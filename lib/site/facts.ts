// ============================================================================
// "Fatti" di ogni gara per le pagine per ricerca: coordinate, meteo storico e
// temperatura dell'acqua nel giorno gara, meccanici/negozi bici vicini,
// iscrizione/prezzi/slot/cut-off dalla pagina ufficiale, risultati e
// vincitori per categoria dell'ultima edizione. Tutto in event_race_facts,
// riempito a lotti da /api/site/facts-backfill e rinfrescato periodicamente.
// Fonti: Open-Meteo (meteo/acqua, CC BY 4.0), OpenStreetMap (negozi, ODbL),
// sito ufficiale della gara, CoachCox imstats (tempi ufficiali).
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateStructured, TRANSLATE_MODEL } from "@/lib/ai/claude";
import { COACHCOX } from "@/lib/site/magazine";
import type { Race } from "@/lib/site/races";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 247coachai.com";
const j = async (url: string, init?: RequestInit) => {
  const r = await fetch(url, { ...init, headers: { "user-agent": UA, ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(25_000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

// ---------------------------------------------------------------- tipi
export interface Climate {
  years: number; window_days: number; month_day: string;
  tmax_avg: number; tmin_avg: number; tmax_hi: number; tmin_lo: number;
  rain_days_pct: number; precip_avg_mm: number; wind_avg_kmh: number; gust_avg_kmh: number; humidity_avg: number | null;
  by_year: { year: number; tmax: number; tmin: number; precip: number; wind: number; gust: number }[];
  source: string;
}
export interface Water { avg_c: number; min_c: number; max_c: number; years: number[]; source: string }
export interface BikeShop { name: string; address: string | null; website: string | null; phone: string | null; hours: string | null; repair: boolean; rental: boolean; km: number; lat: number; lon: number }
export interface Official {
  status: string | null; opens_at: string | null; register_url: string | null;
  price_tiers: { name: string; price: number | null; currency: string | null; notes: string | null }[];
  options: { name: string; description: string | null; url: string | null }[];
  slots: { championship: string | null; year: number | null; total: number | null; notes: string | null } | null;
  cutoffs: { name: string; time: string; notes: string | null }[];
  start_times: { label: string; time: string }[];
  temps: { air_high_c: number | null; air_low_c: number | null; water_c: number | null };
  wetsuit_note: string | null; transfer_policy: string | null; athlete_guide_url: string | null;
  pages: string[];
}
export interface Finisher { name: string; country?: string; div: string; time: string; secs: number; pos?: number }
export interface Results {
  year: number; race_name: string; url: string; source: string;
  starters: number; finishers: number; dnf: number; dns: number;
  overall: { M: Finisher[]; F: Finisher[] };
  ag: Finisher[];
  median: { M: string | null; F: string | null };
  slots_note: string | null;
}

// ---------------------------------------------------------------- geo
export async function geocode(r: Pick<Race, "city" | "country" | "name">): Promise<{ lat: number; lon: number; label: string } | null> {
  for (const q of [r.city, r.name].filter(Boolean) as string[]) {
    const d = await j(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=it&format=json`).catch(() => null);
    const res = (d?.results ?? []) as { latitude: number; longitude: number; name: string; country?: string; admin1?: string }[];
    if (!res.length) continue;
    const hit = res.find((x) => r.country && x.country?.toLowerCase() === r.country.toLowerCase()) ?? res[0];
    return { lat: hit.latitude, lon: hit.longitude, label: [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ") };
  }
  return null;
}

// ---------------------------------------------------------------- meteo storico
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const r1 = (x: number) => Math.round(x * 10) / 10;

export async function climateFor(lat: number, lon: number, raceDate: string): Promise<Climate | null> {
  const md = raceDate.slice(5, 10);
  const now = new Date();
  const lastYear = now.getUTCFullYear() - 1;
  const firstYear = lastYear - 9;
  const d = await j(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${firstYear}-01-01&end_date=${lastYear}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,relative_humidity_2m_mean&timezone=auto`);
  const D = d?.daily as Record<string, (number | null)[]> & { time: string[] };
  if (!D?.time?.length) return null;
  const W = 3; // ±3 giorni attorno alla data gara
  const inWin = (iso: string) => {
    const y = Number(iso.slice(0, 4));
    const target = Date.UTC(y, Number(md.slice(0, 2)) - 1, Number(md.slice(3, 5)));
    return Math.abs(Date.parse(`${iso}T00:00:00Z`) - target) <= W * 864e5;
  };
  const idx = D.time.map((t, i) => (inWin(t) ? i : -1)).filter((i) => i >= 0);
  const val = (k: string) => idx.map((i) => D[k]?.[i]).filter((x): x is number => typeof x === "number");
  const tmax = val("temperature_2m_max"), tmin = val("temperature_2m_min"), pr = val("precipitation_sum"), wd = val("wind_speed_10m_max"), gu = val("wind_gusts_10m_max"), hu = val("relative_humidity_2m_mean");
  if (!tmax.length) return null;
  const byYear: Climate["by_year"] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    const i = D.time.indexOf(`${y}-${md}`);
    if (i < 0) continue;
    const g = (k: string) => Number(D[k]?.[i] ?? NaN);
    byYear.push({ year: y, tmax: r1(g("temperature_2m_max")), tmin: r1(g("temperature_2m_min")), precip: r1(g("precipitation_sum")), wind: Math.round(g("wind_speed_10m_max")), gust: Math.round(g("wind_gusts_10m_max")) });
  }
  return {
    years: lastYear - firstYear + 1, window_days: W, month_day: md,
    tmax_avg: r1(avg(tmax)), tmin_avg: r1(avg(tmin)), tmax_hi: r1(Math.max(...tmax)), tmin_lo: r1(Math.min(...tmin)),
    rain_days_pct: Math.round((pr.filter((x) => x >= 1).length / pr.length) * 100), precip_avg_mm: r1(avg(pr)),
    wind_avg_kmh: Math.round(avg(wd)), gust_avg_kmh: Math.round(avg(gu)), humidity_avg: hu.length ? Math.round(avg(hu)) : null,
    by_year: byYear.reverse(), source: "Open-Meteo Historical Weather API (ERA5)",
  };
}

// ---------------------------------------------------------------- acqua (mare)
export async function waterFor(lat: number, lon: number, raceDate: string): Promise<Water | null> {
  const md = raceDate.slice(5, 10);
  const y0 = new Date().getUTCFullYear() - 1;
  const vals: number[] = [];
  const years: number[] = [];
  for (const y of [y0, y0 - 1, y0 - 2]) {
    const c = Date.UTC(y, Number(md.slice(0, 2)) - 1, Number(md.slice(3, 5)));
    const s = new Date(c - 3 * 864e5).toISOString().slice(0, 10), e = new Date(c + 3 * 864e5).toISOString().slice(0, 10);
    const d = await j(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=sea_surface_temperature&start_date=${s}&end_date=${e}&timezone=auto`).catch(() => null);
    const t = ((d?.hourly?.sea_surface_temperature ?? []) as (number | null)[]).filter((x): x is number => typeof x === "number");
    if (t.length) { vals.push(...t); years.push(y); }
  }
  if (!vals.length) return null;
  return { avg_c: r1(avg(vals)), min_c: r1(Math.min(...vals)), max_c: r1(Math.max(...vals)), years, source: "Open-Meteo Marine API" };
}

// ---------------------------------------------------------------- negozi/meccanici bici (OSM)
function kmBetween(a: number, b: number, c: number, d: number) {
  const R = 6371, toR = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(toR(c - a) / 2) ** 2 + Math.cos(toR(a)) * Math.cos(toR(c)) * Math.sin(toR(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export async function bikeShopsNear(lat: number, lon: number, radiusM = 25000): Promise<BikeShop[]> {
  const q = `[out:json][timeout:25];(nwr["shop"="bicycle"](around:${radiusM},${lat},${lon});nwr["amenity"="bicycle_repair_station"](around:${Math.min(radiusM, 8000)},${lat},${lon}););out center tags 80;`;
  const d = await j("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: q }), headers: { "content-type": "application/x-www-form-urlencoded" } });
  const els = (d?.elements ?? []) as { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
  const shops: BikeShop[] = [];
  for (const e of els) {
    const t = e.tags ?? {};
    const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
    if (la == null || lo == null) continue;
    const station = t.amenity === "bicycle_repair_station";
    const name = t.name ?? (station ? "Bicycle repair station" : null);
    if (!name) continue;
    const addr = [t["addr:street"] ? `${t["addr:street"]} ${t["addr:housenumber"] ?? ""}`.trim() : null, [t["addr:postcode"], t["addr:city"]].filter(Boolean).join(" ") || null].filter(Boolean).join(", ") || null;
    shops.push({
      name, address: addr, website: t.website ?? t["contact:website"] ?? null, phone: t.phone ?? t["contact:phone"] ?? null, hours: t.opening_hours ?? null,
      repair: station || t["service:bicycle:repair"] === "yes", rental: t["service:bicycle:rental"] === "yes" || t.rental === "yes",
      km: r1(kmBetween(lat, lon, la, lo)), lat: la, lon: lo,
    });
  }
  return shops.sort((a, b) => a.km - b.km).slice(0, 20);
}

// ---------------------------------------------------------------- pagina ufficiale
function htmlText(h: string): string {
  return h
    .replace(/<(script|style|noscript|svg|form|select)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => ` ${txt.replace(/<[^>]+>/g, " ").trim()} [${href}] `)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#039;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
const OFFICIAL_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["status", "opens_at", "register_url", "price_tiers", "options", "slots", "cutoffs", "start_times", "temps", "wetsuit_note", "transfer_policy", "athlete_guide_url"],
  properties: {
    status: { type: ["string", "null"], description: "Stato iscrizioni come scritto (es. 'Registration Sold Out', 'Registration Opening Soon', 'Open')" },
    opens_at: { type: ["string", "null"], description: "Data/ora di apertura iscrizioni se indicata" },
    register_url: { type: ["string", "null"] },
    price_tiers: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "price", "currency", "notes"], properties: { name: { type: "string" }, price: { type: ["number", "null"] }, currency: { type: ["string", "null"] }, notes: { type: ["string", "null"] } } } },
    options: { type: "array", description: "Pacchetti/opzioni di iscrizione (IRONMAN Access, VIP, NIRVANA, charity, Flex...) con link", items: { type: "object", additionalProperties: false, required: ["name", "description", "url"], properties: { name: { type: "string" }, description: { type: ["string", "null"] }, url: { type: ["string", "null"] } } } },
    slots: { type: ["object", "null"], additionalProperties: false, required: ["championship", "year", "total", "notes"], properties: { championship: { type: ["string", "null"] }, year: { type: ["integer", "null"] }, total: { type: ["integer", "null"] }, notes: { type: ["string", "null"] } } },
    cutoffs: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "time", "notes"], properties: { name: { type: "string" }, time: { type: "string" }, notes: { type: ["string", "null"] } } } },
    start_times: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "time"], properties: { label: { type: "string" }, time: { type: "string" } } } },
    temps: { type: "object", additionalProperties: false, required: ["air_high_c", "air_low_c", "water_c"], properties: { air_high_c: { type: ["number", "null"] }, air_low_c: { type: ["number", "null"] }, water_c: { type: ["number", "null"] } } },
    wetsuit_note: { type: ["string", "null"] },
    transfer_policy: { type: ["string", "null"] },
    athlete_guide_url: { type: ["string", "null"] },
  },
} as const;

export async function officialInfo(baseUrl: string): Promise<Official | null> {
  const base = baseUrl.replace(/\/+$/, "");
  const paths = ["", "/register", "/world-championship-qualification", "/schedule", "/pre-race-info", "/faqs"];
  const parts: string[] = [];
  const pages: string[] = [];
  for (const p of paths) {
    const url = `${base}${p}`;
    const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en" }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
    if (!r?.ok) continue;
    const txt = htmlText(await r.text()).slice(0, 14_000);
    if (txt.length < 200) continue;
    parts.push(`### ${url}\n${txt}`);
    pages.push(url);
  }
  if (!parts.length) return null;
  const res = await generateStructured<Omit<Official, "pages">>({
    system: "Estrai dati di fatto dalle pagine ufficiali di una gara di triathlon. Riporta SOLO quello che è scritto nelle pagine (prezzi, valute, date, slot, cut-off, orari, temperature, link). Se un dato non c'è usa null o lista vuota. Non inventare. I link vanno riportati completi (assoluti).",
    prompt: parts.join("\n\n").slice(0, 60_000),
    schema: OFFICIAL_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 4000,
    effort: "low",
    model: TRANSLATE_MODEL,
  });
  if (!res.ok || !res.data) throw new Error(res.error ?? "estrazione fallita");
  return { ...res.data, pages };
}

// ---------------------------------------------------------------- risultati (CoachCox)
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ironman|70\.3|\b703\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

let seriesCache: { half: boolean; id: number; name: string }[] | null = null;
async function coachcoxSeries() {
  if (seriesCache) return seriesCache;
  const out: { half: boolean; id: number; name: string }[] = [];
  for (const [path, half] of [["im", false], ["703", true]] as const) {
    const h = await fetch(`https://www.coachcox.co.uk/imstats/${path}/`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25_000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
    for (const m of h.matchAll(/href="[^"]*\/imstats\/series\/(\d+)\/?"[^>]*>([\s\S]*?)<\/a>/g)) {
      const name = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (name) out.push({ half, id: Number(m[1]), name });
    }
  }
  seriesCache = out;
  return out;
}

export async function findCoachcoxSeries(r: Pick<Race, "name" | "city" | "distance">): Promise<number | null> {
  const all = (await coachcoxSeries()).filter((s) => s.half === (r.distance === "half"));
  const keys = [norm(r.name), norm(r.city ?? "")].filter(Boolean);
  const exact = all.find((s) => keys.includes(norm(s.name)));
  if (exact) return exact.id;
  const part = all.find((s) => keys.some((k) => k.length > 3 && (norm(s.name).includes(k) || k.includes(norm(s.name)))));
  return part?.id ?? null;
}

export async function latestCoachcoxRace(seriesId: number): Promise<{ raceId: number; year: number; slotsNote: string | null } | null> {
  const h = await fetch(`https://www.coachcox.co.uk/imstats/series/${seriesId}/`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25_000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  const races = [...h.matchAll(/\/imstats\/race\/(\d+)\/[^"]*"[^>]*>[^<]*?(20\d\d)/g)].map((m) => ({ id: Number(m[1]), year: Number(m[2]) }));
  if (!races.length) return null;
  const best = races.sort((a, b) => b.year - a.year || b.id - a.id)[0];
  const q = /Qualification\s*<[^>]*>?\s*([0-9]+)\s*(?:<[^>]*>\s*)*for\s*(20\d\d)/i.exec(h);
  return { raceId: best.id, year: best.year, slotsNote: q ? `${q[1]} slots (${q[2]})` : null };
}

interface CcRow { n: string; c?: string; g?: string; di?: string; fs?: string; ot?: number | string }
const hms = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export async function resultsFor(raceId: number, year: number, raceName: string, slotsNote: string | null): Promise<Results | null> {
  const res = await fetch(COACHCOX(raceId), { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return null;
  const jj = (await res.json()) as CcRow[] | { data?: CcRow[] };
  const rows: CcRow[] = Array.isArray(jj) ? jj : (jj.data ?? []);
  if (!rows.length) return null;
  const t = (x: CcRow) => Number(x.ot);
  const fin = rows.filter((x) => x.fs === "FIN" && t(x) > 0);
  const toF = (x: CcRow, pos?: number): Finisher => ({ name: x.n, country: x.c, div: x.di ?? "", time: hms(t(x)), secs: t(x), pos });
  const top = (g: "M" | "F") => {
    const pro = fin.filter((x) => x.di === `${g}PRO`).sort((a, b) => t(a) - t(b));
    const pool = pro.length ? pro : fin.filter((x) => (x.g ?? x.di?.[0]) === g).sort((a, b) => t(a) - t(b));
    return pool.slice(0, 3).map((x, i) => toF(x, i + 1));
  };
  const by = new Map<string, CcRow>();
  for (const x of fin.filter((y) => y.di && /^[MF]\d\d/.test(y.di))) { const c = by.get(x.di as string); if (!c || t(x) < t(c)) by.set(x.di as string, x); }
  const median = (g: "M" | "F") => {
    const s = fin.filter((x) => (x.di?.[0] ?? x.g) === g && !/PRO/.test(x.di ?? "")).map(t).sort((a, b) => a - b);
    return s.length ? hms(s[Math.floor(s.length / 2)]) : null;
  };
  return {
    year, race_name: raceName, url: `https://www.coachcox.co.uk/imstats/race/${raceId}/results/`, source: "CoachCox imstats (tempi ufficiali)",
    starters: rows.filter((x) => x.fs !== "DNS").length, finishers: fin.length, dnf: rows.filter((x) => x.fs === "DNF").length, dns: rows.filter((x) => x.fs === "DNS").length,
    overall: { M: top("M"), F: top("F") },
    ag: [...by.values()].sort((a, b) => (a.di as string).localeCompare(b.di as string)).map((x) => toF(x)),
    median: { M: median("M"), F: median("F") },
    slots_note: slotsNote,
  };
}

// ---------------------------------------------------------------- un passo di backfill per gara
type Facts = Record<string, unknown> & { race_id: string };
const DAY = 864e5;
const old = (at: unknown, days: number) => !at || Date.now() - Date.parse(String(at)) > days * DAY;

export async function stepFacts(admin: SupabaseClient, r: Race, f: Facts | null, officialUrl: string | null): Promise<string | null> {
  const row: Facts = { ...(f ?? {}), race_id: r.id };
  const errs = ((f?.errors as Record<string, string> | undefined) ?? {}) as Record<string, string>;
  const save = async (patch: Record<string, unknown>, step: string) => {
    const { error } = await admin.from("event_race_facts").upsert({ ...patch, race_id: r.id, errors: errs, updated_at: new Date().toISOString() }, { onConflict: "race_id" });
    if (error) throw new Error(error.message);
    return step;
  };
  // In caso di errore si riprova il giorno dopo (non a fine periodo).
  const PERIOD: Record<string, [string, number]> = { geo: ["geo_at", 30], climate: ["climate_at", 365], water: ["water_at", 365], shops: ["shops_at", 90], official: ["official_at", 30], results: ["results_at", 30] };
  const fail = async (step: string, e: unknown) => {
    errs[step] = `${new Date().toISOString().slice(0, 10)} ${(e as Error).message}`.slice(0, 300);
    const p = PERIOD[step];
    const patch: Record<string, unknown> = { race_id: r.id, errors: errs, updated_at: new Date().toISOString() };
    if (p) patch[p[0]] = new Date(Date.now() - (p[1] - 1) * DAY).toISOString();
    await admin.from("event_race_facts").upsert(patch as never, { onConflict: "race_id" });
    return `${step}:error`;
  };
  try {
    if (row.lat == null) {
      if (!old(row.geo_at, 30)) return null;
      const g = await geocode(r);
      if (!g) return fail("geo", new Error("non trovata"));
      delete errs.geo;
      return save({ lat: g.lat, lon: g.lon, geo_label: g.label, geo_at: new Date().toISOString() }, "geo");
    }
    const lat = Number(row.lat), lon = Number(row.lon);
    if (r.race_date && old(row.climate_at, 365)) {
      try { return save({ climate: await climateFor(lat, lon, r.race_date), climate_at: new Date().toISOString() }, "climate"); } catch (e) { return fail("climate", e); }
    }
    if (r.race_date && r.water_type === "mare" && old(row.water_at, 365)) {
      try { return save({ water: await waterFor(lat, lon, r.race_date), water_at: new Date().toISOString() }, "water"); } catch (e) { return fail("water", e); }
    }
    if (old(row.shops_at, 90)) {
      await new Promise((ok) => setTimeout(ok, 1500)); // cortesia verso Overpass
      try { return save({ bike_shops: await bikeShopsNear(lat, lon), shops_at: new Date().toISOString() }, "shops"); } catch (e) { return fail("shops", e); }
    }
    if (officialUrl && old(row.official_at, 30)) {
      try { return save({ official: await officialInfo(officialUrl), official_url: officialUrl, official_at: new Date().toISOString() }, "official"); } catch (e) { return fail("official", e); }
    }
    if (old(row.results_at, 30)) {
      try {
        const series = (row.coachcox_series as number | null) ?? (await findCoachcoxSeries(r));
        if (!series) return save({ results_at: new Date().toISOString() }, "results:none");
        const latest = await latestCoachcoxRace(series);
        if (!latest) return save({ coachcox_series: series, results_at: new Date().toISOString() }, "results:none");
        if (latest.raceId === row.coachcox_race && row.results) return save({ results_at: new Date().toISOString() }, "results:same");
        const res = await resultsFor(latest.raceId, latest.year, r.name, latest.slotsNote);
        return save({ coachcox_series: series, coachcox_race: latest.raceId, results_year: latest.year, results: res, results_at: new Date().toISOString() }, "results");
      } catch (e) { return fail("results", e); }
    }
    return null;
  } catch (e) {
    return fail("step", e);
  }
}
