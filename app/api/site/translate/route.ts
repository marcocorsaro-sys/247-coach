// Traduzioni via Claude.
//  UI:        GET /api/site/translate?secret=…&ui=1[&langs=de,fr]        (default: tutte tranne en/it)
//  Gara:      GET /api/site/translate?secret=…&slug=nizza-2027[&langs=en,de][&articles=1]
// Una lingua alla volta per stare nei 300 s: con molte lingue, chiama più volte.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSecret } from "@/lib/site/admin";
import { isLang, LANGS, type Lang } from "@/lib/i18n/config";
import { translateArticles, translatePlaces, translateRace, translateUi } from "@/lib/site/translate";
import type { Race, RaceArticle, RaceReview, RaceSegment } from "@/lib/site/races";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const langsParam = (url.searchParams.get("langs") ?? "").split(",").map((s) => s.trim()).filter(isLang) as Lang[];
  const admin = createAdminClient();

  if (url.searchParams.get("ui") === "1") {
    const langs = langsParam.length ? langsParam : LANGS.filter((l) => l !== "en" && l !== "it");
    const results = [];
    for (const lang of langs) results.push(await translateUi(admin, lang));
    return NextResponse.json({ ui: results });
  }

  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug o ui=1 mancante" }, { status: 400 });
  const { data } = await admin.from("event_races").select("*").eq("slug", slug).maybeSingle();
  const race = data as Race | null;
  if (!race) return NextResponse.json({ error: `gara ${slug} non trovata` }, { status: 404 });
  const [seg, rev, art] = await Promise.all([
    admin.from("event_race_segments").select("*").eq("race_id", race.id).order("leg").order("position"),
    admin.from("event_race_reviews").select("*").eq("race_id", race.id).eq("published", true),
    url.searchParams.get("articles") === "1" ? admin.from("event_race_articles").select("*").eq("race_id", race.id).eq("published", true) : Promise.resolve({ data: [] }),
  ]);
  const langs = langsParam.length ? langsParam : LANGS.filter((l) => l !== "it");
  const results = [];
  if (url.searchParams.get("places") === "1") {
    const { data: pl } = await admin.from("event_race_places").select("id,title,body").eq("race_id", race.id).eq("published", true);
    for (const lang of langs) results.push(await translatePlaces(admin, (pl ?? []) as { id: string; title: string; body: string | null }[], lang));
    return NextResponse.json({ slug, places: results });
  }
  for (const lang of langs) {
    const r = await translateRace(admin, race, (seg.data ?? []) as RaceSegment[], (rev.data ?? []) as RaceReview[], lang);
    const a = (art.data ?? []).length ? await translateArticles(admin, (art.data ?? []) as RaceArticle[], lang) : null;
    results.push({ ...r, articles: a });
  }
  return NextResponse.json({ slug, results });
}
