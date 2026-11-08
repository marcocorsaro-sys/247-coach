"use server";
// ============================================================================
// Onboarding guidato 24/7 Coach: un'unica azione che salva tutti i passi del
// percorso (dati, obiettivi, tempo, attrezzatura, basi) e segna il tour come
// completato. Poi l'atleta parte con la generazione del piano.
// ============================================================================
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAiCoachMode } from "@/lib/ai/mode";
import { parsePace } from "@/lib/training/zones";

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function saveWelcome(formData: FormData) {
  if (!isAiCoachMode()) redirect("/atleta");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const athleteId = user.id;
  const admin = createAdminClient();

  // ---- dati fisici ----
  const paceStr = str(formData.get("threshold_pace"));
  const fitness: Record<string, unknown> = {
    athlete_id: athleteId,
    birth_date: str(formData.get("birth_date")),
    height_cm: num(formData.get("height_cm")),
    weight_kg: num(formData.get("weight_kg")),
    body_fat_pct: num(formData.get("body_fat_pct")),
    resting_hr: num(formData.get("resting_hr")),
    max_hr: num(formData.get("max_hr")),
    lthr: num(formData.get("lthr")),
    ftp_watts: num(formData.get("ftp_watts")),
    threshold_pace_run_s_per_km: paceStr ? parsePace(paceStr) : null,
    updated_by: athleteId,
    updated_at: new Date().toISOString(),
  };
  for (const k of Object.keys(fitness)) if (fitness[k] == null && k !== "athlete_id") delete fitness[k];
  await admin.from("athlete_fitness").upsert(fitness as never, { onConflict: "athlete_id" });

  // ---- obiettivi: priorità e tempi delle gare esistenti ----
  const raceIds = formData.getAll("race_id").map(String);
  for (const id of raceIds) {
    const prio = str(formData.get(`race_priority_${id}`));
    const target = str(formData.get(`race_target_${id}`));
    if (formData.get(`race_remove_${id}`)) {
      await admin.from("races").delete().eq("id", id).eq("athlete_id", athleteId);
      continue;
    }
    await admin
      .from("races")
      .update({ priority: prio ?? "B", target_time: target } as never)
      .eq("id", id)
      .eq("athlete_id", athleteId);
  }
  const newName = str(formData.get("new_race_name"));
  const newDate = str(formData.get("new_race_date"));
  if (newName && newDate) {
    await admin.from("races").insert({
      athlete_id: athleteId,
      name: newName,
      race_date: newDate,
      distance_label: str(formData.get("new_race_distance")),
      target_time: str(formData.get("new_race_target")),
      priority: str(formData.get("new_race_priority")) ?? "B",
    } as never);
  }

  // ---- profilo AI: obiettivi, tempo, attrezzatura, basi, tour ----
  await admin
    .from("ai_athlete_profiles")
    .upsert(
      {
        athlete_id: athleteId,
        goal_notes: str(formData.get("goal_notes")),
        experience_notes: str(formData.get("experience_notes")),
        injuries: str(formData.get("injuries")),
        availability_days: num(formData.get("availability_days")),
        availability_hours: num(formData.get("availability_hours")),
        weekday_minutes_max: num(formData.get("weekday_minutes_max")),
        weekend_hours_max: num(formData.get("weekend_hours_max")),
        strength_sessions_per_week: num(formData.get("strength_sessions_per_week")),
        strength_notes: str(formData.get("strength_notes")),
        fixed_constraints: str(formData.get("fixed_constraints")),
        equipment: str(formData.get("equipment")),
        home_base: str(formData.get("home_base")),
        weekend_base: str(formData.get("weekend_base")),
        onboarding_completed_at: new Date().toISOString(),
        tour_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "athlete_id" },
    );

  redirect(formData.get("then") === "plan" ? "/onboarding?saved=1" : "/atleta");
}
