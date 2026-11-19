// ============================================================================
// Pagine del servizio (/{lang}/coach/...): mappa degli URL e testi.
// Scritte in inglese e italiano (le lingue dell'app); le altre lingue del sito
// puntano alla versione inglese finché non vengono tradotte.
// L'atleta d'esempio è inventato (Michael / Davide): numeri illustrativi,
// funzioni reali. I dati di gara sono quelli della scheda sul sito.
// ============================================================================
import type { Lang } from "@/lib/i18n/config";

export type CoachLang = "en" | "it";
export type CoachPage = "hub" | "how" | "week" | "adapts" | "race" | "pricing";
export const COACH_PAGES: CoachPage[] = ["hub", "how", "week", "adapts", "race", "pricing"];

export const COACH_SLUG: Record<CoachLang, Record<Exclude<CoachPage, "hub">, string>> = {
  en: { how: "how-it-works", week: "a-week-with-your-coach", adapts: "the-plan-adapts", race: "from-race-to-plan", pricing: "pricing-and-faq" },
  it: { how: "come-funziona", week: "una-settimana-con-il-coach", adapts: "il-piano-si-adatta", race: "dalla-gara-al-piano", pricing: "prezzi-e-domande" },
};
export const coachLang = (lang: Lang): CoachLang => (lang === "it" ? "it" : "en");
export function coachPath(lang: Lang, page: CoachPage = "hub"): string {
  const l = coachLang(lang);
  return page === "hub" ? `/${l}/coach` : `/${l}/coach/${COACH_SLUG[l][page]}`;
}
export function coachPageFromSlug(l: CoachLang, slug: string | undefined): CoachPage | null {
  if (!slug) return "hub";
  const hit = (Object.entries(COACH_SLUG[l]) as [Exclude<CoachPage, "hub">, string][]).find(([, s]) => s === slug);
  return hit ? hit[0] : null;
}

/** Prezzo dal 1° gennaio 2027 (decisione di Marco, 19/11/2026). */
export const PRICE_EUR = 15;

/** Gara dell'atleta d'esempio, per mercato (slug in event_races). */
export const EXAMPLE_RACE: Record<CoachLang, string> = { en: "augusta-703-2027", it: "cervia-703-2027" };

export type Msg = { who: "me" | "coach" | "sys"; name?: string; text: string; meta?: string };
export type Ses = { k: "s" | "b" | "r" | "g" | "x"; t: string; d?: string; chg?: boolean };
export type Day = { dn: string; ses: Ses[] };

type Bi<T> = Record<CoachLang, T>;
const P: Bi<{ a: string; c: string }> = { en: { a: "Michael", c: "Jack" }, it: { a: "Davide", c: "Nico" } };
export const PERSONA = P;

// ---------------------------------------------------------------- etichette comuni
export const UI: Bi<Record<string, string>> = {
  en: {
    example: "Example athlete. The numbers are illustrative; the features are the real ones.",
    start: "Start free", startNote: "Free until 31 December 2026. No card.",
    crumb: "The coach", next: "Next", telegram: "Telegram", app: "In the app",
    before: "Before", after: "After", rule: "The rule", happened: "What happened", coachSaw: "What the coach did",
    langNote: "The app and the coach speak English and Italian.",
  },
  it: {
    example: "Atleta d'esempio. I numeri sono illustrativi, le funzioni sono quelle vere.",
    start: "Inizia gratis", startNote: "Gratis fino al 31 dicembre 2026. Nessuna carta.",
    crumb: "Il coach", next: "Avanti", telegram: "Telegram", app: "In app",
    before: "Prima", after: "Dopo", rule: "La regola", happened: "Cosa è successo", coachSaw: "Cosa ha fatto il coach",
    langNote: "L'app e il coach parlano italiano e inglese.",
  },
};

export const PAGE_NAME: Bi<Record<CoachPage, string>> = {
  en: { hub: "The coach", how: "How it works", week: "A week with your coach", adapts: "The plan adapts", race: "From race to plan", pricing: "Pricing & FAQ" },
  it: { hub: "Il coach", how: "Come funziona", week: "Una settimana con il coach", adapts: "Il piano si adatta", race: "Dalla gara al piano", pricing: "Prezzi e domande" },
};
export const PAGE_BLURB: Bi<Record<Exclude<CoachPage, "hub">, string>> = {
  en: {
    how: "From sign-up to your first plan in ten minutes, step by step.",
    week: "Seven days, the sessions and the messages: what using it looks like.",
    adapts: "Three situations, before and after: what changes and why.",
    race: "One real race: what it asks and how that becomes training.",
    pricing: "What it costs from January, what you need, and the awkward questions.",
  },
  it: {
    how: "Dall'iscrizione al primo piano in dieci minuti, passo per passo.",
    week: "Sette giorni, le sedute e i messaggi: com'è usarlo davvero.",
    adapts: "Tre situazioni, prima e dopo: cosa cambia e perché.",
    race: "Una gara vera: cosa chiede e come diventa allenamento.",
    pricing: "Quanto costa da gennaio, cosa serve e le domande scomode.",
  },
};

