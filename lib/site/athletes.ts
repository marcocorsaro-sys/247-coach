// ============================================================================
// Pagine atleta: risultati IRONMAN e 70.3 per atleta (IRONMAN dal 2017, 70.3 dal 2022),
// ricerca per nome e confronti. Inglese e italiano; le altre lingue vanno
// all'inglese. Il nome sta solo in ath_athletes: chi chiede la rimozione viene
// cancellato da lì e i suoi risultati restano anonimi.
// ============================================================================
import type { Lang } from "@/lib/i18n/config";
import { createPublicClient } from "@/lib/supabase/public";
import editionsData from "./data/editions.json";

export type AthLang = "en" | "it";
export const athLang = (l: Lang | string): AthLang => (l === "it" ? "it" : "en");
const SEG: Record<AthLang, string> = { en: "athletes", it: "atleti" };
export const athletesPath = (l: Lang | string) => `/${athLang(l)}/${SEG[athLang(l)]}`;
export const athletePath = (l: Lang | string, slug: string) => `${athletesPath(l)}/${slug}`;
export const comparePath = (l: Lang | string, slugs: string[], race?: string | null) =>
  `${athletesPath(l)}/${athLang(l) === "it" ? "confronto" : "compare"}?a=${slugs.map(encodeURIComponent).join(",")}${race ? `&race=${encodeURIComponent(race)}` : ""}`;
export const COMPARE_SEG: Record<AthLang, string> = { en: "compare", it: "confronto" };
export const REMOVE_SEG: Record<AthLang, string> = { en: "remove", it: "rimozione" };
export const removePath = (l: Lang | string, slug?: string) => `${athletesPath(l)}/${REMOVE_SEG[athLang(l)]}${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`;

export const RESULTS_SEG: Record<AthLang, string> = { en: "results", it: "risultati" };
export const editionPath = (l: Lang | string, editionId: string) => `${athletesPath(l)}/${RESULTS_SEG[athLang(l)]}/${editionId}`;

/** Edizioni di cui abbiamo la classifica (2017-2026), dalla più recente. */
export type Edition = { id: string; key: string; slug: string | null; name: string; cat: "full" | "half"; y: number; date: string; fin: number; st: number | null };
export const EDITIONS = editionsData as Edition[];
const ED_BY_ID = new Map(EDITIONS.map((e) => [e.id, e]));
export const editionById = (id: string): Edition | null => ED_BY_ID.get(id) ?? null;
/** Edizioni di una gara del sito, dallo slug (con o senza anno). */
export const editionsForRace = (slug: string): Edition[] => { const b = slug.replace(/-20\d\d$/, ""); return EDITIONS.filter((e) => e.slug === b); };
/** Coda che distingue due edizioni dello stesso anno: donne/uomini, o il giorno (Kona 2022). */
export const editionTag = (id: string) => (/-women$/.test(id) ? " · W" : /-men$/.test(id) ? " · M" : /-thursday$/.test(id) ? " · Thu" : /-saturday$/.test(id) ? " · Sat" : "");
export const editionLabel = (e: Edition) => `${e.name} ${e.y}${editionTag(e.id)}`;

export type RankRow = AthResult & { cid: string | null; name: string | null; slug: string | null; country: string | null };
/** Classifica di un'edizione: arrivati in ordine di tempo, con filtri per sesso e categoria. */
export async function getEditionResults(editionId: string, opts: { sex?: "M" | "F" | null; ag?: string | null; page?: number; size?: number } = {}): Promise<{ rows: RankRow[]; total: number }> {
  const size = opts.size ?? 100, page = Math.max(0, opts.page ?? 0);
  try {
    const db = createPublicClient();
    let q = db.from("ath_results").select(`cid,${R_COLS}`, { count: "exact" }).eq("edition_id", editionId).eq("status", "FIN").not("finish", "is", null);
    if (opts.ag) q = q.eq("age_group", opts.ag);
    else if (opts.sex) q = q.like("age_group", `${opts.sex}%`);
    const { data, count } = await q.order("finish", { ascending: true }).range(page * size, page * size + size - 1);
    const rows = (data ?? []) as (AthResult & { cid: string | null })[];
    const cids = [...new Set(rows.map((r) => r.cid).filter((c): c is string => Boolean(c)))];
    const names = new Map<string, { name: string; slug: string; country: string | null }>();
    if (cids.length) {
      const { data: a } = await db.from("ath_athletes").select("cid,name,slug,country").in("cid", cids);
      for (const x of (a ?? []) as { cid: string; name: string; slug: string; country: string | null }[]) names.set(x.cid, x);
    }
    return { rows: rows.map((r) => ({ ...r, name: (r.cid && names.get(r.cid)?.name) || null, slug: (r.cid && names.get(r.cid)?.slug) || null, country: (r.cid && names.get(r.cid)?.country) || null })), total: count ?? rows.length };
  } catch { return { rows: [], total: 0 }; }
}

