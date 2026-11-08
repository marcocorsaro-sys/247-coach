import type { RaceSeed } from "./types";

// Fonti: vedi sources. Il percorso 2027 non è ancora descritto nelle fonti consultate: tutto ciò che non è distanza/data è indicativo.
const seed: RaceSeed = {
  slug: "stpolten-703-2027",
  race: {
    official_name: "IRONMAN 70.3 St. Pölten",
    region: "Bassa Austria",
    course_version: "Percorso 2027 non ancora verificato: verifica la mappa ufficiale",
    intro:
      "IRONMAN 70.3 St. Pölten torna nel 2027 dopo anni sotto il marchio Challenge: l'edizione è indicata per il 23 maggio 2027 da fonti locali (verifica comunque il sito ufficiale). Fu il primo IRONMAN 70.3 d'Austria, disputato dal 2007 al 2019, e IRONMAN lo presenta come gara di inizio stagione e passaggio verso Klagenfurt. Le fonti consultate non descrivono ancora il tracciato 2027, quindi nuoto, bici e corsa vanno confermati sulla mappa ufficiale. Una nota locale indica che le iscrizioni 2027 risultano esaurite.",
    kpis: [
      { v: "1,9 km", l: "nuoto · laghi di St. Pölten (luogo da confermare)" },
      { v: "90 km", l: "bici · tracciato 2027 da verificare" },
      { v: "21,1 km", l: "corsa · tracciato 2027 da verificare" },
      { v: "da verificare", l: "acqua a maggio · fresca, muta probabile" },
      { v: "10-22 °C", l: "aria · fine maggio, indicativo" },
      { v: "23 mag 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Distanza 1,9 km; il luogo esatto 2027 non è confermato nelle fonti: in passato la zona è legata ai laghi di St. Pölten (ad esempio il Ratzersdorfer See usato da eventi locali)",
          "Acqua di fine maggio probabilmente fresca: considera la muta e verifica il regolamento",
          "Controlla il briefing per partenze e boe",
        ],
      },
      bike: {
        bullets: [
          "90 km: lo sviluppo del tracciato 2027 non è ancora descritto nelle fonti consultate",
          "La zona intorno a St. Pölten alterna tratti pianeggianti e colline della Bassa Austria: considera un percorso mosso, in attesa della mappa ufficiale (indicativo)",
          "Verifica numero di giri e dislivello sulla mappa ufficiale",
        ],
      },
      run: {
        bullets: [
          "21,1 km: giri e passaggi in città da confermare",
          "Una gara locale dello stesso territorio corre lungo il lago, il fiume Traisen e l'Eventarena: possibile ispirazione per la zona di arrivo, ma non è confermato per il 70.3",
          "Controlla la mappa ufficiale prima di pianificare la strategia di ristori",
        ],
      },
    },
    profile: {
      maxm: 400,
      points: [
        [0, 270], [15, 290], [30, 330], [45, 360], [60, 320], [75, 290], [90, 270],
      ],
      labels: [{ km: 45, m: 360, t: "Profilo indicativo, da verificare" }],
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:45", bike: "3:15", run: "2:15", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:38", bike: "2:50", run: "1:55", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:34", bike: "2:35", run: "1:45", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:30", bike: "2:20", run: "1:35", total: "4:30" },
    ],
    demands: [
      { t: "Percorso 2027 ancora da verificare: studia la mappa ufficiale", b: "preparazione" },
      { t: "Acqua e meteo di maggio variabili", b: "adattamento" },
      { t: "Bici forse mossa: ritmo costante e gestione dei rilanci", b: "gestione dello sforzo" },
      { t: "Gara molto richiesta: iscrizioni già esaurite secondo una nota locale", b: "organizzazione" },
    ],
    tips: [
      { t: "Bici", p: "Allena sia il piatto in posizione aero sia salite brevi: finché la mappa non è confermata, prepara entrambe." },
      { t: "Pacing", p: "Parti sotto il ritmo target in bici e risparmia le gambe per la corsa." },
      { t: "Meteo", p: "Maggio in Austria è variabile: porta ricambi e valuta mantellina nella borsa di cambio." },
      { t: "Nuoto", p: "Prova la muta in acque fresche prima della gara." },
      { t: "Nutrizione", p: "60-80 g/h di carboidrati in bici e sodio adeguato; prova tutto in allenamento." },
    ],
    logistics: [
      {
        t: "Arrivare",
        p: "St. Pölten è a circa mezz'ora di treno da Vienna, raggiungibile anche da Vienna Schwechat. Verifica orari e collegamenti prima della partenza.",
      },
      {
        t: "Dormire",
        p: "Non ho trovato hotel ufficiali nelle fonti consultate: verifica il sito ufficiale e prenota presto, la gara è molto richiesta.",
      },
      {
        t: "Famiglia",
        p: "Verifica sul sito ufficiale zone spettatori e logistica; la città è piccola e ben collegata con Vienna.",
      },
    ],
    faq: [
      { q: "La gara 2027 è confermata?", a: "Sì: IRONMAN ha annunciato il ritorno di St. Pölten nel 2027 e una fonte locale indica il 23 maggio. Verifica la data sul sito ufficiale." },
      { q: "Quali sono le distanze?", a: "1,9 km di nuoto, 90 km di bici e 21,1 km di corsa." },
      { q: "Si può ancora iscriversi?", a: "Una nota locale parla di iscrizioni 2027 esaurite: verifica sul sito ufficiale eventuali slot o liste d'attesa." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 30, title: "Prima parte", note: "Dettagli da verificare sulla mappa ufficiale", grade_pct: null, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 2, km_from: 30, km_to: 60, title: "Parte centrale", note: "Dettagli da verificare sulla mappa ufficiale", grade_pct: null, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 3, km_from: 60, km_to: 90, title: "Rientro", note: "Dettagli da verificare sulla mappa ufficiale", grade_pct: null, dplus_m: null, kind: "rolling" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Corsa · St. Pölten", note: "Giri e passaggi da confermare", grade_pct: null, dplus_m: null, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Nuoto · lago (da confermare)", note: "Luogo e partenza da verificare", grade_pct: null, dplus_m: null, kind: "loop" },
    { leg: "bike", position: 4, km_from: 0, km_to: 90, title: "Totale bici", note: "Dislivello non verificato", grade_pct: null, dplus_m: null, kind: "rolling" },
  ],
  reviews: [
    {
      edition_year: 2019,
      source: "synthesis",
      title: "Sintesi fonti disponibili",
      scores: { swim: 3.8, bike: 3.8, run: 3.8, org: 4.0 },
      body: "Le fonti consultate raccontano soprattutto il contesto: St. Pölten ospitò il primo IRONMAN 70.3 d'Austria dal 2007 al 2019 ed è presentato come gara di inizio stagione e passaggio verso Klagenfurt. Non ho trovato descrizioni affidabili del tracciato 2027 né recensioni dettagliate di atleti: le valutazioni sono indicative e vanno aggiornate quando uscirà la mappa ufficiale.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "news", platform: "5min.at", url: "https://www.5min.at/niederoesterreich/5202606021935/ironman-kehrt-nach-st-poelten-zurueck-termin-fixiert/", title: "IRONMAN kehrt nach St. Pölten zurück: Termin fixiert", lang: "de", excerpt: "Data 23 maggio 2027, iscrizioni dal 18 giugno 2026, distanze 70.3.", topics: ["dates"], quality: 3 },
    { kind: "news", platform: "endurance.biz", url: "https://endurance.biz/2025/industry-news/ironman-70-3-st-polten-to-return-to-european-race-calendar-in-2027/", title: "IRONMAN 70.3 St. Pölten to return to European race calendar in 2027", lang: "en", excerpt: "Ritorno nel 2027, storia 2007-2019, circuito austriaco.", topics: ["context"], quality: 3 },
    { kind: "news", platform: "noe.gv.at", url: "https://noe.gv.at/noe/IRONMAN_2027_in_St._Poelten_ist_ausverkauft.html", title: "IRONMAN 2027 in St. Pölten ist ausverkauft", lang: "de", excerpt: "Titolo che indica le iscrizioni 2027 esaurite.", topics: ["registration"], quality: 2 },
  ],
  harvest: {
    hashtags: ["ironman703stpolten", "ironmanstpoelten", "im703stpolten", "stpoelten703"],
    youtube: ["Ironman 70.3 St. Pölten race report", "Ironman 70.3 St. Polten bike course", "Ironman 70.3 St. Polten 2019"],
    google: ["Ironman 70.3 St. Pölten race report", "Ironman 70.3 St. Pölten recensione gara"],
    years: [2017, 2018, 2019],
  },
};
export default seed;
