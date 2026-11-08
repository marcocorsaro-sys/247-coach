import type { RaceSeed } from "./types";

// Fonti: vedi sources. Giri e dislivello indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "kalmar-2027",
  race: {
    official_name: "IRONMAN Kalmar",
    region: "Småland / Öland (Svezia)",
    course_version: "Edizioni recenti, tratti indicativi: verifica la mappa ufficiale 2027",
    intro: "IRONMAN Kalmar (21 agosto 2027) è una delle full più veloci e panoramiche del Nord Europa: nuoto nello stretto di Kalmar, bici che attraversa il ponte di Öland lungo 6 km e maratona nel centro storico, con arrivo in piazza davanti alla cattedrale. Il percorso è piatto e rapido, ma il vento sul ponte e le onde nel nuoto possono renderlo più duro del previsto. Secondo il comunicato dell'organizzazione, i pettorali 2027 sono andati esauriti in meno di un'ora.",
    kpis: [
      { v: "3,8 km", l: "nuoto · stretto di Kalmar, acqua in parte salata" },
      { v: "180 km", l: "bici · circa 500 m D+ (indicativo), ponte di Öland da 6 km" },
      { v: "42,2 km", l: "corsa · 3 giri nel centro, tra mare e mura storiche" },
      { v: "Muta consigliata", l: "acqua · temperatura non confermata nelle fonti" },
      { v: "Vento", l: "aria · il vento sul ponte è il fattore principale" },
      { v: "21 ago 2027", l: "data confermata dal comunicato · pettorali esauriti" }
    ],
    legs: {
      swim: {
        bullets: [
          "Stretto di Kalmar tra la città e Öland, acqua in parte salata e in parte dolce, con partenza da una passerella",
          "Percorso point-to-point con diverse curve: serve buon sighting",
          "Con vento il mare può essere mosso: allenati in acque aperte",
          "Muta consigliata; la temperatura dell'acqua non è confermata dalle fonti, verifica il briefing"
        ]
      },
      bike: {
        bullets: [
          "Il percorso esce da Kalmar, attraversa il ponte di Öland (circa 6 km), gira sull'isola e rientra sul continente",
          "Le fonti non concordano sulla struttura (un unico anello o due tratti da circa 122 e 58 km): verifica la mappa ufficiale",
          "Dislivello contenuto, circa 500 m D+ (indicativo)",
          "Il vento sul ponte, esposto al Baltico, può rendere la potenza media poco indicativa: pianifica lo sforzo di conseguenza",
          "Per questo tipo di percorso sono consigliate bici da crono o prolunghe"
        ]
      },
      run: {
        bullets: [
          "Tre giri veloci e piatti nel centro di Kalmar, lungo la spiaggia e accanto alle mura storiche",
          "Tifo continuo tra le strade del centro",
          "Arrivo in piazza, davanti alla cattedrale, su tappeto rosso",
          "Se fa caldo, ristori e spugne fanno la differenza nell'ultimo giro"
        ]
      }
    },
    profile: {
      maxm: 40,
      points: [[0,5],[20,8],[40,25],[60,15],[80,20],[100,18],[120,25],[140,12],[160,10],[180,5]],
      labels: [
        { km: 10, m: 20, t: "Ponte di Öland · vento (indicativo)" }
      ]
    },
    splits: [
      { goal: "Finisher sereno", swim: "1:25", bike: "6:45", run: "5:05", total: "13:35" },
      { goal: "Sub 12", swim: "1:15", bike: "5:55", run: "4:15", total: "11:40" },
      { goal: "Sub 11", swim: "1:08", bike: "5:25", run: "3:50", total: "10:35" },
      { goal: "Sub 10", swim: "1:00", bike: "5:00", run: "3:25", total: "9:40" }
    ],
    demands: [
      { t: "Bici: percorso veloce ma esposto al vento sul ponte", b: "gestione dello sforzo" },
      { t: "Nuoto: stretto con possibili onde e diverse curve", b: "orientamento" },
      { t: "Corsa: tre giri piatti con tanto pubblico, non farti trascinare", b: "pacing" },
      { t: "Pettorali esauriti in meno di un'ora: iscrizione da pianificare", b: "pianificazione" }
    ],
    tips: [
      { t: "Bici", p: "Allena pedalate costanti in posizione aero e la gestione del vento laterale." },
      { t: "Pacing", p: "Percorso veloce: tieni ritmo costante e non spingere nei tratti con vento a favore." },
      { t: "Meteo", p: "Porta mantellina e ricambi: anche in agosto sul Baltico può cambiare in fretta." },
      { t: "Nuoto", p: "Allenati con acqua mossa e sighting frequente." },
      { t: "Nutrizione", p: "80-90 g/h di carboidrati in bici, sodio adeguato e prova tutto in allenamento." }
    ],
    logistics: [
      { t: "Arrivare", p: "Kalmar ha un piccolo aeroporto; le alternative più comuni sono Stoccolma o Copenhagen con treno o auto. Verifica i collegamenti aggiornati." },
      { t: "Dormire", p: "Nessun hotel ufficiale verificato nelle fonti consultate. Prenota subito: la città si riempie in settimana gara." },
      { t: "Famiglia", p: "Nuoto con molti spettatori sulla banchina e corsa nel centro: gara facile da seguire a piedi." }
    ],
    faq: [
      { q: "Come si ottiene il pettorale?", a: "Per il 2027 le iscrizioni sono esaurite secondo l'organizzazione; controlla i canali ufficiali per eventuali altre opzioni." },
      { q: "Serve la muta?", a: "È consigliata dalle fonti, ma la temperatura non è confermata: verifica il briefing." },
      { q: "Quanto conta il vento?", a: "È il fattore principale sul ponte di Öland: pianifica sforzo e materiale di conseguenza." }
    ]
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 45, title: "Ponte di Öland e primi km", note: "Piatto ma esposto al vento", grade_pct: 0.3, dplus_m: 100, kind: "flat" },
    { leg: "bike", position: 2, km_from: 45, km_to: 90, title: "Öland", note: "Strade dell'isola, ritmo costante", grade_pct: 0.3, dplus_m: 150, kind: "rolling" },
    { leg: "bike", position: 3, km_from: 90, km_to: 135, title: "Rientro verso il continente", note: "Ritorno sul ponte, vento da gestire", grade_pct: 0.3, dplus_m: 150, kind: "rolling" },
    { leg: "bike", position: 4, km_from: 135, km_to: 180, title: "Mainland e rientro a Kalmar", note: "Finale veloce verso la zona cambio", grade_pct: 0.2, dplus_m: 100, kind: "flat" },
    { leg: "run", position: 1, km_from: 0, km_to: 42.2, title: "Tre giri · centro di Kalmar", note: "Piatto, mare e mura storiche, arrivo davanti alla cattedrale", grade_pct: 0, dplus_m: null, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 3.8, title: "Stretto di Kalmar", note: "Point-to-point, diverse curve", grade_pct: null, dplus_m: null, kind: "point" }
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti 2025-2026",
      scores: { swim: 3.9, bike: 4.0, run: 4.3, org: 4.5 },
      body: "Kalmar è descritta come una full veloce e spettacolare: città e mare accompagnano tutta la gara, il tifo è forte e l'arrivo davanti alla cattedrale è un punto di forza. Le fonti insistono sul vento del ponte di Öland e sul nuoto che può essere mosso. I punteggi sono stime di sintesi, non valutazioni di singoli atleti.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali."
    }
  ],
  sources: [
    { kind: "news", platform: "kalmar.prezly.com", url: "https://kalmar.prezly.com/ironman-kalmar-2027-is-sold-out", title: "IRONMAN Kalmar 2027 is sold out", lang: "en", excerpt: "Data 21 agosto 2027, iscrizioni esaurite in meno di 60 minuti, percorso generale.", topics: ["logistics", "course"], quality: 3 },
    { kind: "blog", platform: "tri247.com", url: "https://www.tri247.com/race/lets-race-ironman-kalmar", title: "Let's race IRONMAN Kalmar", lang: "en", excerpt: "Nuoto nello stretto, bici con ponte di Öland, corsa a tre giri.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "bestbikesplit.com", url: "https://www.bestbikesplit.com/event/ironman-kalmar-sweden-2026-bike-course-race-plan", title: "IRONMAN Kalmar 2026 bike course", lang: "en", excerpt: "Percorso bici, dislivello e vento sul ponte.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "trainerday.com", url: "https://trainerday.com/it/events/se/ironman-de-kalmar", title: "IRONMAN Kalmar — scheda evento", lang: "it", excerpt: "Distanze e attraversamento del ponte di Öland.", topics: ["course"], quality: 2 }
  ],
  harvest: {
    hashtags: ["ironmankalmar", "ironmankalmar2026", "ironmansweden", "kalmar"],
    youtube: ["Ironman Kalmar race report", "Ironman Kalmar bike course", "Ironman Kalmar 2026"],
    google: ["Ironman Kalmar race report", "Ironman Kalmar recensione gara"],
    years: [2024, 2025, 2026]
  }
};
export default seed;
