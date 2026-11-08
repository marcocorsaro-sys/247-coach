// ============================================================================
// Storico gare ricostruito dalle attività (Garmin/Intervals) e proiezione
// dell'obiettivo sulla gara A. Vale per qualunque atleta: si basa solo sulle
// attività importate (icu_activities) e sulla scheda della gara (event_races).
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { compute, solveTarget, levers, DEFAULTS, type CalcInput, type CalcResult, type Lever } from "@/lib/site/calc";

export type RaceKind = "full" | "half" | "olympic" | "sprint" | "marathon" | "full_nosplit";
export interface Leg { km: number; s: number; hr: number | null; w: number | null }
export interface PastRace {
  date: string; kind: RaceKind; name: string | null;
  swim: Leg | null; bike: Leg | null; run: Leg | null; transS: number; totalS: number | null;
}

type A = {
  start_date: string | null; discipline: string | null; sport_type: string | null; name: string | null;
  distance_m: number | null; moving_time_s: number | null; elapsed_time_s: number | null;
  average_heartrate: number | null; average_watts: number | null; average_speed: number | null;
};

const GENERIC = /^(nuoto|swim|bike|bici|run|corsa|transition|transizione|open water)\b|acque libere|^(morning|afternoon|evening|lunch|night)\b|mattutin|pomeridian|serale|pranzo|notturn|^giro\b|^corsa\b|^pedalata\b|^nuotata\b|untitled|senza titolo|^\d{2}\/\d{2}\/\d{4}/i;

