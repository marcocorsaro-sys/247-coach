// ============================================================================
// Lingue del sito pubblico 24/7 Coach: una per ogni paese europeo con gare
// Ironman/70.3. Sorgente dei contenuti: it. Default per visitatori sconosciuti: en.
// URL: /{lang}/{sezione gare localizzata}/{slug}  es. /de/rennen/ironman-nizza-2027
// ============================================================================
export const LANGS = ["en", "it", "de", "fr", "es", "pt", "nl", "da", "sv", "no", "fi", "pl"] as const;
export type Lang = (typeof LANGS)[number];
export const SOURCE_LANG: Lang = "it";
export const DEFAULT_LANG: Lang = "en";

export const LANG_NAME: Record<Lang, string> = {
  en: "English", it: "Italiano", de: "Deutsch", fr: "Français", es: "Español", pt: "Português",
  nl: "Nederlands", da: "Dansk", sv: "Svenska", no: "Norsk", fi: "Suomi", pl: "Polski",
};
export const LOCALE: Record<Lang, string> = {
  en: "en-GB", it: "it-IT", de: "de-DE", fr: "fr-FR", es: "es-ES", pt: "pt-PT", nl: "nl-NL", da: "da-DK", sv: "sv-SE", no: "nb-NO", fi: "fi-FI", pl: "pl-PL",
};
export const OG_LOCALE: Record<Lang, string> = {
  en: "en_GB", it: "it_IT", de: "de_DE", fr: "fr_FR", es: "es_ES", pt: "pt_PT", nl: "nl_NL", da: "da_DK", sv: "sv_SE", no: "nb_NO", fi: "fi_FI", pl: "pl_PL",
};
/** Segmento URL della sezione gare, per lingua. */
export const RACES_SEG: Record<Lang, string> = {
  en: "races", it: "gare", de: "rennen", fr: "courses", es: "carreras", pt: "provas", nl: "wedstrijden",
  da: "loeb", sv: "lopp", no: "loep", fi: "kilpailut", pl: "zawody",
};

export function isLang(x: string | undefined | null): x is Lang {
  return Boolean(x) && (LANGS as readonly string[]).includes(x as string);
}
export function langFromSeg(seg: string): Lang | null {
  const hit = (Object.entries(RACES_SEG) as [Lang, string][]).find(([, s]) => s === seg);
  return hit ? hit[0] : null;
}
/** Sceglie la lingua dall'header Accept-Language. */
export function pickLang(accept: string | null | undefined): Lang {
  if (!accept) return DEFAULT_LANG;
  const prefs = accept.split(",").map((p) => { const [tag, q] = p.trim().split(";q="); return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 }; }).sort((a, b) => b.q - a.q);
  for (const p of prefs) {
    const base = p.tag.split("-")[0];
    const norm = base === "nb" || base === "nn" ? "no" : base;
    if (isLang(norm)) return norm;
  }
  return DEFAULT_LANG;
}
export const sitePath = (lang: Lang, ...rest: string[]) => `/${[lang, ...rest].filter(Boolean).join("/")}`;
export const racesPath = (lang: Lang) => sitePath(lang, RACES_SEG[lang]);
