// ============================================================================
// Strumenti pubblici in sola lettura sui risultati IRONMAN e 70.3 (server MCP
// /api/mcp/results). Ogni chiamata restituisce poche righe: un atleta, una gara,
// un confronto. L'archivio intero non si può elencare da qui.
// ============================================================================
import { EDITIONS, athletePath, editionPath, getAthlete, hms, searchAthletes, getRanking, type RankMetric } from "./athletes";
import { careerRows, edStats, equivPath, rankPath } from "./career";
import { allRaceStats } from "./raceStats";

const SITE = "https://247coachai.com";
type Json = Record<string, unknown>;
const str = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
const slugArg = (v: unknown) => (str(v, 200).toLowerCase().split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "").replace(/[^a-z0-9-]/g, "");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ironman|70\.3|703/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

type RaceRef = { slug: string; name: string; cat: "full" | "half"; d: number | null };
function races(): RaceRef[] {
  return allRaceStats().map(([slug, r]) => { const e = EDITIONS.find((x) => x.slug === slug); return e ? { slug, name: e.name, cat: r.cat, d: r.diff.finish ?? null } : null; }).filter((x): x is RaceRef => Boolean(x));
}
function findRace(q: string, cat?: "full" | "half"): RaceRef | null {
  const all = races().filter((r) => !cat || r.cat === cat), s = slugArg(q), n = norm(q);
  const half = /70\.?3|half/i.test(q);
  return all.find((r) => r.slug === s) ?? all.filter((r) => (half ? r.cat === "half" : true)).find((r) => norm(r.name) === n) ?? all.filter((r) => (half ? r.cat === "half" : r.cat === "full")).find((r) => n && norm(r.name).includes(n)) ?? all.find((r) => n && norm(r.name).includes(n)) ?? null;
}
const parseTime = (v: unknown): number | null => {
  const m = str(v, 12).match(/^(\d{1,2})[:.h](\d{1,2})(?:[:.m](\d{1,2}))?$/);
  if (!m) return null;
  const s = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
  return s >= 3 * 3600 && s <= 18 * 3600 ? s : null;
};
const pct = (v: number | null | undefined) => (v == null ? null : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);

