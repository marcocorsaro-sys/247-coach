// ============================================================================
// Soglie automatiche: riempie SOLO i campi vuoti di athlete_fitness con
//  1) le impostazioni dell'atleta su Intervals.icu (FTP, LTHR, FC max, soglie
//     di passo, FC a riposo, peso), che arrivano da Garmin/Intervals;
//  2) in mancanza, stime dallo storico delle attività (eFTP, passo corsa,
//     passo nuoto, FC max osservata).
// Mai sovrascrive un valore inserito dall'atleta o dal coach.
// ============================================================================
import type { IntervalsConnectionRow } from "@/lib/server/intervals";
import { icuId } from "@/lib/server/readiness";

type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Raw = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) && v > 0 ? v : null);
const pct = (a: number[], p: number) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))]; };

const FIELDS = ["ftp_watts", "lthr", "max_hr", "resting_hr", "threshold_pace_run_s_per_km", "css_swim_s_per_100m", "weight_kg"] as const;
type Field = (typeof FIELDS)[number];

export async function autoThresholds(db: Db, athleteId: string, conn: Pick<IntervalsConnectionRow, "intervals_athlete_id" | "api_key"> | null): Promise<Partial<Record<Field, number>>> {
  const { data: cur } = await db.from("athlete_fitness").select("*").eq("athlete_id", athleteId).maybeSingle();
  const have = (cur ?? {}) as Record<string, unknown>;
  const missing = FIELDS.filter((f) => have[f] == null);
  if (!missing.length) return {};
  const found: Partial<Record<Field, number>> = {};
  const src: string[] = [];

  // 1) Intervals.icu: impostazioni sportive dell'atleta.
  if (conn) {
    try {
      const r = await fetch(`https://intervals.icu/api/v1/athlete/${icuId(conn.intervals_athlete_id)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`API_KEY:${conn.api_key}`).toString("base64")}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const a = (await r.json()) as Raw;
        const ss = (a.sportSettings ?? []) as Raw[];
        const of = (t: string) => ss.find((s) => Array.isArray(s.types) && (s.types as string[]).includes(t));
        const ride = of("Ride"), run = of("Run"), swim = of("Swim");
        const set = (f: Field, v: number | null) => { if (v != null && found[f] == null && missing.includes(f)) found[f] = Math.round(v * 10) / 10; };
        set("ftp_watts", num(ride?.ftp));
        set("lthr", num(run?.lthr) ?? num(ride?.lthr));
        set("max_hr", num(run?.max_hr) ?? num(ride?.max_hr));
        const rp = num(run?.threshold_pace); // m/s
        set("threshold_pace_run_s_per_km", rp ? 1000 / rp : null);
        const sp = num(swim?.threshold_pace);
        set("css_swim_s_per_100m", sp ? 100 / sp : null);
        set("resting_hr", num(a.icu_resting_hr));
        set("weight_kg", num(a.icu_weight));
        if (Object.keys(found).length) src.push("Intervals.icu");
      }
    } catch { /* offline: si passa alle stime */ }
  }

  // 2) Stime dallo storico (ultimi 18 mesi).
  const still = missing.filter((f) => found[f] == null);
  if (still.length) {
    const since = new Date(Date.now() - 548 * 864e5).toISOString();
    const { data } = await db.from("icu_activities").select("discipline, distance_m, moving_time_s, average_speed, average_watts, max_heartrate, raw").eq("is_duplicate" as never, false as never).eq("athlete_id", athleteId).gte("start_date", since).limit(3000);
    const acts = (data ?? []) as { discipline: string; distance_m: number | null; moving_time_s: number | null; average_speed: number | null; average_watts: number | null; max_heartrate: number | null; raw: Raw | null }[];
    const est: Partial<Record<Field, number>> = {};
    if (still.includes("ftp_watts")) {
      const e = acts.filter((a) => a.discipline === "bike").map((a) => num(a.raw?.icu_eftp) ?? num(a.raw?.icu_pm_ftp_watts)).filter((x): x is number => x != null);
      const v = pct(e, 0.9);
      if (v) est.ftp_watts = Math.round(v);
    }
    if (still.includes("max_hr")) {
      const m = acts.map((a) => num(a.max_heartrate)).filter((x): x is number => x != null && x < 215);
      if (m.length >= 10) est.max_hr = Math.round(pct(m, 0.98)!);
    }
    const maxHr = (have.max_hr as number | null) ?? found.max_hr ?? est.max_hr ?? null;
    if (still.includes("lthr") && maxHr) est.lthr = Math.round(maxHr * 0.89);
    if (still.includes("threshold_pace_run_s_per_km")) {
      const p = acts
        .filter((a) => a.discipline === "run" && (a.distance_m ?? 0) >= 8000 && (a.distance_m ?? 0) <= 22000 && a.average_speed && a.average_speed > 2 && a.average_speed < 6.45)
        .map((a) => 1000 / a.average_speed!);
      // Le uscite più veloci su 8-22 km sono vicine al ritmo soglia.
      if (p.length >= 5) est.threshold_pace_run_s_per_km = Math.round(pct(p, 0.05)! * 0.98);
    }
    if (still.includes("css_swim_s_per_100m")) {
      const p = acts
        .filter((a) => a.discipline === "swim" && (a.distance_m ?? 0) >= 1000 && a.moving_time_s)
        .map((a) => (a.moving_time_s! / a.distance_m!) * 100)
        .filter((x) => x > 60 && x < 240);
      if (p.length >= 5) est.css_swim_s_per_100m = Math.round(pct(p, 0.15)!);
    }
    if (Object.keys(est).length) { Object.assign(found, est); src.push("stime dallo storico"); }
  }

  if (!Object.keys(found).length) return {};
  const note = `Soglie compilate in automatico il ${new Date().toISOString().slice(0, 10)} (${src.join(" + ")}): ${Object.entries(found).map(([k, v]) => `${k}=${v}`).join(", ")}. Verificale o correggile in onboarding.`;
  const row: Record<string, unknown> = { athlete_id: athleteId, updated_by: athleteId, ...found, notes: [have.notes, note].filter(Boolean).join("\n"), updated_at: new Date().toISOString() };
  if (cur) await db.from("athlete_fitness").update(row).eq("athlete_id", athleteId);
  else await db.from("athlete_fitness").insert(row);
  return found;
}
