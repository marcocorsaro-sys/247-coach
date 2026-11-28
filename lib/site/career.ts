// ============================================================================
// Carriera di un atleta: posizione rispetto al gruppo e tempi "a parità di
// percorso". Tutto viene da lib/site/data/editionStats.json: per ogni edizione
// la distribuzione dei tempi (ogni 5%) e quanto quell'edizione è stata più
// lenta o più veloce della gara media, misurato sugli stessi atleti.
// ============================================================================
import data from "./data/editionStats.json";
import { athletesPath, athLang, type AthLang, type AthResult } from "./athletes";
import type { Lang } from "@/lib/i18n/config";

export type CLeg = "finish" | "swim" | "bike" | "run";
export const CLEGS: CLeg[] = ["swim", "bike", "run", "finish"];
type ES = Partial<Record<CLeg, number[]>> & { d: Partial<Record<CLeg, number>> };
const ED = data as unknown as Record<string, ES>;
export const edStats = (id: string): ES | null => ED[id] ?? null;

/** Quota di arrivati più lenti di questo tempo (0-100), o null senza distribuzione. */
export function betterThan(id: string, leg: CLeg, secs: number | null | undefined): number | null {
  const q = ED[id]?.[leg];
  if (!q || secs == null || secs <= 0) return null;
  if (secs <= q[0]) return 100;
  if (secs >= q[q.length - 1]) return 0;
  let i = 1;
  while (i < q.length && q[i] < secs) i++;
  const span = q[i] - q[i - 1] || 1;
  const pct = ((i - 1) + (secs - q[i - 1]) / span) * 5;
  return Math.max(0, Math.min(100, Math.round(100 - pct)));
}
/** Tempo riportato alla gara media della stessa distanza, o null se l'edizione non ha indice. */
export function adjusted(id: string, leg: CLeg, secs: number | null | undefined): number | null {
  const d = ED[id]?.d?.[leg];
  if (d == null || secs == null || secs <= 0) return null;
  return Math.round(secs / (1 + d / 100));
}

export type CareerRow = { r: AthResult; adj: number | null; pct: Partial<Record<CLeg, number | null>> };
export function careerRows(results: AthResult[]): CareerRow[] {
  return results.filter((r) => r.status === "FIN" && r.finish).map((r) => ({
    r, adj: adjusted(r.edition_id, "finish", r.finish),
    pct: Object.fromEntries(CLEGS.map((k) => [k, betterThan(r.edition_id, k, r[k])])) as Partial<Record<CLeg, number | null>>,
  }));
}

const EQ_SEG: Record<AthLang, string> = { en: "equivalent", it: "equivalente" };
const CL_SEG: Record<AthLang, string> = { en: "claim", it: "rivendica" };
export const EQUIV_SEG = EQ_SEG, CLAIM_SEG = CL_SEG;
export const equivPath = (l: Lang | string) => `${athletesPath(l)}/${EQ_SEG[athLang(l)]}`;
export const claimPath = (l: Lang | string, slug?: string) => `${athletesPath(l)}/${CL_SEG[athLang(l)]}${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`;

