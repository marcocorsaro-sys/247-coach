// ============================================================================
// Raccolta contenuti per gara via Apify (REST, run-sync): YouTube, Instagram
// (hashtag), Google (blog/forum/race report). Salva solo URL + metadati in
// event_race_sources/event_race_media: niente contenuti copiati, i media si
// mostrano con link/embed al post originale.
//  - APIFY_TOKEN su Vercel (Settings → Environment Variables).
//  - Ogni sorgente è una chiamata separata: ?sources=youtube,instagram,google
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RaceSeed } from "@/lib/site/seed/types";
import type { Race } from "@/lib/site/races";
import { upsertMedia, upsertSources, type MediaRow, type SourceRow } from "./admin";

type Json = Record<string, unknown>;

async function runActor(actor: string, input: Json, timeoutSecs = 150): Promise<Json[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN mancante: aggiungila alle variabili d'ambiente su Vercel.");
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${timeoutSecs}&format=json&clean=true`;
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Apify ${actor} HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  const items = (await res.json()) as unknown;
  return Array.isArray(items) ? (items as Json[]) : [];
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);
const dateOnly = (v: unknown): string | null => { const s = str(v); if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); };
const yearOf = (d: string | null, text: string, years: number[]): number | null => {
  const m = years.map(String).find((y) => text.includes(y));
  if (m) return Number(m);
  return d ? Number(d.slice(0, 4)) : null;
};

/** Termini di ricerca: dal seed se c'è, altrimenti derivati dal nome ufficiale. */
export function harvestTerms(race: Race, seed?: RaceSeed): NonNullable<RaceSeed["harvest"]> {
  if (seed?.harvest) return seed.harvest;
  const base = (race.official_name ?? `IRONMAN ${race.name}`).trim();
  const tag = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return {
    hashtags: [tag, `${tag}${new Date().getFullYear() - 1}`],
    youtube: [`${base} race report`, `${base} bike course`, `${base} ${new Date().getFullYear() - 1}`],
    google: [`${base} race report`, `${base} recensione`, `${base} race review blog`],
    years: [new Date().getFullYear() - 3, new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear()],
  };
}

// Pertinenza minima: il testo deve citare la gara (nome città o "ironman"),
// altrimenti gli hashtag generici portano rumore.
function relevant(text: string, race: Race): boolean {
  const t = text.toLowerCase();
  const city = (race.city ?? race.name).toLowerCase().split(/[\s·]+/)[0];
  const official = (race.official_name ?? "").toLowerCase();
  return t.includes(city) || (official && t.includes(official)) || t.includes("ironman") || t.includes("iron man") || t.includes("70.3");
}

export async function harvestYoutube(admin: SupabaseClient, race: Race, raceId: string, terms: NonNullable<RaceSeed["harvest"]>, limit = 20) {
  const items = await runActor("streamers~youtube-scraper", {
    searchQueries: terms.youtube,
    maxResults: limit,
    maxResultsShorts: 0,
    maxResultStreams: 0,
    sortingOrder: "relevance",
  });
  const years = terms.years ?? [];
  const sources: SourceRow[] = [];
  const media: MediaRow[] = [];
  for (const it of items) {
    const url = str(it.url) ?? (str(it.id) ? `https://www.youtube.com/watch?v=${it.id}` : null);
    const title = str(it.title);
    if (!url || !title) continue;
    const text = `${title} ${str(it.text) ?? ""}`;
    if (!relevant(text, race)) continue;
    const date = dateOnly(it.date);
    const id = str(it.id) ?? /v=([\w-]{11})/.exec(url)?.[1] ?? null;
    const year = yearOf(date, text, years);
    const channel = str(it.channelName);
    const thumb = str(it.thumbnailUrl) ?? (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);
    sources.push({ kind: "video", platform: "youtube", url, title, author: channel, published_at: date, edition_year: year, lang: null, excerpt: (str(it.text) ?? "").slice(0, 280) || null, thumbnail_url: thumb, topics: null, quality: 2, fetched_via: "apify:streamers/youtube-scraper", raw: { views: it.viewCount, likes: it.likes, duration: it.duration } });
    media.push({ platform: "youtube", media_type: "video", url, embed_id: id, author: channel, caption: title, thumbnail_url: thumb, taken_at: date, edition_year: year, leg: "course", views: num(it.viewCount), likes: num(it.likes), published: true });
  }
  return { fetched: items.length, sources_new: await upsertSources(admin, raceId, sources), media_new: await upsertMedia(admin, raceId, media) };
}

