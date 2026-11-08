// ============================================================================
// Aggrega gli allenamenti di un atleta sul mese corrente + precedente per la
// vista mensile. Mette insieme le sessioni delle tabelle (giorno×disciplina)
// e i giorni di ferie (con la scelta dell'atleta dal roaster).
// ============================================================================
import type { createClient } from "@/lib/supabase/server";
import type { MonthItem } from "@/app/atleta/mese/MonthGrid";
import { parseDate, toISODate, addDays } from "@/lib/training/weeks";
import { discMeta } from "@/lib/training/vacation";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Durata totale stimata (s) dagli step: le ripetute contano reps×figli a tempo. */
function sumDuration(
  steps: {
    id: string;
    parent_step_id: string | null;
    step_type: string;
    repeat_count: number | null;
    duration_seconds: number | null;
  }[],
): number {
  let tot = 0;
  for (const s of steps.filter((x) => !x.parent_step_id)) {
    if (s.step_type === "repeat") {
      const kids = steps.filter((c) => c.parent_step_id === s.id);
      const sub = kids.reduce((a, k) => a + (k.duration_seconds ?? 0), 0);
      tot += sub * (s.repeat_count ?? 1);
    } else {
      tot += s.duration_seconds ?? 0;
    }
  }
  return tot;
}

export interface MonthWindow {
  prev: { year: number; month: number };
  current: { year: number; month: number };
  next: { year: number; month: number };
  firstISO: string;
  lastISO: string;
}

/**
 * Finestra mese precedente → corrente → successivo, a partire da "oggi".
 * Il mese successivo serve perché la coach pubblica 3-4 settimane in avanti:
 * a metà mese le ultime cadono già nel mese dopo e senza di lui sparivano
 * dalla vista (Claudio non vedeva novembre il 16 ottobre).
 */
export function monthWindow(today: Date): MonthWindow {
  const y = today.getFullYear();
  const m = today.getMonth();
  const prevDate = new Date(y, m - 1, 1);
  const first = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1);
  const nextDate = new Date(y, m + 1, 1);
  const last = new Date(y, m + 2, 0); // ultimo giorno del mese successivo
  return {
    prev: { year: prevDate.getFullYear(), month: prevDate.getMonth() },
    current: { year: y, month: m },
    next: { year: nextDate.getFullYear(), month: nextDate.getMonth() },
    firstISO: toISODate(first),
    lastISO: toISODate(last),
  };
}

export interface WeekWindow {
  firstISO: string;
  lastISO: string;
  /** Lunedì ISO di ciascuna settimana della finestra (in ordine). */
  weekStarts: string[];
}

/**
 * Finestra "rolling" di N settimane a partire dal lunedì della settimana di
 * `today` (default 4): è la vista di pianificazione del coach. A differenza di
 * monthWindow (calendario per mese) qui le righe sono settimane lun→dom.
 */
export function weekWindow(today: Date, weeks = 4): WeekWindow {
  const dow = (today.getDay() + 6) % 7; // 0 = lunedì
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dow);
  const weekStarts: string[] = [];
  for (let i = 0; i < weeks; i++) {
    weekStarts.push(
      toISODate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i * 7)),
    );
  }
  const last = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + weeks * 7 - 1,
  );
  return { firstISO: toISODate(monday), lastISO: toISODate(last), weekStarts };
}