export type Athlete = { cid: string; slug: string; name: string; country: string | null; sex: string | null; races: number; finishes: number; first_year: number | null; last_year: number | null; best_full: number | null; best_half: number | null };
export type AthResult = {
  edition_id: string; race_key: string; race_slug: string | null; race_name: string; cat: "full" | "half"; year: number; race_date: string | null;
  bib: string | null; age_group: string | null; status: string | null;
  swim: number | null; t1: number | null; bike: number | null; t2: number | null; run: number | null; finish: number | null;
  rank_overall: number | null; rank_sex: number | null; rank_ag: number | null;
};
export type Hit = { slug: string; name: string; country: string | null; sex: string | null; races: number; finishes: number; best_full: number | null; best_half: number | null; last_year: number | null };

const R_COLS = "edition_id,race_key,race_slug,race_name,cat,year,race_date,bib,age_group,status,swim,t1,bike,t2,run,finish,rank_overall,rank_sex,rank_ag";

export async function getAthlete(slug: string): Promise<{ athlete: Athlete; results: AthResult[] } | null> {
  try {
    const db = createPublicClient();
    const { data: a } = await db.from("ath_athletes").select("*").eq("slug", slug).maybeSingle();
    if (!a) return null;
    const { data: r } = await db.from("ath_results").select(R_COLS).eq("cid", (a as Athlete).cid).order("race_date", { ascending: false });
    return { athlete: a as Athlete, results: (r ?? []) as AthResult[] };
  } catch { return null; }
}

export async function searchAthletes(q: string, race?: string | null, limit = 20): Promise<Hit[]> {
  const norm = q.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (norm.length < 3) return [];
  try {
    const { data } = await createPublicClient().rpc("ath_search", { q: norm, race: race || null, lim: limit });
    return (data ?? []) as Hit[];
  } catch { return []; }
}

