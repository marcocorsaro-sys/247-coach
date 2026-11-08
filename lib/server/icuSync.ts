// ============================================================================
// Sincronizzazione delle attività SVOLTE da Intervals.icu → icu_activities.
// Intervals aggrega qualunque piattaforma l'atleta abbia collegato (Garmin,
// Polar, Suunto, Strava, COROS, Wahoo, ...): un solo sync copre tutto.
//
// Il mapping dei campi è DIFENSIVO (più nomi candidati per campo) e il payload
// grezzo viene sempre conservato in `raw`: se Intervals rinomina un campo non
// perdiamo dati e possiamo correggere il mapping a posteriori.
// ============================================================================

import { closePastPlanned } from "@/lib/server/closePlanned";
import type { createClient } from "@/lib/supabase/server";
import { listActivities } from "@/lib/intervals/api";
import type { IntervalsConnectionRow } from "@/lib/server/intervals";
import { syncWellness } from "@/lib/server/readiness";
import { autoThresholds } from "@/lib/server/thresholds";
import { autoMatchActivities } from "@/lib/server/autoMatch";
import { pruneForAthlete } from "@/lib/server/icuPush";
import { aiAthleteIds } from "@/lib/server/appScope";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type Raw = Record<string, unknown>;

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && isFinite(n) ? n : null;
}
function pickNum(a: Raw, ...keys: string[]): number | null {
  for (const k of keys) {
    const n = num(a[k]);
    if (n != null) return n;
  }
  return null;
}
function pickStr(a: Raw, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = a[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

/** type Intervals → nostra disciplina. */
function disciplineOf(type: string | null): string {
  const t = (type ?? "").toLowerCase();
  if (t.includes("run")) return "run";
  if (t.includes("ride") || t.includes("bike") || t.includes("velomobile")) return "bike";
  if (t.includes("swim")) return "swim";
  if (t.includes("weight") || t.includes("workout") || t.includes("training")) return "athletics";
  return "other";
}

export interface IcuSyncResult {
  ok: boolean;
  imported: number;
  detail?: string;
}

/**
 * Importa (upsert) le attività degli ultimi `days` giorni. Idempotente per
 * (athlete, icu_activity_id): i re-sync aggiornano le righe esistenti.
 */
export async function syncIcuActivities(
  supabase: SupabaseClient,
  athleteId: string,
  conn: IntervalsConnectionRow,
  days = 90,
): Promise<IcuSyncResult> {
  const now = new Date();
  const oldest = new Date(now.getTime() - days * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const res = await listActivities(
    { intervals_athlete_id: conn.intervals_athlete_id, api_key: conn.api_key },
    iso(oldest),
    iso(now),
  );
  if (!res.ok) {
    return { ok: false, imported: 0, detail: `HTTP ${res.status}: ${res.detail ?? ""}`.trim() };
  }

  const list = Array.isArray(res.data) ? (res.data as Raw[]) : [];
  if (list.length === 0) return { ok: true, imported: 0 };

  const rows = list
    .map((a) => {
      const icuId = pickStr(a, "id") ?? String(a.id ?? "");
      if (!icuId) return null;
      const type = pickStr(a, "type", "sport");
      return {
        athlete_id: athleteId,
        icu_activity_id: icuId,
        name: pickStr(a, "name"),
        sport_type: type,
        source: pickStr(a, "source"),
        discipline: disciplineOf(type),
        start_date: pickStr(a, "start_date_local", "start_date"),
        distance_m: pickNum(a, "distance", "icu_distance"),
        moving_time_s: pickNum(a, "moving_time", "icu_moving_time"),
        elapsed_time_s: pickNum(a, "elapsed_time"),
        total_elevation_gain: pickNum(a, "total_elevation_gain", "icu_elevation_gain"),
        average_heartrate: pickNum(a, "average_heartrate", "icu_average_hr", "avg_hr"),
        max_heartrate: pickNum(a, "max_heartrate", "icu_max_hr", "max_hr"),
        average_speed: pickNum(a, "average_speed", "icu_average_speed"),
        max_speed: pickNum(a, "max_speed"),
        average_watts: pickNum(a, "icu_average_watts", "average_watts", "icu_weighted_avg_watts"),
        average_cadence: pickNum(a, "average_cadence", "icu_average_cadence"),
        calories: pickNum(a, "calories", "icu_joules"),
        training_load: pickNum(a, "icu_training_load", "training_load"),
        trainer: typeof a.trainer === "boolean" ? a.trainer : null,
        raw: a,
      };
    })
    .filter(Boolean)
    // "Corsa" a più di 23 km/h di media: bici registrata come corsa.
    .map((r) => (r && r.discipline === "run" && (r.average_speed ?? 0) > 6.45 ? { ...r, discipline: "bike" } : r));

  // A blocchi: lo storico completo può essere di migliaia di attività.
  for (let i = 0; i < rows.length; i += 250) {
    const { error } = await supabase
      .from("icu_activities")
      .upsert(rows.slice(i, i + 250) as never, { onConflict: "athlete_id,icu_activity_id" });
    if (error) return { ok: false, imported: i, detail: error.message };
  }

  await supabase
    .from("intervals_connections")
    .update({ last_ok_at: new Date().toISOString() } as never)
    .eq("athlete_id", athleteId);

  // Benessere (HRV, sonno, FC a riposo) per la prontezza: almeno 35 giorni di baseline.
  // Solo atleti di 24/7 Coach: quelli di Irene seguono un iter separato
  // (niente soglie automatiche, niente prontezza).
  if ((await aiAthleteIds()).has(athleteId)) {
    // Doppioni della stessa uscita (Garmin + Strava/Upload): restano in archivio ma
    // marcati, così carico, forma e confronti non contano due volte lo stesso allenamento.
    // NB: il builder di supabase-js è "thenable" ma non ha .catch(): va in try/await.
    try {
      await (supabase as unknown as { rpc: (f: string, a: Record<string, unknown>) => PromiseLike<unknown> })
        .rpc("mark_duplicate_icu_activities", { p_athlete: athleteId, p_since: new Date(Date.now() - (days + 2) * 864e5).toISOString() });
    } catch { /* non blocca il resto */ }
    await syncWellness(supabase as never, athleteId, conn, Math.max(35, Math.min(days, 120))).catch(() => 0);
    // Soglie mancanti: da Intervals.icu o stimate dallo storico (mai sovrascritte).
    await autoThresholds(supabase as never, athleteId, conn).catch(() => null);
    // Calendario Intervals/Garmin: via gli allenamenti superati da revisioni successive.
    await pruneForAthlete(supabase as never, athleteId).catch(() => 0);
    // Allenamento dello sport previsto quel giorno → seduta segnata come svolta da sola.
    await autoMatchActivities(supabase as never, athleteId, Math.min(days, 14)).catch(() => 0);
      await closePastPlanned(supabase as never, athleteId).catch(() => null);
  }
  return { ok: true, imported: rows.length };
}
