import type { RaceSeed } from "./types";

// Fonti: vedi sources. Giri e dislivello indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "copenhagen-2027",
  race: {
    official_name: "IRONMAN Copenhagen",
    region: "Zelanda (Danimarca)",
    course_version: "Edizioni recenti, tratti indicativi: verifica la mappa ufficiale 2027",
    intro: "IRONMAN Copenhagen (22 agosto 2027) parte da Amager Strandpark, con nuoto in una laguna protetta, bici nella Zelanda settentrionale tra costa e campagna e maratona lungo il porto, con passaggi davanti a Sirenetta, Opera, Amalienborg e Nyhavn. L'arrivo è a Christiansborg Slotsplads secondo la scheda di VisitDenmark. È una full veloce e molto scenografica: le fonti parlano di oltre 150.000 spettatori attesi.",
    kpis: [
      { v: "3,8 km", l: "nuoto · laguna protetta ad Amager Strandpark" },
      { v: "180 km", l: "bici · rolling con tratti piatti, dislivello contenuto (non quantificato)" },
      { v: "42,2 km", l: "corsa · giri di circa 10,5 km in centro e sul porto (indicativo)" },
      { v: "< 20 °C", l: "acqua · una guida segnala acqua sotto i 20 °C, indicativo" },
      { v: "Aria fresca", l: "aria · variabile, vento da costa possibile" },
      { v: "22 ago 2027", l: "data in calendario · conferma sul sito ufficiale" }
    ],
    legs: {
      swim: {
        bullets: [
          "Giro unico in una laguna calma e protetta collegata al mare, descritta come una \"piscina\" per l'evento",
          "Muta di norma consentita; una guida segnala acqua sotto i 20 °C (indicativo)",
          "Partenza vicino alla spiaggia di Amager, con zona cambio a pochi passi",
          "Verifica il briefing per la temperatura e il regolamento"
        ]
      },
      bike: {
        bullets: [
          "Due giri secondo una guida; verifica la mappa ufficiale 2027 per giri e dettagli",
          "Primi circa 30 km piatti lungo la costa, poi circa 30 km di saliscendi su strade secondarie, infine strade più larghe con piccoli rilanci",
          "Percorso nella campagna della Zelanda settentrionale, rolling ma senza grandi salite",
          "Il rientro porta verso il centro di Copenhagen, vicino alla Banca Nazionale"
        ]
      },
      run: {
        bullets: [
          "Giri da circa 10,5 km (quattro, secondo una guida: indicativo) in centro e sul porto",
          "Percorso piatto e veloce, con passaggi davanti a Sirenetta, Opera, Amalienborg e Nyhavn",
          "Tantissimo pubblico lungo il percorso",
          "Arrivo a Christiansborg Slotsplads secondo VisitDenmark"
        ]
      }
    },
    profile: {
      maxm: 80,
      points: [[0,5],[20,10],[40,35],[60,55],[80,30],[100,15],[120,35],[140,55],[160,30],[180,5]],
      labels: [
        { km: 50, m: 55, t: "Tratto rolling (indicativo)" }
      ]
    },
    splits: [
      { goal: "Finisher sereno", swim: "1:25", bike: "6:50", run: "5:05", total: "13:40" },
      { goal: "Sub 12", swim: "1:15", bike: "5:55", run: "4:15", total: "11:45" },
      { goal: "Sub 11", swim: "1:08", bike: "5:25", run: "3:50", total: "10:35" },
      { goal: "Sub 10", swim: "1:00", bike: "5:00", run: "3:25", total: "9:40" }
    ],
    demands: [
      { t: "Bici: vento da costa e tratto rolling centrale", b: "gestione dello sforzo" },
      { t: "Nuoto: acqua fresca e partenza affollata", b: "adattamento" },
      { t: "Corsa: giri veloci con tanto pubblico, non farti trascinare", b: "pacing" },
      { t: "Alta richiesta: i pettorali sono andati esauriti in un'ora in un'edizione recente", b: "pianificazione" }
    ],
    tips: [
      { t: "Bici", p: "Allena la posizione aero e il ritmo costante con vento laterale." },
      { t: "Pacing", p: "Percorso veloce: non partire forte, la maratona è piatta ma lunga." },
      { t: "Meteo", p: "Porta mantellina e ricambi: ad agosto sulla costa può essere ventoso." },
      { t: "Nuoto", p: "Prova la muta e allenati in acqua fresca." },
      { t: "Nutrizione", p: "80-90 g/h di carboidrati in bici, sodio adeguato e prova tutto in allenamento." }
    ],
    logistics: [
      { t: "Arrivare", p: "Aeroporto di Copenhagen (CPH) con metro verso il centro e Amager. Controlla i trasporti aggiornati." },
      { t: "Dormire", p: "Nessun hotel ufficiale verificato nelle fonti consultate. Prenota presto: in settimana gara la città è piena." },
      { t: "Famiglia", p: "Amager Strandpark e il porto sono comodi da raggiungere con la metro; la corsa in centro è facile da seguire." }
    ],
    faq: [
      { q: "Serve la muta?", a: "Di norma sì: una guida segnala acqua sotto i 20 °C, ma verifica il briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "Secondo una guida due in bici e quattro da circa 10,5 km in corsa: verifica la mappa 2027." },
      { q: "È adatta a un primo IRONMAN?", a: "Sì: percorso veloce e scenografico, con dislivello contenuto." }
    ]
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 45, title: "Costa e primo tratto", note: "Piatto lungo il mare, poi saliscendi", grade_pct: 0.4, dplus_m: 120, kind: "flat" },
    { leg: "bike", position: 2, km_from: 45, km_to: 90, title: "Strade secondarie rolling", note: "Saliscendi nella campagna della Zelanda", grade_pct: 0.8, dplus_m: 250, kind: "rolling" },
    { leg: "bike", position: 3, km_from: 90, km_to: 135, title: "Secondo giro · metà", note: "Ripartenza con gambe cariche", grade_pct: 0.5, dplus_m: 150, kind: "rolling" },
    { leg: "bike", position: 4, km_from: 135, km_to: 180, title: "Rientro in città", note: "Strade larghe e rientro verso il centro", grade_pct: 0.3, dplus_m: 100, kind: "flat" },
    { leg: "run", position: 1, km_from: 0, km_to: 42.2, title: "Giri · centro e porto", note: "Piatto, Sirenetta, Opera, Amalienborg, Nyhavn", grade_pct: 0, dplus_m: null, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 3.8, title: "Amager Strandpark", note: "Laguna protetta", grade_pct: null, dplus_m: null, kind: "loop" }
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti",
      scores: { swim: 4.2, bike: 4.0, run: 4.4, org: 4.4 },
      body: "Copenhagen è descritta come una full veloce e scenografica: nuoto in laguna protetta, bici senza grandi salite e maratona in centro e sul porto con moltissimo pubblico. Le fonti segnalano acqua fresca e vento come variabili principali. I punteggi sono stime di sintesi, non valutazioni di singoli atleti.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali."
    }
  ],
  sources: [
    { kind: "news", platform: "visitdenmark.com", url: "https://www.visitdenmark.com/denmark/plan-your-trip/ironman-copenhagen-gdk1089058", title: "IRONMAN Copenhagen — VisitDenmark", lang: "en", excerpt: "Data 22 agosto 2027, nuoto ad Amager, corsa sul porto, arrivo a Christiansborg.", topics: ["course", "logistics"], quality: 3 },
    { kind: "blog", platform: "imtalkraceguideeurope.blogspot.com", url: "https://imtalkraceguideeurope.blogspot.com/p/ironman-copenhagen.html", title: "IRONMAN Copenhagen — race guide", lang: "en", excerpt: "Nuoto in laguna, bici a due giri, corsa a giri da 10,5 km.", topics: ["course"], quality: 2 },
    { kind: "blog", platform: "rouvy.com", url: "https://rouvy.com/es/ironman/copenhagen", title: "IRONMAN Copenhagen — bike course", lang: "es", excerpt: "Descrizione del percorso bici da Amager Strandpark.", topics: ["course"], quality: 2 },
    { kind: "news", platform: "sn.dk", url: "https://www.sn.dk/art6627062/koebenhavn-kommune/indland/ironman-i-koebenhavn-melder-startnumre-udsolgt-paa-en-time", title: "Ironman i København: startnumre udsolgt på en time", lang: "da", excerpt: "Pettorali esauriti in un'ora.", topics: ["logistics"], quality: 2 }
  ],
  harvest: {
    hashtags: ["ironmancopenhagen", "ironmancopenhagen2026", "ironmandenmark", "amagerstrandpark"],
    youtube: ["Ironman Copenhagen race report", "Ironman Copenhagen bike course", "Ironman Copenhagen 2026"],
    google: ["Ironman Copenhagen race report", "Ironman Copenhagen recensione gara"],
    years: [2024, 2025, 2026]
  }
};
export default seed;
