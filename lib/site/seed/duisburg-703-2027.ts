import type { RaceSeed } from "./types";

// Fonti: vedi sources. Dislivello, giri e temperatura dell'acqua non verificati: verifica la mappa ufficiale.
const seed: RaceSeed = {
  slug: "duisburg-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Duisburg",
    region: "Nord Reno-Vestfalia (Germania)",
    course_version: "Dati da fonti terze (edizione 2026), indicativi: verifica la mappa ufficiale 2027",
    intro:
      "Lo IRONMAN 70.3 Duisburg (29 agosto 2027 secondo una fonte consultata, data in calendario · conferma sul sito ufficiale) si svolge nel Sportpark Duisburg, nel cuore della Ruhr: nuoto sul canale della regata, bici veloce e piatta su strade chiuse con attraversamento del Reno e mezza maratona in tre giri intorno al lago, con arrivo dentro lo stadio dell'MSV Duisburg. Zona cambio, partenza, arrivo e villaggio gara sono vicini tra loro, quindi la logistica è semplice. Per chi cerca un tempo veloce è una delle opzioni più adatte della Germania.",
    kpis: [
      { v: "1,9 km", l: "nuoto · un giro sul canale della regata" },
      { v: "90 km", l: "bici · due andata e ritorno, percorso piatto" },
      { v: "21,1 km", l: "corsa · tre giri nell'area dei sei laghi, arrivo in stadio" },
      { v: "da verificare", l: "temperatura dell'acqua non trovata nelle fonti" },
      { v: "~20 km", l: "dall'aeroporto di Düsseldorf (S-Bahn)" },
      { v: "29 ago 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Un giro di 1,9 km sul canale della regata di Sportpark Duisburg, con linea di boe facile da seguire",
          "Dagli spalti e dalla riva gli spettatori vedono bene il nuoto",
          "Temperatura dell'acqua non trovata nelle fonti: a fine agosto chiedi al briefing se la muta è consentita",
          "Acqua calma di canale: sfrutta le scie ma resta lucido in partenza",
        ],
      },
      bike: {
        bullets: [
          "Circa 90 km su strade chiuse, descritti come molto piatti e veloci; una fonte parla di due andata e ritorno",
          "Attraversamento del Reno sul ponte della Solidarietà (Brücke der Solidarität) e sfondo industriale della Ruhr",
          "Dislivello contenuto (indicativo): una fonte terza segna circa 110 m su 43 km di un tratto del percorso",
          "Percorso adatto alle appendici aero: tieni una posizione stabile per tutto il tempo",
          "Con pochi cambi di ritmo il vento può fare la differenza: informati su direzione e forza il giorno prima",
        ],
      },
      run: {
        bullets: [
          "21,1 km in tre giri sui sentieri intorno al lago dell'area dei sei laghi, tra boschi e acqua",
          "Arrivo all'interno dello stadio dell'MSV Duisburg (Schauinsland-Reisen-Arena)",
          "Percorso piatto con tratti ombreggiati: la corsa premia chi ha gestito bene la bici",
          "Se fa caldo, tieni acqua e sali ai ristori: sul piatto non c'è recupero",
        ],
      },
    },
    profile: {
      maxm: 80,
      points: [
        [0, 30],
        [15, 32],
        [30, 36],
        [45, 34],
        [60, 38],
        [75, 33],
        [90, 30],
      ],
      labels: [{ km: 45, m: 34, t: "Percorso quasi piatto (indicativo)" }],
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:48", bike: "3:20", run: "2:10", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:40", bike: "2:50", run: "1:50", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:36", bike: "2:35", run: "1:40", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:32", bike: "2:20", run: "1:30", total: "4:30" },
    ],
    demands: [
      { t: "Bici piatta e veloce: tenere la posizione aero e il ritmo costante", b: "efficienza" },
      { t: "Vento possibile sul piatto, senza ripari", b: "gestione" },
      { t: "Nuoto in canale: partenza affollata", b: "orientamento" },
      { t: "Corsa in tre giri: il ritmo deve restare costante", b: "pacing" },
    ],
    tips: [
      { t: "Bici", p: "Allena la posizione aero e i lunghi tratti a potenza costante: il piano usa uscite piatte a ritmo gara." },
      { t: "Pacing", p: "Non spendere tutto in bici perché sembra facile: la corsa è dove si decide il tempo." },
      { t: "Nuoto", p: "Allenati a partire in gruppo e a sfruttare le scie in acqua calma." },
      { t: "Caldo", p: "A fine agosto può fare caldo: prova la strategia di idratazione e sali in allenamento." },
      { t: "Nutrizione", p: "60-90 g/h di carboidrati in bici, da provare prima della gara." },
    ],
    logistics: [
      {
        t: "Arrivare",
        p: "L'aeroporto più vicino indicato dalle fonti è Düsseldorf, circa 20 km, con collegamenti S-Bahn fino al parco. Duisburg ha anche una stazione ferroviaria principale ben servita.",
      },
      {
        t: "Dormire",
        p: "Non ho verificato hotel ufficiali. Il sito della gara è nel Sportpark Duisburg: cerca alloggi tra Duisburg e Düsseldorf e controlla le raccomandazioni ufficiali.",
      },
      {
        t: "Famiglia",
        p: "Partenza, zona cambio, arrivo e villaggio gara sono entro circa 500 m e il punto migliore per gli spettatori è Sportpark Duisburg: è una gara molto facile da seguire a piedi.",
      },
    ],
    faq: [
      { q: "È una gara veloce?", a: "Sì: le fonti descrivono bici e corsa piatte, con arrivo in stadio. Il dislivello esatto va verificato." },
      { q: "Serve la muta?", a: "Non ho trovato la temperatura dell'acqua: conferma nel briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "Una fonte riporta due andata e ritorno in bici e tre giri a piedi: verifica la mappa ufficiale 2027." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 30, title: "Prima parte · verso il Reno", note: "Strade chiuse e piatte, sfondo industriale", grade_pct: 0, dplus_m: null, kind: "flat" },
    { leg: "bike", position: 2, km_from: 30, km_to: 60, title: "Ponte sul Reno", note: "Attraversamento del Reno sul ponte della Solidarietà; tratto più esposto al vento", grade_pct: null, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 3, km_from: 60, km_to: 90, title: "Rientro verso Sportpark", note: "Ultima parte e ingresso in zona cambio", grade_pct: 0, dplus_m: null, kind: "flat" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Tre giri nell'area dei sei laghi", note: "Sentieri intorno al lago, arrivo nello stadio", grade_pct: 0, dplus_m: null, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Canale della regata", note: "Un giro, linea di boe lineare", grade_pct: null, dplus_m: null, kind: "loop" },
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti 2026",
      body: "Dalle fonti consultate Duisburg emerge come 70.3 compatta e veloce: nuoto in canale, bici piatta su strade chiuse con il passaggio sul Reno, corsa in tre giri con arrivo in stadio. La logistica è semplice perché tutto è vicino, mentre il fascino industriale della Ruhr non è quello delle gare di montagna. Le fonti non riportano la temperatura dell'acqua né il dislivello preciso, quindi conviene verificare i dettagli sul sito ufficiale.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "blog", platform: "tri247.com", url: "https://www.tri247.com/race/lets-race-ironman-70-3-duisburg", title: "Let's Race IRONMAN 70.3 Duisburg", lang: "en", excerpt: "Nuoto in canale, bici piatta con ponte sul Reno, corsa in tre giri, arrivo in stadio.", topics: ["course", "logistics"], quality: 3 },
    { kind: "blog", platform: "k226.com", url: "https://www.k226.com/events/eventitem.aspx?id=1796", title: "70.3 Duisburg", lang: "en", excerpt: "Data 29 agosto 2027, Sportpark Duisburg e arrivo alla Schauinsland-Reisen-Arena.", topics: ["course", "logistics"], quality: 3 },
    { kind: "blog", platform: "rouvy.com", url: "https://rouvy.com/all-rouvy-routes/252060", title: "IRONMAN 70.3 Duisburg · percorso bici", lang: "en", excerpt: "Tratto del percorso: 43,5 km con circa 110 m di dislivello, pendenza media 0 %.", topics: ["course"], quality: 2 },
  ],
  harvest: {
    hashtags: ["ironman703duisburg", "im703duisburg", "duisburg", "ironmangermany", "sportparkduisburg"],
    youtube: ["Ironman 70.3 Duisburg race report", "Ironman 70.3 Duisburg bike course", "Ironman 70.3 Duisburg 2026", "Ironman 70.3 Duisburg 2025"],
    google: ["Ironman 70.3 Duisburg race report", "Ironman 70.3 Duisburg recensione gara"],
    years: [2024, 2025, 2026],
  },
};
export default seed;
