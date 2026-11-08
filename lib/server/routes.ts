// ============================================================================
// Percorsi abituali dell'atleta (24/7 Coach).
//  1) syncTracks: per le attività outdoor (corsa/bici) senza traccia, scarica
//     la mappa da Intervals, la semplifica (~120 punti) e la salva.
//  2) rebuildRouteCatalog: raggruppa le tracce simili (sport, partenza entro
//     ~600 m, distanza ±12%, dislivello ±25%) in "percorsi" con nome, volte
//     fatto, tempo tipico. È il catalogo che il coach usa per suggerire dove
//     fare ogni seduta.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { getActivityMap, type IntervalsConn } from "@/lib/intervals/api";

type LatLng = [number, number];

interface ActRow {
  id: string;
  icu_activity_id: string;
  name: string | null;
  sport_type: string | null;
  start_date: string | null;
  distance_m: number | null;
  moving_time_s: number | null;
  total_elevation_gain: number | null;
  trainer: boolean | null;
}

export function routeSport(t: string | null): "run" | "bike" | null {
  const s = (t ?? "").toLowerCase();
  if (s.includes("virtual")) return null;
  if (s.includes("run") || s.includes("hike") || s.includes("walk")) return "run";
  if (s.includes("ride") || s.includes("bike") || s.includes("cycl")) return "bike";
  return null;
}

/** Distanza in metri tra due coordinate (haversine). */
export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Toglie i null e campiona uniformemente a `n` punti. */
export function simplify(latlngs: (LatLng | null)[], n = 120): LatLng[] {
  const pts = latlngs.filter((p): p is LatLng => Array.isArray(p) && p.length === 2);
  if (pts.length <= n) return pts.map((p) => [Number(p[0].toFixed(5)), Number(p[1].toFixed(5))]);
  const out: LatLng[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[Math.round((i * (pts.length - 1)) / (n - 1))];
    out.push([Number(p[0].toFixed(5)), Number(p[1].toFixed(5))]);
  }
  return out;
}

/**
 * Scarica le tracce mancanti (ultimi `days` giorni, max `limit` chiamate per
 * esecuzione così il cron resta sotto il timeout). Idempotente.
 */
export async function syncTracks(
  admin: SupabaseClient,
  athleteId: string,
  conn: IntervalsConn,
  opts: { days?: number; limit?: number } = {},
): Promise<{ fetched: number; skipped: number }> {
  const days = opts.days ?? 400;
  const limit = opts.limit ?? 60;
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data: acts } = await admin
    .from("icu_activities")
    .select("id, icu_activity_id, name, sport_type, start_date, distance_m, moving_time_s, total_elevation_gain, trainer").eq("is_duplicate" as never, false as never)
    .eq("athlete_id", athleteId)
    .gte("start_date", from)
    .order("start_date", { ascending: false });
  const { data: have } = await admin
    .from("icu_activity_tracks")
    .select("activity_id")
    .eq("athlete_id", athleteId);
  const haveSet = new Set(((have ?? []) as { activity_id: string }[]).map((r) => r.activity_id));

  let fetched = 0;
  let skipped = 0;
  for (const a of (acts ?? []) as unknown as ActRow[]) {
    if (fetched >= limit) break;
    if (haveSet.has(a.id) || a.trainer || !routeSport(a.sport_type) || (a.distance_m ?? 0) < 2000) {
      skipped++;
      continue;
    }
    const map = await getActivityMap(conn, a.icu_activity_id);
    const pts = map ? simplify(map.latlngs) : [];
    if (pts.length < 10) {
      // niente GPS (indoor, orologio senza fix): segna come vuota per non riprovare
      await admin.from("icu_activity_tracks").upsert(
        { activity_id: a.id, athlete_id: athleteId, points: [], n_points: 0, bounds: null } as never,
        { onConflict: "activity_id" },
      );
      fetched++;
      continue;
    }
    await admin.from("icu_activity_tracks").upsert(
      {
        activity_id: a.id,
        athlete_id: athleteId,
        start_lat: pts[0][0],
        start_lng: pts[0][1],
        bounds: map?.bounds ?? null,
        points: pts,
        n_points: pts.length,
      } as never,
      { onConflict: "activity_id" },
    );
    fetched++;
  }
  return { fetched, skipped };
}

