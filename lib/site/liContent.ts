// ============================================================================
// Palinsesto LinkedIn della pagina 24/7 Coach: un post al giorno in inglese,
// per chi si allena per un IRONMAN e lavora. Ogni post ha un aggancio a una
// gara in corso o in arrivo e porta a una pagina del sito. Testo scritto da
// Claude SOLO con i dati del sito; grafica /li-media/<id>.jpg con la foto
// della località.
// Rubriche per giorno della settimana (lun→dom):
//   results · worklife · numbers · lessons · preview · destination · coach
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateStructured, AI_MODEL } from "@/lib/ai/claude";
import { racePath, type Race } from "@/lib/site/races";
import { dataFacetPath } from "@/lib/site/facets";
import type { SocialSlide } from "@/lib/site/socialSlide";

export const LI_RUBRICS = ["results", "worklife", "numbers", "lessons", "preview", "destination", "coach"] as const; // lun..dom
export type LiRubric = (typeof LI_RUBRICS)[number];
export type LiContent = { text: string; slide: SocialSlide; url: string };

const SITE = "https://247coachai.com";
const day = (d: string, n: number) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);

export function rubricFor(date: string): LiRubric {
  const dow = new Date(date + "T12:00:00Z").getUTCDay(); // 0 dom
  return LI_RUBRICS[(dow + 6) % 7];
}

type RaceFull = Race & { id: string; name: string; distance: string; race_date: string; country: string | null; swim_km: string | null; bike_km: string | null; bike_dplus_m: number | null; run_km: string | null; water_type: string | null };
type Facts = { race_id: string; geo_label: string | null; climate: Record<string, unknown> | null; water: Record<string, unknown> | null; official: Record<string, unknown> | null; results: Record<string, unknown> | null; results_year: number | null };

function summary(r: RaceFull, f: Facts | undefined, photo: boolean) {
  const c = f?.climate ?? null, w = f?.water ?? null, o = f?.official ?? {}, res = f?.results ?? null;
  return {
    race: `${r.distance === "half" ? "IRONMAN 70.3" : "IRONMAN"} ${r.name}`,
    date: r.race_date, country: r.country, place: f?.geo_label,
    distances_km: [r.swim_km, r.bike_km, r.run_km].join(" / "), bike_elevation_m: r.bike_dplus_m, water_type: r.water_type,
    climate: c ? { tmax_avg: c.tmax_avg, tmin_avg: c.tmin_avg, humidity_avg: c.humidity_avg, rain_days_pct: c.rain_days_pct, wind_avg_kmh: c.wind_avg_kmh, gust_avg_kmh: c.gust_avg_kmh, years: c.years } : null,
    water_c: w ? { avg: w.avg_c, min: w.min_c, max: w.max_c } : null,
    registration: { status: o.status, price_tiers: o.price_tiers, opens_at: o.opens_at },
    cutoffs: o.cutoffs, wetsuit_note: o.wetsuit_note, slots: o.slots,
    last_results: res ? { year: f?.results_year, starters: res.starters, finishers: res.finishers, dnf: res.dnf, median: res.median, overall_men: (res.overall as { M?: unknown[] })?.M?.slice(0, 1), overall_women: (res.overall as { F?: unknown[] })?.F?.slice(0, 1) } : null,
    has_photo: photo,
  };
}

const PAIR = { type: "object", additionalProperties: false, required: ["v", "l"], properties: { v: { type: "string" }, l: { type: "string" } } };
const SCHEMA = {
  type: "object", additionalProperties: false, required: ["topic", "race_name", "text", "slide", "page"],
  properties: {
    topic: { type: "string" },
    race_name: { type: "string" },
    page: { type: "string", enum: ["race", "results", "weather", "registration", "bike", "home"] },
    text: { type: "string" },
    slide: {
      type: "object", additionalProperties: false, required: ["variant", "kicker"],
      properties: {
        variant: { type: "string", enum: ["cover", "stat", "list", "text"] },
        kicker: { type: "string" }, title: { type: ["string", "null"] }, accent: { type: ["string", "null"] }, sub: { type: ["string", "null"] },
        stat: { anyOf: [PAIR, { type: "null" }] }, stats: { type: ["array", "null"], items: PAIR }, lines: { type: ["array", "null"], items: { type: "string" } },
      },
    },
  },
};