// ---------------------------------------------------------------- titoli e descrizioni (SEO)
export const META: Bi<Record<CoachPage, { h1a: string; h1b: string; lead: string }>> = {
  en: {
    hub: { h1a: "Your triathlon coach,", h1b: "around the clock", lead: "It builds the plan for your race around the hours you really have, sends it to your watch, and rewrites it when life gets in the way." },
    how: { h1a: "From sign-up to your first plan", h1b: "in ten minutes", lead: "Four steps. You do three of them once." },
    week: { h1a: "A week", h1b: "with your coach", lead: "Michael, 45, VP Sales, first 70.3 in {weeks} weeks. Eight hours, six days, one trip to Chicago." },
    adapts: { h1a: "No week goes to plan.", h1b: "This plan knows.", lead: "Three situations, before and after. Same athlete, same race." },
    race: { h1a: "From race page", h1b: "to training plan", lead: "One real race, three questions: what does it ask, where are you today, what goes into the weeks in between." },
    pricing: { h1a: "Free until 31 December.", h1b: "Honest about the rest.", lead: "What it costs from January, what you need to use it, and the questions people ask before trusting a coach that isn't a person." },
  },
  it: {
    hub: { h1a: "Il tuo coach di triathlon,", h1b: "a tutte le ore", lead: "Costruisce il piano per la tua gara sulle ore che hai davvero, lo manda sull'orologio e lo riscrive quando la vita si mette di mezzo." },
    how: { h1a: "Dall'iscrizione al primo piano", h1b: "in dieci minuti", lead: "Quattro passi. Tre li fai una volta sola." },
    week: { h1a: "Una settimana", h1b: "con il coach", lead: "Davide, 45 anni, direttore commerciale, primo 70.3 tra {weeks} settimane. Otto ore, sei giorni, una trasferta a Francoforte." },
    adapts: { h1a: "Nessuna settimana va come previsto.", h1b: "Questo piano lo sa.", lead: "Tre situazioni, prima e dopo. Stesso atleta, stessa gara." },
    race: { h1a: "Dalla scheda gara", h1b: "al piano", lead: "Una gara vera, tre domande: cosa chiede, dove sei oggi, cosa va nelle settimane in mezzo." },
    pricing: { h1a: "Gratis fino al 31 dicembre.", h1b: "Onesti sul resto.", lead: "Quanto costa da gennaio, cosa serve per usarlo e le domande che ci si fa prima di fidarsi di un coach che non è una persona." },
  },
};

// ---------------------------------------------------------------- hub
export const HUB: Bi<{
  does: { t: string; p: string }[]; whoH: string; who: { t: string; p: string }[]; wontH: string; wont: string[]; pagesH: string;
}> = {
  en: {
    does: [
      { t: "Plans", p: "Blocks toward your race, recovery weeks, tests when your thresholds are missing. Never above the hours you declared." },
      { t: "Delivers", p: "Each session on your Garmin, Suunto, COROS or Wahoo, on Zwift and ROUVY, and in the calendar you already use." },
      { t: "Notices", p: "Every morning it compares what was planned with what you did. Every Sunday evening it rewrites the week." },
      { t: "Answers", p: "Write to it in the app or on Telegram. It tells you whether it changes the plan now, on Sunday, or not at all." },
    ],
    whoH: "Built for people with a job",
    who: [
      { t: "The busy professional.", p: "Sixty minutes before work, travel most weeks, one race that matters." },
      { t: "The first-timer.", p: "You've entered your first 70.3 and don't know your zones. The plan starts with the tests." },
      { t: "The athlete who already has a coach.", p: "Run it in shadow mode, or invite your coach to steer it." },
    ],
    wontH: "What it won't do",
    wont: [
      "It can't watch your swim stroke or your bike position.",
      "It doesn't give medical advice. Pain or symptoms: see a professional.",
      "It needs your data: without a connected watch it works from much less.",
      "It's in alpha: things break, and you can tell it what's missing.",
    ],
    pagesH: "See it at work",
  },
  it: {
    does: [
      { t: "Pianifica", p: "Blocchi verso la gara, settimane di scarico, test quando mancano le soglie. Mai sopra le ore che hai dichiarato." },
      { t: "Consegna", p: "Ogni seduta su Garmin, Suunto, COROS o Wahoo, su Zwift e ROUVY, e nel calendario che usi già." },
      { t: "Si accorge", p: "Ogni mattina confronta il previsto con il fatto. Ogni domenica sera riscrive la settimana." },
      { t: "Risponde", p: "Gli scrivi in app o su Telegram. Ti dice se cambia il piano subito, domenica, o per niente." },
    ],
    whoH: "Fatto per chi ha un lavoro",
    who: [
      { t: "Chi lavora tanto.", p: "Sessanta minuti prima dell'ufficio, trasferte quasi ogni settimana, una gara che conta." },
      { t: "Chi è alla prima.", p: "Ti sei iscritto al primo 70.3 e non conosci le tue zone. Il piano parte dai test." },
      { t: "Chi ha già un allenatore.", p: "Tienilo in modalità ombra, o invita il tuo allenatore a guidarlo." },
    ],
    wontH: "Cosa non fa",
    wont: [
      "Non vede la tua bracciata né la tua posizione in bici.",
      "Non dà consigli medici. Dolori o sintomi: da un professionista.",
      "Ha bisogno dei tuoi dati: senza orologio collegato lavora con molto meno.",
      "È in alpha: qualcosa si rompe, e puoi dirgli cosa manca.",
    ],
    pagesH: "Guardalo al lavoro",
  },
};

