import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/supabase/database.types";
import { type Discipline, type Fitness } from "@/lib/training/zones";
import { buildWorkoutFit, type FitStepRow } from "@/lib/training/fit";

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
 * Costruisce la Response con il file .FIT (workout) della sessione.
 * Accesso garantito da RLS: coach e atleta proprietario.
 */
export async function sessionFitResponse(id: string): Promise<Response> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Non autenticato", { status: 401 });

  const { data: sessData } = await supabase
    .from("sessions")
    .select("id, week_id, discipline, title")
    .eq("id", id)
    .single();
  const sess = sessData as unknown as Pick<
    Tables<"sessions">,
    "id" | "week_id" | "discipline" | "title"
  > | null;
  if (!sess) return new Response("Sessione non trovata", { status: 404 });

  const { data: weekData } = await supabase
    .from("training_weeks")
    .select("athlete_id")
    .eq("id", sess.week_id)
    .single();
  const week = weekData as unknown as Pick<Tables<"training_weeks">, "athlete_id"> | null;
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

  const steps = (stepsRes.data ?? []) as unknown as FitStepRow[];
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

  const discipline = sess.discipline as Discipline;
  const name = sess.title || discipline;
  const bytes = buildWorkoutFit({ name, discipline, steps, fitness });
  const filename = `${slug(sess.title || discipline)}.fit`;

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
