import type { RaceSeed } from "./types";

// Fonti: vedi sources. Percorso 2025-2026; 2027 non verificato. Dislivelli indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "leeds-2027",
  race: {
    official_name: "IRONMAN Leeds",
    region: "Yorkshire (Regno Unito)",
    course_version: "Edizioni 2025-2026, edizione 2027 non confermata nelle fonti consultate: verifica il sito ufficiale",
    intro: "IRONMAN Leeds è una full distance giovane, con base a Roundhay Park: nuoto in lago, bici ondulata nelle campagne dello Yorkshire e maratona a più giri che torna nel parco. Nelle edizioni 2025 e 2026 il percorso è stato descritto come collinare, con il tratto di Black Hill Road tra i più citati. Per il 2027 la data in calendario è il 15 agosto, ma nelle fonti consultate non c'è una conferma dell'edizione: controlla sul sito ufficiale IRONMAN prima di pianificare viaggio e iscrizione.",
    kpis: [
      { v: "3,8 km", l: "nuoto · Waterloo Lake, Roundhay Park (2 giri da 1,9 km nel 2025)" },
      { v: "180 km", l: "bici · ondulata, circa 2.500 m D+ (indicativo, fonti non concordi)" },
      { v: "42,2 km", l: "corsa · 4 giri da circa 10 km attorno a Roundhay Park (2025)" },
      { v: "~21 °C", l: "acqua · valore medio riportato da un aggregatore, indicativo" },
      { v: "Clima inglese", l: "aria · variabile, pioggia e vento possibili: porta ricambi" },
      { v: "15 ago 2027", l: "data in calendario · conferma sul sito ufficiale" }
    ],
    legs: {
      swim: {
        bullets: [
          "Waterloo Lake, nella parte sud di Roundhay Park: lago aperto con due giri da 1,9 km nell'edizione 2025",
          "Dopo l'uscita c'è una corsa di circa 300 m verso la zona cambio",
          "Temperatura riportata intorno ai 21 °C da un aggregatore: indicativo, verifica il briefing di gara per la muta",
          "Il percorso 2026 doveva essere simile al 2025: controlla la mappa ufficiale"
        ]
      },
      bike: {
        bullets: [
          "Nel 2025: circa 6 km verso Shadwell e poi tre giri da circa 55 km; la somma delle fonti non arriva a 180 km, quindi la struttura esatta è da verificare",
          "Percorso ondulato e collinare: gran parte del dislivello (circa 2.500 m, indicativo) è attorno a Black Hill Road, già vista al Tour de Yorkshire 2018",
          "Strade di campagna con continui saliscendi: gestisci lo sforzo e non bruciare le gambe nei primi giri",
          "Il meteo dello Yorkshire può cambiare in poche ore: porta mantellina e ricambi nella borsa"
        ]
      },
      run: {
        bullets: [
          "Quattro giri da circa 10 km che tornano a Roundhay Park, che fa da hub dell'evento",
          "Un fondo collinare nelle descrizioni: non è una maratona piatta",
          "Passaggi frequenti nell'area dell'arrivo: ottimo per il tifo, ma la tentazione di partire forte è alta",
          "Controlla la mappa ufficiale 2027 per giri e ristori"
        ]
      }
    },
    profile: {
      maxm: 250,
      points: [[0,80],[15,120],[30,200],[45,150],[60,110],[75,190],[90,140],[105,100],[120,200],[135,150],[150,110],[165,170],[180,90]],
      labels: [
        { km: 30, m: 200, t: "Black Hill Road (indicativo)" }
      ]
    },
    splits: [
      { goal: "Finisher sereno", swim: "1:25", bike: "7:15", run: "5:20", total: "14:25" },
      { goal: "Sub 12", swim: "1:15", bike: "6:20", run: "4:15", total: "12:05" },
      { goal: "Sub 11", swim: "1:08", bike: "5:50", run: "3:50", total: "11:00" },
      { goal: "Sub 10", swim: "1:00", bike: "5:20", run: "3:25", total: "10:00" }
    ],
    demands: [
      { t: "Bici: percorso collinare e ondulato, molti rilanci", b: "gestione dello sforzo" },
      { t: "Meteo inglese: vento, pioggia e sbalzi di temperatura", b: "adattamento" },
      { t: "Nuoto: lago con giri multipli e molti atleti", b: "orientamento" },
      { t: "Corsa: giri attorno al parco dopo una bici dura", b: "pacing" }
    ],
    tips: [
      { t: "Bici", p: "Allena salite brevi e ripetute a ritmo costante: il piano usa i tuoi percorsi più mossi." },
      { t: "Pacing", p: "Tieni una potenza bassa nei primi giri: la maratona collinare si decide nella seconda metà della bici." },
      { t: "Meteo", p: "Prova la gestione del cambio d'abbigliamento e porta mantellina e guanti leggeri." },
      { t: "Nuoto", p: "Allenati in acque libere con partenze affollate e boe ravvicinate." },
      { t: "Nutrizione", p: "80-90 g/h di carboidrati in bici, sodio adeguato e prova tutto in allenamento." }
    ],
    logistics: [
      { t: "Arrivare", p: "Leeds Bradford è l'aeroporto più vicino; in alternativa Manchester con treno. Roundhay Park è a nord-est della città: verifica trasporti e chiusure stradali sul sito ufficiale." },
      { t: "Dormire", p: "Nessun hotel ufficiale verificato nelle fonti consultate. Prenota presto: in settimana gara la città è piena." },
      { t: "Famiglia", p: "Il parco è l'hub dell'evento e la corsa torna più volte nella stessa area: facile da seguire a piedi. Controlla la mappa spettatori ufficiale." }
    ],
    faq: [
      { q: "La gara 2027 è confermata?", a: "Nelle fonti consultate non c'è conferma: la data del 15 agosto è quella in calendario, verifica sul sito ufficiale IRONMAN." },
      { q: "Serve la muta?", a: "L'acqua è riportata intorno ai 21 °C da un aggregatore, valore indicativo: controlla il regolamento il giorno prima." },
      { q: "Quanto è dura la bici?", a: "Collinare, con circa 2.500 m D+ riportati (indicativo, le fonti non sono concordi)." }
    ]
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 45, title: "Uscita verso Shadwell e primo giro", note: "Ondulato, struttura 2025 da verificare", grade_pct: 1.2, dplus_m: 500, kind: "rolling" },
    { leg: "bike", position: 2, km_from: 45, km_to: 90, title: "Giro centrale", note: "Saliscendi con Black Hill Road tra i tratti chiave (indicativo)", grade_pct: 1.5, dplus_m: 700, kind: "climb" },
    { leg: "bike", position: 3, km_from: 90, km_to: 135, title: "Ultimo giro · metà", note: "Gambe già cariche, gestisci lo sforzo", grade_pct: 1.2, dplus_m: 600, kind: "rolling" },
    { leg: "bike", position: 4, km_from: 135, km_to: 180, title: "Finale e rientro", note: "Ultime salite e rientro a Roundhay Park", grade_pct: 1.0, dplus_m: 500, kind: "rolling" },
    { leg: "run", position: 1, km_from: 0, km_to: 42.2, title: "Quattro giri · Roundhay Park", note: "Collinare, passaggi frequenti nel parco", grade_pct: null, dplus_m: null, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 3.8, title: "Waterloo Lake", note: "Lago, due giri nel 2025", grade_pct: null, dplus_m: null, kind: "loop" }
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti 2025-2026",
      scores: { swim: 4.0, bike: 3.8, run: 3.8, org: 4.0 },
      body: "Leeds è presentata come una full impegnativa ma accessibile: lago nel parco, bici collinare nello Yorkshire e maratona a giri con base fissa. Le descrizioni insistono sul dislivello della bici e sulla variabilità del meteo; i punteggi sopra sono stime di sintesi, non valutazioni di singoli atleti. L'edizione 2027 non è confermata nelle fonti consultate.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali."
    }
  ],
  sources: [
    { kind: "news", platform: "tri247.com", url: "https://www.tri247.com/triathlon-news/elite/ironman-leeds-course-announced-2025", title: "IRONMAN Leeds course announced (2025)", lang: "en", excerpt: "Nuoto in Waterloo Lake, bici ondulata con Black Hill Road, corsa a quattro giri.", topics: ["course"], quality: 3 },
    { kind: "news", platform: "endurance.biz", url: "https://endurance.biz/2025/industry-news/ironman-leeds-shifts-its-summer-return-to-august-2026/", title: "IRONMAN Leeds shifts its summer return to August 2026", lang: "en", excerpt: "Nuova data dell'edizione 2026 e percorso simile al 2025.", topics: ["logistics"], quality: 3 },
    { kind: "blog", platform: "ssafa.org.uk", url: "https://www.ssafa.org.uk/support-us/events/challenge/ironman-leeds", title: "IRONMAN Leeds — SSAFA", lang: "en", excerpt: "Descrizione dell'evento a Roundhay Park.", topics: ["course"], quality: 2 },
    { kind: "blog", platform: "haid.app", url: "https://haid.app/en/events/ironman-leeds-mq8wqjxt", title: "IRONMAN Leeds — scheda evento", lang: "en", excerpt: "Scheda evento: lago, percorso collinare, nessuna edizione 2027 elencata.", topics: ["course"], quality: 2 }
  ],
  harvest: {
    hashtags: ["ironmanleeds", "ironmanleeds2026", "ironmanleeds2025", "roundhaypark"],
    youtube: ["Ironman Leeds race report", "Ironman Leeds bike course", "Ironman Leeds 2026"],
    google: ["Ironman Leeds race report", "Ironman Leeds recensione gara"],
    years: [2025, 2026]
  }
};
export default seed;
