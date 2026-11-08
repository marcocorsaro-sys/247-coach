import type { RaceSeed } from "./types";

// Fonti: vedi sources. Tratti, giri e dislivelli indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "alghero-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Alghero",
    region: "Sardegna",
    course_version: "Seconda edizione (la prima è del 2026): tratti indicativi, verifica la mappa ufficiale 2027",
    intro: "IRONMAN 70.3 Alghero (30 maggio 2027, data in calendario · conferma sul sito ufficiale) è una gara giovane: la prima edizione si è corsa nel 2026 con quasi 2.900 atleti da 91 paesi. Si nuota nella baia di San Giovanni, si pedala per circa 90 km tra la costa, il Parco di Porto Conte e Capo Caccia e si corre sul lungomare e sotto le mura della città vecchia. Il percorso bici è mosso (le fonti parlano di circa 770-850 m di dislivello positivo), la corsa quasi piatta. È una mezza adatta a chi vuole unire gara e vacanza in Sardegna, con il vento di mare come variabile principale.",
    kpis: [
      { v: "1,9 km", l: "nuoto · baia di San Giovanni, mare" },
      { v: "90 km", l: "bici · costa e Parco di Porto Conte, circa 770-850 m D+ (indicativo)" },
      { v: "21,1 km", l: "corsa · lungomare e mura, circa 110 m D+ (indicativo)" },
      { v: "~18 °C", l: "acqua a fine maggio · dato indicativo, muta probabile" },
      { v: "16-28 °C", l: "aria · tipici valori di fine maggio, vento possibile" },
      { v: "30 mag 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Nuoto in mare nella baia accanto al porto, con partenza e arrivo dalla spiaggia di San Giovanni",
          "Acqua descritta come limpida; a fine maggio è fresca (una scheda indica circa 18 °C, valore indicativo): verifica il regolamento muta nel briefing",
          "Il numero di giri e le boe vanno controllati sulla mappa ufficiale: le fonti non concordano nei dettagli",
          "Con quasi 3.000 iscritti previsti, scegli bene la posizione di partenza",
        ],
      },
      bike: {
        bullets: [
          "Un unico anello da circa 90 km con partenza da Alghero: verso sud lungo la costa, poi verso nord intorno al Parco di Porto Conte fino a Capo Caccia",
          "Percorso definito mosso, con circa 770-850 m di dislivello positivo a seconda della fonte (indicativo)",
          "Il vento di mare può farsi sentire sulle parti scoperte: allena i tratti in posizione e i rilanci",
          "Panorami sulla costa e sul promontorio: tieni comunque la concentrazione sulle discese",
        ],
      },
      run: {
        bullets: [
          "Mezza maratona tra lungomare, mura della città vecchia e centro storico, quasi tutta piatta (circa 110 m D+ secondo una fonte)",
          "Una scheda indica tre giri; un'altra non li precisa: verifica la mappa ufficiale",
          "Poca ombra sul lungomare: in caso di caldo servono ghiaccio e spugne ai ristori",
          "Il passaggio sotto le mura e l'arrivo in città sono tra i momenti più suggestivi",
        ],
      },
    },
    profile: {
      maxm: 160,
      points: [
        [0, 5], [10, 40], [20, 90], [30, 60], [40, 110], [50, 150],
        [60, 100], [70, 60], [80, 40], [90, 5],
      ],
      labels: [{ km: 50, m: 150, t: "Capo Caccia (indicativo)" }],
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:42", bike: "3:15", run: "2:20", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:36", bike: "2:50", run: "1:58", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:33", bike: "2:35", run: "1:45", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:30", bike: "2:25", run: "1:32", total: "4:30" },
    ],
    demands: [
      { t: "Bici mossa e ventosa: ritmo costante, niente sprechi", b: "gestione dello sforzo" },
      { t: "Mare fresco a fine maggio, con tanti atleti in partenza", b: "adattamento" },
      { t: "Corsa piatta ma esposta al sole", b: "pacing" },
      { t: "Gara alla seconda edizione: dettagli di percorso da confermare", b: "preparazione" },
    ],
    tips: [
      { t: "Bici", p: "Allena le salite brevi a ritmo costante e la posizione sul vento: il piano sostituisce la seduta generica con percorsi mossi." },
      { t: "Pacing", p: "Bici a 72-75 % FTP, senza strappi: i km finali di corsa sono quelli che contano." },
      { t: "Nuoto", p: "Prova la muta in acqua fresca e allenati a nuotare in gruppo con boe affollate." },
      { t: "Caldo", p: "Prova la gestione di acqua, sali e raffreddamento: sul lungomare c'è poca ombra." },
      { t: "Nutrizione", p: "60-80 g/h di carboidrati in bici, sodio adeguato; prova tutto in allenamento." },
    ],
    logistics: [
      { t: "Arrivare", p: "Aeroporto di Alghero-Fertilia (AHO) a pochi km dalla città; in alternativa Olbia o Cagliari con auto o treno più trasferimento. Verifica collegamenti e orari per la settimana gara." },
      { t: "Dormire", p: "Non ho trovato hotel ufficiali confermati per la gara: controlla la pagina ufficiale IRONMAN. Alghero a fine maggio è molto richiesta, prenota con anticipo." },
      { t: "Famiglia", p: "La gara si svolge tra lungomare e centro storico, quindi è facile seguirla a piedi; per chi aspetta ci sono spiagge, città vecchia e Capo Caccia." },
    ],
    faq: [
      { q: "Serve la muta?", a: "Probabile: l'acqua a fine maggio è fresca (indicativamente circa 18 °C). La decisione si prende al briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "La bici è un anello da circa 90 km; per la corsa le fonti non concordano sui giri: verifica la mappa ufficiale 2027." },
      { q: "È adatta a una prima mezza?", a: "Sì per l'ambiente e la corsa piatta, ma la bici è mossa e ventosa: serve una buona base." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 30, title: "Costa verso sud", note: "Partenza dalla città e primo tratto lungo il mare", grade_pct: 1.0, dplus_m: 220, kind: "rolling" },
    { leg: "bike", position: 2, km_from: 30, km_to: 60, title: "Verso Porto Conte e Capo Caccia", note: "Parte più impegnativa, indicativa", grade_pct: 1.5, dplus_m: 320, kind: "climb" },
    { leg: "bike", position: 3, km_from: 60, km_to: 90, title: "Rientro ad Alghero", note: "Rientro costiero verso il porto", grade_pct: 0.5, dplus_m: 250, kind: "rolling" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Lungomare e mura", note: "Quasi piatto, giri da verificare", grade_pct: 0, dplus_m: 110, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Baia di San Giovanni", note: "Mare, partenza e arrivo dalla spiaggia", grade_pct: null, dplus_m: null, kind: "loop" },
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti 2026",
      scores: { swim: 4.2, bike: 4.0, run: 4.0, org: 4.0 },
      body: "Alghero è una gara nuova, quindi le testimonianze sono ancora poche. Le fonti insistono su ambientazione, mare limpido, bici costiera mossa e corsa tra lungomare e mura. I punti da gestire sono il vento sulla bici e il caldo sul lungomare. Il giudizio è provvisorio: dopo la seconda edizione ci saranno più racconti diretti.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "blog", platform: "finishers.com", url: "https://www.finishers.com/en/event/ironman-70-3-alghero", title: "Ironman 70.3 Alghero 2027", lang: "en", excerpt: "Distanze, dislivelli indicativi e data 30 maggio 2027.", topics: ["course"], quality: 3 },
    { kind: "news", platform: "unionesarda.it", url: "https://www.unionesarda.it/en/ironman-a-resounding-success-in-alghero-see-you-in-2027-qpzdr5qe", title: "Ironman, a resounding success in Alghero: see you in 2027", lang: "en", excerpt: "Bilancio della prima edizione e prossima edizione nel 2027.", topics: ["course", "logistics"], quality: 3 },
    { kind: "blog", platform: "raceraves.com", url: "https://raceraves.com/races/ironman-70-3-alghero/", title: "IRONMAN 70.3 Alghero — RaceRaves", lang: "en", excerpt: "Scheda gara: nuoto, bici, corsa e clima tipico.", topics: ["course"], quality: 3 },
  ],
  harvest: {
    hashtags: ["ironman703alghero", "ironmanalghero", "703alghero", "alghero703"],
    youtube: ["Ironman 70.3 Alghero race report", "Ironman 70.3 Alghero bike course", "Ironman 70.3 Alghero 2026"],
    google: ["Ironman 70.3 Alghero recensione gara", "Ironman 70.3 Alghero percorso bici"],
    years: [2026],
  },
};
export default seed;