// ---------------------------------------------------------------- come funziona
export const HOW: Bi<{
  steps: { time: string; t: string; p: string }[]; answersH: string; answers: string[];
  thenH: string; then: { t: string; p: string }[]; honest: string; cta: string; bridge: string[];
}> = {
  en: {
    steps: [
      { time: "1 min", t: "Create the account.", p: "Google or email. If you come from a race page, the race is already selected." },
      { time: "4 min", t: "Answer what a coach would ask at the first meeting.", p: "Experience, goal, race, days and hours, the longest weekday session you can afford, your rest day, injuries, equipment. Don't know your thresholds? Leave them blank." },
      { time: "3 min", t: "Connect your history.", p: "A free Intervals.icu account links Garmin, Suunto, COROS, Polar, Wahoo or Strava. It reads your past training and sends workouts to your watch. It publishes nothing and never edits your activities." },
      { time: "2-4 min", t: "Get the plan.", p: "The season laid out up to race day, and the first weeks session by session." },
    ],
    answersH: "What Michael answered",
    answers: ["60 minutes max on weekdays, at 6:15 am", "Pool only Tuesday and Thursday at lunch", "Monday off", "About 8 hours over 6 days", "Threshold heart rate known, the rest to be tested"],
    thenH: "And from day two",
    then: [
      { t: "Name your coach", p: "and connect Telegram: every evening you get tomorrow's session, the weather where you train and how recovered you are." },
      { t: "Add the plan to your calendar.", p: "Google, Apple or Outlook. It updates itself." },
      { t: "Upload what you already have.", p: "An old coach's spreadsheet, your gym routine: the coach uses them." },
    ],
    honest: "The one fiddly step is the Intervals.icu key. We walk you through it, and the Telegram bot can guide you too.",
    cta: "Start free · it takes ten minutes",
    bridge: ["Your watch", "Intervals.icu", "24/7 Coach"],
  },
  it: {
    steps: [
      { time: "1 min", t: "Crei l'account.", p: "Google o email. Se arrivi da una scheda gara, la gara è già selezionata." },
      { time: "4 min", t: "Rispondi a quello che un coach ti chiederebbe al primo incontro.", p: "Esperienza, obiettivo, gara, giorni e ore, quanto può durare una seduta nei feriali, giorno di riposo, infortuni, attrezzatura. Non conosci le soglie? Lasciale vuote." },
      { time: "3 min", t: "Colleghi il tuo storico.", p: "Un account gratuito Intervals.icu collega Garmin, Suunto, COROS, Polar, Wahoo o Strava. Legge gli allenamenti passati e manda le sedute all'orologio. Non pubblica nulla e non modifica le tue attività." },
      { time: "2-4 min", t: "Ricevi il piano.", p: "Il disegno della stagione fino alla gara e le prime settimane seduta per seduta." },
    ],
    answersH: "Cosa ha risposto Davide",
    answers: ["Max 60 minuti nei feriali, alle 6:15", "Piscina solo martedì e giovedì in pausa pranzo", "Lunedì riposo", "Circa 8 ore su 6 giorni", "Frequenza di soglia nota, il resto da testare"],
    thenH: "E dal secondo giorno",
    then: [
      { t: "Dai un nome al coach", p: "e collega Telegram: ogni sera ricevi la seduta di domani, il meteo dove ti alleni e quanto sei recuperato." },
      { t: "Metti il piano nel calendario.", p: "Google, Apple o Outlook. Si aggiorna da solo." },
      { t: "Carica quello che hai già.", p: "Il foglio di un vecchio allenatore, la scheda palestra: il coach li usa." },
    ],
    honest: "L'unico passo macchinoso è la chiave di Intervals.icu. Ti guidiamo riga per riga, e anche il bot Telegram ti accompagna.",
    cta: "Inizia gratis · bastano dieci minuti",
    bridge: ["Il tuo orologio", "Intervals.icu", "24/7 Coach"],
  },
};