export async function harvestInstagram(admin: SupabaseClient, race: Race, raceId: string, terms: NonNullable<RaceSeed["harvest"]>, limit = 40) {
  const items = await runActor("apify~instagram-hashtag-scraper", {
    hashtags: terms.hashtags,
    resultsLimit: limit,
    resultsType: "posts",
  });
  const years = terms.years ?? [];
  const media: MediaRow[] = [];
  const sources: SourceRow[] = [];
  for (const it of items) {
    const url = str(it.url) ?? (str(it.shortCode) ? `https://www.instagram.com/p/${it.shortCode}/` : null);
    if (!url) continue;
    const caption = str(it.caption) ?? "";
    if (!relevant(caption + " " + (Array.isArray(it.hashtags) ? (it.hashtags as string[]).join(" ") : ""), race)) continue;
    const date = dateOnly(it.timestamp);
    const type = str(it.type);
    const mediaType = type === "Video" ? "reel" : "photo";
    const handle = str(it.ownerUsername);
    const row: MediaRow = {
      platform: "instagram", media_type: mediaType, url, embed_id: str(it.shortCode), author: str(it.ownerFullName), author_handle: handle,
      caption: caption.slice(0, 400) || null, thumbnail_url: str(it.displayUrl), taken_at: date, edition_year: yearOf(date, caption, years), leg: null,
      likes: num(it.likesCount), views: num(it.videoViewCount) ?? num(it.videoPlayCount), published: true,
    };
    media.push(row);
    if (caption.length > 300) {
      // Didascalie lunghe = racconti di gara: valgono anche come fonte testuale.
      sources.push({ kind: "post", platform: "instagram", url, title: caption.slice(0, 90).replace(/\s+/g, " "), author: str(it.ownerFullName), author_handle: handle, published_at: date, edition_year: row.edition_year, excerpt: caption.slice(0, 280), quality: 2, fetched_via: "apify:instagram-hashtag-scraper" });
    }
  }
  return { fetched: items.length, media_new: await upsertMedia(admin, raceId, media), sources_new: await upsertSources(admin, raceId, sources) };
}

const NOISE = /(ironman\.com\/|wikipedia\.org|facebook\.com|instagram\.com|tiktok\.com|amazon\.|booking\.com|tripadvisor)/i;

export async function harvestGoogle(admin: SupabaseClient, race: Race, raceId: string, terms: NonNullable<RaceSeed["harvest"]>, perQuery = 20) {
  const items = await runActor("apify~google-search-scraper", {
    queries: terms.google.join("\n"),
    maxPagesPerQuery: 1,
    resultsPerPage: perQuery,
    languageCode: "it",
    countryCode: "it",
    mobileResults: false,
  });
  const years = terms.years ?? [];
  const sources: SourceRow[] = [];
  for (const page of items) {
    const organic = Array.isArray(page.organicResults) ? (page.organicResults as Json[]) : [];
    for (const r of organic) {
      const url = str(r.url);
      const title = str(r.title);
      if (!url || !title || NOISE.test(url)) continue;
      const desc = str(r.description) ?? "";
      if (!relevant(`${title} ${desc}`, race)) continue;
      const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; } })();
      const isVideo = /youtube\.com|youtu\.be|vimeo\.com/.test(url);
      const isForum = /reddit\.com|slowtwitch|forum|tri-mag|triathlonforum/.test(url);
      const isReport = /race[- ]?report|racconto|cronaca|my ironman|la mia gara/i.test(`${title} ${desc}`);
      const kind = isVideo ? "video" : isForum ? "forum" : isReport ? "report" : "blog";
      const date = dateOnly(r.date);
      sources.push({ kind, platform: host, url, title, published_at: date, edition_year: yearOf(date, `${title} ${desc}`, years), lang: /[àèéìòù]|gara|racconto|percorso/i.test(`${title} ${desc}`) ? "it" : "en", excerpt: desc.slice(0, 280) || null, quality: isReport ? 3 : 2, fetched_via: "apify:google-search-scraper" });
    }
  }
  return { fetched: items.length, sources_new: await upsertSources(admin, raceId, sources) };
}