export async function loadMonthItems(
  supabase: SupabaseClient,
  athleteId: string,
  win: { firstISO: string; lastISO: string },
  opts: { publishedOnly: boolean },
): Promise<Record<string, MonthItem[]>> {
  const out: Record<string, MonthItem[]> = {};
  const push = (it: MonthItem) => {
    (out[it.date] ??= []).push(it);
  };

  // ---- Sessioni delle tabelle settimanali ----
  // Una settimana lun→dom può sconfinare di 6 giorni: allargo la finestra query.
  const wkFrom = toISODate(addDays(parseDate(win.firstISO), -6));
  let weeksQ = supabase
    .from("training_weeks")
    .select("id, week_start, status")
    .eq("athlete_id", athleteId)
    .gte("week_start", wkFrom)
    .lte("week_start", win.lastISO);
  if (opts.publishedOnly) weeksQ = weeksQ.eq("status", "published");
  const { data: weeksData } = await weeksQ;
  const weeks = (weeksData ?? []) as unknown as { id: string; week_start: string }[];

  if (weeks.length > 0) {
    const weekStartById = new Map(weeks.map((w) => [w.id, w.week_start.slice(0, 10)]));
    const { data: sessData } = await supabase
      .from("sessions")
      .select("id, week_id, day_of_week, discipline, title, volume_value")
      .in("week_id", weeks.map((w) => w.id))
      .order("sort_order", { ascending: true });
    const sessions = (sessData ?? []) as unknown as {
      id: string;
      week_id: string;
      day_of_week: number;
      discipline: string;
      title: string | null;
      volume_value: string | null;
    }[];

    const sessIds = sessions.map((s) => s.id);
    let doneIds = new Set<string>();
    const durBySession = new Map<string, number>();
    if (sessIds.length > 0) {
      const [logsRes, stepsRes] = await Promise.all([
        supabase
          .from("session_logs")
          .select("session_id, status")
          .eq("athlete_id", athleteId)
          .in("session_id", sessIds),
        supabase
          .from("session_steps")
          .select("id, session_id, parent_step_id, step_type, repeat_count, duration_seconds")
          .in("session_id", sessIds),
      ]);
      doneIds = new Set(
        ((logsRes.data ?? []) as unknown as { session_id: string; status: string }[])
          .filter((l) => l.status === "completed")
          .map((l) => l.session_id),
      );

      // Durata stimata per sessione dagli step strutturati (se presenti).
      const stepsBySession = new Map<string, Parameters<typeof sumDuration>[0]>();
      for (const st of (stepsRes.data ?? []) as unknown as ({
        session_id: string;
      } & Parameters<typeof sumDuration>[0][number])[]) {
        const arr = stepsBySession.get(st.session_id) ?? [];
        arr.push(st);
        stepsBySession.set(st.session_id, arr);
      }
      for (const [sid, arr] of stepsBySession) {
        const sec = sumDuration(arr);
        if (sec > 0) durBySession.set(sid, sec);
      }
    }

    for (const s of sessions) {
      const ws = weekStartById.get(s.week_id);
      if (!ws) continue;
      const date = toISODate(addDays(parseDate(ws), s.day_of_week));
      if (date < win.firstISO || date > win.lastISO) continue;
      push({
        date,
        kind: "session",
        discipline: s.discipline,
        title: s.title ?? discMeta(s.discipline).label,
        detail: s.volume_value,
        durationSec: durBySession.get(s.id) ?? null,
        done: doneIds.has(s.id),
      });
    }
  }

  // ---- Giorni di ferie ----
  let periodsQ = supabase
    .from("vacation_periods")
    .select("id, status")
    .eq("athlete_id", athleteId)
    .lte("start_date", win.lastISO)
    .gte("end_date", win.firstISO);
  if (opts.publishedOnly) periodsQ = periodsQ.eq("status", "published");
  const { data: periodData } = await periodsQ;
  const periodIds = ((periodData ?? []) as unknown as { id: string }[]).map((p) => p.id);

  if (periodIds.length > 0) {
    const [dayRes, woRes] = await Promise.all([
      supabase
        .from("vacation_days")
        .select("id, date, discipline")
        .in("period_id", periodIds)
        .gte("date", win.firstISO)
        .lte("date", win.lastISO),
      supabase
        .from("vacation_workouts")
        .select("id, title, volume_value")
        .in("period_id", periodIds),
    ]);
    const days = (dayRes.data ?? []) as unknown as {
      id: string;
      date: string;
      discipline: string;
    }[];
    const workoutById = new Map(
      ((woRes.data ?? []) as unknown as { id: string; title: string; volume_value: string | null }[]).map(
        (w) => [w.id, w],
      ),
    );

    if (days.length > 0) {
      const { data: pickData } = await supabase
        .from("vacation_picks")
        .select("vacation_day_id, vacation_workout_id, status")
        .eq("athlete_id", athleteId)
        .in("vacation_day_id", days.map((d) => d.id));
      const pickByDay = new Map(
        ((pickData ?? []) as unknown as {
          vacation_day_id: string;
          vacation_workout_id: string | null;
          status: string;
        }[]).map((p) => [p.vacation_day_id, p]),
      );

      for (const d of days) {
        const pick = pickByDay.get(d.id);
        const chosen = pick?.vacation_workout_id ? workoutById.get(pick.vacation_workout_id) : null;
        push({
          date: d.date.slice(0, 10),
          kind: "vacation",
          discipline: d.discipline,
          title: chosen ? chosen.title : "Da scegliere",
          detail: chosen?.volume_value ?? null,
          durationSec: null,
          done: pick?.status === "completed",
        });
      }
    }
  }

  return out;
}