// ---------------------------------------------------------------- una settimana
export const WEEK: Bi<{
  card: { l: string; v: string }[]; weekH: string; total: string; days: Day[]; notes: string[];
  talkH: string; talks: { h: string; ch: string; msgs: Msg[] }[]; honesty: string;
  sawH: string; saw: { v: string; l: string; p: string }[]; cta: string; cta2: string;
}> = {
  en: {
    card: [
      { l: "Athlete", v: "Michael Turner, 45 · VP Sales, Atlanta" },
      { l: "Race", v: "IRONMAN 70.3 Augusta · 26 September 2027 · goal: under 6 hours" },
      { l: "Hours", v: "About 8 a week over 6 days · 60 minutes max on weekdays, at 6:15 am" },
      { l: "Fixed", v: "Pool only Tuesday and Thursday at lunch · Monday off" },
      { l: "Kit", v: "Garmin via Intervals.icu · smart trainer · no power meter outdoors" },
      { l: "Coach", v: "He named it Jack" },
    ],
    weekH: "The week, as planned",
    total: "Base phase · 8 h 05 in total",
    days: [
      { dn: "Mon", ses: [{ k: "x", t: "Rest", d: "His choice, never touched" }] },
      { dn: "Tue", ses: [{ k: "s", t: "Swim 45'", d: "Lunch break · technique, then 6×200 m in Z3" }] },
      { dn: "Wed", ses: [{ k: "r", t: "Run 50'", d: "6:15 am · easy Z2 with 6×1' in Z4" }, { k: "g", t: "Gym 40'", d: "Evening · his own routine" }] },
      { dn: "Thu", ses: [{ k: "s", t: "Swim 45'", d: "Lunch break · 400 m test to set his swim pace" }] },
      { dn: "Fri", ses: [{ k: "b", t: "Bike 60'", d: "Trainer · 3×10' in Z4 (it's on Zwift too)" }] },
      { dn: "Sat", ses: [{ k: "b", t: "Bike 2h45", d: "Long ride in Z2 on one of his usual routes" }] },
      { dn: "Sun", ses: [{ k: "r", t: "Run 1h20", d: "Long run in Z2, last 15' in Z3 · evening: weekly review" }] },
    ],
    notes: [
      "No weekday session is longer than the 60 minutes he declared.",
      "Thursday's test exists because his swim pace was unknown.",
      "Saturday's route comes from his own GPS history, not from a generic map.",
    ],
    talkH: "The same week, in messages",
    talks: [
      { h: "Tuesday · the plan changes straight away", ch: "Telegram", msgs: [
        { who: "me", text: "Thursday I'm in Chicago, no pool. Back Friday night." },
        { who: "coach", text: "Got it: no swim on Thursday. I'm reworking the plan from tomorrow so the 400 m test moves to next Tuesday and Thursday becomes an easy 40' run you can do from the hotel. Ready in a few minutes." },
        { who: "coach", meta: "4 minutes later", text: "🔄 Jack updated your plan. Next days: Wed run 50' + gym · Thu easy run 40' · Fri trainer 60'. Already on your watch and calendar." },
      ] },
      { h: "Thursday · it takes note for Sunday", ch: "Telegram", msgs: [
        { who: "me", text: "Next week is quarter close. I can do five hours, not eight, but Saturday morning is free." },
        { who: "coach", text: "Understood: five hours next week with a free Saturday morning. I'll build it that way on Sunday evening, keeping the long ride and trimming the weekdays. Nothing changes this week." },
      ] },
      { h: "Friday · it reads the old coach's file", ch: "In the app", msgs: [
        { who: "me", text: "My old coach's spreadsheet had a bike test I liked. Can you put it back in?" },
        { who: "coach", text: "Found it in the file you uploaded: 10' warm-up, 5' hard, 10' easy, then 20' all-out. On Sunday, when I build next week, it goes on Friday's trainer session in place of the 3×10'. The result sets your bike zones." },
      ] },
      { h: "Saturday evening · the good-night message", ch: "Telegram", msgs: [
        { who: "coach", text: "🌙 Good night, Michael!\nTomorrow: Run 1h20 · long run in Z2\n• Warm-up: 10' in Z1 · Main: 55' in Z2 · Finish: 15' in Z3\nKeep it easy until the last block: this is the run you'll need off the bike.\nWeather tomorrow: 9 °C at 7 am, clear, light wind.\nReadiness today: 71/100\nReply here to talk to Jack." },
      ] },
    ],
    honesty: "Asked for something it can't do yet? It says so, passes it to the team, and comes back when it's built.",
    sawH: "What the coach looks at",
    saw: [
      { v: "Fitness", l: "the work of the last six weeks", p: "It rises slowly when you train regularly. It's what the plan is building toward race day." },
      { v: "Fatigue", l: "the work of the last week", p: "It jumps after a big weekend. When it runs well ahead of fitness, the next days get lighter." },
      { v: "Readiness", l: "sleep, heart-rate variability, resting heart rate", p: "A number out of 100 against your own four-week average. Low readiness is a question to you, not an order." },
    ],
    cta: "Get your own week · start free", cta2: "See what happens when the week goes wrong",
  },
  it: {
    card: [
      { l: "Atleta", v: "Davide Rinaldi, 45 anni · direttore commerciale, Milano" },
      { l: "Gara", v: "IRONMAN 70.3 Italy Emilia-Romagna, Cervia · 19 settembre 2027 · obiettivo: sotto le 6 ore" },
      { l: "Ore", v: "Circa 8 a settimana su 6 giorni · max 60 minuti nei feriali, alle 6:15" },
      { l: "Vincoli", v: "Piscina solo martedì e giovedì in pausa pranzo · lunedì riposo" },
      { l: "Attrezzatura", v: "Garmin via Intervals.icu · rulli smart · nessun misuratore di potenza su strada" },
      { l: "Coach", v: "Lo ha chiamato Nico" },
    ],
    weekH: "La settimana, com'era prevista",
    total: "Fase di base · 8 h 05 in tutto",
    days: [
      { dn: "Lun", ses: [{ k: "x", t: "Riposo", d: "Scelto da lui, intoccabile" }] },
      { dn: "Mar", ses: [{ k: "s", t: "Nuoto 45'", d: "Pausa pranzo · tecnica, poi 6×200 m in Z3" }] },
      { dn: "Mer", ses: [{ k: "r", t: "Corsa 50'", d: "Ore 6:15 · Z2 facile con 6×1' in Z4" }, { k: "g", t: "Palestra 40'", d: "Sera · la sua scheda" }] },
      { dn: "Gio", ses: [{ k: "s", t: "Nuoto 45'", d: "Pausa pranzo · test 400 m per fissare il passo nuoto" }] },
      { dn: "Ven", ses: [{ k: "b", t: "Bici 60'", d: "Rulli · 3×10' in Z4 (arriva anche su Zwift)" }] },
      { dn: "Sab", ses: [{ k: "b", t: "Bici 2h45", d: "Lungo in Z2 su uno dei suoi giri abituali" }] },
      { dn: "Dom", ses: [{ k: "r", t: "Corsa 1h20", d: "Lungo in Z2, ultimi 15' in Z3 · la sera: revisione settimanale" }] },
    ],
    notes: [
      "Nessuna seduta nei feriali supera i 60 minuti che ha dichiarato.",
      "Il test del giovedì c'è perché il suo passo a nuoto non era noto.",
      "Il giro del sabato viene dal suo storico GPS, non da una mappa generica.",
    ],
    talkH: "La stessa settimana, nei messaggi",
    talks: [
      { h: "Martedì · il piano cambia subito", ch: "Telegram", msgs: [
        { who: "me", text: "Giovedì sono a Francoforte, niente piscina. Rientro venerdì sera." },
        { who: "coach", text: "Ricevuto: giovedì niente nuoto. Rivedo il piano da domani: il test dei 400 m passa a martedì prossimo e giovedì diventa una corsa facile di 40' che puoi fare dall'hotel. Pronto tra qualche minuto." },
        { who: "coach", meta: "4 minuti dopo", text: "🔄 Nico ha aggiornato la tua tabella. Prossimi giorni: mer corsa 50' + palestra · gio corsa facile 40' · ven rulli 60'. È già sull'orologio e nel calendario." },
      ] },
      { h: "Giovedì · ne tiene conto domenica", ch: "Telegram", msgs: [
        { who: "me", text: "La prossima settimana ho la chiusura del trimestre. Riesco a fare cinque ore, non otto, ma sabato mattina sono libero." },
        { who: "coach", text: "Capito: cinque ore la prossima settimana, con sabato mattina libero. La costruisco così domenica sera, tenendo il lungo in bici e accorciando i feriali. Questa settimana non cambia nulla." },
      ] },
      { h: "Venerdì · legge il file del vecchio allenatore", ch: "In app", msgs: [
        { who: "me", text: "Nel foglio del mio vecchio allenatore c'era un test bici che mi piaceva. Me lo rimetti?" },
        { who: "coach", text: "L'ho trovato nel file che hai caricato: 10' di riscaldamento, 5' forte, 10' facile, poi 20' a tutta. Domenica, quando costruisco la prossima settimana, lo metto venerdì sui rulli al posto delle 3×10'. Il risultato fissa le tue zone in bici." },
      ] },
      { h: "Sabato sera · il messaggio della buonanotte", ch: "Telegram", msgs: [
        { who: "coach", text: "🌙 Buonanotte Davide!\nDomani ti aspetta: Corsa 1h20 · lungo in Z2\n• Riscaldamento: 10' in Z1 · Centrale: 55' in Z2 · Finale: 15' in Z3\nTienila facile fino all'ultimo blocco: è la corsa che ti servirà scesi dalla bici.\nMeteo di domani: 6 °C alle 7, sereno, vento debole.\nProntezza di oggi: 71/100\nRispondi qui per scrivere a Nico." },
      ] },
    ],
    honesty: "Gli chiedi una cosa che ancora non sa fare? Lo dice, la passa al team, e torna da te quando c'è.",
    sawH: "Cosa guarda il coach",
    saw: [
      { v: "Forma", l: "il lavoro delle ultime sei settimane", p: "Sale piano quando ti alleni con regolarità. È quello che il piano costruisce verso il giorno di gara." },
      { v: "Fatica", l: "il lavoro dell'ultima settimana", p: "Schizza dopo un weekend carico. Quando corre molto più della forma, i giorni dopo si alleggeriscono." },
      { v: "Prontezza", l: "sonno, variabilità cardiaca, battito a riposo", p: "Un numero su 100 rispetto alla tua media di quattro settimane. Se è bassa è una domanda per te, non un ordine." },
    ],
    cta: "Fatti fare la tua settimana · inizia gratis", cta2: "Guarda cosa succede quando la settimana va storta",
  },
};

