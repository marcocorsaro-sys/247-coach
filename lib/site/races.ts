// ============================================================================
// Catalogo gare long distance (sito pubblico 24/7 Coach): tipi, letture e
// punteggio del Race Advisor. Le tabelle sono in 0029_races_public.sql.
// Tutto è tollerante alle tabelle vuote: le pagine si renderizzano comunque.
// ============================================================================
import { createPublicClient } from "@/lib/supabase/public";
import { RACES_SEG, SOURCE_LANG, type Lang } from "@/lib/i18n/config";

export type Distance = "full" | "half";
export type Season = "prim" | "est" | "aut" | "inv";
export type Water = "mare" | "lago" | "fiume";

export interface Race {
  id: string;
  slug: string;
  series: string;
  distance: Distance;
  name: string;
  official_name: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  race_date: string | null;
  date_confirmed: boolean;
  season: Season | null;
  water_type: Water | null;
  swim_km: number | null;
  bike_km: number | null;
  bike_dplus_m: number | null;
  run_km: number | null;
  run_flat: boolean | null;
  heat_idx: number;
  wind_idx: number;
  fast_idx: number;
  tagline: string | null;
  intro: string | null;
  kpis: { v: string; l: string }[] | null;
  legs: { swim?: { bullets: string[] }; bike?: { bullets: string[] }; run?: { bullets: string[] } } | null;
  profile: { maxm: number; points: [number, number][]; labels: { km: number; m: number; t: string }[] } | null;
  splits: { goal: string; swim: string; bike: string; run: string; total: string }[] | null;
  demands: { t: string; b: string }[] | null;
  tips: { t: string; p: string }[] | null;
  logistics: { t: string; p: string }[] | null;
  faq: { q: string; a: string }[] | null;
  status: "draft" | "published";
  course_version: string | null;
}

export interface RaceSegment {
  id: string; leg: "swim" | "bike" | "run"; position: number;
  km_from: number | null; km_to: number | null; title: string; note: string | null;
  grade_pct: number | null; dplus_m: number | null; kind: string | null;
}
export interface RaceReview {
  id: string; edition_year: number | null; source: "synthesis" | "verified" | "manual";
  title: string | null; scores: Record<string, number> | null; times: Record<string, string> | null;
  wetsuit: boolean | null; gear: string | null; body: string | null; would_repeat: boolean | null;
  sources_note: string | null; created_at: string;
}
export interface RaceSource {
  id: string; kind: string; platform: string | null; url: string; title: string | null;
  author: string | null; author_handle: string | null; published_at: string | null;
  edition_year: number | null; lang: string | null; excerpt: string | null;
  thumbnail_url: string | null; topics: string[] | null; quality: number;
}
export interface RaceArticle {
  id: string; slug: string; topic: string; title: string; dek: string | null; body_md: string;
  author_type: "ai" | "editorial" | "athlete"; edition_year: number | null; reading_min: number | null; updated_at: string;
}
export interface RaceMedia {
  id: string; platform: "instagram" | "youtube" | "strava" | "tiktok" | "other";
  media_type: string; url: string; embed_id: string | null; author: string | null; author_handle: string | null;
  caption: string | null; thumbnail_url: string | null; taken_at: string | null; edition_year: number | null;
  leg: string | null; likes: number | null; views: number | null; featured: boolean;
}

export interface RaceBundle {
  race: Race; segments: RaceSegment[]; reviews: RaceReview[];
  sources: RaceSource[]; articles: RaceArticle[]; media: RaceMedia[]; places: RacePlace[];
}

// Il sito è pubblico e i dati cambiano di rado: ISR di un'ora.
export const RACES_REVALIDATE = 3600;

export interface RacePlace { id: string; kind: "hotel" | "arrival" | "spectator" | "training" | "segment" | "food"; title: string; body: string | null; url: string | null; area: string | null; position: number }

export interface RaceTranslation {
  race_id: string; lang: string; name: string | null; tagline: string | null; intro: string | null;
  kpis: Race["kpis"]; legs: Race["legs"]; splits: Race["splits"]; demands: Race["demands"]; tips: Race["tips"]; logistics: Race["logistics"]; faq: Race["faq"];
  segments: { position: number; leg: string; title: string; note: string | null }[] | null;
  reviews: { id: string; title: string | null; body: string | null; sources_note: string | null }[] | null;
}

/** Applica i campi tradotti (solo quelli valorizzati) sopra la gara sorgente. */
export function applyTranslation(r: Race, t: RaceTranslation | null | undefined): Race {
  if (!t) return r;
  const out = { ...r };
  for (const k of ["name", "tagline", "intro", "kpis", "legs", "splits", "demands", "tips", "logistics", "faq"] as const) {
    const v = t[k];
    if (v != null && (typeof v !== "string" || v.trim())) (out as unknown as Record<string, unknown>)[k] = v;
  }
  return out;
}

