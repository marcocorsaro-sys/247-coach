// ============================================================================
// Carica i "giorni di ferie" di una settimana per la vista atleta:
// per ogni indice di giorno (0=lun..6=dom) ritorna gli slot disciplina con il
// menu (roaster) di allenamenti scegliibili e l'eventuale scelta dell'atleta.
// Mostra solo i periodi pubblicati.
// ============================================================================
import type { createClient } from "@/lib/supabase/server";
import type { VacationSlot, VacationOption } from "@/app/atleta/AthleteWeek";
import { mondayOf, addDays, toISODate } from "@/lib/training/weeks";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function loadVacationByDay(
  supabase: SupabaseClient,
  athleteId: string,
  weekStartISO: string,
): Promise<Record<number, VacationSlot[]>> {
  const mon = mondayOf(weekStartISO);
  const dates = [0, 1, 2, 3, 4, 5, 6].map((i) => toISODate(addDays(mon, i)));
  const dayIndexByDate = new Map(dates.map((d, i) => [d, i]));
  const first = dates[0];
  const last = dates[6];

  // Periodi pubblicati dell'atleta che intersecano la settimana.
  const { data: periodData } = await supabase
    .from("vacation_periods")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("status", "published")
    .lte("start_date", last)
    .gte("end_date", first);
  const periodIds = ((periodData ?? []) as unknown as { id: string }[]).map((p) => p.id);
  if (periodIds.length === 0) return {};

  const [dayRes, woRes] = await Promise.all([
    supabase
      .from("vacation_days")
      .select("id, date, discipline, note")
      .in("period_id", periodIds)
      .in("date", dates),
    supabase
      .from("vacation_workouts")
      .select("id, discipline, title, intensity_label, volume_value, description, sort_order")
      .in("period_id", periodIds)
      .order("sort_order", { ascending: true }),
  ]);
  const days = (dayRes.data ?? []) as unknown as {
    id: string;
    date: string;
    discipline: string;
    note: string | null;
  }[];
  if (days.length === 0) return {};
  const workouts = (woRes.data ?? []) as unknown as (VacationOption & {
    discipline: string;
  })[];

  // Scelte dell'atleta per questi giorni.
  const dayIds = days.map((d) => d.id);
  const { data: pickData } = await supabase
    .from("vacation_picks")
    .select("vacation_day_id, vacation_workout_id, status")
    .eq("athlete_id", athleteId)
    .in("vacation_day_id", dayIds);
  const picks = (pickData ?? []) as unknown as {
    vacation_day_id: string;
    vacation_workout_id: string | null;
    status: string;
  }[];
  const pickByDay = new Map(picks.map((p) => [p.vacation_day_id, p]));

  const optionsByDiscipline = new Map<string, VacationOption[]>();
  for (const w of workouts) {
    const arr = optionsByDiscipline.get(w.discipline) ?? [];
    arr.push({
      id: w.id,
      title: w.title,
      intensity_label: w.intensity_label,
      volume_value: w.volume_value,
      description: w.description,
    });
    optionsByDiscipline.set(w.discipline, arr);
  }

  const out: Record<number, VacationSlot[]> = {};
  for (const d of days) {
    const idx = dayIndexByDate.get(d.date.slice(0, 10));
    if (idx == null) continue;
    const pick = pickByDay.get(d.id);
    const slot: VacationSlot = {
      dayId: d.id,
      discipline: d.discipline,
      note: d.note,
      options: optionsByDiscipline.get(d.discipline) ?? [],
      pickedWorkoutId: pick?.vacation_workout_id ?? null,
      done: pick?.status === "completed",
    };
    (out[idx] ??= []).push(slot);
  }
  return out;
}
