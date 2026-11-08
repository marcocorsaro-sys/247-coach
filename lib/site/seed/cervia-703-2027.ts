import type { RaceSeed } from "./types";

// Fonti: vedi sources. Dislivello, temperature e dettagli tecnici indicativi: verifica la mappa ufficiale 2027.
const seed: RaceSeed = {
  slug: "cervia-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Italy Emilia-Romagna",
    region: "Emilia-Romagna",
    course_version: "Edizioni 2022-2026, tratti indicativi: verifica la mappa ufficiale 2027",
    intro:
      "IRONMAN 70.3 Italy Emilia-Romagna si corre a Cervia, in Romagna: nuoto nell'Adriatico dalla spiaggia, una bici di un solo giro tra le saline e le colline di Bertinoro, e una mezza maratona piatta in tre giri tra Cervia e Milano Marittima fino all'arrivo sul lungomare. Una testata locale riporta che il weekend 2027 sarà il 18 settembre per la full e il 19 settembre per la 70.3, e che sarà il decimo anniversario della prima edizione di Cervia. Conferma data e programma sul sito ufficiale IRONMAN. È una delle 70.3 italiane più accessibili: percorso quasi tutto scorrevole, tifo e logistica facili.",
    kpis: [
      { v: "1,9 km", l: "nuoto · Adriatico dalla spiaggia di Cervia, un giro" },
      { v: "90 km", l: "bici · un giro, saline e colline di Bertinoro (dislivello indicativo)" },
      { v: "21,1 km", l: "corsa · 3 giri piatti tra Cervia e Milano Marittima" },
      { v: "Acqua mare", l: "temperatura da verificare al briefing · muta in base al regolamento" },
      { v: "Settembre", l: "clima ancora caldo, con vento possibile sulla costa" },
      { v: "19 set 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Partenza dalla spiaggia pubblica di Cervia (Lungomare Grazia Deledda), in mare Adriatico",
          "Un solo giro: dopo l'ingresso in acqua una virata a sinistra, poi nuoto parallelo alla riva con due virate a destra",
          "Il mare Adriatico è di solito più calmo di altri mari, ma onde e vento possono cambiare le cose: verifica il briefing",
          "Muta in base alla temperatura dell'acqua il giorno della gara: decide il regolamento ufficiale",
        ],
      },
      bike: {
        bullets: [
          "Un solo giro di 90 km con partenza sul lungomare di Cervia",
          "Si attraversa la zona delle saline (Parco Naturale delle Saline, dove si vedono i fenicotteri) e la campagna romagnola",
          "La parte centrale sale verso le colline di Bertinoro (il «Balcone di Romagna») tra i vigneti di Sangiovese e passa da Forlimpopoli",
          "Dislivello totale non trovato nelle fonti: considera un percorso piatto con una sezione collinare, e verifica la mappa ufficiale",
          "Il vento sulla costa può farsi sentire sui tratti aperti: lascia margine nei primi 30 km",
        ],
      },
      run: {
        bullets: [
          "Tre giri su percorso piatto tra Cervia e Milano Marittima",
          "Si passa dal centro di Cervia e dallo storico Magazzino del Sale prima dell'arrivo",
          "Il pubblico è numeroso e i giri ripetuti permettono di incontrare spesso amici e tifosi",
          "Se fa caldo, il terzo giro è quello che decide: spugne, ghiaccio e ritmo costante",
        ],
      },
    },
    profile: {
      maxm: 250,
      points: [
        [0, 5], [10, 5], [20, 10], [30, 25], [40, 90], [50, 190],
        [55, 215], [60, 160], [70, 60], [80, 15], [90, 5],
      ],
      labels: [{ km: 55, m: 215, t: "Colline di Bertinoro (indicativo)" }],
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:50", bike: "3:15", run: "2:15", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:42", bike: "2:50", run: "1:55", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:36", bike: "2:35", run: "1:42", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:30", bike: "2:20", run: "1:32", total: "4:30" },
    ],
    demands: [
      { t: "Bici: tratto collinare centrale su un percorso altrimenti scorrevole", b: "gestione dello sforzo" },
      { t: "Vento e caldo di settembre sulla costa", b: "adattamento" },
      { t: "Nuoto in mare aperto con partenza dalla spiaggia", b: "orientamento" },
      { t: "Corsa piatta in tre giri: facile partire troppo forte", b: "pacing" },
    ],
    tips: [
      { t: "Bici", p: "Allena salite di 5-8 km a ritmo costante e il rilancio sul piatto dopo la discesa. Usa i tuoi percorsi collinari al posto della seduta generica." },
      { t: "Pacing", p: "Nei primi 30 km piatti resta sotto il 75 % FTP: le gambe servono per Bertinoro e per la mezza." },
      { t: "Nuoto", p: "Allenati a entrare in acqua dalla spiaggia e a orientarti con boe parallele alla riva." },
      { t: "Caldo", p: "Prova ristori con spugne e sodio: la corsa è piatta e senza ombra continua." },
      { t: "Nutrizione", p: "70-80 g/h di carboidrati in bici, idratazione costante e prova tutto in allenamento." },
    ],
    logistics: [
      { t: "Arrivare", p: "Cervia è sulla costa romagnola: gli aeroporti più comodi sono Bologna e Rimini, poi auto o treno fino a Cervia-Milano Marittima. Controlla sul sito ufficiale mappe del traffico e strade chiuse." },
      { t: "Dormire", p: "Non abbiamo trovato hotel ufficiali nelle fonti consultate: Cervia e Milano Marittima hanno molta offerta, ma nel weekend gara (anche con la full) si riempie. Prenota presto." },
      { t: "Famiglia", p: "La città è pensata per i visitatori: spiaggia, lungomare e centro vicini. Il percorso corsa passa dal centro di Cervia, quindi è facile seguire la gara a piedi." },
    ],
    faq: [
      { q: "Serve la muta?", a: "Dipende dalla temperatura dell'acqua il giorno della gara: decide il regolamento ufficiale. Non abbiamo un dato certo sulla temperatura." },
      { q: "Quanti giri sono bici e corsa?", a: "Un solo giro in bici e tre giri in corsa, secondo le edizioni recenti: verifica la mappa 2027." },
      { q: "A che ora si parte?", a: "Le fonti non concordano sull'orario della partenza 2026 (11:00 secondo il Comune, mezzogiorno secondo un'altra scheda): controlla il programma ufficiale 2027." },
      { q: "È adatta a una prima 70.3?", a: "Sì: percorso quasi tutto piatto, un solo giro in bici, organizzazione consolidata e tifo italiano." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 30, title: "Costa, saline e campagna", note: "Tratto piatto con possibile vento (indicativo)", grade_pct: 0.3, dplus_m: 30, kind: "flat" },
    { leg: "bike", position: 2, km_from: 30, km_to: 60, title: "Verso Bertinoro", note: "Salita graduale verso le colline e il «Balcone di Romagna» (dislivello indicativo)", grade_pct: 2.0, dplus_m: 300, kind: "climb" },
    { leg: "bike", position: 3, km_from: 60, km_to: 90, title: "Rientro verso Cervia", note: "Discesa e piano finale verso la zona cambio (indicativo)", grade_pct: -1.0, dplus_m: 40, kind: "flat" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Tre giri · Cervia e Milano Marittima", note: "Piatta, centro di Cervia, Magazzino del Sale, arrivo sul lungomare", grade_pct: 0, dplus_m: 30, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Adriatico · un giro", note: "Dalla spiaggia di Cervia, virata a sinistra, poi parallelo alla riva", grade_pct: null, dplus_m: null, kind: "loop" },
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti 2022-2026",
      scores: { swim: 4.2, bike: 4.0, run: 4.3, org: 4.5 },
      body: "La 70.3 di Cervia è descritta come una gara scorrevole e ben organizzata: nuoto in mare dalla spiaggia, bici di un solo giro con la parte collinare di Bertinoro a spezzare il ritmo e mezza maratona piatta in centro. L'edizione 2026 ha radunato oltre 6.500 atleti nel weekend con le altre distanze, e secondo gli organizzatori il 56 % erano al primo triathlon. È considerata una buona scelta per chi cerca una 70.3 italiana con logistica semplice e tifo costante.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "news", platform: "turismo.comunecervia.it", url: "https://www.turismo.comunecervia.it/en/events/events-and-initiatives/sports-and-games/ironman-70-3-italy-emilia-romagna/", title: "IRONMAN 70.3 Italy Emilia-Romagna - Comune di Cervia", lang: "en", excerpt: "Scheda ufficiale del Comune: distanze, giri, partenza e arrivo, organizzatore.", topics: ["course", "logistics"], quality: 3 },
    { kind: "news", platform: "mondobalneare.com", url: "https://www.mondobalneare.com/ironman-cervia-2026-record-decennale/", title: "Ironman Cervia 2026, record decennale", lang: "it", excerpt: "Numeri dell'edizione 2026 e date del weekend 2027 (18-19 settembre).", topics: ["logistics"], quality: 2 },
    { kind: "blog", platform: "discovercervia.com", url: "https://www.discovercervia.com/en/events/2026/settembre/ironman-70-3-italy-emilia-romagna", title: "Ironman 70.3 Italy Emilia-Romagna - Discover Cervia", lang: "en", excerpt: "Percorso: nuoto, bici verso Bertinoro e corsa piatta in tre giri.", topics: ["course", "spectators"], quality: 2 },
  ],
  harvest: {
    hashtags: ["ironman703cervia", "ironmancervia", "ironman703emiliaromagna", "cervia", "70.3cervia"],
    youtube: ["Ironman 70.3 Cervia race report", "Ironman 70.3 Emilia-Romagna bike course", "Ironman 70.3 Cervia 2025", "Ironman 70.3 Cervia 2026"],
    google: ["Ironman 70.3 Cervia race report", "Ironman 70.3 Emilia-Romagna recensione gara"],
    years: [2023, 2024, 2025, 2026],
  },
};
export default seed;
