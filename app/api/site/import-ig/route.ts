// Importa le foto Instagram curate (lib/site/seed/*-ig.json): le copia nello storage
// (le URL del CDN Instagram scadono) e crea event_race_media. Idempotente.
// GET /api/site/import-ig?secret=…&slug=lanzarote-2027
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSecret } from "@/lib/site/admin";
import { IG_SEEDS } from "@/lib/site/seed/ig";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const posts = IG_SEEDS[slug];
  if (!posts) return NextResponse.json({ error: `nessun file IG per ${slug}`, disponibili: Object.keys(IG_SEEDS) }, { status: 400 });
  const admin = createAdminClient();
  const { data: race } = await admin.from("event_races").select("id").eq("slug", slug).maybeSingle();
  if (!race) return NextResponse.json({ error: "gara non trovata" }, { status: 404 });
  const done: string[] = [], failed: string[] = [];
  for (const p of posts) {
    try {
      const r = await fetch(p.img);
      if (!r.ok) throw new Error(`img ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const path = `${slug}/${p.shortCode}.jpg`;
      const up = await admin.storage.from("race-media").upload(path, buf, { contentType: r.headers.get("content-type") ?? "image/jpeg", upsert: true });
      if (up.error) throw new Error(up.error.message);
      const thumb = admin.storage.from("race-media").getPublicUrl(path).data.publicUrl;
      const { error } = await admin.from("event_race_media").upsert({
        race_id: (race as { id: string }).id, platform: "instagram", media_type: "photo", url: p.url, embed_id: p.shortCode,
        author: p.handle, author_handle: p.handle, caption: p.caption || null, thumbnail_url: thumb, taken_at: p.date, edition_year: p.year,
        likes: p.likes, published: true, featured: p.likes >= 100,
      }, { onConflict: "race_id,url" });
      if (error) throw new Error(error.message);
      done.push(p.shortCode);
    } catch (e) { failed.push(`${p.shortCode}: ${(e as Error).message}`); }
  }
  return NextResponse.json({ slug, done: done.length, failed });
}