/** Tutte le attività dell'atleta (paginando oltre il limite di 1000 righe). */
export async function loadAllActivities(db: SupabaseClient, athleteId: string): Promise<A[]> {
  const out: A[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await db
      .from("icu_activities")
      .select("start_date, discipline, sport_type, name, distance_m, moving_time_s, elapsed_time_s, average_heartrate, average_watts, average_speed").eq("is_duplicate" as never, false as never)
      .eq("athlete_id", athleteId)
      .order("start_date", { ascending: true })
      .range(from, from + 999);
    const rows = (data ?? []) as A[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const leg = (a: A | undefined): Leg | null =>
  a ? { km: (a.distance_m ?? 0) / 1000, s: a.moving_time_s ?? a.elapsed_time_s ?? 0, hr: a.average_heartrate, w: a.average_watts } : null;

/** Ricostruisce le gare (triathlon e maratone) dai giorni con frazioni compatibili. */
export function detectRaces(acts: A[]): PastRace[] {
  const days = new Map<string, A[]>();
  for (const a of acts) {
    if (!a.start_date) continue;
    const d = a.start_date.slice(0, 10);
    days.set(d, [...(days.get(d) ?? []), a]);
  }
  const out: PastRace[] = [];
  for (const [date, xs] of days) {
    const max = (f: (a: A) => boolean) => xs.filter(f).sort((x, y) => (y.distance_m ?? 0) - (x.distance_m ?? 0))[0];
    const sw = max((a) => a.discipline === "swim");
    const bk = max((a) => a.discipline === "bike");
    const rn = max((a) => a.discipline === "run" && (a.average_speed ?? 0) < 6.45);
    const b = (bk?.distance_m ?? 0) / 1000, r = (rn?.distance_m ?? 0) / 1000, s = (sw?.distance_m ?? 0) / 1000;
    let kind: RaceKind | null = null;
    if (b >= 150 && b <= 200 && r >= 38 && r <= 45) kind = "full";
    else if (b >= 80 && b <= 100 && r >= 18 && r <= 23 && (s >= 1.5 || xs.some((a) => /transition/i.test(a.sport_type ?? "")))) kind = "half";
    else if (b >= 35 && b <= 45 && r >= 9 && r <= 11 && s >= 1.2 && s <= 1.9) kind = "olympic";
    else if (b >= 15 && b <= 25 && r >= 4 && r <= 6 && s >= 0.5 && s <= 0.9) kind = "sprint";
    else if (r >= 41 && r <= 43.5 && b < 30) kind = "marathon";
    else {
      const big = xs.find((a) => (a.moving_time_s ?? 0) > 9.5 * 3600 && (a.moving_time_s ?? 0) < 17 * 3600 && (a.distance_m ?? 0) < 1000);
      if (big) { out.push({ date, kind: "full_nosplit", name: null, swim: null, bike: null, run: null, transS: 0, totalS: big.moving_time_s }); }
      continue;
    }
    const named = xs.map((a) => (a.name ?? "").replace(/\s*-\s*(swim|bike|run|nuoto|bici|corsa|t1|t2)\s*$/i, "").trim()).find((n) => n && !GENERIC.test(n)) ?? null;
    const transS = xs.filter((a) => /transition/i.test(a.sport_type ?? "")).reduce((t, a) => t + (a.moving_time_s ?? a.elapsed_time_s ?? 0), 0);
    const L = { swim: kind === "marathon" ? null : leg(sw), bike: kind === "marathon" ? null : leg(bk), run: leg(rn) };
    const totalS = kind === "marathon" ? L.run!.s : L.swim && L.bike && L.run ? L.swim.s + L.bike.s + L.run.s + transS : null;
    out.push({ date, kind, name: named, ...L, transS, totalS });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface Trend { n: number; best: number | null; recent: number | null; bestDate: string | null }
function trend(xs: { date: string; v: number }[]): Trend {
  if (!xs.length) return { n: 0, best: null, recent: null, bestDate: null };
  const best = xs.reduce((m, x) => (x.v < m.v ? x : m));
  const last = [...xs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return { n: xs.length, best: best.v, bestDate: best.date, recent: last.reduce((t, x) => t + x.v, 0) / last.length };
}

/** Considerazioni sulla performance storica (full o 70.3, la distanza con più dati). */
export function performanceInsights(races: PastRace[]) {
  const fulls = races.filter((r) => r.kind === "full");
  const halves = races.filter((r) => r.kind === "half");
  const base = fulls.length >= halves.length ? fulls : halves;
  const dist: "full" | "half" = base === fulls ? "full" : "half";
  const runPace = trend(base.filter((r) => r.run && r.run.km > 0).map((r) => ({ date: r.date, v: r.run!.s / r.run!.km })));
  const bikeKmh = trend(base.filter((r) => r.bike && r.bike.s > 0).map((r) => ({ date: r.date, v: -(r.bike!.km / (r.bike!.s / 3600)) })));
  const swimPace = trend(base.filter((r) => r.swim && r.swim.km > 0.5).map((r) => ({ date: r.date, v: r.swim!.s / (r.swim!.km * 10) })).filter((x) => x.v >= 60 && x.v <= 240));
  const bikeW = base.filter((r) => r.bike?.w).slice(0, 2).map((r) => r.bike!.w!);
  // Velocità bici "di riferimento": le 2 migliori tra le ultime 5 gare (scarta i percorsi duri).
  const sp = base.filter((r) => r.bike && r.bike.s > 0).slice(0, 5).map((r) => r.bike!.km / (r.bike!.s / 3600)).sort((a, b) => b - a).slice(0, 2);
  const refBikeKmh = sp.length ? sp.reduce((a, b) => a + b, 0) / sp.length : null;
  return {
    dist, count: { full: fulls.length, half: halves.length, olympic: races.filter((r) => r.kind === "olympic").length, sprint: races.filter((r) => r.kind === "sprint").length, marathon: races.filter((r) => r.kind === "marathon").length },
    runPace, bikeKmh: { ...bikeKmh, best: bikeKmh.best != null ? -bikeKmh.best : null, recent: bikeKmh.recent != null ? -bikeKmh.recent : null },
    swimPace, recentBikeW: bikeW.length ? bikeW.reduce((a, b) => a + b, 0) / bikeW.length : null, refBikeKmh,
  };
}

export interface TargetRace { name: string; race_date: string; target_time: string | null; distance: "full" | "half" | "olympic" | "sprint"; swim_km?: number | null; bike_km?: number | null; bike_dplus_m?: number | null; run_km?: number | null; run_flat?: boolean | null; water_type?: string | null; heat_idx?: number | null; wind_idx?: number | null; slug?: string | null }
export interface Fit { ftp_watts: number | null; weight_kg: number | null; css_swim_s_per_100m: number | null; threshold_pace_run_s_per_km: number | null }

/** "sub 10:15", "10h15", "5:45" → secondi. */
export function parseTarget(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = v.match(/(\d{1,2})\s*[:h]\s*(\d{2})(?:\s*[:']\s*(\d{2}))?/i);
  if (!m) return null;
  return +m[1] * 3600 + +m[2] * 60 + (m[3] ? +m[3] : 0);
}

export interface Projection { input: CalcInput; proj: CalcResult; targetS: number | null; need: { k: number; res: CalcResult; input: CalcInput; reachable: boolean } | null; levers: Lever[]; basis: string[] }

/** Proiezione sulla gara obiettivo con il modello del calcolatore del sito. */
export function projectRace(t: TargetRace, fit: Fit, ins: ReturnType<typeof performanceInsights>): Projection {
  const d = DEFAULTS[t.distance];
  const heat = t.heat_idx ?? 1, wind = t.wind_idx ?? 1;
  const tempC = [16, 22, 27, 31][Math.max(0, Math.min(3, heat))];
  const water = (t.water_type === "mare" || t.water_type === "lago" || t.water_type === "fiume" ? t.water_type : "lago") as CalcInput["water"];
  const basis: string[] = [];
  const ftp = fit.ftp_watts ?? 220;
  // Bici: dalla velocità reale delle ultime gare (include posizione, drafting legale, pacing);
  // senza storico, dal 70% circa di FTP.
  const useSpeed = ins.dist === t.distance && ins.refBikeKmh != null;
  const watts = ftp * d.ifPct;
  basis.push(useSpeed ? `bici: ${ins.refBikeKmh!.toFixed(1)} km/h, media delle 2 migliori tra le ultime 5 gare` : `bici: ${Math.round(watts)} W (${Math.round(d.ifPct * 100)}% di FTP ${ftp})`);
  const css = fit.css_swim_s_per_100m ?? 120;
  basis.push(`nuoto: CSS ${Math.floor(css / 60)}:${String(Math.round(css % 60)).padStart(2, "0")}/100 m`);
  // Corsa "a gambe fresche": dal ritmo medio delle ultime gare togliamo la fatica tipica della distanza.
  let runFresh: number;
  if (ins.dist === t.distance && ins.runPace.recent) {
    runFresh = ins.runPace.recent / (1 + (t.distance === "full" ? 0.1 : 0.05));
    basis.push(`corsa: dal ritmo medio delle ultime ${Math.min(3, ins.runPace.n)} maratone in gara`);
  } else {
    runFresh = (fit.threshold_pace_run_s_per_km ?? 300) * (t.distance === "full" ? 1.12 : 1.06);
    basis.push("corsa: dalla soglia di corsa del profilo");
  }
  const input: CalcInput = {
    swimM: (t.swim_km ?? d.swimM / 1000) * 1000, bikeKm: t.bike_km ?? d.bikeKm, bikeDplus: t.bike_dplus_m ?? d.bikeDplus,
    runKm: t.run_km ?? d.runKm, runDplus: t.run_flat === false ? 300 : d.runDplus, water,
    swimPace100: css, wetsuit: !(heat >= 2 && water !== "lago"), chop: water === "mare" ? 1 : 0, crowd: 1,
    bikeMode: useSpeed ? "speed" : "power", bikeSpeedFlat: useSpeed ? ins.refBikeKmh! : 34, bikeWatts: watts, ftp, ifPct: d.ifPct,
    massKg: fit.weight_kg ?? 75, bikeKg: 9, cda: 0.3, crr: 0.004, descMaxKmh: 60, windKmh: useSpeed ? 0 : wind * 4, // la velocità reale di gara include già il vento
    runPaceKm: runFresh, tempC, altitudeM: 0, acclimated: false, t1: d.t1, t2: d.t2,
  };
  const proj = compute(input);
  const targetS = parseTarget(t.target_time);
  const need = targetS ? solveTarget(input, targetS) : null;
  return { input, proj, targetS, need, levers: levers(input).slice(0, 5), basis };
}

/** Testo per il coach AI (contesto del piano). */
export function raceHistoryText(races: PastRace[], ins: ReturnType<typeof performanceInsights>, p: Projection | null): string {
  const f = (s: number | null | undefined) => (s == null ? "—" : `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`);
  const pace = (s: number | null) => (s == null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
  const top = races.filter((r) => r.kind === "full" || r.kind === "half").slice(0, 8)
    .map((r) => `${r.date} ${r.kind === "full" ? "full" : "70.3"}${r.name ? ` (${r.name})` : ""}: nuoto ${f(r.swim?.s)}, bici ${f(r.bike?.s)}${r.bike?.w ? ` ${Math.round(r.bike.w)}W` : ""}, corsa ${f(r.run?.s)}`).join("; ");
  const lines = [
    `STORICO GARE RICOSTRUITO: ${ins.count.full} full, ${ins.count.half} 70.3, ${ins.count.olympic} olimpici, ${ins.count.sprint} sprint, ${ins.count.marathon} maratone.${top ? ` Ultime: ${top}.` : ""}`,
    ins.runPace.n ? `CORSA IN GARA (${ins.dist}): migliore ${pace(ins.runPace.best)}/km (${ins.runPace.bestDate}), media ultime 3 ${pace(ins.runPace.recent)}/km.` : "",
    ins.bikeKmh.n ? `BICI IN GARA (${ins.dist}): migliore ${ins.bikeKmh.best?.toFixed(1)} km/h, media ultime ${ins.bikeKmh.recent?.toFixed(1)} km/h.` : "",
  ];
  if (p) {
    lines.push(`PROIEZIONE GARA A (modello calcolatore): ${f(p.proj.totalS)} (nuoto ${f(p.proj.swimS)}, bici ${f(p.proj.bikeS)}, corsa ${f(p.proj.runS)}).`);
    if (p.need && p.targetS) lines.push(`PER L'OBIETTIVO ${f(p.targetS)}: servono nuoto ${pace(p.need.res.swimPaceOw100)}/100 m, bici ${Math.round(p.need.res.watts)} W, corsa ${pace(p.need.res.runPaceEff)}/km effettivi${p.need.reachable ? "" : " (fuori portata con questi dati)"}. Il miglioramento richiesto va distribuito sulla disciplina con più margine.`);
  }
  return lines.filter(Boolean).join("\n");
}

/** Tutto in uno: gare ricostruite, considerazioni e proiezione sulla gara A. */
export async function athletePerformance(db: SupabaseClient, athleteId: string) {
  const [acts, { data: racesD }, { data: fitD }] = await Promise.all([
    loadAllActivities(db, athleteId),
    db.from("races").select("name, race_date, target_time, priority, distance_label").eq("athlete_id", athleteId).gte("race_date", new Date().toISOString().slice(0, 10)).order("race_date"),
    db.from("athlete_fitness").select("ftp_watts, weight_kg, css_swim_s_per_100m, threshold_pace_run_s_per_km").eq("athlete_id", athleteId).maybeSingle(),
  ]);
  const races = detectRaces(acts);
  const ins = performanceInsights(races);
  const rs = (racesD ?? []) as { name: string; race_date: string; target_time: string | null; priority: string | null; distance_label: string | null }[];
  const main = rs.find((r) => r.priority === "A") ?? rs[0] ?? null;
  let target: TargetRace | null = null;
  if (main) {
    const { data: ev } = await db
      .from("event_races")
      .select("slug, distance, swim_km, bike_km, bike_dplus_m, run_km, run_flat, water_type, heat_idx, wind_idx, official_name, race_date")
      .eq("race_date", main.race_date)
      .limit(5);
    const evs = (ev ?? []) as (Omit<TargetRace, "name" | "race_date" | "target_time" | "distance"> & { distance: string; official_name: string | null })[];
    const e = evs.find((x) => (x.official_name ?? "").toLowerCase() === main.name.toLowerCase()) ?? evs.find((x) => (main.distance_label ?? "").includes("226") ? x.distance === "full" : x.distance === "half") ?? null;
    const lbl = (main.distance_label ?? "").toLowerCase();
    const dist = (e?.distance as TargetRace["distance"]) ?? (lbl.includes("70.3") || lbl.includes("half") ? "half" : lbl.includes("olimp") ? "olympic" : lbl.includes("sprint") ? "sprint" : "full");
    target = { ...(e ?? {}), name: main.name, race_date: main.race_date, target_time: main.target_time, distance: dist };
  }
  const fit = (fitD ?? { ftp_watts: null, weight_kg: null, css_swim_s_per_100m: null, threshold_pace_run_s_per_km: null }) as Fit;
  const projection = target ? projectRace(target, fit, ins) : null;
  return { races, ins, target, projection, text: raceHistoryText(races, ins, projection) };
}
