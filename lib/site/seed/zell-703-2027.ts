import type { RaceSeed } from "./types";

// Fonti: vedi sources. Dislivello e posizione delle salite indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "zell-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Zell am See-Kaprun",
    region: "Salisburghese (Austria)",
    course_version: "Dati da fonti terze (edizioni recenti), indicativi: verifica la mappa ufficiale 2027",
    intro:
      "Lo IRONMAN 70.3 Zell am See-Kaprun (29 agosto 2027, data in calendario · conferma sul sito ufficiale) è una mezza distanza di montagna: nuoto nel lago di Zell, bici su un percorso collinare con una salita impegnativa seguita da una discesa veloce e mezza maratona piatta lungo la riva del lago, con arrivo a Zell am See. Il clima di fine agosto è di norma mite, ma l'acqua è fredda e il meteo alpino può cambiare in fretta. È una gara per chi vuole una 70.3 vera in bici, in uno scenario molto bello.",
    kpis: [
      { v: "1,9 km", l: "nuoto · Lago di Zell, acqua fredda" },
      { v: "90 km", l: "bici · circa 1.000 m D+ (indicativo, un solo giro)" },
      { v: "21,1 km", l: "corsa · lungo la riva del lago, percorso piatto" },
      { v: "~17 °C", l: "acqua media indicata da fonte terza · muta quasi certa" },
      { v: "15-25 °C", l: "aria tipica a fine agosto, anche più fresco" },
      { v: "29 ago 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Nuoto di 1,9 km nel Lago di Zell, con base alla zona Strandbad Seespitz a Zell am See",
          "Temperatura media indicata intorno ai 17 °C da una fonte terza: probabile muta, ma controlla il briefing",
          "Numero di giri e posizione delle boe non verificati: consulta la mappa ufficiale",
          "Acqua fredda: scalda le braccia prima della partenza e prova la muta in acqua fredda",
        ],
      },
      bike: {
        bullets: [
          "Circa 90 km su un giro unico tra Zell am See, Kaprun e i paesi vicini, in ambiente di montagna",
          "Una fonte terza (Rouvy) indica circa 1.037 m di dislivello e pendenza massima intorno al 16 %: dati indicativi",
          "Il percorso è descritto come una salita impegnativa seguita da una discesa veloce; non ho verificato dove cadano esattamente",
          "Passaggio nei pressi del castello di Kaprun, secondo il materiale turistico locale",
          "Discese veloci: allena la guida e controlla freni e pressione prima della gara",
        ],
      },
      run: {
        bullets: [
          "21,1 km lungo la riva del lago, classificati come piatti dalle fonti",
          "Il numero di giri non è stato verificato: verifica la mappa ufficiale",
          "Arrivo a Zell am See, con molto pubblico in zona lago",
          "Dopo la bici di montagna le gambe sono cariche: parti controllato nei primi chilometri",
        ],
      },
    },
    profile: {
      maxm: 1000,
      points: [
        [0, 760],
        [15, 770],
        [30, 820],
        [45, 960],
        [55, 940],
        [70, 820],
        [80, 770],
        [90, 760],
      ],
      labels: [{ km: 45, m: 960, t: "Salita principale (posizione indicativa)" }],
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:48", bike: "3:30", run: "2:05", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:40", bike: "3:00", run: "1:40", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:36", bike: "2:42", run: "1:32", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:32", bike: "2:28", run: "1:22", total: "4:30" },
    ],
    demands: [
      { t: "Bici: circa 1.000 m di dislivello in un solo giro, con una salita lunga", b: "forza in salita" },
      { t: "Acqua fredda e meteo alpino variabile", b: "adattamento" },
      { t: "Discese veloci dopo la salita: tecnica e sicurezza", b: "guida" },
      { t: "Corsa piatta ma dopo una bici dura", b: "pacing" },
    ],
    tips: [
      { t: "Bici", p: "Allena salite lunghe a ritmo costante e discese: la bici qui decide la corsa. Il piano usa i tuoi percorsi più mossi." },
      { t: "Pacing", p: "Sulla salita resta sotto soglia: il vantaggio si perde se bruci energia prima della corsa." },
      { t: "Acqua fredda", p: "Prova la muta e la partenza in acqua fredda almeno una volta prima della gara." },
      { t: "Meteo", p: "Porta mantellina e guanti leggeri per la discesa: a fine agosto in montagna può fare fresco." },
      { t: "Nutrizione", p: "60-90 g/h di carboidrati in bici, da provare in allenamento." },
    ],
    logistics: [
      {
        t: "Arrivare",
        p: "L'aeroporto più vicino indicato dalle fonti è Salisburgo (SZG); da lì si arriva a Zell am See in auto o in treno. Verifica tempi e cambi prima di prenotare.",
      },
      {
        t: "Dormire",
        p: "Non ho verificato hotel ufficiali. Zell am See-Kaprun è una destinazione turistica estiva molto richiesta: prenota presto e controlla le indicazioni sul sito della gara.",
      },
      {
        t: "Famiglia",
        p: "L'organizzatore è l'ente turistico locale (Zell am See-Kaprun Tourismus) e la zona lago offre molte attività per chi aspetta. Verifica sul sito il programma e le chiusure stradali.",
      },
    ],
    faq: [
      { q: "Serve la muta?", a: "Probabile: una fonte terza indica acqua intorno ai 17 °C. Conferma nel briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "Non verificato: la bici risulta su un giro unico da fonte terza, per la corsa consulta la mappa ufficiale." },
      { q: "Quanto è dura la bici?", a: "Circa 1.000 m di dislivello, indicativi: è una 70.3 di montagna con salita e discesa veloce." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 25, title: "Partenza e avvicinamento", note: "Parte iniziale dal lago verso le località vicine; profilo indicativo", grade_pct: null, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 2, km_from: 25, km_to: 55, title: "Salita principale", note: "Salita impegnativa descritta dalle fonti; posizione esatta da verificare", grade_pct: null, dplus_m: null, kind: "climb" },
    { leg: "bike", position: 3, km_from: 55, km_to: 75, title: "Discesa veloce", note: "Dopo la salita, tratto veloce: attenzione a curve e freni", grade_pct: null, dplus_m: null, kind: "descent" },
    { leg: "bike", position: 4, km_from: 75, km_to: 90, title: "Rientro a Zell am See", note: "Ultimi chilometri verso la zona cambio", grade_pct: null, dplus_m: null, kind: "flat" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Mezza maratona sul lago", note: "Percorso piatto lungo la riva; giri da verificare", grade_pct: 0, dplus_m: null, kind: "flat" },
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Lago di Zell", note: "Acqua fredda; giri non verificati", grade_pct: null, dplus_m: null, kind: "loop" },
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti 2024-2026",
      body: "Dalle fonti consultate emerge una 70.3 di montagna: acqua fredda, bici con una salita impegnativa e discesa veloce, corsa piatta sul lago. Il fascino è nel paesaggio e nell'organizzazione locale; la difficoltà è nel dislivello in bici e nel meteo alpino, che può cambiare molto da un anno all'altro. Le fonti non concordano su tutti i dettagli (giri, lunghezza esatta della corsa: 21,1 o 21,2 km), quindi conviene verificare la mappa ufficiale.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "blog", platform: "raceraves.com", url: "https://raceraves.com/races/ironman-70-3-zell-am-see-kaprun/", title: "IRONMAN 70.3 Zell am See-Kaprun", lang: "en", excerpt: "Distanze, acqua media 17 °C, bici collinare, corsa piatta lungo il lago.", topics: ["course", "weather"], quality: 3 },
    { kind: "blog", platform: "zellamsee-kaprun.com", url: "https://www.zellamsee-kaprun.com/en/event/ironman-70-3-zell-am-see-kaprun~11120", title: "IRONMAN 70.3 Zell am See-Kaprun (ente turistico)", lang: "en", excerpt: "Data 29 agosto 2027, Strandbad Seespitz, organizzatore locale.", topics: ["logistics"], quality: 4 },
    { kind: "blog", platform: "rouvy.com", url: "https://rouvy.com/en/all-rouvy-routes/250081", title: "IRONMAN 70.3 Zell am See-Kaprun · percorso bici", lang: "en", excerpt: "Bici su un giro, circa 89 km, 1.037 m D+, pendenza massima 16 %.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "zellamsee-kaprun.com", url: "https://webview.zellamsee-kaprun.com/en/sport/summer/triathlon", title: "Triathlon · allenarsi per IRONMAN 70.3", lang: "en", excerpt: "Distanze e passaggio vicino al castello di Kaprun.", topics: ["course", "logistics"], quality: 3 },
  ],
  harvest: {
    hashtags: ["ironman703zellamsee", "ironman703zellamseekaprun", "zellamsee", "kaprun", "im703zell"],
    youtube: ["Ironman 70.3 Zell am See Kaprun race report", "Ironman 70.3 Zell am See bike course", "Ironman 70.3 Zell am See 2025", "Ironman 70.3 Zell am See 2026"],
    google: ["Ironman 70.3 Zell am See Kaprun race report", "Ironman 70.3 Zell am See recensione gara"],
    years: [2024, 2025, 2026],
  },
};
export default seed;
