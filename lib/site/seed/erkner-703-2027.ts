import type { RaceSeed } from "./types";

// Fonti: vedi sources. Giri, dislivello e data 2027 da verificare sul sito ufficiale.
const seed: RaceSeed = {
  slug: "erkner-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Erkner · Berlino-Brandeburgo",
    region: "Brandeburgo (Germania, vicino a Berlino)",
    course_version: "Dati da fonti terze, indicativi: verifica la mappa ufficiale e la conferma dell'edizione 2027",
    intro:
      "Lo IRONMAN 70.3 Erkner si svolge a sud-est di Berlino, al confine tra la capitale e il Brandeburgo: nuoto nel Dämeritzsee dallo Strandbad di Erkner, bici veloce e quasi piatta lungo la Sprea, e mezza maratona in centro a Erkner, con passaggio vicino alla piazza del mercato e al museo Gerhart-Hauptmann. Una fonte consultata riporta il 12 settembre 2027, ma un'altra pagina segnala che la prossima data non è ancora nota: data in calendario · conferma sul sito ufficiale prima di prenotare. È una gara adatta a chi cerca un percorso veloce.",
    kpis: [
      { v: "1,9 km", l: "nuoto · un giro nel Dämeritzsee" },
      { v: "90 km", l: "bici · due giri, percorso piatto e veloce" },
      { v: "21,1 km", l: "corsa · piatta, passaggio nel centro di Erkner" },
      { v: "~20 °C", l: "acqua media indicata da fonte terza" },
      { v: "~10-20 °C", l: "aria tipica a metà settembre (indicativo)" },
      { v: "12 set 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Un giro di 1,9 km nel Dämeritzsee, con partenza dallo Strandbad Erkner",
          "Il lago è diviso tra Berlino e Brandeburgo; le rive sono piatte e boscose",
          "Temperatura media indicata intorno ai 20 °C da una fonte terza: la muta è probabile, ma conferma nel briefing",
          "Nuoto in acqua calma: sfrutta le scie ma non partire troppo forte",
        ],
      },
      bike: {
        bullets: [
          "Circa 90 km in due giri, descritti come piatti e veloci tra foreste e laghi dell'Oder-Spree, lungo la Sprea",
          "Il dislivello è molto contenuto: una fonte sulla prima edizione indicava circa 50 m (dato indicativo)",
          "Le fonti citano strade di recente riasfaltate: verifica lo stato in occasione del sopralluogo",
          "Pochi cambi di ritmo: posizione aero stabile e attenzione al vento",
        ],
      },
      run: {
        bullets: [
          "21,1 km piatti con passaggio vicino alla piazza del mercato di Erkner e al museo Gerhart-Hauptmann",
          "Il numero di giri non concorda tra le fonti (3 o 4): verifica la mappa ufficiale",
          "Più passaggi in centro e molti punti per gli spettatori",
          "Con pochi dislivelli è la costanza del ritmo a fare la differenza",
        ],
      },
    },
    profile: {
      maxm: 80,
      points: [
        [0, 40],
        [15, 42],
        [30, 45],
        [45, 41],
        [60, 44],
        [75, 42],
        [90, 40],
      ],
      labels: [{ km: 45, m: 41, t: "Percorso quasi piatto (indicativo)" }],
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:48", bike: "3:20", run: "2:10", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:40", bike: "2:50", run: "1:50", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:36", bike: "2:35", run: "1:40", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:32", bike: "2:20", run: "1:30", total: "4:30" },
    ],
    demands: [
      { t: "Bici piatta: posizione aero e potenza costante", b: "efficienza" },
      { t: "Vento e meteo di metà settembre, variabili", b: "adattamento" },
      { t: "Nuoto in lago con partenza affollata", b: "orientamento" },
      { t: "Corsa piatta in più giri: ritmo costante", b: "pacing" },
    ],
    tips: [
      { t: "Bici", p: "Allena lunghi tratti a potenza costante in posizione aero: il piano usa uscite piatte a ritmo gara." },
      { t: "Pacing", p: "Non farti ingannare dal percorso piatto: parti controllato e spingi solo nell'ultima parte della corsa." },
      { t: "Nuoto", p: "Prova la muta e le partenze in gruppo in acqua libera." },
      { t: "Meteo", p: "A metà settembre può fare fresco al mattino: porta ricambi e un primo strato leggero." },
      { t: "Nutrizione", p: "60-90 g/h di carboidrati in bici, da provare in allenamento." },
    ],
    logistics: [
      {
        t: "Arrivare",
        p: "L'aeroporto più vicino indicato dalle fonti è Berlino Brandeburgo (BER). Erkner è nella zona sud-est di Berlino: verifica collegamenti S-Bahn e treni regionali.",
      },
      {
        t: "Dormire",
        p: "Non ho verificato hotel ufficiali. Valuta Erkner o Berlino e controlla le raccomandazioni sul sito della gara; prenota presto se la data viene confermata.",
      },
      {
        t: "Famiglia",
        p: "Lo Strandbad e il centro di Erkner sono vicini al percorso, ma la logistica esatta (zone cambio, aree spettatori) va verificata sul sito ufficiale. Contatto indicato da una fonte: erkner70.3@ironman.com.",
      },
    ],
    faq: [
      { q: "La gara 2027 è confermata?", a: "Le fonti non concordano: una indica il 12 settembre 2027, un'altra dice che la prossima data non è nota. Verifica sul sito ufficiale." },
      { q: "Serve la muta?", a: "Probabile: l'acqua media indicata è circa 20 °C. Conferma nel briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "Due giri in bici secondo una fonte; per la corsa 3 o 4 giri a seconda della fonte: verifica la mappa ufficiale." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 45, title: "Primo giro lungo la Sprea", note: "Piatto e veloce tra foreste e laghi", grade_pct: 0, dplus_m: null, kind: "flat" },
    { leg: "bike", position: 2, km_from: 45, km_to: 90, title: "Secondo giro", note: "Stesso profilo: gestisci lo sforzo per la corsa", grade_pct: 0, dplus_m: null, kind: "flat" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Corsa nel centro di Erkner", note: "Piatta; passaggio vicino al mercato e al museo; giri da verificare", grade_pct: 0, dplus_m: null, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Dämeritzsee", note: "Un giro dallo Strandbad Erkner", grade_pct: null, dplus_m: null, kind: "loop" },
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti",
      body: "Dalle fonti consultate Erkner è una 70.3 piatta e veloce vicino a Berlino: lago calmo, bici su strade lungo la Sprea e mezza maratona nel centro cittadino. Il punto di forza è la velocità del percorso; il limite è l'incertezza su date e dettagli, perché le fonti non concordano su giri della corsa e sulla conferma dell'edizione 2027. Prima di impostare il piano verifica data e mappa ufficiale.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "blog", platform: "raceraves.com", url: "https://raceraves.com/races/ironman-70-3-erkner/", title: "IRONMAN 70.3 Erkner", lang: "en", excerpt: "Data 12 settembre 2027, Dämeritzsee, bici piatta in due giri, corsa piatta.", topics: ["course", "weather"], quality: 3 },
    { kind: "blog", platform: "triathlon.de", url: "https://events.triathlon.de/en/blogs/triathlon-regional/ironman-70-3-erkner-bei-berlin", title: "Erster Ironman 70.3 Erkner bei Berlin", lang: "en", excerpt: "Descrizione della prima edizione: nuoto nel Dämeritzsee, bici quasi piatta (circa 50 m).", topics: ["course"], quality: 3 },
    { kind: "news", platform: "runnersworld.de", url: "https://www.runnersworld.de/laufkalender/ironman-70-3-erkner/", title: "Ironman 70.3 Erkner · Laufkalender", lang: "de", excerpt: "Nota che la prossima data non è ancora nota; contatti dell'organizzatore.", topics: ["logistics"], quality: 2 },
  ],
  harvest: {
    hashtags: ["ironman703erkner", "im703erkner", "erkner", "ironmanberlin", "ironmangermany"],
    youtube: ["Ironman 70.3 Erkner race report", "Ironman 70.3 Erkner bike course", "Ironman 70.3 Erkner Berlin", "Ironman 70.3 Erkner 2025"],
    google: ["Ironman 70.3 Erkner race report", "Ironman 70.3 Erkner recensione gara"],
    years: [2023, 2024, 2025],
  },
};
export default seed;
