"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validTz } from "@/lib/server/tz";

/** Salva il fuso del browser sul profilo 24/7 Coach dell'utente collegato (solo il proprio). */
export async function saveTimezone(tz: string): Promise<void> {
  if (!validTz(tz)) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await createAdminClient().from("ai_athlete_profiles").update({ timezone: tz } as never).eq("athlete_id", user.id);
}
