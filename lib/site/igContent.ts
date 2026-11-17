// ============================================================================
// Palinsesto Instagram @247coachai: testi dei caroselli (slide + didascalia)
// nella lingua del paese della gara, scritti da Claude SOLO con i dati del sito
// (event_races + event_race_facts). Le immagini le disegna /ig-media/[id]/[n].
// Tipi di post per gara: course (12 settimane prima), weather (6 settimane),
// raceweek (settimana gara), results (2 giorni dopo, solo con i risultati
// dell'edizione appena corsa).
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateStructured, AI_MODEL } from "@/lib/ai/claude";
import { racePath, type Race } from "@/lib/site/races";
import { DATA_FACET_I18N, FACET_I18N, dataFacetPath, facetPath } from "@/lib/site/facets";
import type { Lang } from "@/lib/i18n/config";

export type IgSlide = {
  kicker: string;
  title: string;
  accent?: string | null;
  cells?: { v: string; l: string }[] | null;
  lines?: string[] | null;
  winners?: { label: string; name: string; time: string }[] | null;
  cta?: { title: string; url: string } | null;
};
export type IgContent = { slides: IgSlide[]; caption: string; url: string; lang: string };

const LANG_NAME: Record<string, string> = { it: "Italian", en: "English", de: "German", fr: "French", es: "Spanish", pt: "Portuguese", nl: "Dutch", da: "Danish", sv: "Swedish", no: "Norwegian", fi: "Finnish", pl: "Polish" };
const SITE = "247coachai.com";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["slides", "caption"],
  properties: {
    caption: { type: "string" },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kicker", "title"],
        properties: {
          kicker: { type: "string" },
          title: { type: "string" },
          accent: { type: ["string", "null"] },
          cells: { type: ["array", "null"], items: { type: "object", additionalProperties: false, required: ["v", "l"], properties: { v: { type: "string" }, l: { type: "string" } } } },
          lines: { type: ["array", "null"], items: { type: "string" } },
          winners: { type: ["array", "null"], items: { type: "object", additionalProperties: false, required: ["label", "name", "time"], properties: { label: { type: "string" }, name: { type: "string" }, time: { type: "string" } } } },
          cta: { type: ["object", "null"], additionalProperties: false, required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string" } } },
        },
      },
    },
  },
};

const BRIEF: Record<string, string> = {
  course: "COURSE carousel, 4 slides: 1) cover: kicker = race date and region, title = race name (e.g. 'IRONMAN 70.3 JESOLO'), cells = swim/bike/run km (bike cell label mentions elevation gain); 2) bike course: the 2-3 key facts from the segments/notes (cells with numbers + 1-2 short lines); 3) run course + a pacing tip from the data; 4) CTA slide: 2-3 short lines on what else is on the site (results, registration, weather, bike shops) + cta {title, url}.",
  weather: "WEATHER carousel, 4 slides: 1) cover: kicker = race date, title = race name, accent line like 'what weather to expect'; 2) cells: average max, average min, rain days %, wind (from climate); 3) water temperature (sea data and/or organiser figure) and wetsuit note if present, cells + 1-2 lines; 4) CTA slide pointing to the weather page.",
  raceweek: "RACE WEEK carousel, 4 slides: 1) cover: 'race week' + race name + date; 2) start times and cut-off times if present (cells), otherwise course numbers; 3) race-day weather in short (cells: max, water, wind) + 2 lines of practical advice drawn ONLY from the data (heat, wind, cold water); 4) CTA to the race page (results of last edition, bike shops near the venue).",
  results: "RESULTS carousel, 4 slides: 1) cover: 'results' + race name + year; 2) winners: overall men and women (winners array with label, name, time); 3) numbers: finishers, DNF, median times (cells); 4) CTA to the results page with all age-group winners.",
};

function pagesFor(r: Race, lang: Lang) {
  const rp = racePath(r, lang);
  return {
    race: `${SITE}${rp}`,
    bike: `${SITE}${facetPath(rp, lang, "bike")}`,
    run: `${SITE}${facetPath(rp, lang, "run")}`,
    results: `${SITE}${dataFacetPath(rp, lang, "results")}`,
    weather: `${SITE}${dataFacetPath(rp, lang, "weather")}`,
    registration: `${SITE}${dataFacetPath(rp, lang, "registration")}`,
    _labels: { bike: FACET_I18N[lang].bike.label, results: DATA_FACET_I18N[lang].results.label },
  };
}

