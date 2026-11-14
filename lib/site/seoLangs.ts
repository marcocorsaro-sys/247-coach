// ============================================================================
// SEO multilingua: una pagina esiste "davvero" in una lingua solo se il suo
// contenuto è tradotto. Le versioni non tradotte (testo italiano dentro la
// cornice di un'altra lingua) sono duplicati: noindex,follow, canonical alla
// versione italiana, fuori da hreflang e sitemap. Così Google non spreca la
// scansione su migliaia di copie identiche e non sceglie canonici a caso.
// ============================================================================
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { LANGS, SOURCE_LANG, type Lang } from "@/lib/i18n/config";

type Tbl = "event_race_translations" | "event_race_article_translations" | "site_magazine_translations";
const KEY: Record<Tbl, string> = { event_race_translations: "race_id", event_race_article_translations: "article_id", site_magazine_translations: "post_id" };

/** Lingue in cui il contenuto esiste (sorgente + traduzioni presenti). */
export async function availableLangs(tbl: Tbl, id: string): Promise<Lang[]> {
  const { data } = await createPublicClient().from(tbl).select("lang").eq(KEY[tbl], id);
  const have = new Set<string>([SOURCE_LANG, ...((data ?? []) as { lang: string }[]).map((r) => r.lang)]);
  return LANGS.filter((l) => have.has(l));
}

/** Mappa id → lingue disponibili, per la sitemap (una query per tabella). */
export async function availableLangsMap(tbl: Tbl): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data } = await createPublicClient().from(tbl).select(`${KEY[tbl]},lang`).range(from, from + page - 1);
    const rows = (data ?? []) as unknown as Record<string, string>[];
    for (const r of rows) {
      const k = r[KEY[tbl]];
      if (!out.has(k)) out.set(k, new Set([SOURCE_LANG]));
      out.get(k)!.add(r.lang);
    }
    if (rows.length < page) break;
  }
  return out;
}

export function hasLang(map: Map<string, Set<string>>, id: string, lang: Lang): boolean {
  return lang === SOURCE_LANG || !!map.get(id)?.has(lang);
}

/** canonical, hreflang (solo lingue tradotte + x-default) e robots per una pagina. */
export function seoFor(lang: Lang, avail: Lang[], pathFor: (l: Lang) => string): Pick<Metadata, "alternates" | "robots"> {
  const translated = avail.includes(lang);
  const languages: Record<string, string> = Object.fromEntries(avail.map((l) => [l, pathFor(l)]));
  languages["x-default"] = pathFor(avail.includes("en") ? "en" : SOURCE_LANG);
  return {
    alternates: { canonical: translated ? pathFor(lang) : pathFor(SOURCE_LANG), languages },
    ...(translated ? {} : { robots: { index: false, follow: true } }),
  };
}
