import type { RaceSeed } from "./types";

// Fonti: vedi sources. Giri, distanze e dislivelli indicativi: le fonti non concordano su tutto, verifica la mappa ufficiale 2027.
const seed: RaceSeed = {
  slug: "elsinore-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Elsinore (Helsingør)",
    region: "Zelanda settentrionale (Danimarca)",
    course_version: "Informazioni da schede di terzi per l'edizione 2027, giri e dislivello indicativi: verifica la mappa ufficiale",
    intro: "IRONMAN 70.3 Elsinore (Helsingør) si corre in Danimarca, sulla costa a nord di Copenaghen, con data in calendario il 27 giugno 2027 · conferma sul sito ufficiale (una scheda riporta solo \"metà giugno\"). Il nuoto è nel porto davanti al castello di Kronborg, la bici esce lungo la costa della Zelanda settentrionale e rientra dopo giri nell'entroterra tra boschi e strade costiere. La mezza si corre intorno a Kronborg e in centro, con pubblico lungo il percorso fino all'arrivo. È un percorso descritto come veloce e abbastanza piatto: dislivello da verificare, ma il vento della costa nordica può contare più delle salite.",
    kpis: [
      { v: "1,9 km", l: "nuoto · un giro nel porto di Elsinore, davanti a Kronborg" },
      { v: "90 km", l: "bici · costa e due giri nell'entroterra (indicativo), dislivello non confermato" },
      { v: "21,1 km", l: "corsa · circa 3,5 giri intorno a Kronborg e in centro" },
      { v: "~17 °C", l: "acqua media indicata da una scheda · muta probabile, verifica il regolamento" },
      { v: "15-27 °C", l: "aria attesa secondo una scheda · storico di giugno 14-33 °C" },
      { v: "27 giu 2027", l: "data in calendario · conferma sul sito ufficiale" }
    ],
    legs: {
      swim: {
        bullets: [
          "Un giro nel porto di Elsinore, con partenza davanti al castello di Kronborg",
          "Acqua di mare con temperatura media indicata intorno a 17 °C: muta probabile, ma la decisione spetta al briefing",
          "Percorso a baia con diverse svolte: studia la mappa e memorizza le boe",
          "Dati sull'uscita e sull'area cambio non verificati: controlla la guida atleta ufficiale"
        ]
      },
      bike: {
        bullets: [
          "Dal porto si risale la costa verso nord; prima di Hornbæk si gira nell'entroterra",
          "Due giri in senso antiorario nella campagna, poi rientro sulla costa verso la città",
          "Descritta come veloce, con piccoli strappi e un mix di strade nel bosco e lungo il mare",
          "Distanza e dislivello non confermati da tutte le fonti (una scheda parla di due giri da 45 km): usa la mappa ufficiale",
          "Il vento sulla costa è la variabile principale: allenati a tenere la posizione aero con le raffiche"
        ]
      },
      run: {
        bullets: [
          "Circa tre giri e mezzo intorno al castello di Kronborg (una scheda indica giri da circa 6 km)",
          "Percorso classificato piatto, con rientro nel centro storico di Elsinore",
          "Tanti passaggi in vista del pubblico: facile da seguire per chi accompagna",
          "Con caldo o sole pieno l'ombra è limitata sul lungomare: spugne e acqua ai ristori"
        ]
      }
    },
    profile: {
      maxm: 120,
      points: [[0, 5], [10, 20], [20, 45], [30, 70], [45, 40], [55, 75], [65, 55], [75, 30], [90, 5]],
      labels: [
        { km: 30, m: 70, t: "Saliscendi nell'entroterra (indicativo)" }
      ]
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:50", bike: "3:15", run: "2:15", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:40", bike: "2:50", run: "1:55", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:35", bike: "2:35", run: "1:45", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:30", bike: "2:20", run: "1:35", total: "4:30" }
    ],
    demands: [
      { t: "Bici: percorso veloce ma esposto al vento della costa", b: "posizione aero e gestione delle raffiche" },
      { t: "Nuoto: baia con svolte multiple, acqua fredda", b: "orientamento e adattamento" },
      { t: "Corsa: tre giri e mezzo, ritmo da tenere regolare", b: "pacing" },
      { t: "Meteo nordico: da 14 a oltre 30 °C nello storico di giugno", b: "adattamento" }
    ],
    tips: [
      { t: "Nuoto", p: "Prova l'acqua fredda in muta e allena le virate attorno alle boe: il percorso a baia ha diverse svolte." },
      { t: "Bici", p: "Lavora sulla posizione aero costante e sui rilanci dopo gli strappi: se il percorso è veloce, il tempo si guadagna con la regolarità." },
      { t: "Pacing", p: "Mezza: parti controllato in bici, la corsa piatta attorno a Kronborg premia chi ha energie nel finale." },
      { t: "Meteo", p: "Porta strati leggeri e antivento: le temperature storiche di giugno variano molto." },
      { t: "Nutrizione", p: "70-90 g/h di carboidrati in bici, sodio adeguato e prova tutto in allenamento." }
    ],
    logistics: [
      { t: "Arrivare", p: "L'aeroporto più vicino indicato è Copenaghen (CPH); da lì si raggiunge Elsinore (Helsingør) via treno o auto. Controlla orari e trasferimenti sul sito ufficiale." },
      { t: "Dormire", p: "Non ho trovato un elenco di hotel ufficiali verificato: cerca vicino al porto e a Kronborg e prenota presto, la settimana gara è piena." },
      { t: "Famiglia", p: "Nuoto, corsa e arrivo sono nel centro vicino al castello, quindi la gara si segue bene a piedi; la bici richiede spostamenti verso la costa." }
    ],
    faq: [
      { q: "Serve la muta?", a: "Probabile: una scheda indica 17 °C di media, ma il regolamento si conferma al briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "Bici su due giri nell'entroterra e corsa su circa 3,5 giri secondo le schede consultate: verifica la mappa 2027." },
      { q: "È adatta a una prima mezza?", a: "Sì, il percorso è descritto come veloce e piatto; il vento e l'acqua fredda sono i fattori da preparare." },
      { q: "La data è confermata?", a: "La data è in calendario al 27 giugno 2027; una scheda riporta solo metà giugno: conferma sul sito ufficiale." }
    ]
  },
  segments: [
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Porto di Elsinore", note: "Un giro davanti a Kronborg", grade_pct: null, dplus_m: null, kind: "loop" },
    { leg: "bike", position: 1, km_from: 0, km_to: 20, title: "Costa verso nord", note: "Uscita dal porto, strade costiere verso Hornbæk", grade_pct: 0.5, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 2, km_from: 20, km_to: 70, title: "Due giri nell'entroterra", note: "Campagna e bosco, piccoli strappi (indicativo)", grade_pct: 1.0, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 3, km_from: 70, km_to: 90, title: "Rientro sulla costa", note: "Ritorno verso la città e zona cambio", grade_pct: 0, dplus_m: null, kind: "flat" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Giri intorno a Kronborg", note: "Circa 3,5 giri, rientro nel centro con pubblico", grade_pct: 0, dplus_m: null, kind: "loop" }
  ],
  reviews: [
    {
      edition_year: 2027,
      source: "synthesis",
      title: "Sintesi fonti 2027",
      body: "Le schede consultate descrivono Elsinore come una mezza veloce e scenografica: nuoto nel porto davanti al castello di Kronborg, bici tra costa e campagna con piccoli strappi, corsa piatta con pubblico in centro. Non ho trovato recensioni di atleti verificabili per questa edizione, quindi la valutazione si basa su descrizioni del percorso. Elementi da preparare: acqua fredda, vento costiero e meteo di giugno molto variabile.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali."
    }
  ],
  sources: [
    { kind: "blog", platform: "raceraves.com", url: "https://raceraves.com/races/ironman-70-3-elsinore/", title: "IRONMAN 70.3 Elsinore — scheda gara", lang: "en", excerpt: "Nuoto nel porto davanti a Kronborg, bici con due giri, corsa piatta attorno al castello; meteo storico.", topics: ["course", "weather"], quality: 3 },
    { kind: "blog", platform: "finishers.com", url: "https://www.finishers.com/course/ironman-de-elseneur", title: "Ironman 70.3 de Elseneur 2027", lang: "fr", excerpt: "Distanze 1,9 km / 90 km / 21,1 km, bici in due giri da 45 km, corsa in 3,5 giri.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "rouvy.com", url: "https://rouvy.com/en/ironman/elsinore-703", title: "IRONMAN 70.3 Elsinore su ROUVY", lang: "en", excerpt: "Percorso bici da 90 km descritto come ondulato, con punti ristoro indicati.", topics: ["course"], quality: 2 }
  ],
  harvest: {
    hashtags: ["ironman703elsinore", "ironmanelsinore", "elsinore703", "ironman703", "helsingor"],
    youtube: ["IRONMAN 70.3 Elsinore", "Ironman 70.3 Elsinore bike course", "Ironman 70.3 Helsingør race"],
    google: ["IRONMAN 70.3 Elsinore race report", "Ironman 70.3 Elsinore recensione gara"],
    years: [2023, 2024, 2025, 2026]
  }
};
export default seed;
