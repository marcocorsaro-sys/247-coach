import type { RaceSeed } from "./types";

// Fonti: vedi sources. Tratti e dislivelli per giro indicativi: verifica la mappa ufficiale 2027.
const seed: RaceSeed = {
  slug: "vitoria-2027",
  race: {
    official_name: "IRONMAN Vitoria-Gasteiz",
    region: "Paesi Baschi (Álava, Spagna)",
    course_version: "Edizioni recenti (2025-2026), dati da schede di terzi: verifica la mappa ufficiale 2027",
    intro: "IRONMAN Vitoria-Gasteiz si corre nei Paesi Baschi, con data in calendario 11 luglio 2027 · conferma sul sito ufficiale (una scheda riporta solo \"metà luglio\"; l'ultima edizione indicata è del 12 luglio 2026). Il nuoto è in un giro nel bacino di Ullíbarri-Gamboa (Landa Park), la bici fa tre giri da circa 60 km nell'Álava, con salite ripetute, e la maratona è su quattro giri tra il centro storico e il verde della città. La transizione è divisa: il lago è a circa 20 km dal centro, con navette la mattina. Caldo estivo e salite a ripetizione rendono la bici il punto chiave.",
    kpis: [
      { v: "3,8 km", l: "nuoto · un giro nel bacino di Ullíbarri-Gamboa" },
      { v: "180 km", l: "bici · 3 giri da ~60 km, circa 1.170 m D+ (da una scheda)" },
      { v: "42,2 km", l: "corsa · 4 giri da ~10,5 km, circa 60 m D+" },
      { v: "20+ °C", l: "acqua in estate · una scheda dice \"sopra i 20\", muta da verificare" },
      { v: "caldo", l: "luglio: picchi sopra i 30 °C possibili (dato indicativo)" },
      { v: "11 lug 2027", l: "data in calendario · conferma sul sito ufficiale" }
    ],
    legs: {
      swim: {
        bullets: [
          "Un giro nel lago di Ullíbarri-Gamboa, nel parco di Landa, a circa 20 km dal centro",
          "Acqua dolce senza onde né correnti; una scheda segnala temperature sopra i 20 °C e di prepararsi anche a un nuoto senza muta",
          "Due svolte a sinistra sulla via del ritorno verso T1",
          "Regola sulla muta da verificare al briefing 2027"
        ]
      },
      bike: {
        bullets: [
          "Tre giri da circa 60 km (1.166 m D+ totali secondo una scheda) tra villaggi e campagna dell'Álava",
          "Salite sostenute a ripetizione e lunghe discese: una scheda parla di una salita impegnativa ogni 50 km circa",
          "Il percorso tocca tratti del Cammino di Santiago",
          "Punto per gli spettatori citato: Ilárraza, dove gli atleti passano due volte",
          "Consigliata bici con buona resa in salita e ruote non troppo alte"
        ]
      },
      run: {
        bullets: [
          "Quattro giri da circa 10,5 km (59 m D+ totali secondo una scheda) tra città vecchia e parchi",
          "Percorso piatto e veloce ma con curve secche e tratti avanti-indietro",
          "Passaggi sul selciato del centro storico: scarpe stabili più che supershoe",
          "Arrivo in piazza: le fonti indicano Plaza España e Plaza Nueva, verifica quella ufficiale"
        ]
      }
    },
    profile: {
      maxm: 700,
      points: [[0, 540], [20, 600], [35, 660], [50, 620], [60, 540], [80, 600], [95, 660], [110, 620], [120, 540], [140, 600], [155, 660], [170, 620], [180, 540]],
      labels: [
        { km: 35, m: 660, t: "Salita del 1° giro (indicativo)" },
        { km: 95, m: 660, t: "2° giro" },
        { km: 155, m: 660, t: "3° giro" }
      ]
    },
    splits: [
      { goal: "Finisher sereno", swim: "1:25", bike: "7:00", run: "5:10", total: "14:00" },
      { goal: "Sub 12", swim: "1:15", bike: "6:10", run: "4:10", total: "11:55" },
      { goal: "Sub 11", swim: "1:08", bike: "5:40", run: "3:45", total: "10:50" },
      { goal: "Sub 10", swim: "1:00", bike: "5:15", run: "3:20", total: "9:55" }
    ],
    demands: [
      { t: "Bici: tre giri con salite ripetute", b: "gestione dello sforzo" },
      { t: "Caldo di luglio sulla maratona a quattro giri", b: "idratazione e adattamento" },
      { t: "Transizione divisa con trasferimento di circa 20 km", b: "organizzazione logistica" },
      { t: "Corsa tecnica: curve, selciato e avanti-indietro", b: "ritmo e scarpe adatte" }
    ],
    tips: [
      { t: "Bici", p: "Allena le salite ripetute a ritmo costante: il terzo giro decide la maratona." },
      { t: "Pacing", p: "Primo giro controllato, senza spendere nelle salite iniziali." },
      { t: "Caldo", p: "Prova la strategia di idratazione e raffreddamento (spugne, ghiaccio) in allenamento." },
      { t: "Logistica", p: "Pianifica sacche, navette del mattino e rientro dopo il traguardo: T1 e arrivo sono distanti." },
      { t: "Nutrizione", p: "80-90 g/h di carboidrati in bici, sodio adeguato e prova tutto prima della gara." }
    ],
    logistics: [
      { t: "Arrivare", p: "Aeroporto di Vitoria-Gasteiz oppure Bilbao (circa 45 minuti di trasferimento secondo una scheda); c'è anche il treno da Madrid." },
      { t: "Dormire", p: "Il centro di Vitoria si riempie: prenota con anticipo o valuta le località vicine. Non ho trovato un hotel ufficiale verificato per il 2027." },
      { t: "Famiglia", p: "Il lago è a circa 20 km dal centro; navette la mattina presto per atleti e accompagnatori, sconsigliato guidare nel giorno gara. Corsa e arrivo si seguono bene in città." }
    ],
    faq: [
      { q: "Serve la muta?", a: "Da verificare: una scheda indica acqua sopra i 20 °C e un possibile nuoto senza muta. Controlla il briefing." },
      { q: "Quanti giri sono bici e corsa?", a: "Tre giri in bici e quattro in corsa secondo le schede recenti: verifica la mappa 2027." },
      { q: "Come si raggiunge il lago?", a: "Con navette dal centro la mattina presto (prima delle 7 secondo l'edizione 2025); nessun parcheggio vicino." },
      { q: "È adatta a un primo IRONMAN?", a: "Possibile, ma la bici con salite ripetute e il caldo vanno preparati." }
    ]
  },
  segments: [
    { leg: "swim", position: 1, km_from: 0, km_to: 3.8, title: "Ullíbarri-Gamboa", note: "Un giro nel bacino, parco di Landa", grade_pct: null, dplus_m: null, kind: "loop" },
    { leg: "bike", position: 1, km_from: 0, km_to: 60, title: "Primo giro", note: "Circa 390 m D+ per giro (media indicativa dai 1.166 m totali)", grade_pct: 0.6, dplus_m: 390, kind: "climb" },
    { leg: "bike", position: 2, km_from: 60, km_to: 120, title: "Secondo giro", note: "Stesso circuito, gambe già cariche", grade_pct: 0.6, dplus_m: 390, kind: "climb" },
    { leg: "bike", position: 3, km_from: 120, km_to: 180, title: "Terzo giro", note: "Ultimo giro e rientro verso la città", grade_pct: 0.6, dplus_m: 390, kind: "climb" },
    { leg: "run", position: 1, km_from: 0, km_to: 42.2, title: "Quattro giri in città", note: "Circa 60 m D+ totali, centro storico e parchi", grade_pct: 0, dplus_m: 59, kind: "loop" }
  ],
  reviews: [
    {
      edition_year: 2026,
      source: "synthesis",
      title: "Sintesi fonti 2025-2026",
      body: "Vitoria-Gasteiz è descritta come una full impegnativa ma ben organizzata: nuoto calmo nel bacino, bici a tre giri con salite ripetute tra villaggi e campagna, maratona piatta ma tecnica nel centro storico. Gli elementi ricorrenti da preparare sono il caldo estivo, la logistica della transizione divisa e la gestione dello sforzo in bici. Non ho trovato recensioni di atleti verificabili: la sintesi si basa su descrizioni del percorso.",
      sources_note: "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali."
    }
  ],
  sources: [
    { kind: "blog", platform: "finishers.com", url: "https://www.finishers.com/fr/course/ironman-de-vitoria-gasteiz", title: "Ironman de Vitoria-Gasteiz 2027", lang: "fr", excerpt: "Bici 3 giri da 60 km con 1.166 m D+, corsa 4 giri con 59 m D+, edizione 2027 a metà luglio.", topics: ["course"], quality: 3 },
    { kind: "blog", platform: "tri247.com", url: "https://www.tri247.com/race/lets-race-ironman-vitoria-gasteiz", title: "Let's Race… IRONMAN Vitoria-Gasteiz", lang: "en", excerpt: "Nuoto nel lago, bici hilly su tre giri, corsa su quattro giri; transizione divisa e navette.", topics: ["course", "logistics"], quality: 3 },
    { kind: "blog", platform: "hoteles-silken.com", url: "https://www.hoteles-silken.com/en/blog/ironman-vitoria-gasteiz/", title: "IRONMAN Vitoria-Gasteiz — guida di un hotel locale", lang: "en", excerpt: "Percorso, navette per Landa Park, iscrizione e consigli logistici (edizione 2025).", topics: ["logistics"], quality: 2 }
  ],
  harvest: {
    hashtags: ["ironmanvitoria", "ironmanvitoriagasteiz", "ironmanvitoria2026", "vitoriagasteiz", "imvitoria"],
    youtube: ["Ironman Vitoria-Gasteiz race report", "Ironman Vitoria-Gasteiz bike course", "Ironman Vitoria 2026"],
    google: ["Ironman Vitoria-Gasteiz race report", "Ironman Vitoria-Gasteiz recensione gara"],
    years: [2023, 2024, 2025, 2026]
  }
};
export default seed;
