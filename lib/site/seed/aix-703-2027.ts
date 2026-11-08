import type { RaceSeed } from "./types";

// Fonti: vedi sources. Dislivello, giri bici e temperatura acqua non verificati: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "aix-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Aix-en-Provence",
    region: "Provenza-Alpi-Costa Azzurra",
    course_version: "Edizione 2026 come riferimento, tratti indicativi: verifica la mappa ufficiale 2027",
    intro:
      "IRONMAN 70.3 Aix-en-Provence è una mezza distanza provenzale con nuoto nel lago di Peyrolles, bici verso Aix tra i paesaggi della Provenza e le strade attorno alla Montagne Sainte-Victoire, e corsa su tre giri nel centro di Aix con arrivo sul Cours Mirabeau. La data 2027 non è univoca nelle fonti (una indica metà maggio, un'altra mostra la data da confermare): conferma sul sito ufficiale. Il percorso è un mix di tratti piatti e collinari, quindi serve una gestione attenta dello sforzo in bici.",
    kpis: [
      { v: "1,9 km", l: "nuoto · lago di Peyrolles" },
      { v: "90 km", l: "bici · da Peyrolles ad Aix, tratti misti (D+ non verificato)" },
      { v: "21,1 km", l: "corsa · 3 giri nel centro di Aix" },
      { v: "da verificare", l: "acqua a maggio · fresca, muta probabile" },
      { v: "12-25 °C", l: "aria · maggio in Provenza, indicativo" },
      { v: "mag 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Lago di Peyrolles, circa 20 km da Aix-en-Provence: percorso rettangolare da 1,9 km",
          "Temperatura dell'acqua non trovata nelle fonti: di norma fresca a maggio, verifica il regolamento sulla muta",
          "Dopo il nuoto si pedala verso Aix: la logistica tra lago e città va letta con attenzione nella guida atleta",
        ],
      },
      bike: {
        bullets: [
          "90 km dal lago di Peyrolles fino ad Aix-en-Provence attraverso i paesaggi provenzali",
          "Le strade tecniche della zona della Montagne Sainte-Victoire alternano tratti piatti e collinari",
          "Dislivello esatto non verificato nelle fonti: considera il percorso mosso e verifica la mappa ufficiale",
        ],
      },
      run: {
        bullets: [
          "Tre giri nel centro di Aix-en-Provence, tra parchi e la fontana de La Rotonde",
          "Arrivo sul Cours Mirabeau, uno dei viali più belli della città",
          "Giri multipli: tifo frequente ma controlla ristori e sensi di marcia nel briefing",
        ],
      },
    },
    profile: {
      maxm: 450,
      points: [
        [0, 200], [15, 260], [30, 320], [45, 380], [60, 320], [75, 260], [90, 210],
      ],
      labels: [{ km: 45, m: 380, t: "Profilo indicativo, da verificare" }],
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:45", bike: "3:20", run: "2:15", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:38", bike: "2:55", run: "1:55", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:34", bike: "2:40", run: "1:45", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:30", bike: "2:25", run: "1:35", total: "4:30" },
    ],
    demands: [
      { t: "Bici mista con tratti tecnici: gestione dello sforzo e delle discese", b: "gestione dello sforzo" },
      { t: "Logistica con T1 al lago e arrivo in città", b: "organizzazione" },
      { t: "Corsa su tre giri nel centro: tifo e pacing", b: "pacing" },
      { t: "Meteo di maggio e vento provenzale (mistral possibile)", b: "adattamento" },
    ],
    tips: [
      { t: "Bici", p: "Allena salite brevi e rilanci e le discese tecniche: i tratti attorno alla Sainte-Victoire richiedono attenzione." },
      { t: "Pacing", p: "Tieni la potenza target sotto controllo in salita: il meglio si gioca nella corsa." },
      { t: "Meteo", p: "Controlla il bollettino: il vento può cambiare la gara." },
      { t: "Nuoto", p: "Prova la muta in acque aperte fresche prima della gara." },
      { t: "Nutrizione", p: "60-80 g/h di carboidrati in bici e sodio adeguato; prova tutto in allenamento." },
    ],
    logistics: [
      {
        t: "Arrivare",
        p: "Aeroporto di Marsiglia-Provenza e stazione TGV di Aix-en-Provence sono i punti di arrivo più comodi. Verifica trasferimenti e navette per il lago di Peyrolles nella guida atleta.",
      },
      {
        t: "Dormire",
        p: "Non ho trovato hotel ufficiali nelle fonti consultate: verifica il sito ufficiale e prenota presto, Aix è piena in settimana gara.",
      },
      {
        t: "Famiglia",
        p: "La corsa su tre giri nel centro e l'arrivo sul Cours Mirabeau rendono la gara facile da seguire; il nuoto è invece a circa 20 km dalla città.",
      },
    ],
    faq: [
      { q: "Serve la muta?", a: "Probabilmente sì a maggio, ma la temperatura non è verificata nelle fonti: controlla il briefing." },
      { q: "Qual è la data 2027?", a: "Le fonti consultate non concordano (metà maggio / da confermare): verifica il sito ufficiale." },
      { q: "È adatta a un primo 70.3?", a: "Sì, con bici mista e ottima atmosfera; serve però gestire con calma le salite." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 30, title: "Dal lago di Peyrolles", note: "Uscita dal lago e primi chilometri verso Aix", grade_pct: null, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 2, km_from: 30, km_to: 60, title: "Strade attorno alla Sainte-Victoire", note: "Tratti tecnici e collinari", grade_pct: null, dplus_m: null, kind: "climb" },
    { leg: "bike", position: 3, km_from: 60, km_to: 90, title: "Rientro ad Aix", note: "Discese e avvicinamento alla zona cambio", grade_pct: null, dplus_m: null, kind: "rolling" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Tre giri · centro di Aix", note: "La Rotonde, parchi, arrivo sul Cours Mirabeau", grade_pct: null, dplus_m: null, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Lago di Peyrolles", note: "Percorso rettangolare da 1,9 km", grade_pct: null, dplus_m: null, kind: "loop" },
    { leg: "bike", position: 4, km_from: 0, km_to: 90, title: "Totale bici", note: "Dislivello non verificato", grade_pct: null, dplus_m: null, kind: "rolling" },
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti recenti",
      scores: { swim: 4.0, bike: 4.0, run: 4.2, org: 4.3 },
      body: "Le fonti consultate descrivono Aix come una mezza scenografica: nuoto in lago, bici attraverso la Provenza con tratti tecnici verso la Sainte-Victoire e corsa nel centro con arrivo sul Cours Mirabeau. Non ho trovato recensioni dettagliate di atleti né dati affidabili su dislivello e temperatura dell'acqua: le valutazioni sono indicative.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "news", platform: "tri247.com", url: "https://www.tri247.com/triathlon-news/elite/ironman-70-3-aix-en-provence-2026-date-start-time-how-to-watch-live", title: "IRONMAN 70.3 Aix-en-Provence 2026", lang: "en", excerpt: "Descrizione di nuoto, bici e corsa dell'edizione 2026.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "finishers.com", url: "https://www.finishers.com/en/event/ironman-70-3-aix-en-provence", title: "Ironman 70.3 Aix-en-Provence 2027", lang: "en", excerpt: "Distanze e data indicativa di metà maggio 2027.", topics: ["course", "dates"], quality: 3 },
    { kind: "blog", platform: "milesrepublic.com", url: "https://fr.milesrepublic.com/en/event/ironman-703-aix-en-provence-10073", title: "IRONMAN 70.3 Aix-en-Provence", lang: "en", excerpt: "Maggio 2027, data da confermare.", topics: ["dates"], quality: 2 },
  ],
  harvest: {
    hashtags: ["ironman703aix", "ironman703aixenprovence", "im703aix", "ironmanaix"],
    youtube: ["Ironman 70.3 Aix-en-Provence race report", "Ironman 70.3 Aix en Provence bike course", "Ironman 70.3 Aix 2025"],
    google: ["Ironman 70.3 Aix-en-Provence race report", "Ironman 70.3 Aix-en-Provence recensione gara"],
    years: [2023, 2024, 2025, 2026],
  },
};
export default seed;
