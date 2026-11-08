// Caricamento delle zone personalizzate di un atleta (server-side).
import type { createClient } from "@/lib/supabase/server";
import type { CustomZones } from "@/lib/training/customZones";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Zone personalizzate per disciplina di un atleta (vuoto se non impostate). */
export async function loadCustomZones(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<CustomZones> {
  const { data } = await supabase
    .from("athlete_custom_zones")
    .select("discipline, zone_name, range_text, sort_order")
    .eq("athlete_id", athleteId)
    .order("discipline", { ascending: true })
    .order("sort_order", { ascending: true });

  const out: CustomZones = {};
  for (const r of (data ?? []) as unknown as {
    discipline: string;
    zone_name: string;
    range_text: string;
  }[]) {
    (out[r.discipline] ??= []).push({ name: r.zone_name, range: r.range_text });
  }
  return out;
}
