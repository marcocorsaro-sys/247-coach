import type { RaceSeed } from "./types";

// Fonti: vedi sources. Giri e dislivello indicativi: le schede consultate non concordano su tutto, verifica la mappa ufficiale 2027.
const seed: RaceSeed = {
  slug: "vitoria-703-2027",
  race: {
    official_name: "IRONMAN 70.3 Vitoria-Gasteiz",
    region: "Paesi Baschi (Álava, Spagna)",
    course_version: "Informazioni da schede di terzi per il 2027, giri e dislivello indicativi: verifica la mappa ufficiale",
    intro: "IRONMAN 70.3 Vitoria-Gasteiz si corre nei Paesi Baschi, con data in calendario domenica 11 luglio 2027 · conferma sul sito ufficiale. Il nuoto è nel bacino di Ullíbarri-Gamboa (parco di Landa), la bici attraversa l'Álava con un percorso descritto come ondulato, e la mezza si corre in centro città, con arrivo in piazza. Il lago è a circa 20 km dal centro, quindi serve pianificare il trasferimento del mattino. Il caldo di luglio e il vento sulle parti esposte sono le variabili principali.",
    kpis: [
      { v: "1,9 km", l: "nuoto · un giro nel bacino di Ullíbarri-Gamboa" },
      { v: "90 km", l: "bici · percorso ondulato, circa 500 m D+ (stima iniziale, da confermare)" },
      { v: "21,1 km", l: "corsa · giri urbani piatti, due giri secondo una scheda" },
      { v: "17-21 °C", l: "acqua · le schede non concordano, verifica la regola sulla muta" },
      { v: "15-33 °C", l: "aria · minima e massima indicate da una scheda" },
      { v: "11 lug 2027", l: "data in calendario · conferma sul sito ufficiale" }
    ],
    legs: {
      swim: {
        bullets: [
          "Un giro nel lago di Ullíbarri-Gamboa, nel parco provinciale di Landa, a circa 20 km dal centro",
          "Acqua dolce calma, senza maree, correnti né onde",
          "Temperatura riportata tra 17 e 21 °C a seconda della scheda: regola sulla muta non confermata per il 2027",
          "Tempo limite per il nuoto indicato da una scheda: 1 ora e 10 minuti dalla partenza (da verificare)"
        ]
      },
      bike: {
        bullets: [
          "Un giro da 90 km nell'Álava tra villaggi e campagna, con tratti del Cammino di Santiago",
          "Profilo ondulato più che di salita; una scheda cita circa 500 m D+ come stima iniziale, da confermare",
          "Parti esposte al vento: giornate ventose rendono la bici più dura",
          "Verifica sulla guida atleta ufficiale lunghezza dei tratti e punti ristoro"
        ]
      },
      run: {
        bullets: [
          "Percorso urbano piatto nel centro di Vitoria-Gasteiz (due giri secondo una scheda)",
          "Arrivo a Plaza España secondo una scheda; per la full altre fonti citano Plaza Nueva: verifica quella ufficiale",
          "Ombra limitata in alcune zone del centro: attenzione al caldo del pomeriggio",
          "Tempo limite complessivo indicato da una scheda: 8 ore e 30 minuti"
        ]
      }
    },
    profile: {
      maxm: 650,
      points: [[0, 540], [10, 570], [20, 600], [30, 640], [45, 600], [55, 570], [65, 610], [75, 580], [90, 540]],
      labels: [
        { km: 30, m: 640, t: "Tratto più alto (indicativo)" }
      ]
    },
    splits: [
      { goal: "Finisher sereno", swim: "0:50", bike: "3:15", run: "2:15", total: "6:30" },
      { goal: "Sub 5:30", swim: "0:40", bike: "2:50", run: "1:55", total: "5:30" },
      { goal: "Sub 5:00", swim: "0:35", bike: "2:35", run: "1:45", total: "5:00" },
      { goal: "Sub 4:30", swim: "0:30", bike: "2:20", run: "1:35", total: "4:30" }
    ],
    demands: [
      { t: "Bici: ondulata ed esposta al vento", b: "gestione dello sforzo" },
      { t: "Caldo di luglio: massime fino a circa 33 °C (indicazione di una scheda)", b: "idratazione" },
      { t: "Transizione e partenza al lago, a circa 20 km dal centro", b: "logistica" },
      { t: "Corsa urbana con poca ombra", b: "pacing" }
    ],
    tips: [
      { t: "Bici", p: "Allena i rilanci e la posizione aero con vento laterale; non spendere energie nei primi strappi." },
      { t: "Pacing", p: "Mezza: tieni la bici controllata per avere gambe nella corsa piatta pomeridiana." },
      { t: "Caldo", p: "Prova in allenamento la strategia con spugne, ghiaccio e sali minerali." },
      { t: "Logistica", p: "Organizza navetta o passaggio per il lago la mattina presto; verifica le navette ufficiali sulla guida atleta." },
      { t: "Nutrizione", p: "70-90 g/h di carboidrati in bici, sodio adeguato e prova tutto prima." }
    ],
    logistics: [
      { t: "Arrivare", p: "Aeroporto più vicino indicato da una scheda: Bilbao (BIO), a circa 60-70 km, poi bus o treno per Vitoria-Gasteiz in meno di un'ora; Madrid e Barcellona hanno più collegamenti." },
      { t: "Dormire", p: "In centro vicino a corsa e arrivo, oppure vicino a Landa per il nuoto. Non ho trovato un hotel ufficiale verificato per il 2027." },
      { t: "Famiglia", p: "Gli spettatori possono vedere nuoto e T1 a Landa e poi corsa e arrivo in centro; il lago richiede un viaggio a parte." }
    ],
    faq: [
      { q: "Serve la muta?", a: "Da verificare: le schede indicano 17-21 °C e le regole 2027 non sono ancora confermate." },
      { q: "Quanti giri sono bici e corsa?", a: "Bici su un giro da 90 km e corsa su due giri secondo una scheda: verifica la mappa 2027." },
      { q: "Quanto è dura la bici?", a: "Ondulata, circa 500 m D+ come stima iniziale: usa il dato ufficiale appena pubblicato." },
      { q: "La data è confermata?", a: "In calendario l'11 luglio 2027; una scheda indica partenza alle 7:00: conferma sul sito ufficiale." }
    ]
  },
  segments: [
    { leg: "swim", position: 1, km_from: 0, km_to: 1.9, title: "Ullíbarri-Gamboa", note: "Un giro nel bacino, parco di Landa", grade_pct: null, dplus_m: null, kind: "loop" },
    { leg: "bike", position: 1, km_from: 0, km_to: 30, title: "Prima parte", note: "Uscita dal lago, tratti ondulati nell'Álava", grade_pct: 0.5, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 2, km_from: 30, km_to: 60, title: "Parte centrale", note: "Campagna e villaggi, tratti esposti al vento", grade_pct: 0.5, dplus_m: null, kind: "rolling" },
    { leg: "bike", position: 3, km_from: 60, km_to: 90, title: "Rientro", note: "Ritorno verso la zona cambio", grade_pct: 0.3, dplus_m: null, kind: "rolling" },
    { leg: "run", position: 1, km_from: 0, km_to: 21.1, title: "Giri urbani", note: "Centro di Vitoria-Gasteiz, piatto, arrivo in piazza", grade_pct: 0, dplus_m: null, kind: "loop" }
  ],
  reviews: [
    {
      edition_year: 2027,
      source: "synthesis",
      title: "Sintesi fonti 2027",
      body: "Le schede consultate descrivono Vitoria-Gasteiz come una mezza scenografica e abbastanza veloce: nuoto calmo nel lago, bici ondulata nell'Álava, corsa piatta in città con arrivo in piazza. Non ho trovato recensioni di atleti verificabili per questa edizione: la sintesi si basa su descrizioni del percorso. Da preparare: caldo di luglio, vento sulla bici e logistica del trasferimento al lago.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali."
    }
  ],
  sources: [
    { kind: "blog", platform: "triathlon.mx", url: "https://triathlon.mx/pages/ironman-70-3-vitoria-gasteiz", title: "IRONMAN 70.3 Vitoria-Gasteiz — scheda 2027", lang: "en", excerpt: "Data 11 luglio 2027, nuoto a Landa, bici ondulata, corsa urbana con arrivo a Plaza España; logistica.", topics: ["course", "logistics"], quality: 3 },
    { kind: "blog", platform: "running.life", url: "https://running.life/es/carrera/ironman-703-vitoria-gasteiz", title: "Ironman 70.3 Vitoria-Gasteiz", lang: "es", excerpt: "Domenica 11 luglio 2027, bici rodadora, corsa urbana piatta, temperature indicative.", topics: ["course", "weather"], quality: 2 },
    { kind: "blog", platform: "tri247.com", url: "https://www.tri247.com/race/lets-race-ironman-vitoria-gasteiz", title: "Let's Race… IRONMAN Vitoria-Gasteiz", lang: "en", excerpt: "Scheda della full sullo stesso lago e città: transizione divisa, navette, voli e treni.", topics: ["logistics"], quality: 2 }
  ],
  harvest: {
    hashtags: ["ironman703vitoria", "ironman703vitoriagasteiz", "vitoria703", "ironman703", "vitoriagasteiz"],
    youtube: ["IRONMAN 70.3 Vitoria-Gasteiz", "Ironman 70.3 Vitoria-Gasteiz bike course", "Ironman 70.3 Vitoria race"],
    google: ["IRONMAN 70.3 Vitoria-Gasteiz race report", "Ironman 70.3 Vitoria-Gasteiz recensione gara"],
    years: [2025, 2026]
  }
};
export default seed;
