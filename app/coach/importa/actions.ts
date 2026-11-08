"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAllWeeks, type ParsedSession } from "@/lib/import/parseWeek";
import { mondayOf, toISODate, weekLabel } from "@/lib/training/weeks";

const enc = (s: string) => encodeURIComponent(s);
const sessionKey = (s: { day_of_week: number; discipline: string }) =>
  `${s.day_of_week}|${s.discipline}`;

/**
 * Importa lo storico: ogni foglio del file Excel è una settimana. Tutti i fogli
 * con almeno una sessione vengono mappati sul lunedì corrispondente (52 settimane
 * dell'anno). Se la settimana esiste già, le sessioni vengono UNITE saltando i
 * doppioni: una cella giorno×disciplina già presente non viene mai duplicata.
 * I fogli di cui non si riesce a derivare la data vengono saltati e segnalati.
 */
export async function importExcel(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const file = formData.get("file");

  if (!athleteId || !(file instanceof File) || file.size === 0) {
    redirect(
      "/coach/importa?error=" +
        enc("Seleziona un atleta e un file Excel."),
    );
  }

  const f = file as File;
  const buf = Buffer.from(await f.arrayBuffer());

  let weeks: ReturnType<typeof parseAllWeeks>;
  try {
    weeks = parseAllWeeks(buf);
  } catch (e) {
    redirect(
      "/coach/importa?error=" +
        enc("Lettura del file non riuscita: " + (e as Error).message),
    );
  }
  if (!weeks!.length) {
    redirect(
      "/coach/importa?athlete=" +
        athleteId +
        "&error=" +
        enc("Nessuna sessione trovata nel file."),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Settimane già presenti per questo atleta, indicizzate per lunedì ISO.
  const { data: existingData } = await supabase
    .from("training_weeks")
    .select("id, week_start")
    .eq("athlete_id", athleteId);
  const existing = (existingData ?? []) as unknown as {
    id: string;
    week_start: string;
  }[];

  const weekIdByStart = new Map<string, string>();
  const preExisting = new Set<string>(); // weekId presenti prima dell'import
  for (const w of existing) {
    weekIdByStart.set(w.week_start.slice(0, 10), w.id);
    preExisting.add(w.id);
  }

  // Stato per-settimana: sessioni giorno×disciplina già presenti e prossimo sort.
  type Existing = {
    id: string;
    raw_text: string | null;
    notes: string | null;
    title: string | null;
    volume_value: string | null;
  };
  const existingByWeekId = new Map<string, Map<string, Existing>>();
  const nextSortByWeekId = new Map<string, number>();

  async function ensureWeekState(weekId: string) {
    if (existingByWeekId.has(weekId)) return;
    const { data } = await supabase
      .from("sessions")
      .select(
        "id, day_of_week, discipline, sort_order, raw_text, notes, title, volume_value",
      )
      .eq("week_id", weekId);
    const rows = (data ?? []) as unknown as {
      id: string;
      day_of_week: number;
      discipline: string;
      sort_order: number | null;
      raw_text: string | null;
      notes: string | null;
      title: string | null;
      volume_value: string | null;
    }[];
    existingByWeekId.set(
      weekId,
      new Map(
        rows.map((r) => [
          sessionKey(r),
          {
            id: r.id,
            raw_text: r.raw_text,
            notes: r.notes,
            title: r.title,
            volume_value: r.volume_value,
          },
        ]),
      ),
    );
    const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order ?? 0), -1);
    nextSortByWeekId.set(weekId, maxSort + 1);
  }

  let weeksCreated = 0;
  const weeksMerged = new Set<string>();
  let sessionsAdded = 0;
  let sessionsSkipped = 0;
  let sessionsFilled = 0;
  const sheetsNoDate: string[] = [];
  const rowsDropped: string[] = [];
  const rowsAssumed: string[] = [];

  // Ordino per data così le settimane risultano coerenti.
  const sorted = [...weeks!].sort((a, b) =>
    (a.weekStart ?? "9999").localeCompare(b.weekStart ?? "9999"),
  );

  for (const pw of sorted) {
    // Righe piene con un'etichetta che il parser non conosce: non entrano in
    // app, quindi almeno si dicono. È il caso in cui "sparisce la riga nuoto".
    for (const d of pw.dropped) {
      const dove = d.label ? `«${d.label}» (riga ${d.row})` : `riga ${d.row}`;
      rowsDropped.push(`${pw.sheetName}: ${dove}, ${d.days} giorni`);
    }
    // Blocchi letti per posizione perché l'etichetta mancava: entrano in app,
    // ma la coach deve sapere che il foglio ha un buco da sistemare.
    for (const a of pw.assumed) rowsAssumed.push(`${pw.sheetName}: ${a}`);
    if (pw.sessions.length === 0) continue;
    if (!pw.weekStart) {
      sheetsNoDate.push(pw.sheetName);
      continue;
    }
    const monday = mondayOf(pw.weekStart);
    const ws = toISODate(monday);

    let weekId = weekIdByStart.get(ws);
    if (!weekId) {
      const { data: created, error: weekErr } = await supabase
        .from("training_weeks")
        .insert({
          athlete_id: athleteId,
          coach_id: user.id,
          created_by: user.id,
          week_start: ws,
          label: weekLabel(monday),
          status: "draft",
          source_filename: f.name,
        } as never)
        .select("id")
        .single();
      const row = created as unknown as { id: string } | null;
      if (weekErr || !row) {
        redirect(
          "/coach/importa?athlete=" +
            athleteId +
            "&error=" +
            enc(weekErr?.message ?? "Errore nel salvataggio della settimana."),
        );
      }
      weekId = row!.id;
      weekIdByStart.set(ws, weekId);
      existingByWeekId.set(weekId, new Map());
      nextSortByWeekId.set(weekId, 0);
      weeksCreated++;
    } else {
      await ensureWeekState(weekId);
    }

    const present = existingByWeekId.get(weekId)!;
    let sort = nextSortByWeekId.get(weekId)!;
    const toInsert: ParsedSession[] = [];
    for (const s of pw.sessions) {
      const k = sessionKey(s);
      const already = present.get(k);
      if (already) {
        // La cella esiste già: non la si tocca, tranne quando il foglio porta
        // un testo e in app quel testo manca del tutto. È il caso delle note
        // aggiunte a una settimana importata prima: senza questo, reimportare
        // il file non le farebbe comparire e servirebbe rifare la settimana.
        const blank = (v: string | null) => !v || !v.trim();
        // id vuoto = riga appena inserita in questo stesso import (due fogli
        // sulla stessa settimana): non c'è niente da completare.
        const patch: Record<string, string> = {};
        if (
          already.id &&
          s.raw_text &&
          blank(already.raw_text) &&
          blank(already.notes)
        ) {
          patch.raw_text = s.raw_text;
          patch.notes = s.raw_text;
        }
        // Stessa logica per tipo e volume: se in app la casella è vuota e nel
        // foglio c'è qualcosa, si completa. Quello che la coach ha scritto a
        // mano non si tocca mai.
        if (already.id && s.title && blank(already.title)) patch.title = s.title;
        if (already.id && s.volume_value && blank(already.volume_value)) {
          patch.volume_value = s.volume_value;
          if (s.volume_unit) patch.volume_unit = s.volume_unit;
        }

        if (Object.keys(patch).length > 0) {
          const { error: fillErr } = await supabase
            .from("sessions")
            .update(patch as never)
            .eq("id", already.id);
          if (fillErr) {
            redirect(
              "/coach/importa?athlete=" +
                athleteId +
                "&error=" +
                enc(fillErr.message),
            );
          }
          if (patch.raw_text) {
            already.raw_text = patch.raw_text;
            already.notes = patch.notes ?? null;
          }
          if (patch.title) already.title = patch.title;
          if (patch.volume_value) already.volume_value = patch.volume_value;
          sessionsFilled++;
          if (preExisting.has(weekId)) weeksMerged.add(weekId);
          continue;
        }
        sessionsSkipped++;
        continue;
      }
      present.set(k, {
        id: "",
        raw_text: s.raw_text,
        notes: s.raw_text,
        title: s.title,
        volume_value: s.volume_value,
      });
      toInsert.push(s);
    }

    if (toInsert.length) {
      const rows = toInsert.map((s) => ({
        week_id: weekId,
        day_of_week: s.day_of_week,
        discipline: s.discipline,
        title: s.title,
        volume_value: s.volume_value,
        volume_unit: s.volume_unit,
        // raw_text resta l'originale immutabile dell'import; notes è il testo
        // EDITABILE mostrato all'atleta, pre-compilato così Irene può arricchirlo
        // subito senza riscriverlo (e l'atleta lo vede come testo principale).
        raw_text: s.raw_text,
        notes: s.raw_text,
        sort_order: sort++,
      }));
      const { error: sessErr } = await supabase
        .from("sessions")
        .insert(rows as never);
      if (sessErr) {
        redirect(
          "/coach/importa?athlete=" +
            athleteId +
            "&error=" +
            enc(sessErr.message),
        );
      }
      nextSortByWeekId.set(weekId, sort);
      sessionsAdded += toInsert.length;
      if (preExisting.has(weekId)) weeksMerged.add(weekId);
    }
  }

  const params = new URLSearchParams({
    athlete: athleteId,
    ok: "1",
    created: String(weeksCreated),
    merged: String(weeksMerged.size),
    added: String(sessionsAdded),
    skipped: String(sessionsSkipped),
    filled: String(sessionsFilled),
  });
  if (sheetsNoDate.length) params.set("nodate", sheetsNoDate.join(", "));
  if (rowsDropped.length) params.set("dropped", rowsDropped.join(" · "));
  if (rowsAssumed.length) params.set("assumed", rowsAssumed.join(" · "));

  redirect("/coach/importa?" + params.toString());
}
