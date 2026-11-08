import type { RaceSeed } from "./types";

// Fonti: vedi sources. Giri, dislivelli e tratti indicativi: verifica la mappa ufficiale 2027.
const seed: RaceSeed = {
  slug: "wales-2027",
  race: {
    official_name: "IRONMAN Wales",
    region: "Pembrokeshire, Galles (Regno Unito)",
    course_version: "Edizioni recenti (2024-2026), dati indicativi: verifica la mappa ufficiale 2027",
    intro:
      "IRONMAN Wales si corre a Tenby, nel Pembrokeshire, sulla costa sud-occidentale del Galles. È una full distance con fama di essere tra le più dure d'Europa: nuoto in mare con onde e correnti, una bici corta di strada ma piena di strappi anche molto ripidi, e una maratona tra le strade lastricate della cittadina murata, con tantissimo pubblico. La data 2027 è in calendario (19 settembre secondo il nostro calendario) ma nelle fonti consultate non l'abbiamo trovata confermata: verifica sul sito ufficiale IRONMAN. L'edizione 2026 si è corsa il 13 settembre. Il meteo di metà settembre sul mare d'Irlanda è imprevedibile: vento, pioggia e freddo sono da mettere in conto.",
    kpis: [
      { v: "3,8 km", l: "nuoto · mare a North Beach, due giri con tratto a piedi sulla sabbia" },
      { v: "180 km", l: "bici · colline del Pembrokeshire, dislivello molto alto (indicativo)" },
      { v: "42,2 km", l: "corsa · circa 4 giri tra le vie di Tenby (verifica 2027)" },
      { v: "14-16 °C", l: "acqua a settembre · muta obbligatoria secondo una guida" },
      { v: "Meteo variabile", l: "vento, pioggia e freddo possibili: gara spesso dura" },
      { v: "19 set 2027", l: "data in calendario · conferma sul sito ufficiale" },
    ],
    legs: {
      swim: {
        bullets: [
          "Partenza da North Beach, a Tenby, in acqua salata nella baia sotto la città",
          "Due giri con uscita a piedi sulla sabbia tra un giro e l'altro",
          "Onde e correnti: una guida parla di mare mosso, con acqua intorno a 14-16 °C (indicativo)",
          "Muta obbligatoria secondo la stessa guida: verifica il regolamento e il briefing ufficiale",
          "All'uscita c'è la lunga corsa verso la zona cambio, con scalini ripidi in cima alla scogliera: è uno dei momenti più celebri della gara",
        ],
      },
      bike: {
        bullets: [
          "180 km nella campagna del Pembrokeshire, molto mossi; una guida cita oltre 2.500 m di dislivello positivo, altre fonti non danno il dato: considera il valore indicativo",
          "I profili dei segmenti mostrano le stesse salite ripetute a circa 90 km di distanza, quindi probabilmente due giri (da verificare sulla mappa ufficiale)",
          "Salite citate: Cross Hands (circa 4 km a pendenza media 5-7 %) e la rampa di Wisemans Bridge verso Saundersfoot, breve ma con punte attorno al 22 %",
          "Decine di strappi consecutivi e discese ripide che finiscono spesso in curva: servono freni affidabili",
          "Fondo generalmente buono ma scivoloso con la pioggia; qualche tratto rovinato segnalato da atleti",
          "Rapporti agili (compact o 11-34) e posizione sulle appendici solo nei tratti scorrevoli",
        ],
      },
      run: {
        bullets: [
          "Circa 4 giri nel centro di Tenby, tra vie lastricate e lungomare (numero giri da confermare per il 2027)",
          "Percorso mosso, con strappi e discese: una guida indica oltre 400 m di dislivello totale",
          "Pubblico molto numeroso, soprattutto in città e all'arrivo nella piazza centrale",
          "Ristori frequenti, ma in passato qualche atleta ha segnalato esaurimento di alcuni prodotti a fine corsa: porta con te il tuo piano nutrizionale",
        ],
      },
    },
    profile: {
      maxm: 200,
      points: [
        [0, 10], [10, 70], [20, 40], [30, 110], [40, 60], [50, 100], [60, 50],
        [70, 90], [78, 70], [85, 140], [95, 60], [105, 40], [108, 105], [120, 50],
        [130, 90], [144, 70], [150, 150], [160, 60], [171, 40], [174, 105], [180, 10],
      ],
      labels: [
        { km: 85, m: 140, t: "Cross Hands (indicativo)" },
        { km: 108, m: 105, t: "Wisemans Bridge (indicativo)" },
        { km: 150, m: 150, t: "Cross Hands · 2° giro" },
        { km: 174, m: 105, t: "Wisemans Bridge · 2° giro" },
      ],
    },
    splits: [
      { goal: "Finisher sereno", swim: "1:30", bike: "7:45", run: "5:30", total: "15:10" },
      { goal: "Sub 13", swim: "1:20", bike: "6:35", run: "4:40", total: "12:55" },
      { goal: "Sub 12", swim: "1:12", bike: "6:10", run: "4:05", total: "11:50" },
      { goal: "Sub 11", swim: "1:05", bike: "5:40", run: "3:40", total: "10:45" },
    ],
    demands: [
      { t: "Bici: dislivello alto e strappi ripidi ripetuti per tutto il giorno", b: "forza e gestione" },
      { t: "Mare mosso e acqua fredda: onde, correnti e uscita a piedi sulla sabbia", b: "orientamento" },
      { t: "Meteo atlantico: vento, pioggia e temperature basse", b: "adattamento" },
      { t: "Corsa mossa tra le vie di Tenby, con pubblico e gambe già cariche", b: "pacing" },
    ],
    tips: [
      { t: "Bici", p: "Allena strappi brevi e ripidi e salite di 4-5 km a ritmo costante. Il piano privilegia lavori di forza specifica e rapporti agili." },
      { t: "Pacing", p: "Sulla bici resta sotto la soglia nelle rampe: spingere a 300 W su uno strappo da 20 % si paga sulla maratona." },
      { t: "Mare", p: "Prova nuoto in acque mosse e uscite dall'acqua con corsa in salita per entrare in T1 con la testa lucida." },
      { t: "Meteo", p: "Prepara due scenari nella borsa di cambio: freddo e pioggia, oppure sole. Mantellina e guanti leggeri." },
      { t: "Nutrizione", p: "80-90 g/h di carboidrati in bici, sodio e piano B per i ristori. Prova tutto in allenamento." },
    ],
    logistics: [
      { t: "Arrivare", p: "Tenby è nel Pembrokeshire, lontana dai grandi aeroporti: le soluzioni usuali sono Cardiff o Bristol con auto a noleggio, oppure treno fino a Tenby. Verifica navette e parcheggi sul sito ufficiale: un atleta ha segnalato parcheggi complicati e navette piene." },
      { t: "Dormire", p: "Gli alloggi di Tenby, secondo una guida, si esauriscono con circa un anno di anticipo. Non abbiamo trovato hotel ufficiali nelle fonti: consulta il sito IRONMAN e prenota presto, anche nei paesi vicini." },
      { t: "Famiglia", p: "La città è raccolta e il percorso corsa passa più volte in centro, quindi la gara è facile da seguire a piedi. Le spiagge e il lungomare sono comodi per chi aspetta; porta abbigliamento antivento." },
    ],
    faq: [
      { q: "Serve la muta?", a: "Secondo una guida sì, con acqua tra 14 e 16 °C. Controlla il regolamento ufficiale e il briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "Probabilmente due giri in bici e circa quattro in corsa, ma i dati non sono confermati dalla fonte ufficiale: verifica la mappa 2027." },
      { q: "È adatta a un primo IRONMAN?", a: "È una gara molto dura per la combinazione di mare mosso, dislivello e meteo. Se è la tua prima full, è fattibile ma serve preparazione specifica." },
    ],
  },
  segments: [
    { leg: "bike", position: 1, km_from: 0, km_to: 45, title: "Uscita da Tenby e primi saliscendi", note: "Strade di campagna, rollers continui (dati indicativi)", grade_pct: 1.5, dplus_m: 550, kind: "rolling" },
    { leg: "bike", position: 2, km_from: 45, km_to: 90, title: "Cross Hands e rientro", note: "Salita lunga di circa 4 km seguita da strappi (indicativo)", grade_pct: 2.0, dplus_m: 600, kind: "climb" },
    { leg: "bike", position: 3, km_from: 90, km_to: 135, title: "Secondo giro · metà", note: "Wisemans Bridge e Saundersfoot, rampa breve e ripida (indicativo)", grade_pct: 1.5, dplus_m: 550, kind: "rolling" },
    { leg: "bike", position: 4, km_from: 135, km_to: 180, title: "Secondo giro · finale", note: "Le ultime salite e il rientro a Tenby (indicativo)", grade_pct: 2.0, dplus_m: 600, kind: "climb" },
    { leg: "run", position: 1, km_from: 0, km_to: 42.2, title: "Giri nel centro di Tenby", note: "Vie lastricate e lungomare, percorso mosso, tifo continuo", grade_pct: 0.5, dplus_m: 400, kind: "loop" },
    { leg: "swim", position: 1, km_from: 0, km_to: 3.8, title: "North Beach · due giri", note: "Mare con onde, uscita a piedi sulla sabbia tra i giri", grade_pct: null, dplus_m: null, kind: "loop" },
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti 2024-2026",
      scores: { swim: 4.0, bike: 3.8, run: 4.2, org: 4.2 },
      body: "IRONMAN Wales è raccontata come una delle full più impegnative: nuoto in mare mosso con uscita iconica, bici corta di strada ma con rampe ripide ripetute, e maratona tra le vie di Tenby con un pubblico che accompagna fino alla piazza. Le guide insistono su meteo imprevedibile, dislivello alto (valore indicativo) e sulla necessità di sapersi gestire quando il ritmo si spezza. Qualche atleta segnala disagi su parcheggi, navette e ristori a fine gara.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali.",
    },
  ],
  sources: [
    { kind: "blog", platform: "triathlon.mx", url: "https://triathlon.mx/blogs/triathlon-news/conquer-the-coastal-climbs-a-comprehensive-guide-to-ironman-wales-2024", title: "Conquer the coastal climbs: a comprehensive guide to IRONMAN Wales 2024", lang: "en", excerpt: "Nuoto in mare a North Beach, bici con salite ripide, corsa su più giri a Tenby, meteo e logistica.", topics: ["course", "logistics"], quality: 2 },
    { kind: "blog", platform: "pjammcycling.com", url: "https://pjammcycling.com/triathlon/156.IRONMAN-Wales-Bike-Course-and-Profile", title: "IRONMAN Wales bike course and profile", lang: "en", excerpt: "Profilo e salite del percorso bici: Cross Hands, Wisemans Bridge, strappi ripetuti.", topics: ["course"], quality: 3 },
    { kind: "news", platform: "visitwales.com", url: "https://www.visitwales.com/event/sporting-event/ironman-wales-2026-574361", title: "IRONMAN Wales 2026", lang: "en", excerpt: "Scheda evento 2026: Tenby, partenza da North Beach, 13 settembre 2026.", topics: ["logistics"], quality: 3 },
    { kind: "forum", platform: "forum.slowtwitch.com", url: "https://forum.slowtwitch.com/t/ironman-wales-2026-race-day-thread/1300473", title: "Ironman Wales 2026 - Race day thread", lang: "en", excerpt: "Nuoto in due giri in mare mosso e uscita con scalini verso la zona cambio.", topics: ["course"], quality: 2 },
  ],
  harvest: {
    hashtags: ["ironmanwales", "ironmantenby", "ironmanwales2026", "tenby", "imwales"],
    youtube: ["Ironman Wales Tenby race report", "Ironman Wales bike course", "Ironman Wales 2026", "Ironman Wales 2025"],
    google: ["Ironman Wales Tenby race report", "Ironman Wales recensione gara"],
    years: [2023, 2024, 2025, 2026],
  },
};
export default seed;
