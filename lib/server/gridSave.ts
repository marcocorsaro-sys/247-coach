import { createClient } from "@/lib/supabase/server";
import { mondayOf, addDays, toISODate, weekLabel } from "@/lib/training/weeks";

const GRID_DISCIPLINES = ["swim", "bike", "run", "athletics"] as const;
type GridDiscipline = (typeof GRID_DISCIPLINES)[number];
const SORT_BY_DISC: Record<GridDiscipline, number> = { swim: 0, bike: 1, run: 2, athletics: 3 };

/** Deduce l'unità del volume dal testo scritto a mano ("3km" → distance, "60'" → time). */
function guessUnit(v: string | null): "time" | "distance" | "other" | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes("km") || s.includes("mt")) return "distance";
  if (s.includes("h") || s.includes("'") || s.includes("’") || s.includes("min")) return "time";
  return "other";
}

const field = (fd: FormData, name: string): string | null => {
  const s = String(fd.get(name) ?? "").trim();
  return s === "" ? null : s;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type Cell = {
  day: number;
  disc: GridDiscipline;
  id: string | null;
  title: string | null;
  vol: string | null;
  notes: string | null;
};

/** Legge le celle di UNA settimana dal form (prefisso c_{weekISO}_{day}_{disc}). */
function readWeekCells(formData: FormData, weekISO: string): Cell[] {
  const cells: Cell[] = [];
  for (let day = 0; day < 7; day++) {
    for (const disc of GRID_DISCIPLINES) {
      const p = `c_${weekISO}_${day}_${disc}`;
      const id = field(formData, `${p}_id`);
      const title = field(formData, `${p}_title`);
      const vol = field(formData, `${p}_vol`);
      const notes = field(formData, `${p}_notes`);
      if (id || title || vol || notes) cells.push({ day, disc, id, title, vol, notes });
    }
  }
  return cells;
}

/** Salva le celle di una singola settimana (crea la settimana al volo se serve). */
async function saveWeekCells(
  supabase: SupabaseClient,
  userId: string,
  athleteId: string,
  weekISO: string,
  cells: Cell[],
) {
  const hasContent = cells.some((c) => c.title || c.vol || c.notes);

  const { data: wkData } = await supabase
    .from("training_weeks")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("week_start", weekISO)
    .maybeSingle();
  let weekId = (wkData as unknown as { id: string } | null)?.id ?? null;

  if (!weekId) {
    if (!hasContent) return; // niente da salvare per questa settimana
    const { data: created } = await supabase
      .from("training_weeks")
      .insert({
        athlete_id: athleteId,
        coach_id: userId,
        created_by: userId,
        week_start: weekISO,
        label: weekLabel(mondayOf(weekISO)),
        status: "draft",
      } as never)
      .select("id")
      .single();
    weekId = (created as unknown as { id: string } | null)?.id ?? null;
    if (!weekId) return;
  }

  // Le sessioni già in archivio per questa settimana, per cella. Il form porta
  // l'id solo delle celle che esistevano quando la pagina è stata disegnata:
  // se lo stesso salvataggio parte due volte (doppio clic, rete che ritenta),
  // la seconda arriva ancora senza id e senza questo controllo inserirebbe una
  // copia. È così che sono nate settimane con sette copie della stessa seduta.
  const { data: liveRows } = await supabase
    .from("sessions")
    .select("id, day_of_week, discipline")
    .eq("week_id", weekId)
    .order("sort_order", { ascending: true });
  const idByCell = new Map<string, string>();
  for (const r of (liveRows ?? []) as unknown as {
    id: string;
    day_of_week: number;
    discipline: string;
  }[]) {
    const k = `${r.day_of_week}|${r.discipline}`;
    if (!idByCell.has(k)) idByCell.set(k, r.id); // come la griglia: vale la prima
  }

  // L'id definitivo di ogni cella: quello arrivato dal form, altrimenti quello
  // della seduta già in archivio in quel giorno×disciplina.
  const resolved = cells.map((c) => ({
    c,
    id: c.id ?? idByCell.get(`${c.day}|${c.disc}`) ?? null,
    empty: !c.title && !c.vol && !c.notes,
  }));

  const inserts: Record<string, unknown>[] = [];
  const ops: Promise<unknown>[] = [];
  for (const { c, id, empty } of resolved) {
    if (id) {
      // Cella svuotata: la seduta si cancella, step compresi.
      //
      // Prima gli step la salvavano dalla cancellazione: la riga restava in
      // archivio con tipo, volume e testo vuoti ma con dentro tutto
      // l'allenamento strutturato. La coach la vedeva sparire dalla griglia,
      // l'atleta continuava a vedersela in app e sull'orologio — è il
      // "allenamenti doppi" di Antonio, il vecchio accanto al nuovo.
      //
      // Si cancella solo quando l'id è arrivato dal form: vuol dire che quella
      // cella era sullo schermo e chi salva l'ha svuotata apposta.
      if (empty && c.id) {
        ops.push(supabase.from("sessions").delete().eq("id", id) as unknown as Promise<unknown>);
      } else {
        ops.push(
          supabase
            .from("sessions")
            .update({
              title: c.title,
              volume_value: c.vol,
              volume_unit: guessUnit(c.vol),
              notes: c.notes,
            } as never)
            .eq("id", id) as unknown as Promise<unknown>,
        );
      }
    } else if (!empty) {
      inserts.push({
        week_id: weekId,
        day_of_week: c.day,
        discipline: c.disc,
        title: c.title,
        volume_value: c.vol,
        volume_unit: guessUnit(c.vol),
        notes: c.notes,
        raw_text: c.notes,
        sort_order: SORT_BY_DISC[c.disc],
      });
    }
  }

  await Promise.all(ops);
  if (inserts.length > 0) await supabase.from("sessions").insert(inserts as never);
}


export type SaveGridResult =
  | { ok: true; dest: string }
  | { ok: false; code: "auth" | "bad_request" };

/**
 * Salva la griglia (1 o 4 settimane) e dice dove andare dopo. Non reindirizza:
 * lo usano sia l'azione del form (vecchi client) sia la route /api/coach/griglia
 * (il form di adesso, che mostra gli errori invece di restare appeso).
 */
export async function runSaveGrid(formData: FormData): Promise<SaveGridResult> {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const wRaw = String(formData.get("w") ?? "");
  if (!athleteId) return { ok: false, code: "bad_request" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "auth" };

  const n = Math.max(1, Math.min(4, parseInt(String(formData.get("n") ?? "1"), 10) || 1));
  const first = mondayOf(wRaw || new Date());
  const ws = toISODate(first);
  const goto = String(formData.get("goto") ?? "").trim();

  const weekISOs = Array.from({ length: n }, (_, i) => toISODate(addDays(first, i * 7)));
  for (const weekISO of weekISOs) {
    await saveWeekCells(supabase, user.id, athleteId, weekISO, readWeekCells(formData, weekISO));
  }

  return {
    ok: true,
    dest: `/coach/atleta/${athleteId}/griglia?w=${goto || ws}&weeks=${n}${goto ? "&sg=1" : "&saved=1"}`,
  };
}
