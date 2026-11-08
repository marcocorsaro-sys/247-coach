import type { RaceSeed } from "./types";

// Fonti: vedi sources. Tratti e dislivelli indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  "slug": "frankfurt-2027",
  "race": {
    "official_name": "Mainova IRONMAN Frankfurt European Championship",
    "region": "Assia",
    "course_version": "Edizioni 2023-2026, tratti indicativi: verifica la mappa ufficiale 2027",
    "intro": "Francoforte (27 giugno 2027) è il campionato europeo IRONMAN: nuoto nel Langener Waldsee, bici che attraversa Wetterau e Taunus con strade chiuse e tifo nei paesi, maratona in più giri lungo il Meno con arrivo al Römerberg, nel cuore della città. È una gara veloce e spettacolare, ma di fine giugno: il caldo può essere forte, e nel 2026 bici e corsa sono state accorciate per le temperature (secondo i racconti degli atleti sui social).",
    "kpis": [
      {
        "v": "3,8 km",
        "l": "nuoto · Langener Waldsee, un giro con uscita australiana"
      },
      {
        "v": "180 km",
        "l": "bici · ondulata, tra Wetterau e dintorni (D+ indicativo)"
      },
      {
        "v": "42,2 km",
        "l": "corsa · 4 giri lungo il Meno"
      },
      {
        "v": "20-25 °C",
        "l": "acqua a fine giugno · muta spesso non ammessa"
      },
      {
        "v": "22-35 °C",
        "l": "aria · caldo possibile"
      },
      {
        "v": "27 giu 2027",
        "l": "data in calendario · conferma sul sito ufficiale"
      }
    ],
    "legs": {
      "swim": {
        "bullets": [
          "Langener Waldsee, a sud della città, un giro con uscita australiana dopo circa 1.500 m",
          "Acqua dolce e calma, spesso vicina al limite della muta in giugno",
          "Partenza a rotazione (rolling start): la fila è lunga ma ordinata",
          "Navette dai punti in città verso la partenza, nelle prime ore del mattino"
        ]
      },
      "bike": {
        "bullets": [
          "Un percorso ondulato che esce dalla città verso nord-est: il D+ varia molto tra le fonti, quindi consideralo mosso più che duro",
          "Le salite brevi ma nervose si trovano nella parte alta; la discesa finale riporta verso il centro",
          "Tifo forte nei paesi e passaggi simbolici come Alte Brücke",
          "Strade chiuse al traffico e organizzazione tedesca: rispetta regolamento e distanze",
          "Vento e caldo sono i fattori da gestire: borracce e ristori vanno pianificati"
        ]
      },
      "run": {
        "bullets": [
          "Quattro giri lungo il Meno tra ponti e centro",
          "Percorso piatto con poco ombra; il caldo è il vero nemico",
          "Il passaggio da Römerberg e il finale con folla sono tra i più iconici d'Europa",
          "Ristori frequenti con acqua e spugne"
        ]
      }
    },
    "profile": {
      "maxm": 300,
      "points": [
        [
          0,
          100
        ],
        [
          20,
          130
        ],
        [
          40,
          200
        ],
        [
          60,
          170
        ],
        [
          80,
          250
        ],
        [
          100,
          200
        ],
        [
          120,
          230
        ],
        [
          140,
          170
        ],
        [
          160,
          140
        ],
        [
          180,
          100
        ]
      ],
      "labels": [
        {
          "km": 80,
          "m": 250,
          "t": "Salite della Wetterau (indicativo)"
        }
      ]
    },
    "splits": [
      {
        "goal": "Finisher sereno",
        "swim": "1:20",
        "bike": "7:00",
        "run": "5:10",
        "total": "13:50"
      },
      {
        "goal": "Sub 12",
        "swim": "1:10",
        "bike": "6:05",
        "run": "4:10",
        "total": "11:45"
      },
      {
        "goal": "Sub 11",
        "swim": "1:04",
        "bike": "5:35",
        "run": "3:45",
        "total": "10:40"
      },
      {
        "goal": "Sub 10",
        "swim": "0:58",
        "bike": "5:10",
        "run": "3:20",
        "total": "9:50"
      }
    ],
    "demands": [
      {
        "t": "Caldo di fine giugno tra bici e corsa",
        "b": "idratazione"
      },
      {
        "t": "Bici veloce con tanti rilanci",
        "b": "gestione dello sforzo"
      },
      {
        "t": "Quattro giri di corsa con folla",
        "b": "pacing"
      },
      {
        "t": "Logistica: cambio e partenza lontani dal centro",
        "b": "piano viaggio"
      }
    ],
    "tips": [
      {
        "t": "Caldo",
        "p": "Prepara la gara con uscite a caldo e piano sodio: nel 2026 l'organizzazione ha accorciato le tappe per le temperature."
      },
      {
        "t": "Bici",
        "p": "Allena i rilanci e le salite brevi a ritmo controllato."
      },
      {
        "t": "Nuoto",
        "p": "Allenati con e senza muta: a giugno il limite di 24,5 °C può essere superato."
      },
      {
        "t": "Logistica",
        "p": "Prenota navette o auto per la partenza al lago con largo anticipo."
      },
      {
        "t": "Nutrizione",
        "p": "80-90 g/h di carboidrati e sodio alto; borracce pronte nella zona cambio."
      }
    ],
    "logistics": [
      {
        "t": "Arrivare",
        "p": "Aeroporto di Francoforte (FRA) con treni per il centro in 15 minuti: il più comodo d'Europa. Treno e metropolitana per spostarsi, navette per il Langener Waldsee."
      },
      {
        "t": "Dormire",
        "p": "Centro città (Römerberg, Hauptbahnhof) per stare vicini all'arrivo; alcune guide citano Le Méridien come hotel comodo. Alternativa: paesi vicino al lago per la partenza."
      },
      {
        "t": "Famiglia",
        "p": "Il giro corsa lungo il Meno e il Römerberg sono ideali per tifare con più passaggi. Per la bici, Alte Brücke e i paesi lungo il percorso sono gli spot più amati."
      }
    ],
    "faq": [
      {
        "q": "Serve la muta?",
        "a": "Dipende dalla temperatura: a fine giugno il lago può superare il limite."
      },
      {
        "q": "Quanto è dura la bici?",
        "a": "Più mossa che dura: percorso veloce con salite brevi; il dislivello varia tra le fonti."
      },
      {
        "q": "Perché è speciale?",
        "a": "È il campionato europeo IRONMAN e l'arrivo al Römerberg è tra i più iconici."
      }
    ]
  },
  "segments": [
    {
      "leg": "bike",
      "position": 1,
      "km_from": 0,
      "km_to": 50,
      "title": "Dalla città verso nord-est",
      "note": "Partenza veloce, strade larghe",
      "grade_pct": 0.5,
      "dplus_m": 200,
      "kind": "rolling"
    },
    {
      "leg": "bike",
      "position": 2,
      "km_from": 50,
      "km_to": 100,
      "title": "Colline della Wetterau",
      "note": "Salite brevi e nervose",
      "grade_pct": 1.5,
      "dplus_m": 400,
      "kind": "climb"
    },
    {
      "leg": "bike",
      "position": 3,
      "km_from": 100,
      "km_to": 150,
      "title": "Rientro mosso",
      "note": "Falsopiani e discese tecniche",
      "grade_pct": 0.5,
      "dplus_m": 250,
      "kind": "rolling"
    },
    {
      "leg": "bike",
      "position": 4,
      "km_from": 150,
      "km_to": 180,
      "title": "Verso Francoforte",
      "note": "Ultimi rilanci e ingresso in città",
      "grade_pct": 0.0,
      "dplus_m": 100,
      "kind": "flat"
    },
    {
      "leg": "run",
      "position": 1,
      "km_from": 0,
      "km_to": 42.2,
      "title": "Quattro giri lungo il Meno",
      "note": "Piatto, caldo, folla; finale al Römerberg",
      "grade_pct": 0,
      "dplus_m": 100,
      "kind": "loop"
    },
    {
      "leg": "swim",
      "position": 1,
      "km_from": 0,
      "km_to": 3.8,
      "title": "Langener Waldsee",
      "note": "Un giro con uscita australiana",
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
        "bike": 4.2,
        "run": 4.1,
        "org": 4.6
      },
      "body": "Francoforte è la gara dei grandi numeri: organizzazione molto efficiente, tifo continuo e un arrivo davvero iconico. Gli atleti raccontano di una bici veloce ma tutt'altro che banale e di una maratona dove il caldo conta più del dislivello. Nell'edizione 2026 le temperature hanno portato ad accorciare bici e corsa, ricordando che a fine giugno la strategia di caldo è parte del piano gara.",
      "sources_note": "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali."
    }
  ],
  "sources": [
    {
      "kind": "blog",
      "platform": "tri247.com",
      "url": "https://www.tri247.com/race/ironman-frankfurt-race-guide",
      "title": "IRONMAN Frankfurt race guide",
      "lang": "en",
      "excerpt": "Guida con nuoto, bici, corsa e logistica.",
      "topics": [
        "course",
        "logistics"
      ],
      "quality": 3
    },
    {
      "kind": "blog",
      "platform": "rouvy.com",
      "url": "https://rouvy.com/en/ironman/frankfurt",
      "title": "IRONMAN Frankfurt su ROUVY",
      "lang": "en",
      "excerpt": "Percorso ufficiale da pedalare su ROUVY.",
      "topics": [
        "training"
      ],
      "quality": 3
    },
    {
      "kind": "blog",
      "platform": "bestbikesplit.com",
      "url": "https://www.bestbikesplit.com/event/ironman-frankfurt-2026-bike-course-race-plan",
      "title": "IRONMAN Frankfurt 2026 bike course race plan",
      "lang": "en",
      "excerpt": "Profilo e piano di pacing.",
      "topics": [
        "course"
      ],
      "quality": 3
    },
    {
      "kind": "results",
      "platform": "running.life",
      "url": "https://running.life/de/termine/ironman-frankfurt",
      "title": "Ironman Frankfurt — scheda",
      "lang": "de",
      "excerpt": "Dati evento.",
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
      "url": "https://www.youtube.com/watch?v=VdLcpgT1lW8",
      "embed_id": "VdLcpgT1lW8",
      "author": "IRONMAN Triathlon",
      "caption": "Race Rewind | 2026 Mainova IRONMAN Frankfurt European Championship",
      "thumbnail_url": "https://i.ytimg.com/vi/VdLcpgT1lW8/hqdefault.jpg",
      "edition_year": 2026,
      "featured": true
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=4DX4NlqImnM",
      "embed_id": "4DX4NlqImnM",
      "author": "IRONMAN Triathlon",
      "caption": "Mainova IRONMAN Frankfurt, European Championship 2025 | Race Rewind",
      "thumbnail_url": "https://i.ytimg.com/vi/4DX4NlqImnM/hqdefault.jpg",
      "edition_year": 2025,
      "featured": true
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=Gxj9RSeEW9I",
      "embed_id": "Gxj9RSeEW9I",
      "author": "IRONMAN Triathlon",
      "caption": "Mainova IRONMAN European Championship Frankfurt 2024 | Race Rewind",
      "thumbnail_url": "https://i.ytimg.com/vi/Gxj9RSeEW9I/hqdefault.jpg",
      "edition_year": 2024,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=K8AkFlP6AjU",
      "embed_id": "K8AkFlP6AjU",
      "author": "IRONMAN Triathlon",
      "caption": "IRONMAN European Championship Frankfurt 2023 | Race Rewind",
      "thumbnail_url": "https://i.ytimg.com/vi/K8AkFlP6AjU/hqdefault.jpg",
      "edition_year": 2023,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=zD2TXCMXSIA",
      "embed_id": "zD2TXCMXSIA",
      "author": "IRONMAN Triathlon",
      "caption": "Pro Race Replay | 2026 Mainova IRONMAN Frankfurt European Championship",
      "thumbnail_url": "https://i.ytimg.com/vi/zD2TXCMXSIA/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=SCjudOdu6sU",
      "embed_id": "SCjudOdu6sU",
      "author": "IRONMAN Triathlon",
      "caption": "Pro Race Replay | 2025 Mainova IRONMAN Frankfurt European Championship",
      "thumbnail_url": "https://i.ytimg.com/vi/SCjudOdu6sU/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=ZMviMmbKajQ",
      "embed_id": "ZMviMmbKajQ",
      "author": "THE DAILY TRI",
      "caption": "Ironman Frankfurt Highlights and Analysis",
      "thumbnail_url": "https://i.ytimg.com/vi/ZMviMmbKajQ/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=tAmhkHDXcoE",
      "embed_id": "tAmhkHDXcoE",
      "author": "IRONMAN Triathlon",
      "caption": "Athletic Brewing Post-Race Report | 2026 IRONMAN Frankfurt",
      "thumbnail_url": "https://i.ytimg.com/vi/tAmhkHDXcoE/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=dEkc1SwADfk",
      "embed_id": "dEkc1SwADfk",
      "author": "Coach Steve Moody",
      "caption": "IRONMAN Frankfurt Course review with Expert Coach",
      "thumbnail_url": "https://i.ytimg.com/vi/dEkc1SwADfk/hqdefault.jpg",
      "edition_year": 2025,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=gM2ZJAq1MlA",
      "embed_id": "gM2ZJAq1MlA",
      "author": "Global Triathlon Network",
      "caption": "Ironman Frankfurt | A Race Guide To The IM European Championship",
      "thumbnail_url": "https://i.ytimg.com/vi/gM2ZJAq1MlA/hqdefault.jpg",
      "edition_year": 2019,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=baelDEtk_Xw",
      "embed_id": "baelDEtk_Xw",
      "author": "triathloninsider",
      "caption": "Ironman Frankfurt | Die Radstrecke im Praxistest",
      "thumbnail_url": "https://i.ytimg.com/vi/baelDEtk_Xw/hqdefault.jpg",
      "edition_year": 2022,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=K_ZXvNz6m3s",
      "embed_id": "K_ZXvNz6m3s",
      "author": "The-Endurance-Guy",
      "caption": "IRONMAN Frankfurt Bike Course Preview | Conquer the Heat & Hills",
      "thumbnail_url": "https://i.ytimg.com/vi/K_ZXvNz6m3s/hqdefault.jpg",
      "edition_year": 2025,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=pSqcg9doRXU",
      "embed_id": "pSqcg9doRXU",
      "author": "Frank Mayer",
      "caption": "Ironman Frankfurt Official Bike Course 2023",
      "thumbnail_url": "https://i.ytimg.com/vi/pSqcg9doRXU/hqdefault.jpg",
      "edition_year": 2023,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=Z7x9UpR0exk",
      "embed_id": "Z7x9UpR0exk",
      "author": "Runninggirl",
      "caption": "Ironman Frankfurt NEW Bike Course 2021 with Paul Schuster // TimeLapse",
      "thumbnail_url": "https://i.ytimg.com/vi/Z7x9UpR0exk/hqdefault.jpg",
      "edition_year": 2021,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=jTus6phQcS8",
      "embed_id": "jTus6phQcS8",
      "author": "Oliver Ehmann",
      "caption": "IRONMAN Frankfurt 2025 - Vom Traum zur Realität | DOKUMENTATION",
      "thumbnail_url": "https://i.ytimg.com/vi/jTus6phQcS8/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=b4Sc-xFz3Jo",
      "embed_id": "b4Sc-xFz3Jo",
      "author": "bigshanu",
      "caption": "ALLES KOPFSACHE – IRONMAN Frankfurt 2025 Doku",
      "thumbnail_url": "https://i.ytimg.com/vi/b4Sc-xFz3Jo/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=tca86rUWnIE",
      "embed_id": "tca86rUWnIE",
      "author": "Max Pembleton",
      "caption": "IRONDAD Ep.10 | Ironman Frankfurt",
      "thumbnail_url": "https://i.ytimg.com/vi/tca86rUWnIE/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=Pk0hVUpmsxA",
      "embed_id": "Pk0hVUpmsxA",
      "author": "Trevor Foley",
      "caption": "DNF IRONMAN FRANKFURT // Race Report",
      "thumbnail_url": "https://i.ytimg.com/vi/Pk0hVUpmsxA/hqdefault.jpg",
      "edition_year": 2024,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=0yAevPGXwss",
      "embed_id": "0yAevPGXwss",
      "author": "Lena S",
      "caption": "IRONMAN FRANKFURT 2025 from middle pack age grouper perspective",
      "thumbnail_url": "https://i.ytimg.com/vi/0yAevPGXwss/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=eD3FIPxARm8",
      "embed_id": "eD3FIPxARm8",
      "author": "Sebastian Kienle - Official",
      "caption": "Ironman Frankfurt – Race Recap",
      "thumbnail_url": "https://i.ytimg.com/vi/eD3FIPxARm8/hqdefault.jpg",
      "edition_year": 2019,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=PF26ukGRd_4",
      "embed_id": "PF26ukGRd_4",
      "author": "Andrew Horsfall-Turner",
      "caption": "Ironman Frankfurt 2022 // Race Recap",
      "thumbnail_url": "https://i.ytimg.com/vi/PF26ukGRd_4/hqdefault.jpg",
      "edition_year": 2022,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=39nijy-2yWw",
      "embed_id": "39nijy-2yWw",
      "author": "IRONMAN Triathlon",
      "caption": "Mainova IRONMAN Frankfurt European Championship | A Fighting Chance",
      "thumbnail_url": "https://i.ytimg.com/vi/39nijy-2yWw/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=_LXwsYcd0Oc",
      "embed_id": "_LXwsYcd0Oc",
      "author": "Paul Heckelsberg",
      "caption": "ROAD TO IRONMAN (Frankfurt) / Ironman Dokumentation",
      "thumbnail_url": "https://i.ytimg.com/vi/_LXwsYcd0Oc/hqdefault.jpg",
      "edition_year": 2026,
      "leg": "course",
      "featured": false
    }
  ],
  "harvest": {
    "hashtags": [
      "ironmanfrankfurt",
      "imfrankfurt",
      "ironmanfrankfurt2026",
      "ironmaneurope",
      "ironmangermany"
    ],
    "youtube": [
      "Ironman Frankfurt race report",
      "Ironman Frankfurt bike course",
      "Ironman Frankfurt 2025",
      "Ironman Frankfurt 2026"
    ],
    "google": [
      "Ironman Frankfurt race report",
      "Ironman Frankfurt recensione gara"
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