const BRIEF: Record<LiRubric, string> = {
  results: "RESULTS RECAP of the race just raced: the winning times, how many finished, the median finish (what a normal age-grouper really did), DNF rate. Angle for working professionals: what the median tells you about setting a realistic goal.",
  worklife: "TRAINING AROUND A JOB: one practical, concrete topic for people who train for an IRONMAN while holding a demanding job (e.g. fitting 10-12 hours a week around a calendar, early-morning sessions, training on business trips and hotel gyms, sleep as the real limiter, lunch-break swims, commuting by bike, protecting key sessions in the agenda, family time, deload weeks during busy quarters). Use the hook race (its date, weather or course) as the concrete example.",
  numbers: "THE NUMBERS: one data insight across races from the RACES TABLE (e.g. highest DNF rates, slowest/fastest median finishes, hottest water, wettest race weeks, biggest bike climbing). Name the races, give the numbers, explain what it means for someone choosing a race. The hook race is the one leading the ranking.",
  lessons: "ENDURANCE x WORK: one lesson from long-distance triathlon that transfers to work and leadership (pacing a quarter like a marathon, negative splits, planning logistics like a project, cut-offs and deadlines, recovering after a big push, the cost and planning of a race season). Concrete, not cheesy; use the hook race's real numbers (cut-offs, distances, medians, prices) as the example.",
  preview: "RACE WEEKEND PREVIEW: the race(s) this weekend: course, expected weather and water temperature, cut-offs, what makes it hard. Practical: what to expect and how to pace it.",
  destination: "DESTINATION SPOTLIGHT: a race several months away as a place worth travelling to, for people who combine racing with a trip (with family, or around a business trip): the place, the race-week climate and water, the course character, registration status and price if present. Make the reader want to put it in the calendar.",
  coach: "BEHIND THE AI COACH: how the 24/7 Coach AI coach works for people with little time: it builds the plan around the athlete's target race and calendar, reads training from the watch, adapts day by day, answers on Telegram, and uses the race data on the site (course, weather, water). Tie it to the hook race (e.g. what the plan of someone racing it looks like in these weeks). Honest, no hype, no invented features or numbers.",
};

/** Sceglie la gara di aggancio e i dati per la rubrica del giorno. */
async function pickRace(admin: SupabaseClient, date: string, rubric: LiRubric) {
  const { data: races } = await admin.from("event_races").select("*");
  const { data: facts } = await admin.from("event_race_facts").select("race_id,geo_label,climate,water,official,results,results_year");
  const { data: photos } = await admin.from("race_photos").select("race_id,status");
  const { data: used } = await admin.from("li_plan").select("race_id,topic,publish_on").lt("publish_on", date).order("publish_on", { ascending: false }).limit(40);
  const F = new Map(((facts ?? []) as Facts[]).map((f) => [f.race_id, f]));
  const P = new Set(((photos ?? []) as { race_id: string; status: string }[]).filter((p) => p.status === "ok").map((p) => p.race_id));
  const recent = new Set(((used ?? []) as { race_id: string | null; publish_on: string }[]).filter((u) => u.race_id && u.publish_on >= day(date, -21)).map((u) => u.race_id!));
  const all = (races ?? []) as RaceFull[];
  const between = (a: string, b: string) => all.filter((r) => r.race_date && r.race_date >= a && r.race_date <= b);
  const fresh = (xs: RaceFull[]) => [...xs.filter((r) => !recent.has(r.id)), ...xs.filter((r) => recent.has(r.id))];
  const withPhotoFirst = (xs: RaceFull[]) => [...xs.filter((r) => P.has(r.id)), ...xs.filter((r) => !P.has(r.id))];
  let pick: RaceFull | undefined;
  let rub = rubric;
  if (rubric === "results") {
    const done = between(day(date, -9), day(date, -1)).filter((r) => F.get(r.id)?.results && Number(F.get(r.id)?.results_year) === Number(r.race_date.slice(0, 4)));
    pick = fresh(done.sort((a, b) => Number((F.get(b.id)?.results as { finishers?: number })?.finishers ?? 0) - Number((F.get(a.id)?.results as { finishers?: number })?.finishers ?? 0)))[0];
    if (!pick) rub = "numbers";
  }
  if (rub === "preview") pick = withPhotoFirst(fresh(between(day(date, 0), day(date, 3))))[0] ?? withPhotoFirst(fresh(between(day(date, 0), day(date, 14))))[0];
  if (rub === "destination") pick = withPhotoFirst(fresh(between(day(date, 110), day(date, 300)).filter((r) => (F.get(r.id)?.official as { status?: string } | null)?.status !== "sold_out")))[0];
  if (rub === "worklife" || rub === "lessons" || rub === "coach") pick = withPhotoFirst(fresh(between(day(date, 1), day(date, 28))))[0] ?? fresh(between(day(date, 1), day(date, 90)))[0];
  const table = rub === "numbers"
    ? all.filter((r) => F.get(r.id)?.results).map((r) => {
        const f = F.get(r.id)!, res = f.results as Record<string, unknown>, c = f.climate as Record<string, unknown> | null, w = f.water as Record<string, unknown> | null;
        const st = Number(res.starters ?? 0), dnf = Number(res.dnf ?? 0);
        return { id: r.id, race: `${r.distance === "half" ? "70.3" : "IM"} ${r.name}`, year: f.results_year, starters: st, finishers: res.finishers, dnf_pct: st ? Math.round((dnf / st) * 1000) / 10 : null, median: res.median, bike_dplus_m: r.bike_dplus_m, water_avg_c: w?.avg_c ?? null, tmax_avg: c?.tmax_avg ?? null, rain_days_pct: c?.rain_days_pct ?? null, next_date: r.race_date };
      })
    : null;
  return { all, rub, pick, F, P, table, usedTopics: ((used ?? []) as { topic: string | null }[]).map((u) => u.topic).filter(Boolean).slice(0, 20) as string[] };
}