type Txt = Record<string, string>;
export const CAR: Record<AthLang, Txt> = {
  en: {
    sum1: "{name} has {races} IRONMAN and 70.3 {racesW} on record between {y1} and {y2}, {fin} of them finished.", sum1one: "{name} has one race on record: {race}.",
    sumBestFull: "Best full-distance time: {t} at {race}.", sumBestHalf: "Best 70.3 time: {t} at {race}.",
    sumAdj: "On a like-for-like course, the strongest race was {race}: worth {t} on an average course.", sumPct: "At {race} {name} was faster than {p}% of finishers.",
    race1: "race", raceN: "races",
    trendH: "Performance over the years", trendLead: "Each dot is a finished race. The solid line is the actual time; the dashed line is the same time brought to an average course of that distance, so races on different courses can be compared.",
    full: "Full distance", half: "70.3", real: "Actual time", adj: "On an average course", faster: "faster ↑",
    fieldH: "Against the field", fieldLead: "For each race, the share of finishers this athlete was faster than, leg by leg. 50% is the middle of the field.",
    adjCol: "Average-course time", noAdj: "–",
    dlH: "Take these results with you", dlCsv: "Download the results (CSV)", dlCard: "Download the summary card (PNG)", dlNote: "The file contains only this athlete's results as shown on this page.",
    claimLink: "Is this you? Merge profiles or fix a result", eqLink: "What would this time be worth at another race?",
    eqTitle: "Race time converter: what is your IRONMAN time worth on another course?", eqH1a: "What would I do", eqH1b: "at another race?",
    eqLead: "Enter a time you raced. We bring it to another course using how the same athletes performed on both: {n} results from people who finished more than one race.",
    eqFrom: "The race you did", eqTime: "Your finish time (h:mm:ss)", eqDist: "Distance", eqTo: "Compare with", eqAll: "All races",
    eqResult: "Equivalent time", eqSame: "your race", eqFaster: "faster course", eqSlower: "slower course", eqBad: "Enter a time such as 12:30:00.", eqPct: "faster than {p}% of the last edition's finishers",
    eqNote: "It is an estimate from medians: weather on the day, your strengths and how you pace change the result. Courses with a shortened leg are left out of the index.",
    eqTableH: "Every race, from fastest to slowest", eqTableLead: "How much slower or faster each course is than the average race of the same distance, in total and leg by leg.", eqRace: "Race", eqIdx: "Total",
    clTitle: "Claim an athlete profile", clH1: "Is this your profile?", clLead: "Some athletes appear twice, because results come from sources that identify people differently, and a few results may be attached to the wrong person. Tell us which pages are yours and what is wrong: we check and fix it by hand.",
    clSlug: "Address of your page", clOther: "Other pages that are also you, or results that are not yours (one per line)", clEmail: "Your email, so we can tell you when it is done", clNote: "Anything that helps us check (optional)", clBtn: "Send the request",
    clDone: "Received. We check each request by hand and write to you when it is done.", clErr: "We couldn't find that page, or the email is missing. Paste the full address of your page.",
    clPriv: "We use your email only to answer this request.",
  },
  it: {
    sum1: "{name} ha in archivio {races} {racesW} IRONMAN e 70.3 tra il {y1} e il {y2}, {fin} portate a termine.", sum1one: "{name} ha in archivio una gara: {race}.",
    sumBestFull: "Miglior tempo sulla distanza full: {t} a {race}.", sumBestHalf: "Miglior tempo su 70.3: {t} a {race}.",
    sumAdj: "A parità di percorso la gara più forte è stata {race}: vale {t} su un percorso medio.", sumPct: "A {race} {name} è stato più veloce del {p}% degli arrivati.",
    race1: "gara", raceN: "gare",
    trendH: "L'andamento negli anni", trendLead: "Ogni punto è una gara finita. La linea continua è il tempo reale; quella tratteggiata è lo stesso tempo riportato a un percorso medio di quella distanza, così gare su percorsi diversi si possono confrontare.",
    full: "Distanza full", half: "70.3", real: "Tempo reale", adj: "Su un percorso medio", faster: "più veloce ↑",
    fieldH: "Rispetto al gruppo", fieldLead: "Per ogni gara, la quota di arrivati di cui questo atleta è stato più veloce, frazione per frazione. Il 50% è il centro del gruppo.",
    adjCol: "Tempo su percorso medio", noAdj: "–",
    dlH: "Porta con te questi risultati", dlCsv: "Scarica i risultati (CSV)", dlCard: "Scarica la scheda riassuntiva (PNG)", dlNote: "Il file contiene solo i risultati di questo atleta, come li vedi in questa pagina.",
    claimLink: "Sei tu? Unisci i profili o correggi un risultato", eqLink: "Quanto varrebbe questo tempo in un'altra gara?",
    eqTitle: "Convertitore di tempi: quanto vale il tuo tempo IRONMAN su un altro percorso?", eqH1a: "Quanto farei", eqH1b: "in un'altra gara?",
    eqLead: "Inserisci un tempo che hai fatto. Lo riportiamo su un altro percorso usando come sono andati gli stessi atleti su entrambi: {n} risultati di persone che hanno finito più di una gara.",
    eqFrom: "La gara che hai fatto", eqTime: "Il tuo tempo finale (h:mm:ss)", eqDist: "Distanza", eqTo: "Confronta con", eqAll: "Tutte le gare",
    eqResult: "Tempo equivalente", eqSame: "la tua gara", eqFaster: "percorso più veloce", eqSlower: "percorso più lento", eqBad: "Inserisci un tempo come 12:30:00.", eqPct: "più veloce del {p}% degli arrivati dell'ultima edizione",
    eqNote: "È una stima fatta sulle mediane: il meteo del giorno, i tuoi punti di forza e come gestisci la gara cambiano il risultato. I percorsi con una frazione accorciata restano fuori dall'indice.",
    eqTableH: "Tutte le gare, dalla più veloce alla più lenta", eqTableLead: "Quanto ogni percorso è più lento o più veloce della gara media della stessa distanza, sul totale e frazione per frazione.", eqRace: "Gara", eqIdx: "Totale",
    clTitle: "Rivendica un profilo atleta", clH1: "Questo profilo sei tu?", clLead: "Alcuni atleti compaiono due volte, perché i risultati arrivano da fonti che identificano le persone in modo diverso, e qualche risultato può essere finito sulla persona sbagliata. Dicci quali pagine sono tue e cosa non va: controlliamo e sistemiamo a mano.",
    clSlug: "Indirizzo della tua pagina", clOther: "Altre pagine che sei sempre tu, o risultati che non sono tuoi (uno per riga)", clEmail: "La tua email, per avvisarti quando è fatto", clNote: "Quello che ci aiuta a verificare (facoltativo)", clBtn: "Invia la richiesta",
    clDone: "Ricevuta. Controlliamo ogni richiesta a mano e ti scriviamo quando è fatto.", clErr: "Non abbiamo trovato quella pagina, oppure manca l'email. Incolla l'indirizzo completo della tua pagina.",
    clPriv: "Usiamo la tua email solo per rispondere a questa richiesta.",
  },
};
