// Genera gli articoli per tema di una gara dalle fonti indicizzate.
// GET /api/site/articles?secret=CRON_SECRET&slug=nizza-2027[&publish=1][&topics=bike,run]
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSecret } from "@/lib/site/admin";
import { generateRaceArticles } from "@/lib/site/articles";
import type { Race, RaceSource } from "@/lib/site/races";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug mancante" }, { status: 400 });
  const publish = url.searchParams.get("publish") === "1";
  const topics = (url.searchParams.get("topics") ?? "").split(",").map((s) => s.trim()).filter(Boolean) as never[];

  const admin = createAdminClient();
  const { data } = await admin.from("event_races").select("*").eq("slug", slug).maybeSingle();
  const race = data as Race | null;
  if (!race) return NextResponse.json({ error: `gara ${slug} non trovata` }, { status: 404 });
  const { data: src } = await admin.from("event_race_sources").select("id,kind,platform,url,title,author,author_handle,published_at,edition_year,lang,excerpt,thumbnail_url,topics,quality").eq("race_id", race.id).gte("quality", 2).order("quality", { ascending: false }).limit(60);
  const r = await generateRaceArticles(admin, race, (src ?? []) as RaceSource[], { publish, topics: topics.length ? topics : undefined });
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
