// ============================================================================
// Chiusura delle sedute passate (solo atleti 24/7 Coach, idea di Luca Valerio).
//  - Seduta svolta (abbinata a un'attività o segnata a mano): l'allenamento
//    programmato sparisce dal calendario Intervals/Garmin.
//  - Giorno passato senza niente, o con uno sport diverso: il coach lo dice
//    all'atleta su Telegram ("lo prendo per buono così, se hai fatto altro
//    scrivimelo"), registra la seduta come non svolta e la toglie dal calendario.
// Non tocca mai gli atleti di Irene né le tabelle ombra.
// ============================================================================
import { aiAthleteIds } from "@/lib/server/appScope";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { deleteEvent, listEvents, type IntervalsCalendarEvent } from "@/lib/intervals/api";
import { tgSend } from "@/lib/notify/athlete";

type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const romeDay = (d: Date | string = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(d));
const romeHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", hour12: false }).format(new Date()));
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
const NAME: Record<string, string> = { swim: "nuoto", bike: "bici", run: "corsa", athletics: "atletica", other: "forza/altro" };

/** Sedute "chiuse" (svolte, parziali o non svolte) di un insieme di sessioni. */
export async function closedSessionIds(db: Db, athleteId: string, sessionIds: string[]): Promise<Set<string>> {
  if (!sessionIds.length) return new Set();
  const { data } = await db.from("session_logs").select("session_id, status").eq("athlete_id", athleteId).in("session_id", sessionIds);
  return new Set(((data ?? []) as { session_id: string; status: string }[]).filter((l) => l.status !== "planned").map((l) => l.session_id));
}

