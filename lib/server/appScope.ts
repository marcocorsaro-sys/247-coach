// ============================================================================
// Separazione tra le due app che condividono il database:
//  - 24/7 Coach (APP_MODE ai_coach): solo gli atleti del coach AI.
//  - Tabella di Irene: solo gli atleti NON del coach AI.
// Ogni vista "admin" (switch atleta, elenchi) passa da qui.
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_COACH_ID, isAiCoachMode } from "@/lib/ai/mode";

/** Id degli atleti del coach AI (24/7 Coach). */
export async function aiAthleteIds(): Promise<Set<string>> {
  const { data } = await createAdminClient().from("coaching_relationships").select("athlete_id").eq("coach_id", AI_COACH_ID);
  return new Set(((data ?? []) as { athlete_id: string }[]).map((r) => r.athlete_id));
}

/** true se l'atleta appartiene all'app in cui stiamo girando. */
export async function athleteInThisApp(athleteId: string): Promise<boolean> {
  const ai = await aiAthleteIds();
  return isAiCoachMode() ? ai.has(athleteId) : !ai.has(athleteId);
}

/** Filtra una lista di atleti tenendo solo quelli dell'app corrente. */
export async function filterToThisApp<T extends { id: string }>(rows: T[]): Promise<T[]> {
  const ai = await aiAthleteIds();
  return rows.filter((r) => (isAiCoachMode() ? ai.has(r.id) : !ai.has(r.id)));
}
