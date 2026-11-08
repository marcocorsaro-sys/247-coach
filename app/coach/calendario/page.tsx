import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCoachAccess } from "@/lib/server/viewAs";
import type { Tables } from "@/supabase/database.types";
import CoachNav from "@/components/CoachNav";
import RaceCalendar, { type CatalogRace } from "@/components/RaceCalendar";
import { addRaceFromCatalog } from "./actions";

export default async function CoachCalendar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const coachAccess = await resolveCoachAccess(supabase, user.id);
  if (!coachAccess.allowed) redirect("/atleta");
  const coachId = coachAccess.coachId!;

  const { data: relData } = await supabase
    .from("coaching_relationships")
    .select("athlete_id")
    .eq("coach_id", coachId)
    .eq("active", true);
  const ids = ((relData ?? []) as unknown as { athlete_id: string }[]).map((r) => r.athlete_id);

  let athletes: { id: string; name: string }[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids)
      .order("full_name", { ascending: true });
    athletes = ((data ?? []) as unknown as Pick<Tables<"profiles">, "id" | "full_name" | "email">[]).map(
      (a) => ({ id: a.id, name: a.full_name ?? a.email }),
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const [catRes, racesRes] = await Promise.all([
    supabase
      .from("race_catalog")
      .select("id, name, race_date, race_type, location, url")
      .gte("race_date", today)
      .order("race_date", { ascending: true }),
    ids.length > 0
      ? supabase.from("races").select("athlete_id, name, race_date").in("athlete_id", ids)
      : Promise.resolve({ data: [] as { athlete_id: string; name: string; race_date: string }[] }),
  ]);
  const races = (catRes.data ?? []) as unknown as CatalogRace[];
  const addedByAthlete: Record<string, string[]> = {};
  for (const r of ((racesRes.data ?? []) as unknown as {
    athlete_id: string;
    name: string;
    race_date: string;
  }[])) {
    const k = `${r.name.trim().toLowerCase()}|${r.race_date.slice(0, 10)}`;
    (addedByAthlete[r.athlete_id] ??= []).push(k);
  }

  return (
    <div className="wrap-tight">
      <CoachNav label="CALENDARIO" />

      <div className="hero">
        <div>
          <span className="mono">// CALENDARIO GARE</span>
          <h1>
            Gare <em>Ironman</em>.
          </h1>
          <p>
            Sfoglia il circuito e aggiungi una gara obiettivo alla scheda di un tuo atleta.
            {races.length > 0 ? ` ${races.length} gare in calendario.` : ""}
          </p>
        </div>
      </div>

      {races.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Catalogo gare ancora vuoto.
        </div>
      ) : (
        <RaceCalendar
          races={races}
          addAction={addRaceFromCatalog}
          mode="coach"
          athletes={athletes}
          addedByAthlete={addedByAthlete}
        />
      )}
    </div>
  );
}
