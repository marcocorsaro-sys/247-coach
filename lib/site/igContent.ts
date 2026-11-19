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
  variant?: "cover" | "stat" | "list" | "cta" | "text";
  stat?: { v: string; l: string } | null;
  stats?: { v: string; l: string }[] | null;
  sub?: string | null;
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

const PAIR = { type: "object", additionalProperties: false, required: ["v", "l"], properties: { v: { type: "string" }, l: { type: "string" } } };
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
        required: ["variant", "kicker"],
        properties: {
          variant: { type: "string", enum: ["cover", "stat", "list", "cta", "text"] },
          kicker: { type: "string" },
          title: { type: ["string", "null"] },
          accent: { type: ["string", "null"] },
          sub: { type: ["string", "null"] },
          stat: { anyOf: [PAIR, { type: "null" }] },
          stats: { type: ["array", "null"], items: PAIR },
          lines: { type: ["array", "null"], items: { type: "string" } },
          winners: { type: ["array", "null"], items: { type: "object", additionalProperties: false, required: ["label", "name", "time"], properties: { label: { type: "string" }, name: { type: "string" }, time: { type: "string" } } } },
          cta: { type: ["object", "null"], additionalProperties: false, required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string" } } },
        },
      },
    },
  },
};

const BRIEF: Record<string, string> = {
  course: "COURSE carousel, 4-5 slides: 1) cover: kicker = date, title = place name only (e.g. 'JESOLO'), sub = 'IRONMAN 70.3 · Italy · 1.9 / 90 / 21.1 km'; 2) stat: the bike elevation gain or the key bike fact; 3) stat: the key run fact; 4) optional stat or text with one pacing tip drawn from the data; last) cta to the bike course page.",
  weather: "WEATHER carousel, 4-5 slides: 1) cover: kicker = date, title = place name, sub = 'what weather to expect'; 2) stat: average max temperature on race day; 3) stat: water temperature (with a one-line wetsuit note if the data allows); 4) stat: rain days % or wind; last) cta to the weather page.",
  raceweek: "RACE WEEK carousel, 4-5 slides: 1) cover: kicker = 'Race week · <weekday day month>', title = place name, sub = 'IRONMAN · <country> · swim / bike / run km'; 2) stat: water temperature; 3) stat: the most striking weather number (heat, rain days, wind, humidity); 4) list: last edition finishers and median times (stats, max 3); last) cta to the race page.",
  lineup: "WEEKEND LINEUP, ONE slide only: variant 'list', kicker 'This weekend', title + accent = a short hook about the weekend (e.g. '4 races' / '3 continents'), stats = up to 3 races from RELATED (v = date like '6 DEC', l = short race name like 'IM Busselton' or '70.3 La Quinta'). Caption: one line per race in RELATED with date, place and one number from the data (water or air temperature, climbing).",
  wrap: "WEEKEND WRAP carousel: slide 1 cover (kicker 'Weekend wrap', title = hook max 12 chars, sub = the races covered); then ONE 'list' slide per race in RELATED that has results (max 4): kicker = race name, title 'Winners', winners = overall men and women; last slide cta to the results page of the hook race. If no race in RELATED has results of this year, build it on finishers and medians of the last edition and say the year.",
  numbers: "THE NUMBERS, 2 slides: 1) variant 'stat' or 'list' with the single comparison described in the EDITORIAL BRIEF, using ONLY numbers in TABLE; 2) cta slide. Caption explains what the number means for someone choosing a race.",
  destination: "DESTINATION carousel, 4 slides: 1) cover: kicker 'Registration open' (only if the data says open, otherwise the race date), title = place name, sub = race and date; 2) stat: the most attractive climate or water number; 3) stat: the course character in one number (bike climbing); 4) cta to the race page. Caption: why travel there, registration status as in the data.",
  trainsmart: "TRAIN SMART, 2 slides: 1) variant 'text': kicker = '<N> weeks to <place>' using weeks_to_race, title + accent = the advice in max 2 short lines, 1 line of max 60 chars with the race number that motivates it; 2) cta slide: title 'Your plan', accent 'for this race', cta title 'Build it with the AI coach', url as given. Caption: practical, non-medical training advice for someone with a full-time job, tied to this race's real demands (climbing, heat, water), then one sentence saying the 24/7 Coach AI coach builds the plan on this race's course and weather. No invented features.",
  regwatch: "REGISTRATION WATCH, ONE slide: variant 'list', kicker 'Still open', title + accent = hook, stats = up to 3 races from RELATED whose registration status is open (v = date like '10 JAN', l = short race name). Caption lists all open races in RELATED with date. Only races whose status in the data says open.",
  results: "RESULTS carousel, 4 slides: 1) cover: kicker = 'Results <year>', title = place name, sub = distance and number of finishers; 2) list: overall men and women winners (winners array with label, name, time); 3) list: finishers, DNF, median times (stats, max 3); 4) cta to the results page with all age-group winners.",
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
export async function buildIgContent(admin: SupabaseClient, plan: { id: string; race_id: string; kind: string; lang: string; publish_on?: string | null; brief?: string | null }): Promise<{ content: IgContent | null; skip?: string; error?: string }> {
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
  const ctaUrl = plan.kind === "results" || plan.kind === "wrap" ? pages.results : plan.kind === "destination" || plan.kind === "regwatch" ? pages.registration : plan.kind === "weather" ? pages.weather : plan.kind === "course" ? pages.bike : pages.race;
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
  // Formati editoriali su più gare: gare vicine alla data di uscita e tabella di confronto.
  const day0 = plan.publish_on ?? new Date().toISOString().slice(0, 10);
  const shift = (n: number) => new Date(Date.parse(day0) + n * 864e5).toISOString().slice(0, 10);
  const win: Record<string, [number, number]> = { lineup: [0, 3], wrap: [-4, -1], regwatch: [7, 130] };
  let related: unknown[] | null = null;
  let table: unknown[] | null = null;
  if (win[plan.kind] || plan.kind === "numbers") {
    const q = admin.from("event_races").select("id,name,distance,race_date,country,bike_dplus_m");
    const { data: rs } = win[plan.kind] ? await q.gte("race_date", shift(win[plan.kind][0])).lte("race_date", shift(win[plan.kind][1])).order("race_date") : await q.gte("race_date", shift(-60)).lte("race_date", shift(150)).order("race_date");
    const ids = ((rs ?? []) as { id: string }[]).map((x) => x.id);
    const { data: fs } = await admin.from("event_race_facts").select("race_id,climate,water,official,results,results_year").in("race_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const F = new Map(((fs ?? []) as { race_id: string; climate: Record<string, unknown> | null; water: Record<string, unknown> | null; official: Record<string, unknown> | null; results: Record<string, unknown> | null; results_year: number | null }[]).map((x) => [x.race_id, x]));
    const rows = ((rs ?? []) as { id: string; name: string; distance: string; race_date: string; country: string | null; bike_dplus_m: number | null }[]).map((x) => {
      const f = F.get(x.id); const rr = f?.results ?? null;
      const st = Number(rr?.starters ?? 0), dnf = Number(rr?.dnf ?? 0);
      return { race: `${x.distance === "half" ? "70.3" : "IRONMAN"} ${x.name}`, date: x.race_date, country: x.country, bike_climb_m: x.bike_dplus_m, tmax_avg_c: f?.climate?.tmax_avg ?? null, humidity_pct: f?.climate?.humidity_avg ?? null, rain_days_pct: f?.climate?.rain_days_pct ?? null, water_avg_c: f?.water?.avg_c ?? null, registration: f?.official?.status ?? null,
        results: rr ? { year: f?.results_year, finishers: rr.finishers, starters: rr.starters, dnf_pct: st ? Math.round((dnf / st) * 1000) / 10 : null, median: rr.median, overall_men: (rr.overall as { M?: unknown[] })?.M?.slice(0, 1), overall_women: (rr.overall as { F?: unknown[] })?.F?.slice(0, 1) } : null };
    });
    if (plan.kind === "numbers") table = rows.map(({ results, ...x }) => ({ ...x, dnf_pct: results?.dnf_pct ?? null, median_men: (results?.median as { M?: string } | undefined)?.M ?? null, finishers: results?.finishers ?? null }));
    else related = rows;
  }
  const weeksToRace = r.race_date ? Math.max(0, Math.round((Date.parse(String(r.race_date)) - Date.parse(day0)) / (7 * 864e5))) : null;
  const extra = `${plan.brief ? `\nEDITORIAL BRIEF (the angle and hook decided in the editorial plan; follow it, but every number must come from the data): ${plan.brief}` : ""}${related ? `\nRELATED (races for this post): ${JSON.stringify(related)}` : ""}${table ? `\nTABLE (races to compare): ${JSON.stringify(table)}` : ""}\nweeks_to_race: ${weeksToRace}`;
  const out = await generateStructured<{ slides: IgSlide[]; caption: string }>({
    system: `You write Instagram carousels for 24/7 Coach (247coachai.com), an independent site about every IRONMAN and IRONMAN 70.3 race. Write EVERYTHING in ${LANG_NAME[lang]}. Use ONLY facts and numbers present in the DATA; never invent times, prices, records or claims. Numbers keep the locale's decimal separator. The slides are printed over a photo of the venue and must be readable on a phone at a glance: ONE idea per slide, very few words. kicker max 28 characters; title max 12 characters (printed huge, uppercase; usually just the place name); accent max 14 characters (optional second title line in orange); sub max 60 characters; stat.v max 6 characters (a number with its unit, e.g. '30°C', '1,268m', '9/10'), stat.l max 24 characters; stats max 3 items with v max 7 characters and l max 18; lines: at most 1 line of max 60 characters. variant 'stat' uses stat + optional lines; 'list' uses title + stats or winners; 'cover' uses title + sub; 'cta' uses title + accent + cta. Caption: 2-3 short paragraphs (hook with one concrete number, what the post shows, 'link in bio' / the page), then 5-7 hashtags: race-specific ones (e.g. #im703jesolo #ironmanlanzarote), country/language ones and #triathlon #ironman. No emojis except at most one. Never say we are affiliated with IRONMAN. No superlatives or rankings against other races (flattest, hardest, hottest, fastest, 'in Europe', 'in the world') unless the races compared and their numbers are all in the data you were given.`,
    prompt: `${BRIEF[plan.kind] ?? BRIEF.raceweek}\nThe CTA url must be exactly: ${ctaUrl}${extra}\n\nDATA:\n${JSON.stringify(data)}`,
    schema: SCHEMA,
    effort: "medium",
    model: AI_MODEL,
    maxTokens: 6000,
  });
  if (!out.ok || !out.data?.slides?.length) return { content: null, error: "generazione fallita" };
  return { content: { slides: out.data.slides.slice(0, 6), caption: out.data.caption, url: ctaUrl, lang } };
}