// ---------------------------------------------------------------- il piano si adatta
export const ADAPTS: Bi<{
  cases: { h: string; fact: string; msgs: Msg[]; ch: string; before?: Ses[]; after?: Ses[]; variant?: string; rule: string }[];
  whenH: string; when: { t: string; p: string }[]; limits: string; cta: string; cta2: string;
}> = {
  en: {
    cases: [
      { h: "He did much more", fact: "Saturday's ride was planned at 2h45. The group kept going: 4h20.", ch: "Sunday morning, in the app",
        msgs: [{ who: "coach", text: "Yesterday the plan said 2h45 in Z2, you did 4h20. I've lightened the start of next week: Tuesday's swim is technique only, Wednesday's run loses the hard minutes, quality is back on Friday. Today, keep the long run all in Z2." }],
        before: [{ k: "s", t: "Tue · Swim 45'", d: "with 6×200 m in Z3" }, { k: "r", t: "Wed · Run 50'", d: "with 6×1' in Z4" }],
        after: [{ k: "s", t: "Tue · Swim 40'", d: "technique only", chg: true }, { k: "r", t: "Wed · Run 40'", d: "in Z1-Z2", chg: true }],
        rule: "It doesn't punish the extra and doesn't pretend it didn't happen. Reviews always start from tomorrow: today's session is never rewritten." },
      { h: "He skipped a session", fact: "Wednesday's 6:15 run never happened. No activity on the watch.", ch: "Thursday morning, in the app",
        msgs: [
          { who: "coach", text: "Yesterday the plan had a 50' run, and nothing shows up. All good? If you skipped because you were tired, sore or busy, write it below and I'll adapt." },
          { who: "me", text: "7 am meeting, couldn't make it. I'm fine." },
          { who: "coach", text: "Fine, no need to make it up. The week continues as written; Sunday's long run does the job." },
        ],
        variant: "Had he answered \"my knee is pulling\", the plan would have been reviewed from the next day, with the run replaced.",
        rule: "A missed session is a question, not a debt. Missed sessions are never crammed back in." },
      { h: "Three nights in a hotel", fact: "Two flights, three short nights. Readiness drops to 41/100.", ch: "Evening message, then 6:05 am",
        msgs: [
          { who: "coach", text: "Recovery has been low: if you wake up tired, tell me and I'll lighten tomorrow." },
          { who: "me", text: "Wrecked." },
          { who: "coach", text: "Then skip the 3×10' today: an easy spin, or nothing. I'm reworking the plan from tomorrow, and the hard session comes back at the weekend if your readiness is up." },
        ],
        rule: "It reads your sleep, heart-rate variability and resting heart rate against your own four-week average. You have the last word." },
    ],
    whenH: "The four moments the plan can change",
    when: [
      { t: "Every morning", p: "It compares yesterday's plan with what you did." },
      { t: "When you write to it", p: "It decides: change from tomorrow, on Sunday, or just an answer. And tells you." },
      { t: "Every Sunday evening", p: "It rewrites next week on what actually happened." },
      { t: "When you ask", p: "\"Review my plan now\": ready in a few minutes." },
    ],
    limits: "Small differences don't trigger anything: ten extra minutes on an easy run is just life.",
    cta: "Start free and break your first week", cta2: "Read the awkward questions",
  },
  it: {
    cases: [
      { h: "Ha fatto molto di più", fact: "Il lungo di sabato era 2h45. Il gruppo ha tirato dritto: 4h20.", ch: "Domenica mattina, in app",
        msgs: [{ who: "coach", text: "Ieri erano previste 2h45 in Z2, ne hai fatte 4h20. Ho alleggerito l'inizio della prossima settimana: martedì nuoto solo tecnica, mercoledì corsa senza variazioni, la qualità torna venerdì. Oggi tieni il lungo tutto in Z2." }],
        before: [{ k: "s", t: "Mar · Nuoto 45'", d: "con 6×200 m in Z3" }, { k: "r", t: "Mer · Corsa 50'", d: "con 6×1' in Z4" }],
        after: [{ k: "s", t: "Mar · Nuoto 40'", d: "solo tecnica", chg: true }, { k: "r", t: "Mer · Corsa 40'", d: "in Z1-Z2", chg: true }],
        rule: "Non punisce l'extra e non fa finta che non ci sia stato. Le revisioni partono sempre da domani: la seduta di oggi non viene riscritta." },
      { h: "Ha saltato una seduta", fact: "La corsa di mercoledì alle 6:15 non c'è stata. Nessuna attività sull'orologio.", ch: "Giovedì mattina, in app",
        msgs: [
          { who: "coach", text: "Ieri era prevista una corsa di 50', ma non risulta nessuna attività. Tutto ok? Se hai saltato per stanchezza, un fastidio o impegni, scrivimelo qui sotto: adatto il piano di conseguenza." },
          { who: "me", text: "Riunione alle 7, non ce l'ho fatta. Sto bene." },
          { who: "coach", text: "Bene, non serve recuperarla. La settimana prosegue com'è scritta: il lungo di domenica fa il suo lavoro." },
        ],
        variant: "Se avesse risposto «il ginocchio tira», il piano sarebbe stato rivisto dal giorno dopo, con la corsa sostituita.",
        rule: "Una seduta saltata è una domanda, non un debito. Le sedute perse non si recuperano mai a forza." },
      { h: "Tre notti in hotel", fact: "Due voli, tre notti corte. La prontezza scende a 41/100.", ch: "Messaggio della sera, poi ore 6:05",
        msgs: [
          { who: "coach", text: "Il recupero è basso: se domattina ti svegli stanco scrivimelo e alleggerisco." },
          { who: "me", text: "Cotto." },
          { who: "coach", text: "Allora oggi lascia stare le 3×10': rulli facili, o niente. Rivedo il piano da domani, e la seduta dura torna nel weekend se la prontezza risale." },
        ],
        rule: "Legge sonno, variabilità cardiaca e battito a riposo rispetto alla tua media di quattro settimane. L'ultima parola è tua." },
    ],
    whenH: "Le quattro occasioni in cui il piano cambia",
    when: [
      { t: "Ogni mattina", p: "Confronta il previsto di ieri con quello che hai fatto." },
      { t: "Quando gli scrivi", p: "Decide: cambia da domani, domenica, o solo una risposta. E te lo dice." },
      { t: "Ogni domenica sera", p: "Riscrive la settimana dopo su quello che è successo davvero." },
      { t: "Quando lo chiedi", p: "«Rivedi il piano adesso»: pronto in pochi minuti." },
    ],
    limits: "Le piccole differenze non fanno scattare niente: dieci minuti in più su un fondo sono solo vita.",
    cta: "Inizia gratis e prova a rompere la prima settimana", cta2: "Leggi le domande scomode",
  },
};

