"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveCoachAccess } from "@/lib/server/viewAs";

/** Il coach aggiunge una gara del catalogo a un proprio atleta. */
export async function addRaceFromCatalog(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const catalogId = String(formData.get("catalog_id") ?? "");
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!catalogId || !athleteId) return;

  const coachAccess = await resolveCoachAccess(supabase, user.id);
  if (!coachAccess.allowed) return;
  const { data: rel } = await supabase
    .from("coaching_relationships")
    .select("athlete_id")
    .eq("coach_id", coachAccess.coachId!)
    .eq("athlete_id", athleteId)
    .maybeSingle();
  if (!rel && !coachAccess.isAdmin) return;

  const { data } = await supabase
    .from("race_catalog")
    .select("name, race_date, location, race_type")
    .eq("id", catalogId)
    .single();
  const c = data as unknown as {
    name: string;
    race_date: string;
    location: string | null;
    race_type: string | null;
  } | null;
  if (!c) return;

  await supabase.from("races").insert({
    athlete_id: athleteId,
    name: c.name,
    race_date: c.race_date,
    location: c.location,
    distance_label: c.race_type,
    sport: "triathlon",
  } as never);

  revalidatePath(`/coach/atleta/${athleteId}`);
  redirect(`/coach/atleta/${athleteId}`);
}