/** Prepara il contenuto di un post del palinsesto. null = da saltare (dati mancanti). */
export async function buildIgContent(admin: SupabaseClient, plan: { id: string; race_id: string; kind: string; lang: string }): Promise<{ content: IgContent | null; skip?: string; error?: string }> {
  const { data: race } = await admin.from("event_races").select("*").eq("id", plan.race_id).maybeSingle();
  if (!race) return { content: null, skip: "gara non trovata" };
  const { data: facts } = await admin.from("event_race_facts").select("geo_label,climate,water,official,results,results_year").eq("race_id", plan.race_id).maybeSingle();
  const { data: segs } = await admin.from("event_race_segments").select("leg,km_from,km_to,title,note,grade_pct,dplus_m").eq("race_id", plan.race_id).order("leg").order("position").limit(14);
  const r = race as Race & Record<string, unknown>;
  const year = Number(String(r.race_date ?? "").slice(0, 4));
  if (plan.kind === "results" && (!facts?.results || Number(facts.results_year) !== year)) return { content: null, skip: "risultati dell'edizione non ancora disponibili" };
  if (plan.kind === "weather" && !facts?.climate) return { content: null, skip: "meteo mancante" };
  const lang = (plan.lang in LANG_NAME ? plan.lang : "en") as Lang;
  const pages = pagesFor(r, lang);
  const ctaUrl = plan.kind === "results" ? pages.results : plan.kind === "weather" ? pages.weather : plan.kind === "course" ? pages.bike : pages.race;
  const off = (facts?.official ?? {}) as Record<string, unknown>;
  const res = (facts?.results ?? null) as Record<string, unknown> | null;
  const data = {
    race: { name: r.name, official_name: r.official_name, distance: r.distance === "half" ? "IRONMAN 70.3" : "IRONMAN", date: r.race_date, city: r.city, country: r.country, place: facts?.geo_label, swim_km: r.swim_km, bike_km: r.bike_km, bike_elevation_m: r.bike_dplus_m, run_km: r.run_km, water_type: r.water_type, tagline: r.tagline },
    segments: segs ?? [],
    climate: facts?.climate ? (({ by_year: _b, ...c }) => c)(facts.climate as Record<string, unknown>) : null,
    water: facts?.water ?? null,
    official: { status: off.status, start_times: off.start_times, cutoffs: off.cutoffs, temps: off.temps, wetsuit_note: off.wetsuit_note },
    results: res ? { year: res.year, starters: res.starters, finishers: res.finishers, dnf: res.dnf, median: res.median, overall_men: (res.overall as { M?: unknown[] })?.M?.slice(0, 1), overall_women: (res.overall as { F?: unknown[] })?.F?.slice(0, 1) } : null,
  };
  const out = await generateStructured<{ slides: IgSlide[]; caption: string }>({
    system: `You write Instagram carousels for 24/7 Coach (247coachai.com), an independent site about every IRONMAN and IRONMAN 70.3 race. Write EVERYTHING in ${LANG_NAME[lang]}. Use ONLY facts and numbers present in the DATA; never invent times, prices, records or claims. Numbers keep the locale's decimal separator. Slide texts are short: kicker max 40 characters, title max 28 characters (it is printed huge, uppercase), accent max 28 characters (second title line in orange), cell values max 9 characters, cell labels max 26 characters, lines max 90 characters, max 4 cells and max 3 lines per slide. Caption: 2-3 short paragraphs (hook with one concrete number, what the post shows, 'link in bio' / the page), then 5-7 hashtags: race-specific ones (e.g. #im703jesolo #ironmanlanzarote), country/language ones and #triathlon #ironman. No emojis except at most one. Never say we are affiliated with IRONMAN.`,
    prompt: `${BRIEF[plan.kind]}\nThe CTA url must be exactly: ${ctaUrl}\n\nDATA:\n${JSON.stringify(data)}`,
    schema: SCHEMA,
    effort: "medium",
    model: AI_MODEL,
    maxTokens: 6000,
  });
  if (!out.ok || !out.data?.slides?.length) return { content: null, error: "generazione fallita" };
  return { content: { slides: out.data.slides.slice(0, 6), caption: out.data.caption, url: ctaUrl, lang } };
}