// ---------------------------------------------------------------- dalla gara al piano
export const RACEPLAN: Bi<{
  asksH: string; tiles: Record<"swim" | "bike" | "run" | "air" | "water" | "wind", string>; seePage: string;
  standH: string; stand: string; leverH: string; lever: string;
  weeksH: string; weeks: string; blocks: { t: string; p: string }[];
  tellH: string; tell: string; msgs: Msg[]; pickH: string; pick: string; cta: string; ctaPick: string; calc: string;
}> = {
  en: {
    asksH: "What {race} asks",
    tiles: { swim: "swim", bike: "bike, with {dplus} m of climbing", run: "run", air: "average high on race week", water: "average water temperature", wind: "average wind" },
    seePage: "Open the race page",
    standH: "Where you stand today",
    stand: "Once your history is in, the coach projects your finish time on this course and compares it with your goal. The course data it uses (distance, climbing, heat, wind, water) is the same you read on the race page.",
    leverH: "What moves the clock",
    lever: "It shows which leg buys you the most time. For Michael it's the run off the bike: that's where his weeks put the quality.",
    weeksH: "{weeks} weeks, in blocks",
    weeks: "You see the whole design on day one and the detail of the next weeks.",
    blocks: [
      { t: "Base", p: "Regular volume, technique, the tests that set your zones." },
      { t: "Build", p: "Longer weekends, the first sessions at race effort." },
      { t: "Race-specific", p: "Bike and run back to back, at the pace and in the conditions of the day." },
      { t: "Taper", p: "Less volume, same sharpness, toward the date." },
    ],
    tellH: "Tell it what the race page told you",
    tell: "Worried about the heat or a climb late in the bike? Write it. It goes into the plan.",
    msgs: [
      { who: "me", text: "Augusta in late September is still hot and I struggle in the heat. Can we prepare for that?" },
      { who: "coach", text: "Yes. I'll factor it in from Sunday, when I build the next weeks: one run a week goes into the warmest hour you can manage, always in Z2. Add it to your goals in the app too, so it stays with me until race day." },
    ],
    pickH: "Now pick yours", pick: "Every race on the site has its page. Start from there and the race comes with you into the sign-up.",
    cta: "Build the plan for {race} · free", ctaPick: "Pick your race", calc: "Try the performance calculator",
  },
  it: {
    asksH: "Cosa chiede {race}",
    tiles: { swim: "nuoto", bike: "bici, con {dplus} m di dislivello", run: "corsa", air: "massima media nella settimana di gara", water: "temperatura media dell'acqua", wind: "vento medio" },
    seePage: "Apri la scheda gara",
    standH: "Dove sei oggi",
    stand: "Con il tuo storico dentro, il coach proietta il tuo tempo su questo percorso e lo confronta con l'obiettivo. I dati di gara che usa (distanze, dislivello, caldo, vento, acqua) sono gli stessi che leggi nella scheda.",
    leverH: "Cosa sposta il cronometro",
    lever: "Ti mostra quale frazione rende di più. Per Davide è la corsa dopo la bici: è lì che le sue settimane mettono la qualità.",
    weeksH: "{weeks} settimane, a blocchi",
    weeks: "Dal primo giorno vedi tutto il disegno e il dettaglio delle prossime settimane.",
    blocks: [
      { t: "Base", p: "Volume regolare, tecnica, i test che fissano le tue zone." },
      { t: "Costruzione", p: "Weekend più lunghi, le prime sedute al ritmo gara." },
      { t: "Specifico", p: "Bici e corsa di seguito, al passo e nelle condizioni del giorno." },
      { t: "Scarico", p: "Meno volume, stessa brillantezza, verso la data." },
    ],
    tellH: "Di' al coach quello che hai letto nella scheda",
    tell: "Ti preoccupano il caldo o una salita nel finale della bici? Scriviglielo. Entra nel piano.",
    msgs: [
      { who: "me", text: "A Cervia a settembre fa ancora caldo e io soffro. Si può preparare?" },
      { who: "coach", text: "Sì. Ne tengo conto da domenica, quando costruisco le prossime settimane: una corsa a settimana va nell'ora più calda che riesci a fare, sempre in Z2. Scrivilo anche negli obiettivi in app, così resta con me fino alla gara." },
    ],
    pickH: "Adesso scegli la tua", pick: "Ogni gara del sito ha la sua scheda. Parti da lì e la gara ti segue nell'iscrizione.",
    cta: "Costruisci il piano per {race} · gratis", ctaPick: "Scegli la tua gara", calc: "Prova il calcolatore di performance",
  },
};

