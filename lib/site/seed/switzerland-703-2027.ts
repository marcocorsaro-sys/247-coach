import type { RaceSeed } from "./types";

// Fonti: vedi sources. Tratti e dislivelli indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "switzerland-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Switzerland Rapperswil-Jona",
    region: "San Gallo (Svizzera)",
    course_version: "Edizioni recenti, tratti indicativi: verifica la mappa ufficiale 2027",
    intro: "IRONMAN 70.3 Switzerland si corre a Rapperswil-Jona, sull'Obersee (parte alta del Lago di Zurigo), con la data del 6 giugno 2027 indicata dalle schede turistiche (conferma sul sito ufficiale). È la 20ª edizione e i migliori si qualificano per il Mondiale 70.3. Nuoto nel lago, due giri in bici da 45 km tra lago e colline verdi (la fonte più dettagliata indica circa 1.100 m D+, con la salita nota come «Witches' Hill») e due giri di corsa da 10,5 km nella città vecchia, fino alla scalinata verso il castello detta «Stairway to Heaven». Pubblico numeroso e organizzazione svizzera: una mezza esigente in bici.",
    kpis: [
      { v: "1,9 km", l: "nuoto · Obersee, partenza dal Lido" },
      { v: "90 km", l: "bici · due giri da 45 km, circa 1.100 m D+ (indicativo)" },
      { v: "21,1 km", l: "corsa · due giri da 10,5 km nella città vecchia" },
      { v: "Fresca", l: "acqua a inizio giugno · dato non trovato, muta probabile" },
      { v: "Variabile", l: "meteo · inizio giugno, verifica le previsioni" },
      { v: "6 giu 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Nuoto nell'Obersee, acqua descritta come limpida, con partenza dall'area del Lido",
          "Temperatura dell'acqua non trovata nelle fonti: a inizio giugno è prevedibilmente fresca, la muta dipende dal regolamento del giorno",
          "Controlla la mappa ufficiale per boe e uscita: i dettagli non sono nelle schede consultate",
        ],
      },
      bike: {
        bullets: [
          "Due giri da circa 45 km lungo il lago e nelle colline verdi dell'entroterra",
          "Una scheda indica circa 1.100 m di dislivello positivo e una salita ripida chiamata «Witches' Hill» (dato indicativo)",
          "Il secondo giro è quello che pesa: parti sotto soglia e conserva gambe per i rilanci",
          "Discese tecniche: attenzione in caso di pioggia, frequente in Svizzera a inizio giugno",
        ],
      },
      run: {
        bullets: [
          "Due giri da circa 10,5 km nel centro storico di Rapperswil, accanto al mercato del pesce e con la scalinata verso il castello",
          "Il dislivello varia nelle fonti (da circa 60 a 150 m): tratto breve ma ripido sui gradini, il resto è veloce",
          "Pubblico numeroso nei punti caldi con musica; arrivo al Lidoplatz",
          "Il tratto in città è in parte su pavé o gradini: scarpe con buon grip",
        ],
      },
    },
    profile: {
      maxm: 650,
      points: [
        [0, 410], [10, 480], [20, 580], [30, 520], [40, 450], [45, 410],
        [55, 480], [65, 580], [75, 520], [85, 450], [90, 410],
      ],
      labels: [
        { km: 20, m: 580, t: "Witches' Hill (indicativo)" },
        { km: 65, m: 580, t: "Witches' Hill · 2° giro" },
      ],
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:45", bike: "3:20", run: "2:15", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:38", bike: "2:55", run: "1:52", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:34", bike: "2:40", run: "1:40", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:31", bike: "2:28", run: "1:27", total: "4:30" },
    ],
    demands: [
      { t: "Bici: due giri mossi con circa 1.100 m D+ (indicativo)", b: "gestione dello sforzo" },
      { t: "Meteo variabile: acqua fresca, possibile pioggia", b: "adattamento" },
      { t: "Corsa: scalinata e centro storico, due giri", b: "pacing" },
      { t: "Nuoto con partenza affollata in lago", b: "orientamento" },
    ],
    tips: [
      { t: "Bici", p: "Allena salite ripide brevi e rilanci: il piano usa i tuoi percorsi più mossi al posto della seduta generica." },
      { t: "Pacing", p: "Primo giro a 72-75 % FTP: la corsa si decide nel secondo giro in bici." },
      { t: "Meteo", p: "Porta mantellina leggera e prova la discesa su asfalto bagnato." },
      { t: "Corsa", p: "Inserisci qualche ripetuta in salita ripida e gradini nelle ultime settimane." },
      { t: "Nutrizione", p: "60-80 g/h di carboidrati in bici, sodio adeguato; prova tutto in allenamento." },
    ],
    logistics: [
      { t: "Arrivare", p: "Rapperswil è sul lago di Zurigo e ha stazione ferroviaria; l'aeroporto di Zurigo è la porta d'ingresso più comoda. Verifica orari e collegamenti per la settimana gara." },
      { t: "Dormire", p: "Non ho trovato hotel ufficiali confermati: controlla la pagina ufficiale IRONMAN e prenota con anticipo, anche nei comuni vicini." },
      { t: "Famiglia", p: "Il percorso corsa passa più volte nella città vecchia, con zona festa e ristorante nell'area evento: facile da seguire a piedi." },
    ],
    faq: [
      { q: "Serve la muta?", a: "Non ho trovato la temperatura dell'acqua: di norma a inizio giugno è fresca, la decisione è al briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "Due giri in bici da 45 km e due in corsa da 10,5 km, secondo le fonti consultate." },
      { q: "È adatta a una prima mezza?", a: "Meglio con una base in bici: il dislivello è importante e il meteo può essere impegnativo." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 45, title: "Primo giro", note: "Lago, colline verdi e salita ripida (Witches' Hill)", grade_pct: 1.2, dplus_m: 550, kind: "climb" },
    { leg: "bike", position: 2, km_from: 45, km_to: 90, title: "Secondo giro", note: "Stesso anello, gambe già cariche", grade_pct: 1.2, dplus_m: 550, kind: "climb" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Due giri nella città vecchia", note: "Fischmarktplatz e scalinata verso il castello", grade_pct: 0.5, dplus_m: 100, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Obersee", note: "Lago, partenza dall'area del Lido", grade_pct: null, dplus_m: null, kind: "loop" },
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti 2026",
      scores: { swim: 4.2, bike: 4.0, run: 4.2, org: 4.5 },
      body: "Le fonti descrivono Rapperswil come una mezza organizzata e molto sentita, con città vecchia, scalinata verso il castello e pubblico nei punti caldi. La bici è la parte che richiede più rispetto, per il dislivello e la salita ripida. Il giudizio è una sintesi di schede e guide, non di recensioni dirette.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "blog", platform: "finishers.com", url: "https://www.finishers.com/en/event/ironman-70-3-switzerland", title: "Ironman 70.3 Switzerland 2027", lang: "en", excerpt: "Distanze, giri e dislivello della bici.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "zuerich.com", url: "https://www.zuerich.com/en/ironman-rapperswil-703", title: "IRONMAN Rapperswil 70.3", lang: "en", excerpt: "Data 6 giugno 2027 e descrizione del percorso.", topics: ["course", "logistics"], quality: 3 },
    { kind: "blog", platform: "myswitzerland.com", url: "https://www.myswitzerland.com/en-ch/experiences/events/ironman-703-switzerland-rapperswiljona/", title: "IRONMAN 70.3 Switzerland Rapperswil-Jona", lang: "en", excerpt: "20ª edizione, percorso e pubblico.", topics: ["course", "spectators"], quality: 3 },
  ],
  harvest: {
    hashtags: ["ironman703switzerland", "ironmanrapperswil", "703rapperswil", "ironmanswitzerland"],
    youtube: ["Ironman 70.3 Switzerland Rapperswil race report", "Ironman 70.3 Rapperswil bike course", "Ironman 70.3 Switzerland 2026"],
    google: ["Ironman 70.3 Rapperswil recensione gara", "Ironman 70.3 Switzerland bike course"],
    years: [2023, 2024, 2025, 2026],
  },
};
export default seed;