export const PUBLIC_TOOLS = [
  { name: "search_athletes", title: "Search athletes by name", description: "Find IRONMAN and IRONMAN 70.3 athletes by name in the 24/7 Coach results archive (IRONMAN 2017-2026, 70.3 2022-2026). Returns up to 10 matches with country, number of races, best times and the profile URL. Use the returned slug with get_athlete.",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "Athlete name, at least 3 letters" }, race: { type: "string", description: "Optional race to restrict the search, e.g. 'Lanzarote'" } }, required: ["name"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_athlete", title: "Athlete career", description: "Full results of one athlete: every race with swim, bike, run and finish times, rankings, the share of finishers they beat in each leg, and the finish time adjusted to an average course so races on different courses can be compared.",
    inputSchema: { type: "object", properties: { slug: { type: "string", description: "Athlete slug or profile URL from search_athletes" } }, required: ["slug"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "compare_athletes", title: "Compare athletes", description: "Compare 2 to 4 athletes leg by leg on the editions they both raced.",
    inputSchema: { type: "object", properties: { slugs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "Athlete slugs from search_athletes" } }, required: ["slugs"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_race", title: "Race statistics", description: "Statistics of an IRONMAN or 70.3 race: how much slower or faster the course is than the average race of the same distance (total, swim, bike, run), and for each edition finishers, median times and winners.",
    inputSchema: { type: "object", properties: { race: { type: "string", description: "Race name or slug, e.g. 'Lanzarote', '70.3 Nice'" } }, required: ["race"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "convert_time", title: "Convert a finish time between races", description: "Estimate what a finish time on one course is worth on another, using how the same athletes performed on both. Without to_race it returns the equivalent on the 12 fastest and 12 slowest courses of the same distance.",
    inputSchema: { type: "object", properties: { from_race: { type: "string" }, time: { type: "string", description: "Finish time as h:mm:ss, e.g. 12:30:00" }, to_race: { type: "string" } }, required: ["from_race", "time"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "athlete_rankings", title: "Athlete rankings", description: "Top 25 athletes by best finish time on a full-course edition (full distance or 70.3) or by number of finishes, optionally for one country (ISO 2-letter code) and gender.",
    inputSchema: { type: "object", properties: { metric: { type: "string", enum: ["full", "half", "finishes"] }, country: { type: "string", description: "ISO 3166-1 alpha-2, e.g. IT" }, gender: { type: "string", enum: ["M", "F"] } } }, annotations: { readOnlyHint: true, openWorldHint: false } },
] as const;

export async function callPublicTool(name: string, a: Json): Promise<Json> {
  if (name === "search_athletes") {
    const r = a.race ? findRace(str(a.race)) : null;
    const key = r ? EDITIONS.find((e) => e.slug === r.slug)?.key ?? null : null;
    const hits = await searchAthletes(str(a.name, 80), key, 10);
    return { query: str(a.name, 80), matches: hits.map((h) => ({ slug: h.slug, name: h.name, country: h.country, races: h.races, finishes: h.finishes, best_full: h.best_full ? hms(h.best_full) : null, best_70_3: h.best_half ? hms(h.best_half) : null, last_year: h.last_year, url: `${SITE}${athletePath("en", h.slug)}` })) };
  }
  if (name === "get_athlete") {
    const d = await getAthlete(slugArg(a.slug));
    if (!d) throw new Error("Athlete not found. Use search_athletes to get a slug.");
    const car = new Map(careerRows(d.results).map((c) => [c.r.edition_id, c]));
    return {
      name: d.athlete.name, country: d.athlete.country, gender: d.athlete.sex, races: d.athlete.races, finishes: d.athlete.finishes, years: [d.athlete.first_year, d.athlete.last_year], best_full: d.athlete.best_full ? hms(d.athlete.best_full) : null, best_70_3: d.athlete.best_half ? hms(d.athlete.best_half) : null,
      url: `${SITE}${athletePath("en", d.athlete.slug)}`,
      results: d.results.slice(0, 60).map((r) => { const c = car.get(r.edition_id); return { race: `${r.race_name} ${r.year}`, date: r.race_date, distance: r.cat === "full" ? "140.6" : "70.3", age_group: r.age_group, status: r.status, swim: hms(r.swim), bike: hms(r.bike), run: hms(r.run), finish: r.status === "FIN" ? hms(r.finish) : null, rank_overall: r.rank_overall, rank_age_group: r.rank_ag, faster_than_pct_of_finishers: c ? c.pct : null, finish_on_average_course: c?.adj ? hms(c.adj) : null }; }),
      note: "Times are the official race results. finish_on_average_course removes the effect of course and conditions of that edition.",
    };
  }
  if (name === "compare_athletes") {
    const slugs = (Array.isArray(a.slugs) ? a.slugs : []).map(slugArg).filter(Boolean).slice(0, 4);
    if (slugs.length < 2) throw new Error("Give 2 to 4 athlete slugs.");
    const list = (await Promise.all(slugs.map((s) => getAthlete(s)))).filter((d): d is NonNullable<typeof d> => Boolean(d));
    if (list.length < 2) throw new Error("Athletes not found.");
    const ed = new Map<string, Json[]>();
    list.forEach((d) => d.results.forEach((r) => ed.set(r.edition_id, [...(ed.get(r.edition_id) ?? []), { athlete: d.athlete.name, race: `${r.race_name} ${r.year}`, date: r.race_date, age_group: r.age_group, swim: hms(r.swim), bike: hms(r.bike), run: hms(r.run), finish: r.status === "FIN" ? hms(r.finish) : r.status, rank_overall: r.rank_overall }])));
    const common = [...ed.values()].filter((g) => g.length >= 2);
    return { athletes: list.map((d) => ({ name: d.athlete.name, url: `${SITE}${athletePath("en", d.athlete.slug)}` })), races_in_common: common.slice(0, 20), url: `${SITE}/en/athletes/compare?a=${list.map((d) => d.athlete.slug).join(",")}` };
  }
  if (name === "get_race") {
    const r = findRace(str(a.race));
    if (!r) throw new Error("Race not found. Try the city or region name, e.g. 'Lanzarote' or '70.3 Nice'.");
    const st = new Map(allRaceStats()).get(r.slug)!;
    return {
      race: r.name, distance: r.cat === "full" ? "140.6" : "70.3", url: `${SITE}/en/races/${r.slug}`,
      course_vs_average: { total: pct(st.diff.finish), swim: pct(st.diff.swim), bike: pct(st.diff.bike), run: pct(st.diff.run), meaning: "Positive = slower than the average race of this distance, measured on athletes who also finished another race", sample_results: st.n_cross },
      editions: st.editions.slice(0, 10).map((e) => ({ year: e.y, date: e.date, starters: e.st, finishers: e.fin, did_not_finish: e.dnf, median_finish: hms(e.med.finish), median_swim: hms(e.med.swim), median_bike: hms(e.med.bike), median_run: hms(e.med.run), flags: e.flags })),
      full_results: EDITIONS.filter((e) => e.slug === r.slug).slice(0, 10).map((e) => `${SITE}${editionPath("en", e.id)}`),
    };
  }
  if (name === "convert_time") {
    const secs = parseTime(a.time);
    if (secs == null) throw new Error("Give the time as h:mm:ss, between 3 and 18 hours.");
    const from = findRace(str(a.from_race));
    if (!from || from.d == null) throw new Error("Starting race not found or without a course index.");
    const eq = (r: RaceRef) => { const t = Math.round((secs * (1 + (r.d as number) / 100)) / (1 + (from.d as number) / 100)); const q = EDITIONS.filter((e) => e.slug === r.slug).map((e) => edStats(e.id)?.finish).find(Boolean); let p: number | null = null; if (q) { if (t <= q[0]) p = 100; else if (t >= q[q.length - 1]) p = 0; else { let i = 1; while (i < q.length && q[i] < t) i++; p = Math.round(100 - ((i - 1) + (t - q[i - 1]) / (q[i] - q[i - 1] || 1)) * 5); } } return { race: r.name, course_vs_average: pct(r.d), equivalent_time: hms(t), faster_than_pct_of_last_edition_finishers: p }; };
    const same = races().filter((r) => r.cat === from.cat && r.d != null).sort((p, q) => (p.d as number) - (q.d as number));
    const base = { from: from.name, time: hms(secs), note: "Estimate from medians: weather, pacing and individual strengths change the result.", url: `${SITE}${equivPath("en")}?from=${from.slug}&t=${hms(secs)}` };
    if (a.to_race) { const to = findRace(str(a.to_race), from.cat); if (!to || to.d == null) throw new Error("Target race not found for the same distance."); return { ...base, result: eq(to) }; }
    return { ...base, fastest_courses: same.slice(0, 12).map(eq), slowest_courses: same.slice(-12).map(eq) };
  }
  if (name === "athlete_rankings") {
    const metric = (["full", "half", "finishes"].includes(str(a.metric)) ? str(a.metric) : "full") as RankMetric;
    const country = /^[A-Za-z]{2}$/.test(str(a.country)) ? str(a.country).toUpperCase() : null;
    const sex = str(a.gender) === "M" || str(a.gender) === "F" ? (str(a.gender) as "M" | "F") : null;
    const rows = await getRanking({ metric, country, sex, limit: 25 });
    return { metric, country, gender: sex, athletes: rows.map((r, i) => ({ position: i + 1, name: r.name, country: r.country, value: metric === "finishes" ? r.finishes : hms(metric === "full" ? r.rank_full : r.rank_half), url: `${SITE}${athletePath("en", r.slug)}` })), note: "Best times count only editions raced on the full course.", url: `${SITE}${rankPath("en", { c: country, m: metric })}` };
  }
  throw new Error(`Unknown tool: ${name}`);
}
