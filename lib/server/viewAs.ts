// ============================================================================
// Switch di vista: coach → atleta, e super admin → qualunque atleta o vista
// coach.
//
// Il cookie è solo un puntatore: ogni richiesta ri-verifica i permessi.
//  - Un COACH può impersonare solo i PROPRI atleti.
//  - Un SUPER ADMIN (profiles.is_admin) può impersonare qualunque atleta e
//    aprire l'area coach (i dati sono quelli della coach; la policy RLS
//    admin_all gli dà la visibilità necessaria).
// ============================================================================

import { cookies } from "next/headers";
import type { createClient } from "@/lib/supabase/server";
import { athleteInThisApp } from "@/lib/server/appScope";
import { isAiCoachMode } from "@/lib/ai/mode";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const VIEW_AS_COOKIE = "view_as_athlete";

export interface ViewAs {
  /** Ruolo dell'utente loggato. */
  role: string;
  /** Super admin? */
  isAdmin: boolean;
  /** Atleta effettivo di cui mostrare i dati (null = coach senza impersonificazione). */
  athleteId: string | null;
  /** true se si stanno guardando i dati di un ALTRO atleta. */
  impersonating: boolean;
}

async function loadMe(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", userId)
    .single();
  const me = data as unknown as { role: string; is_admin: boolean | null } | null;
  return { role: me?.role ?? "athlete", isAdmin: Boolean(me?.is_admin) };
}

/** Risolve l'atleta effettivo per l'utente loggato (self o impersonato). */
export async function resolveViewAs(
  supabase: SupabaseClient,
  userId: string,
): Promise<ViewAs> {
  const { role, isAdmin } = await loadMe(supabase, userId);
  const jar = await cookies();
  const target = jar.get(VIEW_AS_COOKIE)?.value;

  if (role === "coach") {
    if (!target) return { role, isAdmin, athleteId: null, impersonating: false };
    const { data: rel } = await supabase
      .from("coaching_relationships")
      .select("athlete_id")
      .eq("coach_id", userId)
      .eq("athlete_id", target)
      .maybeSingle();
    if (!rel) return { role, isAdmin, athleteId: null, impersonating: false };
    return { role, isAdmin, athleteId: target, impersonating: true };
  }

  // Atleta (eventualmente super admin).
  if (isAdmin && target && target !== userId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", target)
      .eq("role", "athlete")
      .maybeSingle();
    if (prof && (await athleteInThisApp(target))) return { role, isAdmin, athleteId: target, impersonating: true };
  }
  return { role, isAdmin, athleteId: userId, impersonating: false };
}

/** true se l'utente può aprire l'area coach (coach o super admin). */
export async function canAccessCoachArea(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { role, isAdmin } = await loadMe(supabase, userId);
  // In 24/7 Coach l'area coach (dati di Irene) non è accessibile a nessuno.
  if (isAiCoachMode()) return false;
  return role === "coach" || isAdmin;
}

export interface CoachAccess {
  allowed: boolean;
  /** Coach di cui mostrare i dati: sé stesso, o (per l'admin) la coach. */
  coachId: string | null;
  isAdmin: boolean;
}

/**
 * Accesso all'area coach: il coach vede sé stesso; il super admin vede i dati
 * della coach (la prima con role='coach' — nell'app ce n'è una: Irene).
 */
export async function resolveCoachAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<CoachAccess> {
  const { role, isAdmin } = await loadMe(supabase, userId);
  if (role === "coach") return { allowed: true, coachId: userId, isAdmin };
  if (!isAdmin) return { allowed: false, coachId: null, isAdmin };

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "coach")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const coach = data as unknown as { id: string } | null;
  return { allowed: Boolean(coach), coachId: coach?.id ?? null, isAdmin };
}
