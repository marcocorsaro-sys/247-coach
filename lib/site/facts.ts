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
export interface BikeShop { name: string; address: string | null; website: string | null; phone: string | null; hours: string | null; repair: boolean; rental: boolean; km: number; lat: number; lon: number; url?: string | null; rating?: number | null; reviews?: number | null; source?: "osm" | "google" }
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
// Gare il cui nome non è una località cercabile.
// Nomi paese in italiano o varianti → nome inglese usato da Open-Meteo.
const COUNTRY_EN: Record<string, string> = {
  spagna: "Spain", germania: "Germany", italia: "Italy", "regno unito": "United Kingdom", danimarca: "Denmark", svezia: "Sweden",
  svizzera: "Switzerland", francia: "France", "türkiye": "Turkey", turchia: "Turkey", "chinese taipei": "Taiwan", austria: "Austria",
  portogallo: "Portugal", "paesi bassi": "Netherlands", olanda: "Netherlands", belgio: "Belgium", polonia: "Poland", finlandia: "Finland",
  norvegia: "Norway", grecia: "Greece", croazia: "Croatia", slovenia: "Slovenia", estonia: "Estonia", ungheria: "Hungary", "repubblica ceca": "Czechia",
  "stati uniti": "United States", "united states of america": "United States", usa: "United States", messico: "Mexico", brasile: "Brazil",
  cina: "China", giappone: "Japan", "sudafrica": "South Africa", "nuova zelanda": "New Zealand", irlanda: "Ireland", "emirati arabi uniti": "United Arab Emirates",
  marocco: "Morocco", egitto: "Egypt", argentina: "Argentina", cile: "Chile", "corea del sud": "South Korea", "south korea": "South Korea",
};
const GEO_OVERRIDE: Record<string, string> = {
  "eagleman": "Cambridge", "pennsylvania happy valley": "State College", "kraichgau": "Bad Schönborn",
  "westfriesland": "Hoorn", "hawai`i": "Waikoloa", "world championship kona": "Kailua-Kona",
  "washington tri-cities": "Kennewick", "northern california": "Santa Rosa", "japan south hokkaido": "Hokuto",
  "nelson mandela bay": "Gqeberha", "desaru coast": "Desaru", "dallas-little elm": "Little Elm", "switzerland": "Rapperswil", "wales": "Tenby", "erkner": "Erkner",
};
export async function geocode(r: Pick<Race, "city" | "country" | "name">): Promise<{ lat: number; lon: number; label: string } | null> {
  const name = (r.name ?? "").replace(/`/g, "'").replace(/\b(70\.3|IRONMAN|World Championship)\b/gi, " ").replace(/\s+/g, " ").trim();
  const words = name.split(" ");
  const cands = [GEO_OVERRIDE[(r.name ?? "").toLowerCase()], r.city?.split(/\s*[·,]\s*/)[0], r.city, name, ...name.split(/\s*[-–]\s*/), words.slice(1).join(" "), words[words.length - 1], words[0]]
    .filter((x): x is string => !!x && x.length > 2);
  for (const q of [...new Set(cands)]) {
    const d = await j(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`).catch(() => null);
    // solo località abitate (PPL*): niente stati, aeroporti o parchi omonimi
    const res = ((d?.results ?? []) as { latitude: number; longitude: number; name: string; country?: string; admin1?: string; feature_code?: string }[])
      .filter((x) => !x.feature_code || x.feature_code.startsWith("PPL"))
      .filter((x) => norm(x.name).includes(norm(q).slice(0, 5)) || norm(q).includes(norm(x.name)));
    if (!res.length) continue;
    const want = r.country ? (COUNTRY_EN[r.country.toLowerCase()] ?? r.country).toLowerCase() : null;
    const hit = want ? res.find((x) => x.country?.toLowerCase() === want) : res[0];
    if (!hit) continue;
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
  // Una richiesta piccola per anno (7 giorni): la richiesta unica di 10 anni pesa troppo per i limiti di Open-Meteo (429).
  const W = 3; // ±3 giorni attorno alla data gara
  const vars = "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,relative_humidity_2m_mean";
  const tmax: number[] = [], tmin: number[] = [], pr: number[] = [], wd: number[] = [], gu: number[] = [], hu: number[] = [];
  const byYear: Climate["by_year"] = [];
  let fails = 0;
  for (let y = lastYear; y >= firstYear; y--) {
    const c = Date.UTC(y, Number(md.slice(0, 2)) - 1, Number(md.slice(3, 5)));
    const s = new Date(c - W * 864e5).toISOString().slice(0, 10), e = new Date(c + W * 864e5).toISOString().slice(0, 10);
    let d: { daily?: Record<string, (number | null)[]> & { time: string[] } } | null = null;
    try { d = await j(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${s}&end_date=${e}&daily=${vars}&timezone=auto`); }
    catch (err) { if (++fails >= 3) throw err; await new Promise((r) => setTimeout(r, 1500)); continue; }
    const D = d?.daily;
    if (!D?.time?.length) continue;
    const num = (k: string) => (D[k] ?? []).filter((x): x is number => typeof x === "number");
    tmax.push(...num("temperature_2m_max")); tmin.push(...num("temperature_2m_min")); pr.push(...num("precipitation_sum"));
    wd.push(...num("wind_speed_10m_max")); gu.push(...num("wind_gusts_10m_max")); hu.push(...num("relative_humidity_2m_mean"));
    const i = D.time.indexOf(`${y}-${md}`);
    if (i >= 0) {
      const g = (k: string) => Number(D[k]?.[i] ?? NaN);
      byYear.push({ year: y, tmax: r1(g("temperature_2m_max")), tmin: r1(g("temperature_2m_min")), precip: r1(g("precipitation_sum")), wind: Math.round(g("wind_speed_10m_max")), gust: Math.round(g("wind_gusts_10m_max")) });
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!tmax.length) return null;
  return {
    years: lastYear - firstYear + 1, window_days: W, month_day: md,
    tmax_avg: r1(avg(tmax)), tmin_avg: r1(avg(tmin)), tmax_hi: r1(Math.max(...tmax)), tmin_lo: r1(Math.min(...tmin)),
    rain_days_pct: Math.round((pr.filter((x) => x >= 1).length / pr.length) * 100), precip_avg_mm: r1(avg(pr)),
    wind_avg_kmh: Math.round(avg(wd)), gust_avg_kmh: Math.round(avg(gu)), humidity_avg: hu.length ? Math.round(avg(hu)) : null,
    by_year: byYear, source: "Open-Meteo Historical Weather API (ERA5)",
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
type OsmEl = { lat?: number | string; lon?: number | string; center?: { lat: number; lon: number }; tags?: Record<string, string> };

/** Nominatim (OSM) come riserva quando Overpass non risponde dai server di hosting. */
async function nominatimShops(lat: number, lon: number): Promise<OsmEl[]> {
  const dLat = 0.14, dLon = 0.14 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const vb = [lon - dLon, lat + dLat, lon + dLon, lat - dLat].map((x) => x.toFixed(4)).join(",");
  const out: OsmEl[] = [];
  for (const q of ["bicycle shop", "bicycle repair"]) {
    const d = (await j(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&viewbox=${vb}&bounded=1&format=jsonv2&extratags=1&addressdetails=1&limit=40`, { headers: { accept: "application/json", "accept-language": "en" } })) as
      { lat: string; lon: string; name?: string; display_name?: string; type?: string; extratags?: Record<string, string>; address?: Record<string, string> }[];
    for (const x of d ?? []) {
      const a = x.address ?? {};
      out.push({ lat: x.lat, lon: x.lon, tags: { ...(x.extratags ?? {}), name: x.name || "", shop: x.type === "bicycle" ? "bicycle" : (x.extratags?.shop ?? ""), "addr:street": a.road ?? "", "addr:housenumber": a.house_number ?? "", "addr:postcode": a.postcode ?? "", "addr:city": a.city ?? a.town ?? a.village ?? "" } });
    }
    await new Promise((r) => setTimeout(r, 1100)); // policy Nominatim: max 1 richiesta al secondo
  }
  return out;
}

