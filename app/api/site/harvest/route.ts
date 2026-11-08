// Raccolta contenuti per una gara via Apify.
// GET /api/site/harvest?secret=CRON_SECRET&slug=nizza-2027&sources=youtube,instagram,google&limit=30
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSecret } from "@/lib/site/admin";
import { harvestGoogle, harvestInstagram, harvestTerms, harvestYoutube } from "@/lib/site/harvest";
import { SEEDS } from "@/lib/site/seed";
import type { Race } from "@/lib/site/races";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug mancante" }, { status: 400 });
  const wanted = (url.searchParams.get("sources") ?? "youtube,google").split(",").map((s) => s.trim()).filter(Boolean);
  const limit = Number(url.searchParams.get("limit") ?? 30);

  const admin = createAdminClient();
  const { data } = await admin.from("event_races").select("*").eq("slug", slug).maybeSingle();
  const race = data as Race | null;
  if (!race) return NextResponse.json({ error: `gara ${slug} non trovata` }, { status: 404 });
  const terms = harvestTerms(race, SEEDS[slug]);
  // Hashtag Instagram alternativi (es. ?tags=ironman703porec,im703porec) quando quelli derivati dal nome non rendono.
  const tags = (url.searchParams.get("tags") ?? "").split(",").map((t) => t.trim().replace(/^#/, "").toLowerCase()).filter(Boolean);
  if (tags.length) terms.hashtags = tags;

  const out: Record<string, unknown> = { slug, terms };
  for (const s of wanted) {
    try {
      if (s === "youtube") out.youtube = await harvestYoutube(admin, race, race.id, terms, limit);
      else if (s === "instagram") out.instagram = await harvestInstagram(admin, race, race.id, terms, limit);
      else if (s === "google") out.google = await harvestGoogle(admin, race, race.id, terms, Math.min(limit, 30));
      else out[s] = { error: "sorgente sconosciuta" };
    } catch (e) {
      out[s] = { error: (e as Error).message };
    }
  }
  return NextResponse.json(out);
}