export async function listRaces(lang: Lang = SOURCE_LANG): Promise<Race[]> {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("event_races")
    .select("*")
    .eq("status", "published")
    .order("race_date", { ascending: true });
  if (error) {
    // Tabella non ancora migrata o RLS: il sito deve comunque rispondere.
    console.warn("[races] listRaces:", error.message);
    return [];
  }
  const races = (data ?? []) as Race[];
  if (lang === SOURCE_LANG || !races.length) return races;
  const { data: tr } = await sb.from("event_race_translations").select("race_id,lang,name,tagline").eq("lang", lang);
  const byId = new Map(((tr ?? []) as RaceTranslation[]).map((t) => [t.race_id, t]));
  return races.map((r) => applyTranslation(r, byId.get(r.id)));
}

export async function getRaceBundle(slug: string, lang: Lang = SOURCE_LANG): Promise<RaceBundle | null> {
  const sb = createPublicClient();
  const { data: race, error } = await sb.from("event_races").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error || !race) return null;
  const id = (race as Race).id;
  const [segments, reviews, sources, articles, media, trRes, placesRes] = await Promise.all([
    sb.from("event_race_segments").select("*").eq("race_id", id).order("leg").order("position"),
    sb.from("event_race_reviews").select("*").eq("race_id", id).eq("published", true).order("created_at", { ascending: false }).limit(30),
    sb.from("event_race_sources").select("id,kind,platform,url,title,author,author_handle,published_at,edition_year,lang,excerpt,thumbnail_url,topics,quality").eq("race_id", id).gte("quality", 2).order("quality", { ascending: false }).order("published_at", { ascending: false }).limit(60),
    sb.from("event_race_articles").select("id,slug,topic,title,dek,body_md,author_type,edition_year,reading_min,updated_at").eq("race_id", id).eq("published", true).order("updated_at", { ascending: false }),
    sb.from("event_race_media").select("*").eq("race_id", id).eq("published", true).order("featured", { ascending: false }).order("likes", { ascending: false, nullsFirst: false }).limit(160),
    lang === SOURCE_LANG ? Promise.resolve({ data: null }) : sb.from("event_race_translations").select("*").eq("race_id", id).eq("lang", lang).maybeSingle(),
    sb.from("event_race_places").select("id,kind,title,body,url,area,position").eq("race_id", id).eq("published", true).order("kind").order("position"),
  ]);
  const t = (trRes.data ?? null) as RaceTranslation | null;
  let segs = (segments.data ?? []) as RaceSegment[];
  let revs = (reviews.data ?? []) as RaceReview[];
  let arts = (articles.data ?? []) as RaceArticle[];
  if (t) {
    const sm = new Map((t.segments ?? []).map((x) => [`${x.leg}:${x.position}`, x]));
    segs = segs.map((s) => { const x = sm.get(`${s.leg}:${s.position}`); return x ? { ...s, title: x.title || s.title, note: x.note ?? s.note } : s; });
    const rm = new Map((t.reviews ?? []).map((x) => [x.id, x]));
    revs = revs.map((r) => { const x = rm.get(r.id); return x ? { ...r, title: x.title ?? r.title, body: x.body ?? r.body, sources_note: x.sources_note ?? r.sources_note } : r; });
  }
  if (lang !== SOURCE_LANG && arts.length) {
    const { data: at } = await sb.from("event_race_article_translations").select("article_id,title,dek,body_md").eq("lang", lang).in("article_id", arts.map((a) => a.id));
    const am = new Map(((at ?? []) as { article_id: string; title: string; dek: string | null; body_md: string }[]).map((x) => [x.article_id, x]));
    arts = arts.map((a) => { const x = am.get(a.id); return x ? { ...a, title: x.title, dek: x.dek, body_md: x.body_md } : a; });
  }
  let places = (placesRes.data ?? []) as RacePlace[];
  if (lang !== SOURCE_LANG && places.length) {
    const { data: pt } = await sb.from("event_race_place_translations").select("place_id,title,body").eq("lang", lang).in("place_id", places.map((x) => x.id));
    const pm = new Map(((pt ?? []) as { place_id: string; title: string | null; body: string | null }[]).map((x) => [x.place_id, x]));
    places = places.map((x) => { const y = pm.get(x.id); return y ? { ...x, title: y.title || x.title, body: y.body ?? x.body } : x; });
  }
  return {
    places,
    race: applyTranslation(race as Race, t),
    segments: segs,
    reviews: revs,
    sources: (sources.data ?? []) as RaceSource[],
    articles: arts,
    media: (media.data ?? []) as RaceMedia[],
  };
}

