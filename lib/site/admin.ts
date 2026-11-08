// ============================================================================
// Scritture sul catalogo gare (service role): seed di una scheda, upsert di
// fonti/media raccolti, salvataggio articoli. Solo lato server, chiamato
// dalle route /api/site/* protette da CRON_SECRET.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RaceSeed } from "@/lib/site/seed/types";

export function checkSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const got = new URL(req.url).searchParams.get("secret");
  return Boolean(secret) && got === secret;
}

export async function raceIdBySlug(admin: SupabaseClient, slug: string): Promise<string | null> {
  const { data } = await admin.from("event_races").select("id").eq("slug", slug).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export interface SourceRow {
  kind: string; platform?: string | null; url: string; title?: string | null; author?: string | null; author_handle?: string | null;
  published_at?: string | null; edition_year?: number | null; lang?: string | null; excerpt?: string | null; thumbnail_url?: string | null;
  topics?: string[] | null; quality?: number; fetched_via?: string | null; raw?: unknown;
}
export interface MediaRow {
  platform: string; media_type: string; url: string; embed_id?: string | null; author?: string | null; author_handle?: string | null;
  caption?: string | null; thumbnail_url?: string | null; taken_at?: string | null; edition_year?: number | null; leg?: string | null;
  likes?: number | null; views?: number | null; featured?: boolean; published?: boolean; source_id?: string | null;
}

/** Rimuove caratteri che Postgres rifiuta nel JSON (\u0000, surrogati spaiati da slice su emoji). */
function cleanStr(v: unknown): unknown {
  if (typeof v === "string") return v.replace(/\u0000/g, "").replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
  if (Array.isArray(v)) return v.map(cleanStr);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, cleanStr(x)]));
  return v;
}

export async function upsertSources(admin: SupabaseClient, raceId: string, rows: SourceRow[]): Promise<number> {
  if (!rows.length) return 0;
  const seen = new Set<string>();
  const payload = rows.filter((r) => r.url && !seen.has(r.url) && seen.add(r.url)).map((r) => cleanStr({ ...r, race_id: raceId, quality: r.quality ?? 2 }) as Record<string, unknown>);
  const { error, data } = await admin.from("event_race_sources").upsert(payload, { onConflict: "race_id,url", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(`sources: ${error.message}`);
  return data?.length ?? 0;
}

export async function upsertMedia(admin: SupabaseClient, raceId: string, rows: MediaRow[]): Promise<number> {
  if (!rows.length) return 0;
  const seen = new Set<string>();
  const payload = rows.filter((r) => r.url && !seen.has(r.url) && seen.add(r.url)).map((r) => cleanStr({ published: true, ...r, race_id: raceId }) as Record<string, unknown>);
  const { error, data } = await admin.from("event_race_media").upsert(payload, { onConflict: "race_id,url", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(`media: ${error.message}`);
  return data?.length ?? 0;
}

/** Applica un seed completo (idempotente): scheda, segmenti, recensioni, fonti, media. */
export async function applySeed(admin: SupabaseClient, seed: RaceSeed) {
  const id = await raceIdBySlug(admin, seed.slug);
  if (!id) throw new Error(`gara ${seed.slug} non trovata: inserisci prima la riga in event_races`);
  const { error: e1 } = await admin.from("event_races").update({ ...seed.race, updated_at: new Date().toISOString() }).eq("id", id);
  if (e1) throw new Error(`race: ${e1.message}`);

  let segments = 0;
  if (seed.segments?.length) {
    await admin.from("event_race_segments").delete().eq("race_id", id);
    const { error } = await admin.from("event_race_segments").insert(seed.segments.map((s) => ({ ...s, race_id: id })));
    if (error) throw new Error(`segments: ${error.message}`);
    segments = seed.segments.length;
  }
  let reviews = 0;
  for (const rv of seed.reviews ?? []) {
    const { data: ex } = await admin.from("event_race_reviews").select("id").eq("race_id", id).eq("source", rv.source).eq("title", rv.title).maybeSingle();
    const row = { ...rv, race_id: id, published: true };
    const { error } = ex ? await admin.from("event_race_reviews").update(row).eq("id", (ex as { id: string }).id) : await admin.from("event_race_reviews").insert(row);
    if (error) throw new Error(`reviews: ${error.message}`);
    reviews++;
  }
  const sources = await upsertSources(admin, id, (seed.sources ?? []).map((s) => ({ ...s, fetched_via: "seed" })));
  const media = await upsertMedia(admin, id, seed.media ?? []);
  return { ok: true, slug: seed.slug, segments, reviews, sources_new: sources, media_new: media };
}