export async function bikeShopsNear(lat: number, lon: number, radiusM = 20000): Promise<BikeShop[]> {
  const q = `[out:json][timeout:15];(nwr["shop"="bicycle"](around:${radiusM},${lat},${lon});nwr["amenity"="bicycle_repair_station"](around:${Math.min(radiusM, 8000)},${lat},${lon}););out center tags 80;`;
  // Più istanze Overpass (la principale rifiuta spesso i datacenter), poi Nominatim.
  let els: OsmEl[] | null = null;
  const errs: string[] = [];
  for (const ep of ["https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter"]) {
    try {
      const r = await fetch(ep, { method: "POST", body: new URLSearchParams({ data: q }), headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, signal: AbortSignal.timeout(18_000) });
      if (!r.ok) throw new Error(String(r.status));
      els = ((await r.json()) as { elements?: OsmEl[] }).elements ?? [];
      break;
    } catch (e) { errs.push(`${new URL(ep).host} ${(e as Error).message} ${((e as Error & { cause?: { code?: string } }).cause?.code) ?? ""}`.trim()); }
  }
  if (!els) {
    try { els = await nominatimShops(lat, lon); } catch (e) { errs.push(`nominatim ${(e as Error).message}`); }
  }
  if (!els) throw new Error(errs.join(" | ").slice(0, 280));
  const shops: BikeShop[] = [];
  const seen = new Set<string>();
  for (const e of els) {
    const t = e.tags ?? {};
    const la = Number(e.lat ?? e.center?.lat), lo = Number(e.lon ?? e.center?.lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    const station = t.amenity === "bicycle_repair_station";
    const name = t.name || (station ? "Bicycle repair station" : null);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const addr = [t["addr:street"] ? `${t["addr:street"]} ${t["addr:housenumber"] ?? ""}`.trim() : null, [t["addr:postcode"], t["addr:city"]].filter(Boolean).join(" ") || null].filter(Boolean).join(", ") || null;
    shops.push({
      name, address: addr, website: t.website || t["contact:website"] || null, phone: t.phone || t["contact:phone"] || null, hours: t.opening_hours || null,
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

let seriesCache: { half: boolean; id: number; name: string; year: number }[] | null = null;
// Elenco delle gare CoachCox: /imstats/im/ (full) e /imstats/him/ (70.3), una riga per serie con l'ultima edizione.
async function coachcoxSeries() {
  if (seriesCache) return seriesCache;
  const best = new Map<string, { half: boolean; id: number; name: string; year: number }>();
  for (const [path, half] of [["im", false], ["him", true]] as const) {
    const h = await fetch(`https://www.coachcox.co.uk/imstats/${path}/`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25_000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
    for (const m of h.matchAll(/imstats\/race\/(\d+)\/"\s+title="Summary Stats for (?:Ironman|IRONMAN)\s+(?:70\.3\s+)?([^"]+?)\s+(20\d\d)"/g)) {
      const name = m[2].trim();
      if (/aqua ?bike|aquabike|swim|5150/i.test(name)) continue;
      const k = `${half}|${name.toLowerCase()}`;
      const y = Number(m[3]), id = Number(m[1]);
      const cur = best.get(k);
      if (!cur || y > cur.year || (y === cur.year && id > cur.id)) best.set(k, { half, id, name, year: y });
    }
  }
  seriesCache = [...best.values()];
  return seriesCache;
}

/** Ultima edizione con risultati su CoachCox della gara (match per nome, città o slug). */
export async function findCoachcoxRace(r: Pick<Race, "name" | "city" | "distance" | "slug">): Promise<{ raceId: number; year: number } | null> {
  const all = (await coachcoxSeries()).filter((s) => s.half === (r.distance === "half"));
  const slugBase = r.slug.replace(/-?703/g, "").replace(/-20\d\d$/, "");
  const keys = [norm(r.name), norm(r.city ?? ""), norm(slugBase)].filter((k) => k.length > 2);
  const hit = all.find((s) => keys.includes(norm(s.name)))
    ?? all.find((s) => keys.some((k) => k.length > 4 && (norm(s.name).includes(k) || k.includes(norm(s.name)))));
  return hit ? { raceId: hit.id, year: hit.year } : null;
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
  // La versione dell'API CoachCox cambia (v1.92 → v1.93...): la leggo dalla pagina risultati.
  const page = `https://www.coachcox.co.uk/imstats/race/${raceId}/results/`;
  const ph = await fetch(page, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25_000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  const api = /wp-json\/imstats\/v[\d.]+\/race\/results\/\d+/.exec(ph)?.[0];
  const res = await fetch(api ? `https://www.coachcox.co.uk/${api}` : COACHCOX(raceId), { headers: { "user-agent": UA, referer: page }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`coachcox ${res.status}`);
  const jj = (await res.json()) as CcRow[] | { data?: CcRow[] };
  const rows: CcRow[] = Array.isArray(jj) ? jj : (jj.data ?? []);
  if (!rows.length) return null;
  const t = (x: CcRow) => Number(x.ot);
  const fin = rows.filter((x) => x.fs === "FIN" && t(x) > 0);
  const toF = (x: CcRow, pos?: number): Finisher => ({ name: x.n, country: x.c, div: x.di ?? "", time: hms(t(x)), secs: t(x), pos });
  const top = (g: "M" | "F") => {
    const pro = fin.filter((x) => x.di === `${g}PRO`).sort((a, b) => t(a) - t(b));
    const pool = pro.length ? pro : fin.filter((x) => (x.g?.[0] ?? x.di?.[0]) === g).sort((a, b) => t(a) - t(b));
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

export async function stepFacts(admin: SupabaseClient, r: Race, f: Facts | null, officialUrl: string | null, opts: { skipShops?: boolean } = {}): Promise<string | null> {
  const row: Facts = { ...(f ?? {}), race_id: r.id };
  const errs = ((f?.errors as Record<string, string> | undefined) ?? {}) as Record<string, string>;
  const save = async (patch: Record<string, unknown>, step: string) => {
    delete errs[step.split(":")[0]];
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
    if (!opts.skipShops && old(row.shops_at, 90)) {
      try { return save({ bike_shops: await bikeShopsNear(lat, lon), shops_at: new Date().toISOString() }, "shops"); } catch (e) { return fail("shops", e); }
    }
    if (old(row.official_at, 30)) {
      // senza fonte ufficiale salvata: provo gli URL ironman.com plausibili e tengo quello che risponde
      const ou = officialUrl ?? (row.official_url as string | null) ?? (await discoverOfficial(r));
      if (ou) {
        try { return save({ official: await officialInfo(ou), official_url: ou, official_at: new Date().toISOString() }, "official"); } catch (e) { return fail("official", e); }
      }
      if (!officialUrl) await admin.from("event_race_facts").upsert({ race_id: r.id, official_at: new Date(Date.now() - 23 * DAY).toISOString() } as never, { onConflict: "race_id" }); // riprova tra una settimana
    }
    if (old(row.results_at, 30)) {
      try {
        const latest = await findCoachcoxRace(r);
        if (!latest) return save({ results_at: new Date().toISOString() }, "results:none");
        if (latest.raceId === row.coachcox_race && row.results) return save({ results_at: new Date().toISOString() }, "results:same");
        const res = await resultsFor(latest.raceId, latest.year, r.name, null);
        return save({ coachcox_race: latest.raceId, results_year: latest.year, results: res, results_at: new Date().toISOString() }, "results");
      } catch (e) { return fail("results", e); }
    }
    return null;
  } catch (e) {
    return fail("step", e);
  }
}

// ---------------------------------------------------------------- negozi bici da Google Maps (Apify)
// OSM blocca i server di hosting: i negozi arrivano da un run di compass/crawler-google-places
// ("bike shop <località>") lanciato dal cron con APIFY_TOKEN, assegnato alle gare entro 25 km.
const BIKE_CAT = /bicycle|bike|cycl|bicicl|fahrrad|vélo|velo|fiets|cykel|sykkel|pyörä|rower|mtb|triathlon/i;

type G = { title?: string; categoryName?: string; categories?: string[]; location?: { lat: number; lng: number }; address?: string; phone?: string; website?: string; url?: string; totalScore?: number; reviewsCount?: number; permanentlyClosed?: boolean; temporarilyClosed?: boolean; openingHours?: { day: string; hours: string }[] };

/** Negozi bici da Google Maps (Apify) per le gare che non li hanno ancora: un lotto di località per giro. */
export async function importGoogleShops(admin: SupabaseClient, batch = 30): Promise<{ done: number; error?: string }> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { done: 0, error: "APIFY_TOKEN mancante" };
  const { data: rows } = await admin.from("event_race_facts").select("race_id,lat,lon,geo_label").not("lat", "is", null).not("geo_label", "is", null).is("shops_at", null).limit(400);
  if (!rows?.length) return { done: 0 };
  const byLabel = new Map<string, { race_id: string; lat: number; lon: number }[]>();
  for (const r of rows as { race_id: string; lat: number; lon: number; geo_label: string }[]) {
    if (!byLabel.has(r.geo_label)) byLabel.set(r.geo_label, []);
    byLabel.get(r.geo_label)!.push(r);
  }
  const labels = [...byLabel.keys()].slice(0, batch);
  const url = `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=170&format=json&clean=true`;
  const res = await fetch(url, {
    method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(200_000),
    body: JSON.stringify({ searchStringsArray: labels.map((l) => `bike shop ${l}`), maxCrawledPlacesPerSearch: 12, language: "en", scrapePlaceDetailPage: false, scrapeContacts: false, maxImages: 0, maxReviews: 0 }),
  });
  if (!res.ok) return { done: 0, error: `apify ${res.status} ${(await res.text()).slice(0, 200)}` };
  const items = ((await res.json()) as G[]).filter((g) => g.title && g.location && !g.permanentlyClosed && !g.temporarilyClosed && BIKE_CAT.test([g.categoryName, ...(g.categories ?? []), g.title].join(" ")));
  let n = 0;
  for (const l of labels) {
    for (const r of byLabel.get(l)!) {
      const seen = new Set<string>();
      const shops: BikeShop[] = [];
      for (const g of items) {
        const km = kmBetween(r.lat, r.lon, g.location!.lat, g.location!.lng);
        if (km > 25 || seen.has(g.title!.toLowerCase())) continue;
        seen.add(g.title!.toLowerCase());
        const cats = [g.categoryName, ...(g.categories ?? [])].join(" ");
        shops.push({
          name: g.title!, address: g.address ?? null, website: g.website ?? null, phone: g.phone ?? null,
          hours: g.openingHours?.length ? g.openingHours.map((h) => `${h.day.slice(0, 3)} ${h.hours}`).join("; ") : null,
          repair: /repair|service|riparaz|werkstatt|atelier|taller/i.test(cats), rental: /rental|noleggio|verleih|location|alquiler|hire/i.test(cats),
          km: r1(km), lat: g.location!.lat, lon: g.location!.lng, url: g.url ?? null, rating: g.totalScore ?? null, reviews: g.reviewsCount ?? null, source: "google",
        });
      }
      shops.sort((a, b) => a.km - b.km);
      await admin.from("event_race_facts").update({ bike_shops: shops.slice(0, 20), shops_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("race_id", r.race_id);
      n++;
    }
  }
  return { done: n };
}

// ---------------------------------------------------------------- pagina ufficiale ironman.com da indovinare
const sl = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const IT_EN: Record<string, string> = { nizza: "nice", francoforte: "frankfurt", amburgo: "hamburg", copenaghen: "copenhagen" };
export async function discoverOfficial(r: Pick<Race, "slug" | "name" | "city" | "official_name" | "distance">): Promise<string | null> {
  const pre = r.distance === "half" ? "im703-" : "im-";
  const base = r.slug.replace(/-?703/g, "").replace(/-20\d\d$/, "");
  const names = [base, IT_EN[base] ?? "", sl(r.name.replace(/70\.3/g, "")), sl(r.official_name?.replace(/ironman|70\.3/gi, "") ?? ""), sl(r.city ?? ""), sl(IT_EN[sl(r.city ?? "")] ?? "")].filter((x) => x.length > 2);
  const tried = new Set<string>();
  for (const n of names) {
    const u = `https://www.ironman.com/races/${pre}${n}`;
    if (tried.has(u)) continue;
    tried.add(u);
    const res = await fetch(u, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15_000) }).catch(() => null);
    if (!res?.ok) continue;
    const final = res.url.replace(/\/$/, "");
    if (!/ironman\.com\/races\/im/.test(final)) continue; // redirect alla home o all'elenco gare
    if ((/\/im703-/.test(final)) !== (r.distance === "half")) continue;
    return final;
  }
  return null;
}