// ---------------------------------------------------------------- prezzi e domande
export const PRICING: Bi<{
  nowT: string; nowP: string; thenT: string; thenP: string; per: string; incl: string[]; faqH: string; faq: { q: string; a: string }[];
}> = {
  en: {
    nowT: "Until 31 December 2026", nowP: "Free. Everything included, no card asked.",
    thenT: "From 1 January 2027", thenP: "One plan, everything included.", per: "a month",
    incl: ["Plan built on your race and your hours", "Sessions on your watch and in your calendar", "Daily check and weekly review", "The coach in the app and on Telegram"],
    faqH: "The awkward questions",
    faq: [
      { q: "How is it different from a human coach?", a: "A human coach sees you move, knows you, and has judgement no software has. This coach is there every morning and every evening, reads every session, and reworks the week in minutes. Many athletes need the second more often than the first. You can have both: invite your coach and they steer the AI." },
      { q: "I already follow a plan.", a: "Use shadow mode: you see what 24/7 Coach would propose, nothing is sent to your watch. Or upload the plan: the coach takes its phases and sessions and recalculates intensities on your real thresholds." },
      { q: "What do I need?", a: "A sports watch or Strava, and a free Intervals.icu account that connects them. Sleep and recovery tracking needs a watch you sleep with." },
      { q: "Why Intervals.icu?", a: "It's the bridge that reads your history and writes workouts to your watch. We publish nothing and never edit your activities." },
      { q: "I only have six hours a week.", a: "Say so. Your hours, your longest weekday session and your rest day are hard limits." },
      { q: "I don't know my zones.", a: "The first week includes the tests. Later, write \"recalculate my thresholds\" after a race or a test." },
      { q: "Do I have to use Telegram?", a: "No. You can talk to the coach in the app, or from Claude and ChatGPT. Telegram adds the evening message." },
      { q: "Which languages?", a: "The race guide is in 12 languages. The app and the coach speak English and Italian." },
      { q: "Only triathlon?", a: "Triathlon, trail running and ultra endurance." },
      { q: "What can go wrong in alpha?", a: "A sync that arrives late, a session that needs a second look. Tell the coach: every message also reaches the team." },
      { q: "Are you part of IRONMAN?", a: "No. 24/7 Coach is independent. Race names are used to describe the events." },
      { q: "Who is behind it?", a: "77OS S.R.L., Milan." },
    ],
  },
  it: {
    nowT: "Fino al 31 dicembre 2026", nowP: "Gratis. Tutto compreso, nessuna carta richiesta.",
    thenT: "Dal 1° gennaio 2027", thenP: "Un solo piano, tutto compreso.", per: "al mese",
    incl: ["Piano costruito sulla tua gara e sulle tue ore", "Sedute sull'orologio e nel calendario", "Controllo ogni giorno e revisione ogni settimana", "Il coach in app e su Telegram"],
    faqH: "Le domande scomode",
    faq: [
      { q: "In cosa è diverso da un coach umano?", a: "Un coach umano ti vede muoverti, ti conosce, e ha un giudizio che nessun software ha. Questo coach c'è ogni mattina e ogni sera, legge ogni seduta e riscrive la settimana in pochi minuti. A molti atleti serve più spesso la seconda cosa. Puoi averle tutte e due: inviti il tuo allenatore e lui guida il coach AI." },
      { q: "Seguo già un piano.", a: "Usa la modalità ombra: vedi cosa proporrebbe 24/7 Coach, niente arriva all'orologio. Oppure carica il piano: il coach ne prende fasi e sedute e ricalcola le intensità sulle tue soglie vere." },
      { q: "Cosa mi serve?", a: "Un orologio sportivo o Strava, e un account gratuito Intervals.icu che li collega. Per sonno e recupero serve un orologio con cui dormi." },
      { q: "Perché Intervals.icu?", a: "È il ponte che legge il tuo storico e scrive le sedute sull'orologio. Non pubblichiamo nulla e non modifichiamo le tue attività." },
      { q: "Ho solo sei ore a settimana.", a: "Dillo. Le tue ore, la durata massima nei feriali e il giorno di riposo sono limiti rigidi." },
      { q: "Non conosco le mie zone.", a: "La prima settimana include i test. Poi, dopo una gara o un test, scrivi «ricalcola le soglie»." },
      { q: "Devo usare Telegram?", a: "No. Parli con il coach in app, oppure da Claude e ChatGPT. Telegram aggiunge il messaggio della sera." },
      { q: "In che lingue?", a: "La guida alle gare è in 12 lingue. L'app e il coach parlano italiano e inglese." },
      { q: "Solo triathlon?", a: "Triathlon, trail running e ultra endurance." },
      { q: "Cosa può andare storto in alpha?", a: "Un sync in ritardo, una seduta da rivedere. Dillo al coach: ogni messaggio arriva anche al team." },
      { q: "Siete parte di IRONMAN?", a: "No. 24/7 Coach è indipendente. I nomi delle gare sono usati per descrivere gli eventi." },
      { q: "Chi c'è dietro?", a: "77OS S.R.L., Milano." },
    ],
  },
};

// ---------------------------------------------------------------- footer
export const FOOT: Bi<{ races: string; all: string; find: string; mag: string; coach: string; tools: string; calc: string; company: string; forCoaches: string; legal: string }> = {
  en: { races: "Races", all: "All races", find: "Find your race", mag: "Magazine", coach: "The coach", tools: "Free tools", calc: "Performance calculator", company: "24/7 Coach", forCoaches: "For coaches", legal: "24/7 Coach is a product of" },
  it: { races: "Gare", all: "Tutte le gare", find: "Trova la tua gara", mag: "Magazine", coach: "Il coach", tools: "Strumenti gratuiti", calc: "Calcolatore di performance", company: "24/7 Coach", forCoaches: "Per allenatori", legal: "24/7 Coach è una soluzione di" },
};
