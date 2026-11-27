import type { MetadataRoute } from "next";
import { IS_AI_APP } from "@/lib/branding";
import { listRaces, racePath } from "@/lib/site/races";
import { LANGS, racesPath, sitePath } from "@/lib/i18n/config";
import { createPublicClient } from "@/lib/supabase/public";
import { availableLangsMap, hasLang } from "@/lib/site/seoLangs";
import { COACH_PAGES, coachPath } from "@/lib/site/coach";
import { EDITIONS, athletesPath, editionPath } from "@/lib/site/athletes";
import { TOPIC_FACET, dataFacetPath, dataFacetsFor, facetPath, facetsFor } from "@/lib/site/facets";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://247coachai.com";
  if (!IS_AI_APP) return [];
  const races = await listRaces();
  // Solo le versioni davvero tradotte: le altre sono duplicati in italiano (noindex).
  const [raceTr, artTr, magTr] = await Promise.all([
    availableLangsMap("event_race_translations"),
    availableLangsMap("event_race_article_translations"),
    availableLangsMap("site_magazine_translations"),
  ]);
  const out: MetadataRoute.Sitemap = [{ url: `${base}/privacy`, priority: 0.2 }, { url: `${base}/terms`, priority: 0.2 }];
  for (const l of ["en", "it"] as const) for (const k of COACH_PAGES) out.push({ url: `${base}${coachPath(l, k)}`, changeFrequency: "weekly", priority: k === "hub" ? 0.9 : 0.8 });
  for (const l of ["en", "it"] as const) {
    out.push({ url: `${base}${athletesPath(l)}`, changeFrequency: "weekly", priority: 0.8 });
    for (const e of EDITIONS) out.push({ url: `${base}${editionPath(l, e.id)}`, changeFrequency: "monthly", priority: 0.6 });
  }
  for (const lang of LANGS) {
    out.push({ url: `${base}${sitePath(lang)}`, changeFrequency: "daily", priority: lang === "en" || lang === "it" ? 1 : 0.8 });
    out.push({ url: `${base}${racesPath(lang)}`, changeFrequency: "daily", priority: 0.9 });
    out.push({ url: `${base}/${lang}/calc`, changeFrequency: "monthly", priority: 0.8 });
    for (const r of races) if (hasLang(raceTr, r.id, lang)) out.push({ url: `${base}${racePath(r, lang)}`, changeFrequency: "weekly", priority: 0.8 });
  }
  const { data: mag } = await createPublicClient().from("site_magazine_posts").select("id,slug,updated_at").eq("published", true);
  for (const lang of LANGS) {
    out.push({ url: `${base}/${lang}/magazine`, changeFrequency: "daily", priority: 0.8 });
    for (const m of (mag ?? []) as { id: string; slug: string; updated_at: string }[]) if (hasLang(magTr, m.id, lang)) out.push({ url: `${base}/${lang}/magazine/${m.slug}`, lastModified: m.updated_at, changeFrequency: "weekly", priority: 0.6 });
  }
  // Pagine facet (percorso nuoto/bici/corsa, giorno gara, viaggio): URL parlanti tradotti.
  const sb = createPublicClient();
  const [{ data: arts }, { data: rx }, { data: pl }, { data: fx }, { data: rv }] = await Promise.all([
    sb.from("event_race_articles").select("id,topic,race_id,updated_at").eq("published", true),
    sb.from("event_races").select("id,legs,splits,logistics").eq("status", "published"),
    sb.from("event_race_places").select("race_id").eq("published", true),
    sb.from("event_race_facts").select("race_id,climate,bike_shops,official,results,updated_at"),
    sb.from("event_race_reviews").select("race_id").eq("published", true),
  ]);
  const factsBy = new Map(((fx ?? []) as ({ race_id: string; updated_at: string } & Record<string, unknown>)[]).map((x) => [x.race_id, x]));
  const revCount = new Map<string, number>();
  for (const x of (rv ?? []) as { race_id: string }[]) revCount.set(x.race_id, (revCount.get(x.race_id) ?? 0) + 1);
  const withPlaces = new Set(((pl ?? []) as { race_id: string }[]).map((x) => x.race_id));
  const artsBy = new Map<string, { id: string; topic: string; updated_at: string }[]>();
  for (const a of (arts ?? []) as { id: string; topic: string; race_id: string; updated_at: string }[]) {
    if (!artsBy.has(a.race_id)) artsBy.set(a.race_id, []);
    artsBy.get(a.race_id)!.push(a);
  }
  const extra = new Map(((rx ?? []) as { id: string; legs: unknown; splits: unknown; logistics: unknown }[]).map((x) => [x.id, x]));
  for (const r of races) {
    const x = extra.get(r.id);
    if (!x) continue;
    const ra = artsBy.get(r.id) ?? [];
    const fs = facetsFor({ race: { legs: x.legs, splits: x.splits, logistics: x.logistics }, articles: ra, places: withPlaces.has(r.id) ? [1] : [] });
    for (const lang of LANGS) {
      if (!hasLang(raceTr, r.id, lang)) continue;
      for (const f of fs) {
        const a = ra.find((y) => TOPIC_FACET[y.topic] === f);
        if (a && !hasLang(artTr, a.id, lang)) continue;
        out.push({ url: `${base}${facetPath(racePath(r, lang), lang, f)}`, lastModified: a?.updated_at, changeFrequency: "monthly", priority: f === "bike" || f === "run" || f === "swim" ? 0.8 : 0.7 });
      }
      const fr = factsBy.get(r.id) ?? null;
      for (const df of dataFacetsFor(fr, revCount.get(r.id) ?? 0)) {
        out.push({ url: `${base}${dataFacetPath(racePath(r, lang), lang, df)}`, lastModified: fr?.updated_at, changeFrequency: df === "registration" || df === "results" ? "weekly" : "monthly", priority: df === "results" || df === "registration" || df === "weather" ? 0.8 : 0.6 });
      }
    }
  }
  return out;
}
