// Caricamento della connessione Intervals.icu di un atleta (server-side).
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface IntervalsConnectionRow {
  intervals_athlete_id: string | null;
  api_key: string;
  enabled: boolean;
  last_ok_at: string | null;
  /** Canali dichiarati ("garmin, polar, ..."), informativo. */
  channels: string | null;
  /** Se false, i PIANIFICATI non vengono inviati al dispositivo (le attività svolte sì). */
  push_planned: boolean;
  /** Riscaldamento di bici e corsa "aperto" fino alla pressione del tasto giro. */
  warmup_lap_press: boolean;
  /** Foto profilo (da Intervals), se presente. */
  avatar_url?: string | null;
  /** Orizzonte di invio all'orologio: 0 = solo settimana in corso, 7 = anche la prossima, null = tutto. */
  push_days?: number | null;
}

export async function loadIntervalsConnection(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<IntervalsConnectionRow | null> {
  const { data } = await supabase
    .from("intervals_connections")
    .select(
      "intervals_athlete_id, api_key, enabled, last_ok_at, channels, push_planned, warmup_lap_press, avatar_url, push_days",
    )
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const row = (data ?? null) as unknown as IntervalsConnectionRow | null;
  if (row) {
    // Tabella ombra (l'atleta segue un altro coach): niente invio all'orologio, mai.
    const { data: ai } = await supabase.from("ai_athlete_profiles").select("shadow_plan").eq("athlete_id", athleteId).maybeSingle();
    if ((ai as { shadow_plan?: boolean } | null)?.shadow_plan) row.push_planned = false;
  }
  return row;
}

/** Elenco canali/piattaforme selezionabili (informativo, per l'onboarding). */
export const ICU_CHANNELS: [string, string][] = [
  ["garmin", "Garmin"],
  ["polar", "Polar"],
  ["suunto", "Suunto"],
  ["coros", "COROS"],
  ["wahoo", "Wahoo"],
  ["strava", "Strava"],
  ["trainingpeaks", "TrainingPeaks"],
];
