import type { MetadataRoute } from "next";
import { IS_AI_APP } from "@/lib/branding";
import { listRaces, racePath } from "@/lib/site/races";
import { LANGS, racesPath, sitePath } from "@/lib/i18n/config";
import { createPublicClient } from "@/lib/supabase/public";
import { availableLangsMap, hasLang } from "@/lib/site/seoLangs";

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
  const { data } = await createPublicClient().from("event_race_articles").select("id,slug,race_id,updated_at").eq("published", true);
  const byId = new Map(races.map((r) => [r.id, r]));
  for (const a of (data ?? []) as { id: string; slug: string; race_id: string; updated_at: string }[]) {
    const r = byId.get(a.race_id);
    if (r) for (const lang of LANGS) if (hasLang(artTr, a.id, lang)) out.push({ url: `${base}${racePath(r, lang)}/${a.slug}`, lastModified: a.updated_at, changeFrequency: "monthly", priority: 0.6 });
  }
  return out;
}
