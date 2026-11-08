import type { RaceSeed } from "./types";

// Fonti: vedi sources. Dettagli non confermati (giri bici, temperatura acqua) indicati come tali: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "jesolo-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Venice-Jesolo",
    region: "Veneto",
    course_version: "Edizioni recenti, tratti indicativi: verifica la mappa ufficiale 2027",
    intro:
      "IRONMAN 70.3 Venice-Jesolo (24 aprile 2027, data indicata come confermata da Finishers: verifica comunque il sito ufficiale) è una mezza distanza velocissima sulla costa veneta: nuoto in Adriatico, un solo anello in bici su strade piatte e dritte tra laguna, Cavallino ed Eraclea, e corsa su tre giri lungo viale alberato e lungomare con arrivo sulla spiaggia. Il dislivello è minimo, quindi qui si gioca tutto su pacing, vento e acqua ancora fredda di inizio stagione. Per questo è una classica gara di apertura per puntare a un tempo.",
    kpis: [
      { v: "1,9 km", l: "nuoto · Adriatico, un anello antiorario" },
      { v: "90 km", l: "bici · anello unico, circa 90 m D+ (fonte Finishers)" },
      { v: "21,1 km", l: "corsa · 3 giri da circa 7 km" },
      { v: "~17 °C", l: "acqua · media indicata da una fonte, muta probabile" },
      { v: "10-20 °C", l: "aria · primavera variabile, vento possibile" },
      { v: "24 apr 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Mare Adriatico, un anello antiorario con partenza dalla spiaggia vicino al faro tra Jesolo e Cavallino",
          "Acqua di inizio primavera: una fonte indica una media intorno ai 17 °C, quindi muta quasi certamente necessaria (verifica il regolamento)",
          "Con il mare possono esserci onde e corrente: allenati a nuotare in acque libere e a orientarti sulle boe",
          "Uscita sulla spiaggia e corsa verso la zona cambio",
        ],
      },
      bike: {
        bullets: [
          "Anello unico da 90 km, descritto come veloce e piatto, con lunghi rettilinei",
          "Passaggi tra paesaggio lagunare, Cavallino, il ponte di barche di Cortellazzo e i canali di Eraclea",
          "Il dislivello è minimo (circa 90 m secondo Finishers): sul piatto il vento fa la differenza",
          "Rientro a Jesolo sulle stesse strade dell'andata, quindi il vento cambia faccia nella seconda metà",
        ],
      },
      run: {
        bullets: [
          "Tre giri da circa 7 km: viale alberato e ombreggiato, poi lungomare fino al giro di boa",
          "Percorso piatto (circa 7 m D+ secondo Finishers): ritmo costante e niente scuse",
          "Arrivo sulla spiaggia, con tifo nei punti di passaggio",
          "Ristori frequenti: nelle giornate più calde conviene bere a ogni punto",
        ],
      },
    },
    profile: {
      maxm: 40,
      points: [
        [0, 2], [15, 3], [30, 4], [45, 3], [60, 5], [75, 4], [90, 2],
      ],
      labels: [{ km: 60, m: 5, t: "Percorso quasi piatto (indicativo)" }],
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:45", bike: "3:15", run: "2:15", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:38", bike: "2:50", run: "1:55", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:34", bike: "2:35", run: "1:45", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:30", bike: "2:20", run: "1:35", total: "4:30" },
    ],
    demands: [
      { t: "Bici piatta e ventosa: ritmo costante, niente picchi", b: "gestione dello sforzo" },
      { t: "Nuoto in mare con acqua fredda di inizio stagione", b: "adattamento" },
      { t: "Corsa piatta su tre giri: partire troppo forte si paga nel secondo", b: "pacing" },
      { t: "Posizione aerodinamica mantenuta a lungo sui rettilinei", b: "aerodinamica" },
    ],
    tips: [
      { t: "Bici", p: "Allena lunghe uscite in posizione aero a potenza costante: qui non ci sono salite che spezzano il ritmo." },
      { t: "Pacing", p: "Mantieni la potenza target anche col vento a favore: il rientro contro vento è quello che ti rallenta." },
      { t: "Nuoto", p: "Prova la muta in acqua libera prima della gara e abituati all'acqua fredda con qualche uscita in mare o lago." },
      { t: "Corsa", p: "Parti al ritmo che puoi tenere per tre giri uguali: il piatto non perdona le partenze troppo veloci." },
      { t: "Nutrizione", p: "60-80 g/h di carboidrati in bici e sodio adeguato; prova tutto in allenamento." },
    ],
    logistics: [
      {
        t: "Arrivare",
        p: "Jesolo si raggiunge in auto dall'autostrada A4 (Venezia) o in treno fino a Venezia/Mestre e poi autobus; l'aeroporto di Venezia-Marco Polo è il più comodo. Verifica gli orari dei trasporti nel weekend gara.",
      },
      {
        t: "Dormire",
        p: "Jesolo è una località balneare piena di hotel e appartamenti; una fonte (Falkensteiner) la indica come partner della gara, ma verifica sul sito ufficiale gli hotel convenzionati. Prenota con anticipo: la settimana gara è piena.",
      },
      {
        t: "Famiglia",
        p: "Il percorso corsa è su tre giri e passa più volte nello stesso tratto: è facile da seguire a piedi. La spiaggia e il lungomare offrono molto da fare per chi aspetta.",
      },
    ],
    faq: [
      { q: "Serve la muta?", a: "Probabilmente sì: una fonte indica acqua media di circa 17 °C. Controlla il briefing e il regolamento ufficiale." },
      { q: "Quanti giri sono bici e corsa?", a: "Un anello unico in bici da 90 km e tre giri da circa 7 km in corsa, secondo le fonti consultate: verifica la mappa 2027." },
      { q: "È adatta a un primo 70.3?", a: "Sì: percorso piatto e veloce. Occhio a vento e acqua fredda." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 30, title: "Uscita da Jesolo verso Cavallino", note: "Rettilinei veloci, ritmo da stabilire con calma", grade_pct: 0, dplus_m: 30, kind: "flat" },
    { leg: "bike", position: 2, km_from: 30, km_to: 60, title: "Laguna, Cortellazzo ed Eraclea", note: "Ponte di barche e canali; attenzione al vento", grade_pct: 0, dplus_m: 30, kind: "flat" },
    { leg: "bike", position: 3, km_from: 60, km_to: 90, title: "Rientro a Jesolo", note: "Stesse strade dell'andata, vento cambia faccia", grade_pct: 0, dplus_m: 30, kind: "flat" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Tre giri · viale e lungomare", note: "Piatto, ombra sul viale, arrivo in spiaggia", grade_pct: 0, dplus_m: 7, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Adriatico · anello antiorario", note: "Partenza dalla spiaggia vicino al faro", grade_pct: null, dplus_m: null, kind: "loop" },
    { leg: "bike", position: 4, km_from: 0, km_to: 90, title: "Totale bici (dato Finishers)", note: "Circa 89 m D+ complessivi", grade_pct: 0, dplus_m: 89, kind: "flat" },
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti recenti",
      scores: { swim: 3.8, bike: 4.2, run: 4.0, org: 4.2 },
      body: "Venice-Jesolo viene descritta come una mezza veloce e piatta: percorso bici su strade dritte tra laguna e canali, corsa piatta con parte in ombra e arrivo sulla spiaggia. Le fonti consultate parlano di acqua ancora fredda di aprile e di vento come principale variabile. Non ho trovato recensioni di atleti dettagliate: le valutazioni sono indicative e basate sul profilo del percorso.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "blog", platform: "finishers.com", url: "https://www.finishers.com/course/ironman-de-venise-jesolo", title: "Ironman 70.3 de Venise - Jesolo 2027", lang: "fr", excerpt: "Data, distanze e dislivello (89 m bici, 7 m corsa).", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "raceraves.com", url: "https://www.raceraves.com/races/ironman-70-3-venice-jesolo/", title: "IRONMAN 70.3 Venice-Jesolo — Race Raves", lang: "en", excerpt: "Descrizione di nuoto, bici e corsa.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "rouvy.com", url: "https://rouvy.com/ironman/venice-jesolo-703", title: "Venice-Jesolo 70.3 bike course", lang: "en", excerpt: "Anello unico da 90 km, piatto.", topics: ["course"], quality: 3 },
  ],
  harvest: {
    hashtags: ["ironman703jesolo", "ironman703venicejesolo", "im703jesolo", "venicejesolo"],
    youtube: ["Ironman 70.3 Venice Jesolo race report", "Ironman 70.3 Jesolo bike course", "Ironman 70.3 Venice-Jesolo 2025"],
    google: ["Ironman 70.3 Jesolo race report", "Ironman 70.3 Venice Jesolo recensione gara"],
    years: [2022, 2023, 2024, 2025, 2026],
  },
};
export default seed;