export async function buildLiPost(admin: SupabaseClient, plan: { id: string; publish_on: string; rubric: string }): Promise<{ content: LiContent | null; race_id?: string | null; topic?: string; rubric?: string; error?: string }> {
  const { all, rub, pick, F, P, table, usedTopics } = await pickRace(admin, plan.publish_on, plan.rubric as LiRubric);
  const data = {
    today: plan.publish_on,
    hook_race: pick ? { ...summary(pick, F.get(pick.id), P.has(pick.id)), pages: pagesOf(pick) } : null,
    races_table: table,
    recent_topics_to_avoid: usedTopics,
  };
  const out = await generateStructured<{ topic: string; race_name: string; page: string; text: string; slide: SocialSlide }>({
    system: `You write the daily LinkedIn post of 24/7 Coach (247coachai.com), an independent guide to every IRONMAN and IRONMAN 70.3 race in the world plus an AI triathlon coach. The audience: professionals and managers who train for long-distance triathlon around a demanding job. Write in English.
Rules:
- Use ONLY facts and numbers present in DATA for anything about races (dates, temperatures, times, prices, counts). General training or work advice is allowed but must be sensible, practical and non-medical. Never invent statistics, studies or quotes. Never claim affiliation with IRONMAN.
- Format for LinkedIn: first line is a hook of max 110 characters with one concrete number or a sharp claim; then short paragraphs of 1-2 sentences separated by blank lines; 120-220 words total; at most one emoji; end with one question to the reader, then the link on its own line as "Full guide: <url>", then 3 hashtags (always #triathlon, plus #ironman or #ironman703, plus one fitting tag such as #leadership #productivity #endurance #worklifebalance #travel).
- Do not repeat a topic listed in recent_topics_to_avoid.
- The slide is ONE image over a photo of the race venue, readable on a phone: variant 'cover' (kicker max 28 chars, title = place name max 12 chars, sub max 60 chars), 'stat' (kicker, stat.v max 6 chars e.g. '30°C' '13:43' '9/10', stat.l max 24 chars, optional 1 line max 60 chars), 'list' (kicker, title max 12 chars, accent max 14, stats max 3 with v max 7 chars and l max 18) or 'text' (kicker, title max 12, accent max 14, 1 line max 60). Pick the variant that carries the post's key number.`,
    prompt: `RUBRIC: ${BRIEF[rub]}\n\n${rub === "numbers" ? "race_name = the race leading your insight (as written in races_table); page = which of its pages fits (race, results, weather, registration)." : "race_name = the hook race; page = which of hook_race.pages fits."}\n\nDATA:\n${JSON.stringify(data)}`,
    schema: SCHEMA,
    effort: "medium",
    model: AI_MODEL,
    maxTokens: 6000,
  });
  if (!out.ok || !out.data) return { content: null, error: out.error ?? "generazione fallita" };
  let lead = pick;
  if (rub === "numbers") {
    const nm = out.data.race_name.toLowerCase().replace(/^(ironman 70\.3|ironman|70\.3|im)\s+/, "").trim();
    const row = (table ?? []).find((t) => t.race.toLowerCase().replace(/^(70\.3|im)\s+/, "") === nm) ?? (table ?? []).find((t) => t.race.toLowerCase().includes(nm));
    lead = row ? all.find((r) => r.id === row.id) : undefined;
  }
  const pages: Record<string, string> = lead ? pagesOf(lead) : { home: SITE };
  const url = pages[out.data.page] ?? pages.race ?? SITE;
  // il link nel testo è sempre quello della pagina scelta, anche se il modello l'avesse scritto diverso
  const text = /Full guide:/i.test(out.data.text) ? out.data.text.replace(/Full guide:\s*\S+/i, `Full guide: ${url}`) : `${out.data.text}\n\nFull guide: ${url}`;
  const raceId = lead?.id ?? null;
  return { content: { text, slide: out.data.slide, url }, race_id: raceId, topic: out.data.topic, rubric: rub };
}

function pagesOf(r: RaceFull) {
  const rp = racePath(r as Race, "en");
  return {
    home: SITE,
    race: `${SITE}${rp}`,
    results: `${SITE}${dataFacetPath(rp, "en", "results")}`,
    weather: `${SITE}${dataFacetPath(rp, "en", "weather")}`,
    registration: `${SITE}${dataFacetPath(rp, "en", "registration")}`,
    bike: `${SITE}${rp}`,
  };
}