export async function closePastPlanned(db: Db, athleteId: string): Promise<{ asked: number; deleted: number }> {
  if (!(await aiAthleteIds()).has(athleteId)) return { asked: 0, deleted: 0 };
  const { data: ap } = await db.from("ai_athlete_profiles").select("shadow_plan, telegram_chat_id, coach_name").eq("athlete_id", athleteId).maybeSingle();
  const prof = (ap ?? {}) as { shadow_plan?: boolean; telegram_chat_id?: number | string | null; coach_name?: string | null };
  if (prof.shadow_plan) return { asked: 0, deleted: 0 };
  const coach = prof.coach_name?.trim() || "il tuo coach";
  const today = romeDay();

  // 1) Giorni passati (ultimi 3) con sedute senza esito: chiedi e chiudi.
  let asked = 0;
  if (romeHour() >= 7) {
    const from = addDays(today, -3);
    const { data: wks } = await db.from("training_weeks").select("id, week_start").eq("athlete_id", athleteId).eq("status", "published").gte("week_start", mondayOf(from)).lte("week_start", today);
    const W = (wks ?? []) as { id: string; week_start: string }[];
    if (W.length) {
      const { data: ss } = await db.from("sessions").select("id, week_id, day_of_week, discipline, title, volume_value").in("week_id", W.map((w) => w.id));
      const S = ((ss ?? []) as { id: string; week_id: string; day_of_week: number; discipline: string; title: string | null; volume_value: string | null }[])
        .map((s) => ({ ...s, date: addDays(W.find((w) => w.id === s.week_id)!.week_start, s.day_of_week) }))
        .filter((s) => s.date >= from && s.date < today);
      const closed = await closedSessionIds(db, athleteId, S.map((s) => s.id));
      const { data: pl } = await db.from("session_logs").select("session_id, athlete_note").eq("athlete_id", athleteId).in("session_id", S.map((s) => s.id));
      const prevNote = new Map(((pl ?? []) as { session_id: string; athlete_note: string | null }[]).filter((l) => l.athlete_note && !/^Rilevato da orologio|^Nessun allenamento rilevato|^Non svolta come prevista/.test(l.athlete_note)).map((l) => [l.session_id, l.athlete_note!]));
      const open = S.filter((s) => !closed.has(s.id));
      if (open.length) {
        const { data: acts } = await db.from("icu_activities").select("start_date, discipline, name, moving_time_s, distance_m").eq("athlete_id", athleteId).eq("is_duplicate", false).gte("start_date", `${addDays(from, -1)}T00:00:00Z`);
        const A = ((acts ?? []) as { start_date: string; discipline: string; name: string | null; moving_time_s: number | null; distance_m: number | null }[]).filter((a) => (a.moving_time_s ?? 0) >= 180);
        const lines: string[] = [];
        for (const date of [...new Set(open.map((s) => s.date))].sort()) {
          const miss = open.filter((s) => s.date === date);
          const did = A.filter((a) => a.start_date.slice(0, 10) === date);
          const didTxt = did.map((a) => `${a.name || NAME[a.discipline] || a.discipline} alle ${new Date(a.start_date).toLocaleTimeString("it-IT", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })} ${Math.round((a.moving_time_s ?? 0) / 60)}'${a.distance_m ? ` ${(a.distance_m / 1000).toFixed(a.discipline === "swim" ? 2 : 1)} km` : ""}`).join(", ");
          for (const s of miss) {
            await db.from("session_logs").upsert({
              session_id: s.id,
              athlete_id: athleteId,
              status: "skipped",
              athlete_note: [prevNote.get(s.id), did.length ? `Non svolta come prevista: fatto invece ${didTxt} (rilevato da orologio)` : "Nessun allenamento rilevato dall'orologio"].filter(Boolean).join("\n"),
            }, { onConflict: "session_id,athlete_id" });
          }
          const prev = miss.map((s) => `${s.title ?? NAME[s.discipline] ?? s.discipline}${s.volume_value ? ` (${s.volume_value})` : ""}`).join(" + ");
          lines.push(`• ${dayLabel(date)}: era previsto ${prev}. ${did.length ? `Ho visto invece ${didTxt}.` : "Non vedo nessun allenamento."}`);
        }
        const text = `${lines.join("\n")}\n\nLo prendo per buono così e lo tolgo dal calendario dell'orologio. Se hai fatto qualcosa che non è arrivato su Intervals, scrivimelo e ne tengo conto.\n\n${coach === "il tuo coach" ? "" : coach}`.trim();
        if (prof.telegram_chat_id && (await tgSend(prof.telegram_chat_id, text))) {
          await db.from("ai_feedback").insert({ athlete_id: athleteId, message: "[messaggio del coach]", kind: "message", decision: "answer", coach_reply: text, consumed_at: new Date().toISOString() });
        }
        asked = open.length;
      }
    }
  }

  // 2) Calendario Intervals: via gli eventi nostri dei giorni passati e quelli di oggi già svolti.
  let deleted = 0;
  const conn = await loadIntervalsConnection(db as never, athleteId);
  if (conn?.api_key && conn.push_planned !== false) {
    const icu = { intervals_athlete_id: conn.intervals_athlete_id, api_key: conn.api_key };
    const listed = await listEvents(icu as never, addDays(today, -14), today);
    if (listed.ok) {
      const ev = ((Array.isArray(listed.data) ? listed.data : []) as IntervalsCalendarEvent[]).filter((e) => UUID_RX.test(e.external_id ?? e.uid ?? ""));
      const todayIds = ev.filter((e) => (e.start_date_local ?? "").slice(0, 10) === today).map((e) => (e.external_id ?? e.uid)!);
      const closedToday = await closedSessionIds(db, athleteId, todayIds);
      for (const e of ev) {
        const d = (e.start_date_local ?? "").slice(0, 10);
        const key = (e.external_id ?? e.uid)!;
        if (d < today || (d === today && closedToday.has(key))) {
          const r = await deleteEvent(icu as never, e.id);
          if (r.ok) deleted++;
        }
      }
    }
  }
  return { asked, deleted };
}
