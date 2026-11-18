// ============================================================================
// Foto della località di gara per le grafiche social (Instagram, LinkedIn).
// Solo foto con licenza libera da Wikimedia Commons (CC0, pubblico dominio,
// CC BY, CC BY-SA), mai foto di altri atleti o di IRONMAN. Tra i candidati
// sceglie Claude guardando le immagini: paesaggio riconoscibile del posto
// (mare, lago, lungomare, città), niente persone in primo piano, scritte o loghi.
// Il credito (autore, licenza) va sempre stampato sulla grafica.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { generateStructured, TRANSLATE_MODEL } from "@/lib/ai/claude";
import { COUNTRY_EN } from "@/lib/site/facts";

export const PHOTO_UA = "247coach-bot/1.0 (https://247coachai.com; social graphics)";
const API = "https://commons.wikimedia.org/w/api.php";
const LIC_OK = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?)/i;
const BAD_TITLE = /(map|flag|logo|coat of arms|seal|locator|diagram|chart|plan |ironman|triathlon|marathon|portrait|wedding|selfie|hotel room|interior|menu|sign\b|poster|museum exhibit)/i;

export type PhotoCand = { title: string; url: string; page: string; author: string; license: string; license_url: string; w: number; h: number; score: number };

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

async function commonsSearch(q: string): Promise<PhotoCand[]> {
  const p = new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "30",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiextmetadatafilter: "LicenseShortName|Artist|LicenseUrl", iiurlwidth: "2400",
  });
  const r = await fetch(`${API}?${p}`, { headers: { "user-agent": PHOTO_UA }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!r?.ok) return [];
  const d = (await r.json().catch(() => null)) as { query?: { pages?: Record<string, { title: string; imageinfo?: { thumburl?: string; url: string; descriptionurl: string; width: number; height: number; mime: string; extmetadata?: Record<string, { value?: string }> }[] }> } } | null;
  const out: PhotoCand[] = [];
  for (const pg of Object.values(d?.query?.pages ?? {})) {
    const ii = pg.imageinfo?.[0];
    if (!ii || ii.mime !== "image/jpeg") continue;
    const lic = ii.extmetadata?.LicenseShortName?.value ?? "";
    if (!LIC_OK.test(lic)) continue;
    if (ii.width < 1800 || ii.height < 1100) continue;
    const ratio = ii.width / ii.height;
    if (ratio < 1.15 || ratio > 2.4) continue; // paesaggio, ritagliabile in 4:5
    if (BAD_TITLE.test(pg.title)) continue;
    const free = /^(cc0|public domain|pd)/i.test(lic) ? 3 : /by-sa/i.test(lic) ? 1 : 2;
    out.push({
      title: pg.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
      url: (ii.thumburl ?? ii.url).replace(/\?.*$/, ""),
      page: ii.descriptionurl,
      author: strip(ii.extmetadata?.Artist?.value ?? "") || "unknown",
      license: lic,
      license_url: ii.extmetadata?.LicenseUrl?.value ?? "",
      w: ii.width, h: ii.height,
      score: free + Math.min(ii.width, 6000) / 6000,
    });
  }
  return out;
}