function terrainOf(sport: "run" | "bike", km: number, dplus: number): string {
  const r = km > 0 ? dplus / km : 0;
  if (sport === "run") return r > 45 ? "montagna" : r > 15 ? "collina" : "pianura";
  return r > 18 ? "montagna" : r > 7 ? "collina" : "pianura";
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Nome "pulito": via i prefissi automatici Garmin/Strava. */
function cleanName(n: string | null): string | null {
  if (!n) return null;
  const s = n.replace(/^(morning|afternoon|evening|lunch|night)\s+/i, "").trim();
  if (/^(corsa|corsa trail|trail run|run|giro|ride|ciclismo su strada|pedalata mattutina|sessione di trail running mattutina|allenamento)$/i.test(s)) return null;
  return s;
}

/** Località della partenza (Nominatim, best-effort, solo per i percorsi nuovi). */
async function placeName(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`,
      { headers: { "User-Agent": "247coach/1.0 (training app)" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { address?: Record<string, string> };
    const a = j.address ?? {};
    return a.village || a.town || a.city || a.municipality || a.hamlet || a.county || null;
  } catch {
    return null;
  }
}

/** Ricostruisce il catalogo dei percorsi dalle tracce. */
export async function rebuildRouteCatalog(
  admin: SupabaseClient,
  athleteId: string,
  opts: { prune?: boolean } = {},
): Promise<number> {
  const { data: tr } = await admin
    .from("icu_activity_tracks")
    .select("activity_id, start_lat, start_lng, bounds, points, n_points")
    .eq("athlete_id", athleteId)
    .gt("n_points", 9);
  const tracks = (tr ?? []) as unknown as {
    activity_id: string; start_lat: number; start_lng: number; bounds: unknown; points: LatLng[]; n_points: number;
  }[];
  if (!tracks.length) return 0;
  const { data: ar } = await admin
    .from("icu_activities")
    .select("id, name, sport_type, start_date, distance_m, moving_time_s, total_elevation_gain").eq("is_duplicate" as never, false as never)
    .in("id", tracks.map((t) => t.activity_id));
  const actById = new Map(((ar ?? []) as unknown as ActRow[]).map((a) => [a.id, a]));

  type Item = { t: (typeof tracks)[number]; a: ActRow; sport: "run" | "bike"; km: number; dplus: number };
  const items: Item[] = [];
  for (const t of tracks) {
    const a = actById.get(t.activity_id);
    const sport = a ? routeSport(a.sport_type) : null;
    if (!a || !sport) continue;
    items.push({ t, a, sport, km: (a.distance_m ?? 0) / 1000, dplus: a.total_elevation_gain ?? 0 });
  }
  items.sort((x, y) => (y.a.start_date ?? "").localeCompare(x.a.start_date ?? ""));

  // clustering greedy: ogni item va nel primo gruppo compatibile
  const groups: Item[][] = [];
  for (const it of items) {
    const g = groups.find((grp) => {
      const r = grp[0];
      if (r.sport !== it.sport) return false;
      if (haversineM([r.t.start_lat, r.t.start_lng], [it.t.start_lat, it.t.start_lng]) > 600) return false;
      if (Math.abs(r.km - it.km) > Math.max(1, r.km * 0.12)) return false;
      if (Math.abs(r.dplus - it.dplus) > Math.max(80, r.dplus * 0.25)) return false;
      return true;
    });
    if (g) g.push(it);
    else groups.push([it]);
  }

  // Catalogo stabile: un gruppo che corrisponde a un percorso già esistente
  // (stesso sport, partenza vicina, distanza/dislivello simili) ne conserva
  // l'id, così le sedute pianificate non perdono il link al percorso.
  const { data: exData } = await admin
    .from("athlete_routes")
    .select("id, sport, distance_km, elevation_m, start_lat, start_lng")
    .eq("athlete_id", athleteId);
  const existing = ((exData ?? []) as {
    id: string; sport: string; distance_km: number; elevation_m: number; start_lat: number; start_lng: number;
  }[]).map((e) => ({ ...e, used: false }));

  let n = 0;
  let geocoded = 0;
  for (const g of groups) {
    const rep = g[0]; // la più recente
    const km = median(g.map((x) => x.km)) ?? rep.km;
    const dplus = median(g.map((x) => x.dplus)) ?? rep.dplus;
    const mins = median(g.map((x) => (x.a.moving_time_s ?? 0) / 60).filter((m) => m > 0));
    const names = g.map((x) => cleanName(x.a.name)).filter((s): s is string => !!s);
    const freq = new Map<string, number>();
    for (const s of names) freq.set(s, (freq.get(s) ?? 0) + 1);
    const best = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const terrain = terrainOf(rep.sport, km, dplus);
    const generic = `${rep.sport === "run" ? "Anello" : "Giro"} ${Math.round(km)} km ${terrain}${dplus > 100 ? ` D+${Math.round(dplus)}` : ""}`;
    const row = {
      athlete_id: athleteId,
      sport: rep.sport,
      distance_km: Number(km.toFixed(1)),
      elevation_m: Math.round(dplus),
      typical_minutes: mins != null ? Math.round(mins) : null,
      times_done: g.length,
      last_done: rep.a.start_date ? rep.a.start_date.slice(0, 10) : null,
      start_lat: rep.t.start_lat,
      start_lng: rep.t.start_lng,
      bounds: rep.t.bounds,
      points: rep.t.points,
      sample_activity_id: rep.a.id,
      terrain,
      updated_at: new Date().toISOString(),
    };
    const match = existing.find(
      (e) =>
        !e.used &&
        e.sport === rep.sport &&
        haversineM([e.start_lat, e.start_lng], [rep.t.start_lat, rep.t.start_lng]) <= 600 &&
        Math.abs(Number(e.distance_km) - km) <= Math.max(1, km * 0.12) &&
        Math.abs(Number(e.elevation_m) - dplus) <= Math.max(80, dplus * 0.25),
    );
    if (match) {
      match.used = true;
      // il nome resta quello esistente (può essere stato curato a mano)
      const { error } = await admin.from("athlete_routes").update(row as never).eq("id", match.id);
      if (!error) n++;
    } else {
      let name = best ?? generic;
      if (geocoded < 40) {
        geocoded++;
        const place = await placeName(rep.t.start_lat, rep.t.start_lng);
        if (place && !name.toLowerCase().includes(place.toLowerCase())) name = `${place} · ${name}`;
        await new Promise((r) => setTimeout(r, 1100)); // rate limit Nominatim
      }
      const { error } = await admin.from("athlete_routes").insert({ ...row, name } as never);
      if (!error) n++;
    }
  }
  // Si potano i percorsi non più ritrovati solo nel backfill completo: con le
  // tracce ancora parziali (cron incrementale) resterebbero fuori per caso.
  if (opts.prune) {
    const stale = existing.filter((e) => !e.used).map((e) => e.id);
    if (stale.length) await admin.from("athlete_routes").delete().in("id", stale);
  }
  return n;
}

export interface RouteRow {
  id: string;
  sport: "run" | "bike";
  name: string;
  distance_km: number;
  elevation_m: number;
  typical_minutes: number | null;
  times_done: number;
  last_done: string | null;
  terrain: string | null;
  points?: LatLng[];
}

export async function listRoutes(db: SupabaseClient, athleteId: string, withPoints = false): Promise<RouteRow[]> {
  const { data } = await db
    .from("athlete_routes")
    .select(`id, sport, name, distance_km, elevation_m, typical_minutes, times_done, last_done, terrain${withPoints ? ", points" : ""}`)
    .eq("athlete_id", athleteId)
    .order("times_done", { ascending: false });
  return (data ?? []) as unknown as RouteRow[];
}

/** Catalogo come testo per il prompt del coach (ordinato per frequenza). */
export function routesText(routes: RouteRow[]): string {
  if (!routes.length) return "nessun percorso GPS disponibile";
  return routes
    .slice(0, 40)
    .map(
      (r) =>
        `  [${r.id}] ${r.sport === "run" ? "CORSA" : "BICI"} · ${r.name} · ${r.distance_km} km · D+${r.elevation_m} m · ${r.terrain ?? ""}${
          r.typical_minutes ? ` · ~${Math.round(r.typical_minutes)}'` : ""
        } · fatto ${r.times_done}x${r.last_done ? ` (ultimo ${r.last_done})` : ""}`,
    )
    .join("\n");
}