export const hms = (s: number | null | undefined): string => {
  if (s == null) return "–";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.round(s % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
};
/** Differenza tra due tempi, con segno: "−4:12" o "+1:03:20". */
export const delta = (a: number | null | undefined, b: number | null | undefined): string => {
  if (a == null || b == null) return "–";
  const d = a - b, s = Math.abs(d);
  if (s === 0) return "=";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${d < 0 ? "−" : "+"}${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(x).padStart(2, "0")}`;
};
export const flag = (cc: string | null | undefined): string => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "");
export const raceLabel = (r: { race_name: string; year: number }) => `${r.race_name.replace(/^IRONMAN\s+/i, "IRONMAN ")} ${r.year}`;

type Txt = Record<string, string>;
export const ATH: Record<AthLang, Txt> = {
  en: {
    nav: "Athletes", hubTitle: "IRONMAN and 70.3 athlete results: search by name", hubH1a: "Find an athlete.", hubH1b: "See every race.",
    hubLead: "Search IRONMAN results from 2017 and 70.3 results from 2022 by name, up to 2026: every race, every split, and side-by-side comparisons.",
    searchPh: "Name and surname, at least 3 letters", searchBtn: "Search", none: "No athlete found with that name.", typeMore: "Type at least three letters.",
    inRace: "Only athletes who raced", results: "results", race1: "race", raceN: "races",
    athTitle: "{name}: IRONMAN and 70.3 results, times and splits", athDesc: "{name}{country}: {races} IRONMAN and 70.3 races from {y1} to {y2}, with swim, bike and run splits, rankings and comparisons.",
    athKicker: "Athlete results", athH1b: "IRONMAN results",
    tRaces: "races on record", tFin: "finished", tBestFull: "best full distance", tBestHalf: "best 70.3",
    allRaces: "All races", date: "Date", race: "Race", ag: "Age group", swim: "Swim", bike: "Bike", run: "Run", finish: "Finish", overall: "Overall", agRank: "AG", status: "Status",
    sameRace: "Same race, different years", sameLead: "How {name} did on the same course from one edition to the next. Differences are against the earlier year.",
    vs: "Compare with another athlete", vsLead: "Pick someone who raced the same event and see the gap leg by leg.",
    cmpTitle: "Compare IRONMAN athletes, leg by leg", cmpH1: "Compare athletes", cmpLead: "Side by side on the races they both did. Differences are against the first athlete.",
    cmpAdd: "Add an athlete", cmpNone: "Choose at least two athletes to compare.", cmpNoCommon: "These athletes have no race in common between 2017 and 2026.", cmpCommon: "Races in common",
    diff: "Gap", remove: "remove",
    coachH: "Your next result starts with a plan.", coachP: "24/7 Coach builds your training around your race and the hours you really have, and puts each session on your watch.", coachCta: "Meet the coach",
    srcNote: "Times are the official results of each race, IRONMAN editions from 2017 and 70.3 editions from 2022, up to 2026. A result that is missing or wrong here is missing or wrong in the published results.",
    privNote: "Is this you and you don't want this page? You can have it removed.", privLink: "Remove my page",
    rmTitle: "Remove an athlete page", rmH1: "Remove my page", rmLead: "Fill this in and the page is deleted straight away: your name is removed from our database and your results stay only as anonymous times in the race statistics.",
    rmSlug: "Address of the page to remove", rmEmail: "Your email (optional, only if you want a confirmation)", rmNote: "Anything you want to tell us (optional)", rmBtn: "Remove the page", rmDone: "Done: the page has been removed.", rmNotFound: "We couldn't find that page. Paste its full address.",
    privH: "What we publish, and why", privP: "Athlete pages show what race organisers publish in their official results: name, country, age group, times and placings. We add nothing else, we don't show contact details, and we don't build profiles for advertising. The legal basis is our legitimate interest in reporting public sports results. You can ask for removal at any time; it is immediate.",
    edTitle: "{race}: full results, splits and rankings", edDesc: "{race} results: {fin} finishers with swim, bike and run splits, by gender and age group. Search any athlete and compare.",
    edKicker: "Full results", edAll: "All", edMen: "Men", edWomen: "Women", edAg: "Age group", edFound: "{n} finishers", edPos: "#", edName: "Athlete", edPrev: "← Previous", edNext: "Next →", edPage: "Page {p} of {n}",
    edSearch: "Find an athlete in this race", edOther: "Other editions", edRace: "Course, weather and race guide", edAnon: "Removed on request", edLatest: "Latest results", edSee: "Full results",
    sAll: "Search races and athletes", sPh: "Race, city or athlete name", sRaces: "Races", sAthletes: "Athletes", sNone: "Nothing found.", sOpen: "Search", sAllAth: "All athletes →",
    dnf: "Did not finish", dns: "Did not start", dq: "Disqualified",
  },
  it: {
    nav: "Atleti", hubTitle: "Risultati degli atleti IRONMAN e 70.3: cerca per nome", hubH1a: "Cerca un atleta.", hubH1b: "Guarda tutte le sue gare.",
    hubLead: "Cerca per nome nei risultati IRONMAN dal 2017 e 70.3 dal 2022, fino al 2026: ogni gara, ogni frazione, e i confronti fianco a fianco.",
    searchPh: "Nome e cognome, almeno 3 lettere", searchBtn: "Cerca", none: "Nessun atleta trovato con questo nome.", typeMore: "Scrivi almeno tre lettere.",
    inRace: "Solo atleti che hanno corso", results: "risultati", race1: "gara", raceN: "gare",
    athTitle: "{name}: risultati IRONMAN e 70.3, tempi e frazioni", athDesc: "{name}{country}: {races} gare IRONMAN e 70.3 dal {y1} al {y2}, con tempi di nuoto, bici e corsa, posizioni e confronti.",
    athKicker: "Risultati atleta", athH1b: "risultati IRONMAN",
    tRaces: "gare in archivio", tFin: "portate a termine", tBestFull: "miglior full distance", tBestHalf: "miglior 70.3",
    allRaces: "Tutte le gare", date: "Data", race: "Gara", ag: "Categoria", swim: "Nuoto", bike: "Bici", run: "Corsa", finish: "Finale", overall: "Assoluta", agRank: "Cat.", status: "Esito",
    sameRace: "Stessa gara, anni diversi", sameLead: "Come è andato {name} sullo stesso percorso da un'edizione all'altra. Le differenze sono rispetto all'anno precedente.",
    vs: "Confronta con un altro atleta", vsLead: "Scegli qualcuno che ha corso la stessa gara e guarda il distacco frazione per frazione.",
    cmpTitle: "Confronta gli atleti IRONMAN, frazione per frazione", cmpH1: "Confronta gli atleti", cmpLead: "Fianco a fianco sulle gare che hanno corso entrambi. Le differenze sono rispetto al primo atleta.",
    cmpAdd: "Aggiungi un atleta", cmpNone: "Scegli almeno due atleti da confrontare.", cmpNoCommon: "Questi atleti non hanno gare in comune tra il 2017 e il 2026.", cmpCommon: "Gare in comune",
    diff: "Distacco", remove: "togli",
    coachH: "Il prossimo risultato comincia da un piano.", coachP: "24/7 Coach costruisce l'allenamento sulla tua gara e sulle ore che hai davvero, e mette ogni seduta sull'orologio.", coachCta: "Scopri il coach",
    srcNote: "I tempi sono i risultati ufficiali di ogni gara, edizioni IRONMAN dal 2017 e 70.3 dal 2022, fino al 2026. Un risultato che qui manca o è sbagliato manca o è sbagliato nei risultati pubblicati.",
    privNote: "Sei tu e non vuoi questa pagina? Puoi farla rimuovere.", privLink: "Rimuovi la mia pagina",
    rmTitle: "Rimuovere una pagina atleta", rmH1: "Rimuovi la mia pagina", rmLead: "Compila il modulo e la pagina viene cancellata subito: il tuo nome sparisce dal nostro database e i tuoi risultati restano solo come tempi anonimi nelle statistiche di gara.",
    rmSlug: "Indirizzo della pagina da rimuovere", rmEmail: "La tua email (facoltativa, solo se vuoi una conferma)", rmNote: "Quello che vuoi dirci (facoltativo)", rmBtn: "Rimuovi la pagina", rmDone: "Fatto: la pagina è stata rimossa.", rmNotFound: "Non abbiamo trovato quella pagina. Incolla il suo indirizzo completo.",
    privH: "Cosa pubblichiamo, e perché", privP: "Le pagine atleta mostrano quello che gli organizzatori pubblicano nei risultati ufficiali: nome, paese, categoria, tempi e posizioni. Non aggiungiamo altro, non mostriamo contatti e non costruiamo profili a fini pubblicitari. La base giuridica è il nostro legittimo interesse a riportare risultati sportivi pubblici. Puoi chiedere la rimozione in qualsiasi momento: è immediata.",
    edTitle: "{race}: classifica completa, frazioni e posizioni", edDesc: "Risultati {race}: {fin} arrivati con i tempi di nuoto, bici e corsa, per sesso e categoria. Cerca un atleta e confronta.",
    edKicker: "Classifica completa", edAll: "Tutti", edMen: "Uomini", edWomen: "Donne", edAg: "Categoria", edFound: "{n} arrivati", edPos: "#", edName: "Atleta", edPrev: "← Precedente", edNext: "Successiva →", edPage: "Pagina {p} di {n}",
    edSearch: "Cerca un atleta in questa gara", edOther: "Altre edizioni", edRace: "Percorso, meteo e guida alla gara", edAnon: "Rimosso su richiesta", edLatest: "Ultime classifiche", edSee: "Classifica completa",
    sAll: "Cerca gare e atleti", sPh: "Gara, città o nome dell'atleta", sRaces: "Gare", sAthletes: "Atleti", sNone: "Nessun risultato.", sOpen: "Cerca", sAllAth: "Tutti gli atleti →",
    dnf: "Ritirato", dns: "Non partito", dq: "Squalificato",
  },
};
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
