// ============================================================================
// Allenatori umani di 24/7 Coach. Un coach vede SOLO gli atleti che hanno
// accettato il suo invito (ai_coach_athletes, status active) e che sono atleti
// 247. Nessun legame con coaching_relationships né con l'app di Irene.
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { aiAthleteIds } from "@/lib/server/appScope";

export type HumanCoach = { user_id: string; display_name: string; club: string | null; invite_code: string; created_at: string };

export async function getHumanCoach(userId: string): Promise<HumanCoach | null> {
  const { data } = await createAdminClient().from("ai_coaches").select("*").eq("user_id", userId).maybeSingle();
  return (data as HumanCoach | null) ?? null;
}

export async function coachByInvite(code: string): Promise<HumanCoach | null> {
  if (!/^[0-9a-f]{6,16}$/i.test(code)) return null;
  const { data } = await createAdminClient().from("ai_coaches").select("*").eq("invite_code", code.toLowerCase()).maybeSingle();
  return (data as HumanCoach | null) ?? null;
}

/** Atleti attivi del coach, solo se atleti 247. */
export async function coachAthleteIds(coachId: string): Promise<string[]> {
  const [{ data }, ai] = await Promise.all([
    createAdminClient().from("ai_coach_athletes").select("athlete_id").eq("coach_id", coachId).eq("status", "active"),
    aiAthleteIds(),
  ]);
  return ((data ?? []) as { athlete_id: string }[]).map((r) => r.athlete_id).filter((id) => ai.has(id));
}

export async function isCoachOf(coachId: string, athleteId: string): Promise<boolean> {
  return (await coachAthleteIds(coachId)).includes(athleteId);
}

export async function coachesOfAthlete(athleteId: string): Promise<HumanCoach[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("ai_coach_athletes").select("coach_id").eq("athlete_id", athleteId).eq("status", "active");
  const ids = ((data ?? []) as { coach_id: string }[]).map((r) => r.coach_id);
  if (!ids.length) return [];
  const { data: cs } = await admin.from("ai_coaches").select("*").in("user_id", ids);
  return (cs ?? []) as HumanCoach[];
}