// ---------------------------------------------------------------------------
// Race Advisor — matching su attributi dichiarati del percorso e meteo storico
// ---------------------------------------------------------------------------
export interface AdvisorPrefs {
  dist: Distance | "any";
  per: Season | "any";
  water: Water | "any";
  bike: "flat" | "roll" | "mtn";
  heat: "ok" | "no";
  goal: "fin" | "pb" | "slot";
}
export const DEFAULT_PREFS: AdvisorPrefs = { dist: "full", per: "est", water: "any", bike: "roll", heat: "ok", goal: "fin" };

export function bikeClass(dplus: number | null): "flat" | "roll" | "mtn" {
  const d = dplus ?? 0;
  return d < 700 ? "flat" : d < 1700 ? "roll" : "mtn";
}

export function scoreRace(r: Race, p: AdvisorPrefs): { s: number; why: string[] } | null {
  if (p.dist !== "any" && r.distance !== p.dist) return null;
  let s = 0;
  const why: string[] = [];
  if (p.per !== "any") { if (r.season === p.per) { s += 25; why.push("periodo giusto"); } else s += 5; } else s += 15;
  if (p.water !== "any") { if (r.water_type === p.water) { s += 15; why.push(p.water === "mare" ? "nuoto in mare" : "acqua dolce"); } } else s += 8;
  const bc = bikeClass(r.bike_dplus_m);
  const order = ["flat", "roll", "mtn"];
  if (bc === p.bike) { s += 25; why.push({ flat: "bici piatta", roll: "bici mossa", mtn: "bici di montagna" }[p.bike]); }
  else if (Math.abs(order.indexOf(bc) - order.indexOf(p.bike)) === 1) s += 10;
  if (p.heat === "no") { if (r.heat_idx === 0) { s += 15; why.push("clima fresco"); } else if (r.heat_idx === 2) s -= 15; } else s += 8;
  if (p.goal === "pb") { s += r.fast_idx * 6; if (r.fast_idx >= 2) why.push("percorso veloce"); }
  if (p.goal === "fin") { s += (3 - r.wind_idx) * 3 + (r.run_flat ? 5 : 0); if (r.run_flat) why.push("corsa piatta"); }
  if (p.goal === "slot") { s += (3 - r.fast_idx) * 4; if (r.fast_idx <= 1) why.push("campo meno profondo"); }
  return { s: Math.max(0, Math.min(99, s)), why };
}

export function fmtDate(d: string | null, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }, locale = "it-IT"): string {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString(locale, opts).replace(".", "");
}

export function weeksUntil(d: string | null, from = new Date()): number | null {
  if (!d) return null;
  const ms = new Date(d + "T12:00:00").getTime() - from.getTime();
  return Math.max(0, Math.round(ms / (7 * 86400000)));
}

export function hasRichContent(r: Race): boolean {
  return Boolean(r.intro && r.legs && r.splits);
}

// ---------------------------------------------------------------------------
// URL pubblici: /gare/ironman-nizza-2027. Il nome della serie è usato in modo
// descrittivo (sito non affiliato). Lo slug nel DB resta senza prefisso, così
// il prefisso cambia senza riscrivere le righe. I vecchi URL senza prefisso
// restano validi (redirect alla versione canonica).
// ---------------------------------------------------------------------------
export const SERIES_LABEL: Record<string, string> = { ironman: "Ironman", challenge: "Challenge", indipendente: "" };
export function seriesPrefix(r: Pick<Race, "series" | "distance">): string {
  const s = SERIES_LABEL[r.series] ?? "";
  return s ? `${s.toLowerCase()}-${r.distance === "half" ? "703-" : ""}` : "";
}
/** Segmento URL della scheda gara (senza lingua/sezione): "ironman-nizza-2027". */
export function raceSeg(r: Pick<Race, "series" | "distance" | "slug">): string {
  return `${seriesPrefix(r)}${r.slug.replace(/-703-/, "-")}`;
}
/** Path pubblico della scheda gara nella lingua data: /de/rennen/ironman-nizza-2027. */
export function racePath(r: Pick<Race, "series" | "distance" | "slug">, lang: Lang = SOURCE_LANG): string {
  return `/${lang}/${RACES_SEG[lang]}/${raceSeg(r)}`;
}
/** Dato un segmento URL, lo slug DB (toglie il prefisso serie). */
export function slugFromPath(seg: string): string {
  const m = /^(ironman|challenge)-(703-)?(.+)$/.exec(seg);
  if (!m) return seg;
  if (!m[2]) return m[3];
  // 70.3: "ironman-703-alghero-2027" → "alghero-703-2027"
  return m[3].replace(/-(\d{4})$/, "-703-$1");
}
/** Nome con serie, per titoli e H1: "Ironman Nizza", "Ironman 70.3 Alghero". */
export function raceTitle(r: Pick<Race, "series" | "distance" | "name">): string {
  const s = SERIES_LABEL[r.series] ?? "";
  return [s, r.distance === "half" ? "70.3" : "", r.name].filter(Boolean).join(" ");
}
