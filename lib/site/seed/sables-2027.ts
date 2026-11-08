import type { RaceSeed } from "./types";

// Fonti: vedi sources. Tratti, giri e dislivelli indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "sables-2027",
  race: {
    official_name: "IRONMAN Les Sables-d'Olonne-Vendée",
    region: "Vandea, Pays de la Loire (Francia)",
    course_version: "Seconda edizione full (la prima è del 2025): dettagli indicativi, verifica la mappa ufficiale 2027",
    intro: "IRONMAN Les Sables-d'Olonne-Vendée si svolge sulla costa atlantica della Vandea. Per il 27 giugno 2027 un calendario di gare e una scheda dedicata indicano la distanza intera (3,8 / 180 / 42,2), come seconda edizione full dopo quella inaugurale del 2025; la gara alterna anno per anno con il formato 70.3. Attenzione: le fonti non sono del tutto allineate (una scheda cita ancora un 70.3 a metà giugno 2027, un'altra una pausa del 70.3 nel 2027), quindi conferma formato e data sul sito ufficiale. Nel 2025 l'evento ha ottenuto riconoscimenti nei sondaggi tra gli atleti IRONMAN per esperienza di nuoto e di bici.",
    kpis: [
      { v: "3,8 km", l: "nuoto · mare, partenza dalla Grande Plage (dato dal 70.3)" },
      { v: "180 km", l: "bici · due giri, percorso mosso, dislivello non trovato" },
      { v: "42,2 km", l: "corsa · giri tra Remblai e laghetto (da verificare)" },
      { v: "Atlantico", l: "acqua a fine giugno · dato non trovato, muta da verificare" },
      { v: "Variabile", l: "meteo oceanico · vento e fresco possibili" },
      { v: "27 giu 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Nuoto in mare a Les Sables-d'Olonne con partenza dalla Grande Plage (dato riferito al 70.3, verifica il tracciato della full)",
          "Nel 2025 il nuoto è stato classificato tra i migliori delle gare IRONMAN nei sondaggi tra gli atleti",
          "Temperatura dell'acqua e uso della muta: non trovati nelle fonti, dipendono dal giorno e dal briefing",
          "Maree e onde possono cambiare il tracciato: arriva con tempo per il briefing",
        ],
      },
      bike: {
        bullets: [
          "Due giri per un totale di 180 km, descritti come mossi/ondulati (fonte Rouvy)",
          "Il 70.3 sullo stesso territorio è descritto come anello nella foresta di Olonne, saline e villaggi (circa 600 m D+ per 90 km, dato 70.3): per la full il dislivello non è stato trovato",
          "Nei sondaggi tra gli atleti la bici del 2025 è stata tra le prime cinque dell'IRONMAN Series per esperienza",
          "Vento atlantico e falsi piani: mantieni il ritmo, soprattutto nel secondo giro",
        ],
      },
      run: {
        bullets: [
          "Il 70.3 corre su due giri tra Remblai (lungomare) e laghetto di Tanchet, con un possibile passaggio sulla spiaggia; per la full i giri vanno verificati sulla mappa",
          "Percorso quasi piatto: gli organizzatori hanno presentato il 70.3 come tra i più pianeggianti di Francia",
          "Il tratto sulla sabbia, se presente, rallenta molto: allenalo",
          "La maratona non è stata tra le prime cinque per esperienza di corsa nei sondaggi 2025",
        ],
      },
    },
    profile: {
      maxm: 80,
      points: [
        [0, 5], [15, 25], [30, 45], [45, 30], [60, 15], [75, 40], [90, 10],
        [105, 35], [120, 50], [135, 30], [150, 40], [165, 20], [180, 5],
      ],
      labels: [],
    },
    splits: [
      { goal: "Finisher sereno", swim: "1:25", bike: "7:00", run: "5:10", total: "14:00" },
      { goal: "Sub 12", swim: "1:15", bike: "6:10", run: "4:10", total: "11:55" },
      { goal: "Sub 11", swim: "1:08", bike: "5:40", run: "3:45", total: "10:50" },
      { goal: "Sub 10", swim: "1:00", bike: "5:15", run: "3:20", total: "9:55" },
    ],
    demands: [
      { t: "Bici: due giri mossi con vento atlantico", b: "gestione dello sforzo" },
      { t: "Mare aperto e meteo oceanico, anche con onde", b: "adattamento" },
      { t: "Corsa quasi piatta, ma con possibile tratto in sabbia", b: "pacing" },
      { t: "Formato e data da confermare sul sito ufficiale", b: "preparazione" },
    ],
    tips: [
      { t: "Bici", p: "Allena il ritmo costante in pianura mossa e la posizione sul vento; il piano usa i tuoi percorsi più lunghi." },
      { t: "Pacing", p: "Primo giro a 70-72 % FTP: il secondo decide la maratona." },
      { t: "Mare", p: "Allena il nuoto in acque libere con onda, se possibile con muta." },
      { t: "Corsa", p: "Se sul percorso c'è sabbia, inserisci qualche seduta in spiaggia." },
      { t: "Nutrizione", p: "80-90 g/h di carboidrati in bici, sodio adeguato; prova tutto in allenamento." },
    ],
    logistics: [
      { t: "Arrivare", p: "Les Sables-d'Olonne è in Vandea, sulla costa atlantica: gli scali più comodi sono Nantes o La Rochelle con auto o treno (verifica collegamenti e orari)." },
      { t: "Dormire", p: "Non ho trovato hotel ufficiali confermati: controlla la pagina ufficiale IRONMAN e prenota con largo anticipo, la zona è turistica a fine giugno." },
      { t: "Famiglia", p: "Località balneare con lungomare e spiaggia: per chi aspetta ci sono molte alternative, e il percorso corsa è vicino al centro." },
    ],
    faq: [
      { q: "Serve la muta?", a: "Non ho trovato la temperatura dell'acqua: l'Atlantico a fine giugno è fresco, la decisione è al briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "La bici è su due giri; per la corsa i giri non sono confermati: verifica la mappa 2027." },
      { q: "La gara 2027 è confermata come full?", a: "Una scheda e un calendario la indicano il 27 giugno 2027 come full, ma altre fonti sono in disaccordo: conferma sul sito ufficiale." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 45, title: "Primo giro · prima parte", note: "Partenza dalla città verso foresta e saline (indicativo)", grade_pct: 0.5, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 2, km_from: 45, km_to: 90, title: "Primo giro · rientro", note: "Rientro verso la città, gambe ancora fresche", grade_pct: 0.5, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 3, km_from: 90, km_to: 135, title: "Secondo giro · prima parte", note: "Mantieni il ritmo, vento da gestire", grade_pct: 0.5, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 4, km_from: 135, km_to: 180, title: "Secondo giro · finale", note: "Ultimi km prima del cambio", grade_pct: 0.5, dplus_m: null, kind: "rolling" },
    { leg: "run", position: 1, km_from: 0, km_to: 42.2, title: "Maratona tra Remblai e Tanchet", note: "Quasi piatta, giri da verificare", grade_pct: 0, dplus_m: null, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 3.8, title: "Grande Plage", note: "Mare, partenza dalla spiaggia", grade_pct: null, dplus_m: null, kind: "loop" },
  ],
  reviews: [
    {
      edition_year: 2025,
      source: "synthesis",
      title: "Sintesi fonti 2025",
      scores: { swim: 4.5, bike: 4.2, run: 3.8, org: 4.5 },
      body: "La prima full del 2025 ha avuto buoni riscontri: negli sondaggi tra gli atleti IRONMAN, nuoto e bici sono finiti tra i migliori della serie e l'evento è stato citato per soddisfazione complessiva. La corsa non è invece rientrata tra le prime cinque. Il giudizio è provvisorio, perché esiste una sola edizione full e le fonti sono poche.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "blog", platform: "werun.world", url: "https://werun.world/?p=774", title: "IRONMAN Les Sables-d'Olonne — scheda 2027", lang: "fr", excerpt: "Distanza intera, 27 giugno 2027, 2ª edizione, alternanza con il 70.3.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "triathlonstore.fr", url: "https://triathlonstore.fr/en/blogs/infos/l-ironman-70-3-des-sables-d-olonne-2026-le-half-ironman-fait-son-grand-retour-en-vendee", title: "L'IRONMAN 70.3 des Sables d'Olonne 2026", lang: "en", excerpt: "Percorso del 70.3: Grande Plage, foresta di Olonne, Remblai.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "rouvy.com", url: "https://rouvy.com/en/ironman/les-sables-dolonne", title: "IRONMAN Les Sables d'Olonne Vendée — Rouvy", lang: "en", excerpt: "Bici full: 180 km su due giri, percorso mosso.", topics: ["course"], quality: 3 },
    { kind: "news", platform: "endurance.biz", url: "https://endurance.biz/?p=92264", title: "IRONMAN Global Athletes' Choice Awards 2025", lang: "en", excerpt: "Riconoscimenti per nuoto, bici e soddisfazione dell'evento.", topics: ["course"], quality: 3 },
  ],
  harvest: {
    hashtags: ["ironmanlessables", "ironmanlessablesdolonne", "ironmanvendee", "imlessables"],
    youtube: ["Ironman Les Sables d'Olonne race report", "Ironman Les Sables d'Olonne bike course", "Ironman Les Sables 2025"],
    google: ["Ironman Les Sables d'Olonne recensione gara", "Ironman Les Sables d'Olonne parcours vélo"],
    years: [2025],
  },
};
export default seed;