async function thumb64(url: string): Promise<string | null> {
  // miniatura 640px: dalla thumb ridimensionata, oppure costruita dall'originale
  const m = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/.exec(url);
  const small = /\/\d+px-/.test(url) ? url.replace(/\/(\d+)px-/, "/960px-") : m ? `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${m[3]}/960px-${m[3]}` : url;
  const r = await fetch(small, { headers: { "user-agent": PHOTO_UA }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!r?.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  const jpg = await sharp(buf).resize(640, 420, { fit: "inside" }).jpeg({ quality: 70 }).toBuffer().catch(() => null);
  return jpg ? jpg.toString("base64") : null;
}

type RaceRow = { id: string; name: string; country: string | null; city?: string | null; water_type?: string | null };

/** Cerca e sceglie la foto di una gara; salva in race_photos. */
export async function findRacePhoto(admin: SupabaseClient, race: RaceRow, geoLabel?: string | null): Promise<{ status: string; title?: string; note?: string }> {
  const country = race.country ? COUNTRY_EN[race.country.toLowerCase()] ?? race.country : "";
  const place = race.city || race.name;
  const water = /lake|lago/i.test(race.water_type ?? "") ? "lake" : /river|fiume/i.test(race.water_type ?? "") ? "river" : "beach";
  const queries = [`${place} ${country}`, `${place} ${water}`, `${place} panorama`];
  if (geoLabel && !geoLabel.toLowerCase().startsWith(place.toLowerCase())) queries.push(geoLabel.split(",").slice(0, 2).join(" "));
  const seen = new Map<string, PhotoCand>();
  for (const q of queries) for (const c of await commonsSearch(q)) if (!seen.has(c.url)) seen.set(c.url, c);
  const cands = [...seen.values()].sort((a, b) => b.score - a.score).slice(0, 8);
  const now = new Date().toISOString();
  if (!cands.length) {
    await admin.from("race_photos").upsert({ race_id: race.id, status: "none", note: "nessuna foto con licenza libera trovata", candidates: [], checked_at: now });
    return { status: "none" };
  }
  const imgs: string[] = [];
  const shown: PhotoCand[] = [];
  for (const c of cands) {
    await new Promise((r) => setTimeout(r, 300)); // gentile con Wikimedia
    const b = await thumb64(c.url) ?? (await new Promise((r) => setTimeout(r, 2000)), await thumb64(c.url));
    if (b) { imgs.push(b); shown.push(c); }
  }
  if (!shown.length) {
    await admin.from("race_photos").upsert({ race_id: race.id, status: "error", note: "miniature non scaricabili", candidates: cands, checked_at: now });
    return { status: "error" };
  }
  const out = await generateStructured<{ pick: number; focus_x: number; reason: string }>({
    system: "You pick background photos for social media graphics about triathlon race venues. Be strict about what is in the photo.",
    prompt: `These ${shown.length} photos (in order, numbered from 1) are candidates for the race venue "${race.name}" (${country}). Titles: ${shown.map((c, i) => `${i + 1}. ${c.title}`).join(" | ")}.
Pick the ONE best photo for a striking, readable background: it must clearly show this place (sea, lake, beach, waterfront, landscape or skyline), be sharp and well exposed, and have NO people recognisable in the foreground, no visible text, signs, logos, brands, vehicles as the subject, no interiors, no maps. Prefer wide scenic views with calm areas where text can sit. If none qualifies, return pick 0.
focus_x: horizontal position (0 = left edge, 1 = right edge) of the most important part of the photo, for a vertical 4:5 crop.`,
    schema: { type: "object", additionalProperties: false, required: ["pick", "focus_x", "reason"], properties: { pick: { type: "integer" }, focus_x: { type: "number" }, reason: { type: "string" } } },
    images: imgs,
    model: TRANSLATE_MODEL,
    effort: "low",
    maxTokens: 800,
  });
  if (!out.ok || !out.data) {
    await admin.from("race_photos").upsert({ race_id: race.id, status: "error", note: out.error ?? "scelta fallita", candidates: shown, checked_at: now });
    return { status: "error", note: out.error };
  }
  const k = out.data.pick;
  if (!k || k < 1 || k > shown.length) {
    await admin.from("race_photos").upsert({ race_id: race.id, status: "none", note: out.data.reason, candidates: shown, checked_at: now });
    return { status: "none", note: out.data.reason };
  }
  const c = shown[k - 1];
  await admin.from("race_photos").upsert({
    race_id: race.id, status: "ok", url: c.url, page_url: c.page, title: c.title, author: c.author, license: c.license, license_url: c.license_url,
    width: c.w, height: c.h, focus_x: Math.min(1, Math.max(0, out.data.focus_x ?? 0.5)), picked_by: "ai", note: out.data.reason, candidates: shown, checked_at: now,
  });
  return { status: "ok", title: c.title, note: out.data.reason };
}

/** Credito da stampare sulla grafica. */
export function photoCredit(p: { author?: string | null; license?: string | null }): string {
  const lic = (p.license ?? "").replace(/^public domain$/i, "Public domain");
  return `Photo: ${p.author ?? "unknown"} · ${lic} · Wikimedia Commons`;
}

/** Foto ritagliata per la grafica (JPEG), con ritaglio sul punto focale. */
export async function photoCrop(url: string, w: number, h: number, focusX = 0.5): Promise<Buffer | null> {
  const r = await fetch(url, { headers: { "user-agent": PHOTO_UA }, signal: AbortSignal.timeout(25_000) }).catch(() => null);
  if (!r?.ok) return null;
  const img = sharp(Buffer.from(await r.arrayBuffer()));
  const m = await img.metadata();
  if (!m.width || !m.height) return null;
  const scale = Math.max(w / m.width, h / m.height);
  const sw = Math.round(m.width * scale), sh = Math.round(m.height * scale);
  const left = Math.max(0, Math.min(sw - w, Math.round(sw * focusX - w / 2)));
  const top = Math.max(0, Math.round((sh - h) / 2));
  return img.resize(sw, sh).extract({ left, top, width: w, height: h }).jpeg({ quality: 88 }).toBuffer().catch(() => null);
}
