// ============================================================================
// Traduzioni mancanti del sito, a lotti (cron ogni 10 minuti).
// Ogni giro, entro ~240 s, traduce quello che manca in quest'ordine:
// schede gara → articoli-guida → magazine, lingue a partire dalle più grandi.
// Quando è tutto tradotto il giro non fa nulla (solo qualche query).
// GET /api/site/translate-backfill  (cron, Authorization: Bearer CRON_SECRET) o ?secret=
//   &dry=1  → solo conteggi di ciò che manca
// ============================================================================
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { translateArticles, translateRace } from "@/lib/site/translate";
import { translateMagazine, type MagPost } from "@/lib/site/magazine";
import type { Race, RaceArticle, RaceReview, RaceSegment } from "@/lib/site/races";
import type { Lang } from "@/lib/i18n/config";

export const maxDuration = 300;
const ORDER: Lang[] = ["de", "fr", "es", "nl", "pt", "pl", "da", "sv", "no", "fi", "en"];
const BUDGET_MS = 240_000;

async function have(admin: ReturnType<typeof createAdminClient>, tbl: string, key: string): Promise<Set<string>> {
  const s = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await admin.from(tbl as never).select(`${key},lang`).range(from, from + 999);
    const rows = (data ?? []) as unknown as Record<string, string>[];
    for (const r of rows) s.add(`${r[key]}|${r.lang}`);
    if (rows.length < 1000) break;
  }
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const ok = secret && (url.searchParams.get("secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const t0 = Date.now();
  const left = () => BUDGET_MS - (Date.now() - t0);
  const admin = createAdminClient();

  const [{ data: races }, { data: arts }, { data: posts }, raceHave, artHave, magHave] = await Promise.all([
    admin.from("event_races").select("*"),
    admin.from("event_race_articles").select("*").eq("published", true),
    admin.from("site_magazine_posts").select("*").eq("published", true),
    have(admin, "event_race_translations", "race_id"),
    have(admin, "event_race_article_translations", "article_id"),
    have(admin, "site_magazine_translations", "post_id"),
  ]);
  const R = (races ?? []) as Race[];
  const A = (arts ?? []) as RaceArticle[] & { id: string; race_id: string }[];
  const P = (posts ?? []) as MagPost[];
  const todoRace = ORDER.flatMap((l) => R.filter((r) => !raceHave.has(`${r.id}|${l}`)).map((r) => ({ r, l })));
  const todoArt = ORDER.flatMap((l) => (A as unknown as (RaceArticle & { id: string })[]).filter((a) => !artHave.has(`${a.id}|${l}`)).map((a) => ({ a, l })));
  const todoMag = ORDER.flatMap((l) => P.filter((p) => !magHave.has(`${p.id}|${l}`)).map((p) => ({ p, l })));
  const counts = { races: todoRace.length, articles: todoArt.length, magazine: todoMag.length };
  if (url.searchParams.get("dry") === "1") return NextResponse.json({ todo: counts });

  const done = { races: 0, articles: 0, magazine: 0 };
  const errors: string[] = [];
  // 4 traduzioni in parallelo per giro: ~4 volte più veloce senza sforare i limiti dell'API.
  const PAR = 4;
  async function run<T>(items: T[], minLeft: number, fn: (x: T) => Promise<void>) {
    for (let i = 0; i < items.length; i += PAR) {
      if (left() < minLeft) break;
      await Promise.all(items.slice(i, i + PAR).map((x) => fn(x).catch((e) => { errors.push((e as Error).message); })));
    }
  }
  await run(todoRace, 70_000, async ({ r, l }) => {
    const [seg, rev] = await Promise.all([
      admin.from("event_race_segments").select("*").eq("race_id", r.id).order("leg").order("position"),
      admin.from("event_race_reviews").select("*").eq("race_id", r.id).eq("published", true),
    ]);
    const x = await translateRace(admin as never, r, (seg.data ?? []) as RaceSegment[], (rev.data ?? []) as RaceReview[], l);
    if (x.ok) done.races++; else errors.push(`race ${r.slug}/${l}: ${x.error}`);
  });
  await run(todoArt, 45_000, async ({ a, l }) => {
    const x = await translateArticles(admin as never, [a], l);
    done.articles += x.done;
    errors.push(...x.errors.map((e) => `art/${l}: ${e}`));
  });
  await run(todoMag, 45_000, async ({ p, l }) => {
    const x = await translateMagazine(admin as never, p, l);
    if (x.ok) done.magazine++; else errors.push(`mag ${p.slug}/${l}: ${x.error}`);
  });
  if (errors.length) console.error("[translate-backfill]", errors.slice(0, 10));
  return NextResponse.json({ todo: counts, done, errors: errors.slice(0, 10), ms: Date.now() - t0 });
}
