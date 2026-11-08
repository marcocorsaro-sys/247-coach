// Caricamento dizionario per lingua: en/it dal codice, le altre da site_ui_i18n
// (generate da Claude) con fallback chiave per chiave su en. Cache 1 h.
import { EN, IT, fmt, type Dict, type DictKey } from "./dict";
import { createPublicClient } from "@/lib/supabase/public";
import type { Lang } from "./config";

export type { Dict, DictKey };
export { fmt };

const cache = new Map<string, { at: number; dict: Dict }>();
const TTL = 3600_000;

export async function getDict(lang: Lang): Promise<Dict> {
  if (lang === "en") return EN as Dict;
  if (lang === "it") return IT;
  const hit = cache.get(lang);
  if (hit && Date.now() - hit.at < TTL) return hit.dict;
  let dict: Dict = { ...(EN as Dict) };
  try {
    const { data } = await createPublicClient().from("site_ui_i18n").select("dict").eq("lang", lang).maybeSingle();
    const d = (data as { dict?: Partial<Dict> } | null)?.dict;
    if (d) dict = { ...dict, ...Object.fromEntries(Object.entries(d).filter(([k, v]) => k in EN && typeof v === "string" && v)) } as Dict;
  } catch { /* fallback en */ }
  cache.set(lang, { at: Date.now(), dict });
  return dict;
}

/** t(dict) → funzione di traduzione con segnaposto. */
export function tr(dict: Dict) {
  return (k: DictKey, vars?: Record<string, string | number | null | undefined>) => fmt(dict[k] ?? (EN as Dict)[k] ?? k, vars);
}
export type T = ReturnType<typeof tr>;
