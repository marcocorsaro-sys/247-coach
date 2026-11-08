import type { RaceSeed } from "./types";

// Fonti: vedi sources. Tratti e dislivelli indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  "slug": "hamburg-2027",
  "race": {
    "official_name": "IRONMAN Hamburg European Championship",
    "region": "Amburgo",
    "course_version": "Edizioni 2023-2026, tratti indicativi: verifica la mappa ufficiale 2027",
    "intro": "Amburgo (6 giugno 2027) è il campionato europeo che punta sulla velocità: nuoto nelle acque della città, due giri in bici su un percorso urbano piatto e veloce, maratona in quattro giri lungo l'acqua con arrivo nel cuore di Amburgo. Le iscrizioni 2027 sono esaurite, a conferma dell'appeal della gara. Il clima di inizio giugno è fresco: più pioggia e vento che caldo.",
    "kpis": [
      {
        "v": "3,8 km",
        "l": "nuoto · acque della città, partenza alle 7:00"
      },
      {
        "v": "180,2 km",
        "l": "bici · due giri, piatta e veloce"
      },
      {
        "v": "42,2 km",
        "l": "corsa · 4 giri lungo l'acqua"
      },
      {
        "v": "16-20 °C",
        "l": "acqua a inizio giugno · muta quasi sempre ammessa"
      },
      {
        "v": "12-22 °C",
        "l": "aria · fresco, vento e pioggia possibili"
      },
      {
        "v": "6 giu 2027",
        "l": "data in calendario · iscrizioni 2027 esaurite"
      }
    ],
    "legs": {
      "swim": {
        "bullets": [
          "Nuoto nelle acque in pieno centro, in uno scenario urbano spettacolare con pubblico sulle rive",
          "Acqua fresca a giugno: la muta è quasi sempre ammessa",
          "Partenza alle 7:00, partenze scaglionate",
          "Visibilità limitata ma percorso ben marcato"
        ]
      },
      "bike": {
        "bullets": [
          "Due giri su un percorso urbano e suburbano, tra i più piatti e veloci del circuito IRONMAN",
          "Pochi metri di dislivello (circa 300 m in totale secondo alcune fonti): conta la posizione aerodinamica e il vento",
          "Fondo ottimo ma tratti con curve e rotatorie: attenzione alle giunzioni",
          "Il vento può rallentare i tratti di ritorno",
          "Regole di drafting molto severe: tantissimi atleti e arbitri in moto"
        ]
      },
      "run": {
        "bullets": [
          "Quattro giri lungo l'acqua, tra ponti, banchine e viali",
          "Percorso piatto e veloce con molto pubblico",
          "L'arrivo è nel cuore della città, tra le tribune",
          "Ristori frequenti, clima fresco"
        ]
      }
    },
    "profile": {
      "maxm": 80,
      "points": [
        [
          0,
          10
        ],
        [
          30,
          14
        ],
        [
          60,
          18
        ],
        [
          90,
          12
        ],
        [
          120,
          16
        ],
        [
          150,
          15
        ],
        [
          180,
          10
        ]
      ],
      "labels": []
    },
    "splits": [
      {
        "goal": "Finisher sereno",
        "swim": "1:18",
        "bike": "6:50",
        "run": "5:00",
        "total": "13:25"
      },
      {
        "goal": "Sub 12",
        "swim": "1:08",
        "bike": "5:50",
        "run": "4:10",
        "total": "11:25"
      },
      {
        "goal": "Sub 11",
        "swim": "1:03",
        "bike": "5:20",
        "run": "3:45",
        "total": "10:20"
      },
      {
        "goal": "Sub 10",
        "swim": "0:57",
        "bike": "4:55",
        "run": "3:15",
        "total": "9:20"
      }
    ],
    "demands": [
      {
        "t": "Bici piatta e veloce: aerodinamica e controllo del vento",
        "b": "potenza costante"
      },
      {
        "t": "Regole di drafting severe",
        "b": "regolamento"
      },
      {
        "t": "Acqua fresca di giugno",
        "b": "adattamento al freddo"
      },
      {
        "t": "Meteo variabile: pioggia, vento, fresco",
        "b": "abbigliamento"
      }
    ],
    "tips": [
      {
        "t": "Aero",
        "p": "Posizione aerodinamica sostenibile per 5 ore: testala in allenamento."
      },
      {
        "t": "Drafting",
        "p": "Distanze rigide: non stare in scia, usa i ristori per ritrovare spazio."
      },
      {
        "t": "Meteo",
        "p": "Pioggia e fresco: abbigliamento e scarpe da bagnato in borsa."
      },
      {
        "t": "Nuoto",
        "p": "Muta di buona qualità e nuotate in acque a 16-18 °C."
      },
      {
        "t": "Nutrizione",
        "p": "80-90 g/h di carboidrati; clima fresco richiede meno acqua ma più sodio."
      }
    ],
    "logistics": [
      {
        "t": "Arrivare",
        "p": "Aeroporto di Amburgo (HAM) con metropolitana S1 diretta per il centro in circa 25 minuti. Anche treno ad alta velocità da Berlino e Hannover."
      },
      {
        "t": "Dormire",
        "p": "Centro (Altstadt, Binnenalster) per partenza e arrivo a piedi; il periodo è affollato, prenota presto. Iscrizioni e alloggi legati agli atleti sono pubblicati su ironman.com per le date 5-7 giugno 2027."
      },
      {
        "t": "Famiglia",
        "p": "Banchine e ponti permettono di vedere atleti più volte, soprattutto nei quattro giri della corsa. Per la bici, i tratti urbani offrono molti punti di tifo."
      }
    ],
    "faq": [
      {
        "q": "Serve la muta?",
        "a": "Quasi sempre sì: l'acqua a inizio giugno è fredda."
      },
      {
        "q": "È davvero piatta?",
        "a": "Sì: è tra le full più piatte del circuito."
      },
      {
        "q": "Posso ancora iscrivermi?",
        "a": "Le iscrizioni 2027 risultano esaurite: controlla eventuali slot e liste d'attesa sul sito ufficiale."
      }
    ]
  },
  "segments": [
    {
      "leg": "bike",
      "position": 1,
      "km_from": 0,
      "km_to": 45,
      "title": "Primo giro · città",
      "note": "Veloce, curve e rotatorie",
      "grade_pct": 0.0,
      "dplus_m": 60,
      "kind": "flat"
    },
    {
      "leg": "bike",
      "position": 2,
      "km_from": 45,
      "km_to": 90,
      "title": "Primo giro · periferia",
      "note": "Rettilinei e vento",
      "grade_pct": 0.0,
      "dplus_m": 50,
      "kind": "flat"
    },
    {
      "leg": "bike",
      "position": 3,
      "km_from": 90,
      "km_to": 135,
      "title": "Secondo giro · città",
      "note": "Stesso circuito, gambe cariche",
      "grade_pct": 0.0,
      "dplus_m": 60,
      "kind": "flat"
    },
    {
      "leg": "bike",
      "position": 4,
      "km_from": 135,
      "km_to": 180,
      "title": "Secondo giro · rientro",
      "note": "Rettilinei veloci verso la zona cambio",
      "grade_pct": 0.0,
      "dplus_m": 50,
      "kind": "flat"
    },
    {
      "leg": "run",
      "position": 1,
      "km_from": 0,
      "km_to": 42.2,
      "title": "Quattro giri lungo l'acqua",
      "note": "Piatto, fresco, molto tifo",
      "grade_pct": 0,
      "dplus_m": 50,
      "kind": "loop"
    },
    {
      "leg": "swim",
      "position": 1,
      "km_from": 0,
      "km_to": 3.8,
      "title": "Acque del centro",
      "note": "Acqua fresca, rive piene di pubblico",
      "grade_pct": null,
      "dplus_m": null,
      "kind": "loop"
    }
  ],
  "reviews": [
    {
      "edition_year": 2026,
      "source": "synthesis",
      "title": "Sintesi fonti 2023-2026",
      "scores": {
        "swim": 4.2,
        "bike": 3.9,
        "run": 4.1,
        "org": 4.6
      },
      "body": "Amburgo è la full dei tempi veloci: piatta, urbana e perfetta per chi cerca un personale. Gli atleti raccontano un'organizzazione impeccabile, un tifo continuo sulle rive e un clima fresco che aiuta nella corsa; la difficoltà è nel tenere la potenza costante su un percorso piatto e nel rispettare le regole di drafting con tanta gente. Le iscrizioni 2027 sono esaurite.",
      "sources_note": "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali."
    }
  ],
  "sources": [
    {
      "kind": "blog",
      "platform": "rouvy.com",
      "url": "https://rouvy.com/en/ironman/hamburg",
      "title": "IRONMAN Hamburg su ROUVY",
      "lang": "en",
      "excerpt": "Percorso ufficiale da pedalare su ROUVY.",
      "topics": [
        "training"
      ],
      "quality": 3
    },
    {
      "kind": "blog",
      "platform": "werun.world",
      "url": "https://werun.world/?p=1367",
      "title": "IRONMAN Hamburg 2027",
      "lang": "fr",
      "excerpt": "Scheda gara: data, distanze e giri.",
      "topics": [
        "course"
      ],
      "quality": 3
    },
    {
      "kind": "results",
      "platform": "runnersworld.de",
      "url": "https://www.runnersworld.de/laufkalender/ironman-hamburg/",
      "title": "Ironman Hamburg",
      "lang": "de",
      "excerpt": "Calendario e informazioni.",
      "topics": [
        "course"
      ],
      "quality": 3
    },
    {
      "kind": "results",
      "platform": "running.life",
      "url": "https://running.life/de/termine/ironman-hamburg",
      "title": "Ironman Hamburg",
      "lang": "de",
      "excerpt": "Scheda evento.",
      "topics": [
        "course"
      ],
      "quality": 3
    }
  ],
  "media": [
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=EeeglqX56kw",
      "embed_id": "EeeglqX56kw",
      "author": "IRONMAN Triathlon",
      "caption": "2026 IRONMAN Hamburg European Championship | Race Rewind",
      "thumbnail_url": "https://i.ytimg.com/vi/EeeglqX56kw/hqdefault.jpg",
      "edition_year": 2026,
      "featured": true
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=2tSDeiYEoII",
      "embed_id": "2tSDeiYEoII",
      "author": "IRONMAN Triathlon",
      "caption": "Qatar Airways IRONMAN Hamburg, European Championship | 2025 Race Rewind",
      "thumbnail_url": "https://i.ytimg.com/vi/2tSDeiYEoII/hqdefault.jpg",
      "edition_year": 2025,
      "featured": true
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=fQ00GNEKg8U",
      "embed_id": "fQ00GNEKg8U",
      "author": "IRONMAN Triathlon",
      "caption": "2024 IRONMAN Hamburg European Championship | Race Rewind",
      "thumbnail_url": "https://i.ytimg.com/vi/fQ00GNEKg8U/hqdefault.jpg",
      "edition_year": 2024,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=847v8KxxjT4",
      "embed_id": "847v8KxxjT4",
      "author": "IRONMANEurope",
      "caption": "Supersapiens IRONMAN Hamburg 2021 Race Movie",
      "thumbnail_url": "https://i.ytimg.com/vi/847v8KxxjT4/hqdefault.jpg",
      "edition_year": 2021,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=XnsMvG1xUmI",
      "embed_id": "XnsMvG1xUmI",
      "author": "IRONMAN Triathlon",
      "caption": "Pro Race Replay | 2026 IRONMAN Hamburg",
      "thumbnail_url": "https://i.ytimg.com/vi/XnsMvG1xUmI/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=_kAflDk8eKM",
      "embed_id": "_kAflDk8eKM",
      "author": "IRONMAN Triathlon",
      "caption": "Athletic Brewing Post-Race Report | 2026 IRONMAN Hamburg",
      "thumbnail_url": "https://i.ytimg.com/vi/_kAflDk8eKM/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=PNAcKStXwjY",
      "embed_id": "PNAcKStXwjY",
      "author": "THE DAILY TRI",
      "caption": "2024 IRONMAN Hamburg | Full Highlights with Commentary",
      "thumbnail_url": "https://i.ytimg.com/vi/PNAcKStXwjY/hqdefault.jpg",
      "edition_year": 2024,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=sO5S659udjo",
      "embed_id": "sO5S659udjo",
      "author": "IRONMAN Triathlon",
      "caption": "Qatar Airways IRONMAN Hamburg | A Fighting Chance Presented by HOKA",
      "thumbnail_url": "https://i.ytimg.com/vi/sO5S659udjo/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=P4v-nEdA8uk",
      "embed_id": "P4v-nEdA8uk",
      "author": "Coach Steve Moody",
      "caption": "IRONMAN HAMBURG: Insider Tips and Course Teasers",
      "thumbnail_url": "https://i.ytimg.com/vi/P4v-nEdA8uk/hqdefault.jpg",
      "edition_year": 2024,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=yqpbHe3K-2w",
      "embed_id": "yqpbHe3K-2w",
      "author": "The-Endurance-Guy",
      "caption": "IRONMAN Hamburg Bike Course Preview | Fast, Flat & Aero-Optimized",
      "thumbnail_url": "https://i.ytimg.com/vi/yqpbHe3K-2w/hqdefault.jpg",
      "edition_year": 2025,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=c0eCfc0reP8",
      "embed_id": "c0eCfc0reP8",
      "author": "World Triathlon",
      "caption": "2020 WTS Hamburg bike course preview",
      "thumbnail_url": "https://i.ytimg.com/vi/c0eCfc0reP8/hqdefault.jpg",
      "edition_year": 2020,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=FJlWsBEhf2Q",
      "embed_id": "FJlWsBEhf2Q",
      "author": "Alex Kukla",
      "caption": "Ironman Hamburg 2025 Dokumentation | Breaking The Wall",
      "thumbnail_url": "https://i.ytimg.com/vi/FJlWsBEhf2Q/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=uqyhszLpD5Y",
      "embed_id": "uqyhszLpD5Y",
      "author": "Jannis Reichmuth",
      "caption": "I CAN. I WILL. | IRONMAN DOCUMENTARY",
      "thumbnail_url": "https://i.ytimg.com/vi/uqyhszLpD5Y/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=nZtIMx0DL-4",
      "embed_id": "nZtIMx0DL-4",
      "author": "Patrick Delorenzi",
      "caption": "Breaking SUB 10 Hours at IRONMAN Hamburg 2023",
      "thumbnail_url": "https://i.ytimg.com/vi/nZtIMx0DL-4/hqdefault.jpg",
      "edition_year": 2023,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=6GLN01PeOLg",
      "embed_id": "6GLN01PeOLg",
      "author": "Cédric Cuypers",
      "caption": "I FINISHED MY FIRST FULL IRONMAN!",
      "thumbnail_url": "https://i.ytimg.com/vi/6GLN01PeOLg/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=CslvJYxCSo8",
      "embed_id": "CslvJYxCSo8",
      "author": "Julie IEMMOLO",
      "caption": "IRONMAN Hamburg Race Recap",
      "thumbnail_url": "https://i.ytimg.com/vi/CslvJYxCSo8/hqdefault.jpg",
      "edition_year": 2024,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=P-vxj5X7xBY",
      "embed_id": "P-vxj5X7xBY",
      "author": "Triathlon Ross",
      "caption": "Race Recap | IRONMAN Hamburg 2024",
      "thumbnail_url": "https://i.ytimg.com/vi/P-vxj5X7xBY/hqdefault.jpg",
      "edition_year": 2024,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=xR_OCAuZnEk",
      "embed_id": "xR_OCAuZnEk",
      "author": "Bestform Bastian Fitness",
      "caption": "Mein erster Ironman Hamburg 2025 | Ablauf, Erfahrung, Tipps",
      "thumbnail_url": "https://i.ytimg.com/vi/xR_OCAuZnEk/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=sq01yD4gvf4",
      "embed_id": "sq01yD4gvf4",
      "author": "The real 1",
      "caption": "IRONMAN Hamburg 2026 Swim Start | The Atmosphere Was Unreal",
      "thumbnail_url": "https://i.ytimg.com/vi/sq01yD4gvf4/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=7vjHVyfeH_Q",
      "embed_id": "7vjHVyfeH_Q",
      "author": "The real 1",
      "caption": "From Sunrise to Finish Line | Inside IRONMAN Hamburg 2026",
      "thumbnail_url": "https://i.ytimg.com/vi/7vjHVyfeH_Q/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=2y5Nk3OJzvg",
      "embed_id": "2y5Nk3OJzvg",
      "author": "Jackie Hering",
      "caption": "IRONMAN Hamburg Race Week: Episode 1",
      "thumbnail_url": "https://i.ytimg.com/vi/2y5Nk3OJzvg/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=zEDehHsbt7g",
      "embed_id": "zEDehHsbt7g",
      "author": "Keith Williams",
      "caption": "Ironman Hamburg 2026 Road Trip",
      "thumbnail_url": "https://i.ytimg.com/vi/zEDehHsbt7g/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=XekHdzKtbqQ",
      "embed_id": "XekHdzKtbqQ",
      "author": "Dan Noz",
      "caption": "MY FIRST EVER IRONMAN | HAMBURG 2017 RACE REPORT",
      "thumbnail_url": "https://i.ytimg.com/vi/XekHdzKtbqQ/hqdefault.jpg",
      "edition_year": 2017,
      "featured": false
    }
  ],
  "harvest": {
    "hashtags": [
      "ironmanhamburg",
      "imhamburg",
      "ironmanhamburg2026",
      "ironmaneurope",
      "ironmangermany"
    ],
    "youtube": [
      "Ironman Hamburg race report",
      "Ironman Hamburg bike course",
      "Ironman Hamburg 2025",
      "Ironman Hamburg 2026"
    ],
    "google": [
      "Ironman Hamburg race report",
      "Ironman Hamburg recensione gara"
    ],
    "years": [
      2023,
      2024,
      2025,
      2026
    ]
  }
};
export default seed;
