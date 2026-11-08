import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/supabase/database.types";
import { type Discipline, type Fitness } from "@/lib/training/zones";
import { buildWorkoutTcx, type TcxStepRow } from "@/lib/training/tcx";
import { weekLabel } from "@/lib/training/weeks";

function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "allenamento"
  );
}

/**
 * Costruisce la Response con il file TCX della sessione.
 * L'accesso è garantito dalle policy RLS: vi accedono sia il coach sia
 * l'atleta proprietario della sessione.
 */
export async function sessionTcxResponse(id: string): Promise<Response> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Non autenticato", { status: 401 });

  const { data: sessData } = await supabase
    .from("sessions")
    .select("id, week_id, day_of_week, discipline, title")
    .eq("id", id)
    .single();
  const sess = sessData as unknown as Pick<
    Tables<"sessions">,
    "id" | "week_id" | "day_of_week" | "discipline" | "title"
  > | null;
  if (!sess) return new Response("Sessione non trovata", { status: 404 });

  const { data: weekData } = await supabase
    .from("training_weeks")
    .select("athlete_id, label, week_start")
    .eq("id", sess.week_id)
    .single();
  const week = weekData as unknown as Pick<
    Tables<"training_weeks">,
    "athlete_id" | "label" | "week_start"
  > | null;
  if (!week) return new Response("Settimana non trovata", { status: 404 });

  const [stepsRes, fitRes] = await Promise.all([
    supabase
      .from("session_steps")
      .select(
        "id, parent_step_id, sort_order, step_type, repeat_count, duration_seconds, distance_meters, target_type, target_low, target_high, cadence_rpm, note",
      )
      .eq("session_id", id)
      .order("sort_order", { ascending: true }),
    supabase.from("athlete_fitness").select("*").eq("athlete_id", week.athlete_id).maybeSingle(),
  ]);

  const steps = (stepsRes.data ?? []) as unknown as TcxStepRow[];
  const fit = (fitRes.data ?? null) as unknown as Tables<"athlete_fitness"> | null;

  const fitness: Fitness = {
    max_hr: fit?.max_hr ?? null,
    resting_hr: fit?.resting_hr ?? null,
    lthr: fit?.lthr ?? null,
    threshold_pace_run_s_per_km: fit?.threshold_pace_run_s_per_km ?? null,
    ftp_watts: fit?.ftp_watts ?? null,
    css_swim_s_per_100m: fit?.css_swim_s_per_100m ?? null,
    swim_test_400_s: fit?.swim_test_400_s ?? null,
    zone_model: fit?.zone_model ?? "standard",
  };

  let scheduledOn: string | null = null;
  if (week.week_start) {
    const d = new Date(week.week_start);
    d.setDate(d.getDate() + (sess.day_of_week ?? 0));
    scheduledOn = d.toISOString().slice(0, 10);
  }

  const discipline = sess.discipline as Discipline;
  const name = sess.title || `${discipline} ${weekLabel(week.week_start)}`.trim();
  const tcx = buildWorkoutTcx({ name, discipline, steps, fitness, scheduledOn });
  const filename = `${slug(sess.title || discipline)}.tcx`;

  return new Response(tcx, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.garmin.tcx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
