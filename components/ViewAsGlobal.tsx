// Server component globale: monta il menu di switch vista per coach e super
// admin su TUTTE le pagine. Per gli altri utenti non renderizza nulla.
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VIEW_AS_COOKIE } from "@/lib/server/viewAs";
import ViewAsMenu, { type ViewAsAthlete } from "@/app/coach/ViewAsMenu";
import { filterToThisApp } from "@/lib/server/appScope";
import { isAiCoachMode } from "@/lib/ai/mode";

export default async function ViewAsGlobal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profData } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();
  const me = profData as unknown as { role: string; is_admin: boolean | null } | null;
  const isCoach = me?.role === "coach";
  const isAdmin = Boolean(me?.is_admin);
  if (!isCoach && !isAdmin) return null;

  let athletes: ViewAsAthlete[] = [];
  if (isCoach) {
    const { data: rels } = await supabase
      .from("coaching_relationships")
      .select("athlete_id")
      .eq("coach_id", user.id)
      .eq("active", true);
    const ids = ((rels ?? []) as unknown as { athlete_id: string }[]).map((r) => r.athlete_id);
    if (ids.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids)
        .order("full_name", { ascending: true });
      athletes = ((data ?? []) as unknown as {
        id: string;
        full_name: string | null;
        email: string;
      }[]).map((a) => ({ id: a.id, name: a.full_name ?? a.email }));
    }
  } else {
    // Super admin: tutti gli atleti (sé stesso escluso: quella è la sua app).
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "athlete")
      .neq("id", user.id)
      .order("full_name", { ascending: true });
    athletes = ((data ?? []) as unknown as {
      id: string;
      full_name: string | null;
      email: string;
    }[]).map((a) => ({ id: a.id, name: a.full_name ?? a.email }));
  }

  // Mai mescolare gli atleti di Irene con quelli di 24/7 Coach.
  athletes = await filterToThisApp(athletes);
  if (athletes.length === 0 && !isAdmin) return null;

  const jar = await cookies();
  const currentId = jar.get(VIEW_AS_COOKIE)?.value ?? null;

  return (
    <ViewAsMenu
      athletes={athletes}
      currentId={currentId}
      showCoachView={isAdmin && !isCoach && !isAiCoachMode()}
    />
  );
}
