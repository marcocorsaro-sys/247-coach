// ============================================================================
// Sedute "non svolte" e sedute con una nota dell'atleta. Servono alla coach in
// cima alla scheda dell'atleta: così non deve aprire la griglia settimana per
// settimana per scoprire chi ha saltato cosa, perché, e cosa ha scritto.
// ============================================================================
import type { createClient } from "@/lib/supabase/server";
import { parseDate, toISODate, addDays } from "@/lib/training/weeks";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface SkippedSession {
  sessionId: string;
  /** true = "non svolto"; false = seduta con una nota dell'atleta. */
  skipped: boolean;
  dateISO: string;
  discipline: string;
  title: string | null;
  note: string | null;
}

/** Non svolte con data negli ultimi `days` giorni (e nel futuro), dalla più recente. */
export async function loadSkippedSessions(
  supabase: SupabaseClient,
  athleteId: string,
  days = 21,
): Promise<SkippedSession[]> {
  const { data: logData } = await supabase
    .from("session_logs")
    .select("session_id, status, athlete_note")
    .eq("athlete_id", athleteId)
    .or("status.eq.skipped,athlete_note.not.is.null");
  const logs = (logData ?? []) as unknown as {
    session_id: string;
    status: string;
    athlete_note: string | null;
  }[];
  if (!logs.length) return [];

  const { data: sessData } = await supabase
    .from("sessions")
    .select("id, week_id, day_of_week, discipline, title")
    .in("id", logs.map((l) => l.session_id));
  const sessions = (sessData ?? []) as unknown as {
    id: string;
    week_id: string;
    day_of_week: number;
    discipline: string;
    title: string | null;
  }[];
  if (!sessions.length) return [];

  const { data: wkData } = await supabase
    .from("training_weeks")
    .select("id, week_start")
    .in("id", Array.from(new Set(sessions.map((s) => s.week_id))));
  const weekStart = new Map(
    ((wkData ?? []) as unknown as { id: string; week_start: string }[]).map((w) => [w.id, w.week_start]),
  );

  const noteBySession = new Map(logs.map((l) => [l.session_id, l.athlete_note]));
  const skippedIds = new Set(logs.filter((l) => l.status === "skipped").map((l) => l.session_id));
  const since = toISODate(addDays(new Date(), -days));
  const out: SkippedSession[] = [];
  for (const s of sessions) {
    const ws = weekStart.get(s.week_id);
    if (!ws) continue;
    const dateISO = toISODate(addDays(parseDate(ws.slice(0, 10)), s.day_of_week));
    if (dateISO < since) continue;
    out.push({
      sessionId: s.id,
      skipped: skippedIds.has(s.id),
      dateISO,
      discipline: s.discipline,
      title: s.title,
      note: noteBySession.get(s.id) ?? null,
    });
  }
  return out.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}
