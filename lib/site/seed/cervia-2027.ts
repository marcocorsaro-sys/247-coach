import type { RaceSeed } from "./types";

// Fonti: vedi sources. Tratti e dislivelli indicativi: verifica la mappa ufficiale.
const seed: RaceSeed = {
  "slug": "cervia-2027",
  "race": {
    "official_name": "IRONMAN Italy Emilia-Romagna",
    "region": "Emilia-Romagna",
    "course_version": "Edizioni 2022-2026, tratti indicativi: verifica la mappa ufficiale 2027",
    "intro": "Cervia (18 settembre 2027) è la full distance italiana per eccellenza: nuoto nell'Adriatico all'alba, una bici che attraversa le saline e si spinge nelle colline di Bertinoro, una maratona tra Cervia e Milano Marittima con arrivo sul lungomare Deledda. A settembre il clima è ancora caldo ma meno estremo di luglio; il vento sulla costa e il pubblico italiano sono i due elementi che tutti ricordano. Nel 2026 l'evento ha celebrato i 10 anni di IRONMAN Italy Emilia-Romagna.",
    "kpis": [
      {
        "v": "3,8 km",
        "l": "nuoto · Adriatico dalla spiaggia di Cervia, partenza alle 7:30"
      },
      {
        "v": "180 km",
        "l": "bici · saline, costa e colline verso Bertinoro"
      },
      {
        "v": "42,2 km",
        "l": "corsa · Cervia e Milano Marittima, piatta"
      },
      {
        "v": "20-24 °C",
        "l": "acqua a settembre · muta spesso consigliata"
      },
      {
        "v": "18-28 °C",
        "l": "aria · sole e umidità"
      },
      {
        "v": "18 set 2027",
        "l": "data in calendario · conferma sul sito ufficiale"
      }
    ],
    "legs": {
      "swim": {
        "bullets": [
          "Partenza alle 7:30 dalla spiaggia pubblica di Cervia, sul lungomare Grazia Deledda",
          "Mare Adriatico, acqua bassa e salata: la muta aiuta a galleggiare e di solito è ammessa",
          "Correnti lievi e visibilità limitata: il sighting è la chiave",
          "Oltre 3.000 atleti in mare all'alba (full e 70.3 nello stesso weekend): partenze scaglionate"
        ]
      },
      "bike": {
        "bullets": [
          "Dalla zona cambio sul lungomare Deledda ci si sposta tra le saline di Cervia e poi nell'entroterra",
          "Il tratto più duro porta alle colline di Bertinoro: salita breve ma impegnativa che spezza il ritmo",
          "Lungo la costa vento da mare, soprattutto in direzione SS16: allenati a pedalare con vento contro",
          "Il percorso è molto veloce, ma la fama di «draft party» di alcune edizioni obbliga alla massima attenzione al regolamento",
          "Ristori frequenti, strade larghe e tifo nei paesi"
        ]
      },
      "run": {
        "bullets": [
          "Maratona in più giri tra il centro storico di Cervia e Milano Marittima",
          "Passaggi da Piazza Garibaldi, Torre San Michele, Borgo Marina e viali alberati",
          "Percorso quasi piatto, ma l'umidità e il caldo di settembre si fanno sentire",
          "Arrivo al Fantini Club 182 sul lungomare Deledda: i primi arrivi circa alle 16:00, gli ultimi fino a mezzanotte"
        ]
      }
    },
    "profile": {
      "maxm": 250,
      "points": [
        [
          0,
          5
        ],
        [
          25,
          10
        ],
        [
          45,
          20
        ],
        [
          60,
          80
        ],
        [
          70,
          200
        ],
        [
          80,
          120
        ],
        [
          95,
          60
        ],
        [
          110,
          30
        ],
        [
          130,
          80
        ],
        [
          150,
          50
        ],
        [
          165,
          20
        ],
        [
          180,
          5
        ]
      ],
      "labels": [
        {
          "km": 70,
          "m": 200,
          "t": "Bertinoro (indicativo)"
        }
      ]
    },
    "splits": [
      {
        "goal": "Finisher sereno",
        "swim": "1:20",
        "bike": "7:10",
        "run": "5:10",
        "total": "13:55"
      },
      {
        "goal": "Sub 12",
        "swim": "1:10",
        "bike": "6:00",
        "run": "4:15",
        "total": "11:50"
      },
      {
        "goal": "Sub 11",
        "swim": "1:05",
        "bike": "5:20",
        "run": "3:50",
        "total": "10:35"
      },
      {
        "goal": "Sub 10",
        "swim": "0:58",
        "bike": "5:00",
        "run": "3:20",
        "total": "9:40"
      }
    ],
    "demands": [
      {
        "t": "Bici veloce e affollata: disciplina sul drafting",
        "b": "regolamento"
      },
      {
        "t": "Vento da mare sulla costa e sulla SS16",
        "b": "gestione dello sforzo"
      },
      {
        "t": "Caldo e umidità di settembre sul lungomare",
        "b": "idratazione"
      },
      {
        "t": "Nuoto: partenza all'alba con molta gente",
        "b": "orientamento"
      }
    ],
    "tips": [
      {
        "t": "Vento",
        "p": "Fai uscite con vento reale lungo la costa: il piano cerca tra i tuoi percorsi quelli più esposti."
      },
      {
        "t": "Drafting",
        "p": "Mantieni le distanze: arbitri e penalità sono severi. Trova il tuo ritmo senza stare in scia."
      },
      {
        "t": "Caldo",
        "p": "Almeno tre uscite lunghe a caldo; sodio e raffreddamento in corsa."
      },
      {
        "t": "Nuoto",
        "p": "Allenati a nuotare in mare e a fare sighting con onda e gente."
      },
      {
        "t": "Nutrizione",
        "p": "80-90 g/h di carboidrati e piano ristori chiaro: le ultime ore sono notturne."
      }
    ],
    "logistics": [
      {
        "t": "Arrivare",
        "p": "Aeroporti di Bologna, Rimini e Forlì; da Bologna 1h15 in auto o treno fino a Cervia-Milano Marittima. Parcheggi limitati il giorno gara: meglio soggiornare vicino o usare le navette."
      },
      {
        "t": "Dormire",
        "p": "Cervia e Milano Marittima, vicino a partenza e zona cambio (lungomare Deledda): prenota con 9+ mesi di anticipo. La settimana gara è piena."
      },
      {
        "t": "Famiglia",
        "p": "Il lungomare e Viale Roma sono ideali: partenza, cambio, maratona e arrivo sono vicini. Punti consigliati: lungomare Deledda, Viale Roma, Viale Milazzo, Fantini Club 182."
      }
    ],
    "faq": [
      {
        "q": "Serve la muta?",
        "a": "Spesso sì: l'acqua a metà settembre è tra 20 e 24 °C; il limite di temperatura viene deciso in gara."
      },
      {
        "q": "Il percorso è davvero piatto?",
        "a": "La corsa sì; la bici ha il tratto di Bertinoro e il vento rende il percorso più impegnativo di quanto sembri."
      },
      {
        "q": "C'è anche il 70.3?",
        "a": "Sì, nello stesso weekend: i percorsi e le informazioni sono diversi, questa scheda riguarda solo la full."
      }
    ]
  },
  "segments": [
    {
      "leg": "bike",
      "position": 1,
      "km_from": 0,
      "km_to": 40,
      "title": "Saline e costa",
      "note": "Partenza veloce, vento da mare",
      "grade_pct": 0.0,
      "dplus_m": 30,
      "kind": "flat"
    },
    {
      "leg": "bike",
      "position": 2,
      "km_from": 40,
      "km_to": 90,
      "title": "Verso Bertinoro",
      "note": "Salita breve ma dura nelle colline",
      "grade_pct": 2.0,
      "dplus_m": 200,
      "kind": "climb"
    },
    {
      "leg": "bike",
      "position": 3,
      "km_from": 90,
      "km_to": 140,
      "title": "Colline e rientro",
      "note": "Falsopiani e discese tecniche",
      "grade_pct": 0.0,
      "dplus_m": 100,
      "kind": "rolling"
    },
    {
      "leg": "bike",
      "position": 4,
      "km_from": 140,
      "km_to": 180,
      "title": "Ritorno sul lungomare",
      "note": "Veloce, vento di faccia",
      "grade_pct": 0.0,
      "dplus_m": 30,
      "kind": "flat"
    },
    {
      "leg": "run",
      "position": 1,
      "km_from": 0,
      "km_to": 42.2,
      "title": "Cervia e Milano Marittima",
      "note": "Piatto, caldo e umido, tifo continuo",
      "grade_pct": 0,
      "dplus_m": 60,
      "kind": "loop"
    },
    {
      "leg": "swim",
      "position": 1,
      "km_from": 0,
      "km_to": 3.8,
      "title": "Adriatico dalla spiaggia di Cervia",
      "note": "Acqua bassa, correnti lievi",
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
        "swim": 4.0,
        "bike": 3.9,
        "run": 4.0,
        "org": 4.4
      },
      "body": "Cervia è la full italiana più amata: organizzazione efficiente, tifo caldo e logistica comoda grazie alla vicinanza tra cambio, partenza e arrivo. I racconti degli atleti segnalano un percorso veloce ma insidioso per il vento e per il traffico in bici; la maratona è piatta ma il caldo e l'umidità di settembre si sentono. L'arrivo sul lungomare è citato spesso come uno dei più emozionanti d'Italia.",
      "sources_note": "Sintesi AI da guide e racconti di gara; nessuna frase attribuita a persone reali."
    }
  ],
  "sources": [
    {
      "kind": "news",
      "platform": "turismo.comunecervia.it",
      "url": "https://www.turismo.comunecervia.it/en/events/events-and-initiatives/sports-and-games/ironman",
      "title": "IRONMAN a Cervia — scheda del Comune",
      "lang": "en",
      "excerpt": "Orari, percorso e punti per gli spettatori.",
      "topics": [
        "course",
        "spectators"
      ],
      "quality": 3
    },
    {
      "kind": "blog",
      "platform": "triathlon.mx",
      "url": "https://triathlon.mx/blogs/triathlon-news/conquer-italys-newest-full-distance-ironman-emilia-romagna-cervia-2024-race-guide",
      "title": "Race guide IRONMAN Emilia-Romagna Cervia",
      "lang": "en",
      "excerpt": "Guida al percorso e ai consigli logistici; i dati di dislivello non coincidono con altre fonti.",
      "topics": [
        "course"
      ],
      "quality": 3
    },
    {
      "kind": "blog",
      "platform": "earthtrekkers.com",
      "url": "https://www.earthtrekkers.com/racing-ironman-italy",
      "title": "Racing IRONMAN Italy",
      "lang": "en",
      "excerpt": "Racconto di gara.",
      "topics": [
        "tips"
      ],
      "quality": 3
    },
    {
      "kind": "results",
      "platform": "finishers.com",
      "url": "https://www.finishers.com/fr/course/ironman-d-emilie-romagne",
      "title": "Ironman d'Émilie-Romagne",
      "lang": "fr",
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
      "url": "https://www.youtube.com/watch?v=QjHAyLKAmXc",
      "embed_id": "QjHAyLKAmXc",
      "author": "IRONMAN Triathlon",
      "caption": "Race Rewind | 2025 IRONMAN & IRONMAN 70.3 Italy Emilia-Romagna",
      "thumbnail_url": "https://i.ytimg.com/vi/QjHAyLKAmXc/hqdefault.jpg",
      "edition_year": 2025,
      "featured": true
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=ErHCuuQAOPU",
      "embed_id": "ErHCuuQAOPU",
      "author": "IRONMAN Triathlon",
      "caption": "Race Rewind | IRONMAN & IRONMAN 70.3 Italy Emilia-Romagna 2024",
      "thumbnail_url": "https://i.ytimg.com/vi/ErHCuuQAOPU/hqdefault.jpg",
      "edition_year": 2024,
      "featured": true
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=kYAJ3sRhKt4",
      "embed_id": "kYAJ3sRhKt4",
      "author": "IRONMAN Triathlon",
      "caption": "2023 IRONMAN & IRONMAN 70.3 Italy Emilia-Romagna Race Rewind",
      "thumbnail_url": "https://i.ytimg.com/vi/kYAJ3sRhKt4/hqdefault.jpg",
      "edition_year": 2023,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=VfOrvCKM214",
      "embed_id": "VfOrvCKM214",
      "author": "IRONMANEurope",
      "caption": "IRONMAN & IRONMAN 70.3 Italy, Emilia-Romagna 2022 | Race Movie",
      "thumbnail_url": "https://i.ytimg.com/vi/VfOrvCKM214/hqdefault.jpg",
      "edition_year": 2022,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=fXP71BYzMYY",
      "embed_id": "fXP71BYzMYY",
      "author": "IRONMAN Triathlon",
      "caption": "Celebrating 10 years of IRONMAN Italy, Emilia-Romagna",
      "thumbnail_url": "https://i.ytimg.com/vi/fXP71BYzMYY/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=I8rxH29uq68",
      "embed_id": "I8rxH29uq68",
      "author": "Daddo Sport",
      "caption": "Ironman Italy Emilia Romagna 2026",
      "thumbnail_url": "https://i.ytimg.com/vi/I8rxH29uq68/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=OzO_9o5kjXw",
      "embed_id": "OzO_9o5kjXw",
      "author": "Daddo Sport",
      "caption": "Il racconto di Ironman Italy Emilia Romagna 2024",
      "thumbnail_url": "https://i.ytimg.com/vi/OzO_9o5kjXw/hqdefault.jpg",
      "edition_year": 2024,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=IGdeS2CZArg",
      "embed_id": "IGdeS2CZArg",
      "author": "Ravennawebtv",
      "caption": "Cervia si sveglia con l'Ironman: oltre 3mila atleti in mare all'alba",
      "thumbnail_url": "https://i.ytimg.com/vi/IGdeS2CZArg/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=j_ssUThDxGE",
      "embed_id": "j_ssUThDxGE",
      "author": "Coach Steve Moody",
      "caption": "IRONMAN Italy Course: Hints/Tips from an IRONMAN U certified Coach",
      "thumbnail_url": "https://i.ytimg.com/vi/j_ssUThDxGE/hqdefault.jpg",
      "edition_year": 2023,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=imqHZMpWRhM",
      "embed_id": "imqHZMpWRhM",
      "author": "Jo Wil",
      "caption": "Ironman Italy Emilia-Romagna Bike course Bertinoro climb",
      "thumbnail_url": "https://i.ytimg.com/vi/imqHZMpWRhM/hqdefault.jpg",
      "edition_year": 2022,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=Vjy3wEGMRz8",
      "embed_id": "Vjy3wEGMRz8",
      "author": "Edward Williamson",
      "caption": "Do Not Sign Up For Ironman Italy Emilia Romagna Until You Watch This",
      "thumbnail_url": "https://i.ytimg.com/vi/Vjy3wEGMRz8/hqdefault.jpg",
      "edition_year": 2026,
      "leg": "course",
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=G4HH2PYIw64",
      "embed_id": "G4HH2PYIw64",
      "author": "TriGer - E. & R. Gerheim",
      "caption": "Ironman Emilia Romagna Italy",
      "thumbnail_url": "https://i.ytimg.com/vi/G4HH2PYIw64/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=_iTvx8D2UVo",
      "embed_id": "_iTvx8D2UVo",
      "author": "TriGer - E. & R. Gerheim",
      "caption": "IRONMAN Italy Emilia Romagna 2026",
      "thumbnail_url": "https://i.ytimg.com/vi/_iTvx8D2UVo/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=AS9pKJqwlgY",
      "embed_id": "AS9pKJqwlgY",
      "author": "Lorenzo",
      "caption": "Lorenzo, YOU ARE AN IRONMAN [Documentario IRONMAN CERVIA 2025]",
      "thumbnail_url": "https://i.ytimg.com/vi/AS9pKJqwlgY/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=XTM0WpcKv1c",
      "embed_id": "XTM0WpcKv1c",
      "author": "Lukas Rakštelis",
      "caption": "How I became an IRONMAN in Emilia Romagna, Cervia, Italy | Vlog | 4K",
      "thumbnail_url": "https://i.ytimg.com/vi/XTM0WpcKv1c/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=4f0u44kFUYg",
      "embed_id": "4f0u44kFUYg",
      "author": "Giovanni Friio",
      "caption": "One Step at a Time - Giovanni Friio - Ironman Cervia 2025",
      "thumbnail_url": "https://i.ytimg.com/vi/4f0u44kFUYg/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=dcv9WIlvKao",
      "embed_id": "dcv9WIlvKao",
      "author": "Sophia Thain",
      "caption": "Ironman Italy 2024 | The Debrief",
      "thumbnail_url": "https://i.ytimg.com/vi/dcv9WIlvKao/hqdefault.jpg",
      "edition_year": 2024,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=LOi-wG1qWMs",
      "embed_id": "LOi-wG1qWMs",
      "author": "Valentina Tilli",
      "caption": "Ironman Italy 2025 amazing speech by Paul Kaye",
      "thumbnail_url": "https://i.ytimg.com/vi/LOi-wG1qWMs/hqdefault.jpg",
      "edition_year": 2025,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=srYdT8sVUnc",
      "embed_id": "srYdT8sVUnc",
      "author": "IRONMAN Triathlon",
      "caption": "2022 IRONMAN Italy Emilia-Romagna Pro Race Recap",
      "thumbnail_url": "https://i.ytimg.com/vi/srYdT8sVUnc/hqdefault.jpg",
      "edition_year": 2022,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=12m7niO82e8",
      "embed_id": "12m7niO82e8",
      "author": "Triathlon Today",
      "caption": "Biggest DRAFT PARTY in triathlon? Ironman Emilia-Romagna",
      "thumbnail_url": "https://i.ytimg.com/vi/12m7niO82e8/hqdefault.jpg",
      "edition_year": 2022,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=fr2f1JLMbS0",
      "embed_id": "fr2f1JLMbS0",
      "author": "IRONMANEurope",
      "caption": "The emotion of IRONMAN Italy Emilia-Romagna 2017",
      "thumbnail_url": "https://i.ytimg.com/vi/fr2f1JLMbS0/hqdefault.jpg",
      "edition_year": 2017,
      "featured": false
    },
    {
      "platform": "youtube",
      "media_type": "video",
      "url": "https://www.youtube.com/watch?v=vPyb-9bT1TA",
      "embed_id": "vPyb-9bT1TA",
      "author": "Sam Rollings",
      "caption": "Ironman Emilia Romagna 2026",
      "thumbnail_url": "https://i.ytimg.com/vi/vPyb-9bT1TA/hqdefault.jpg",
      "edition_year": 2026,
      "featured": false
    }
  ],
  "harvest": {
    "hashtags": [
      "ironmancervia",
      "ironmanitaly",
      "ironmanemiliaromagna",
      "imitaly",
      "ironmancervia2026"
    ],
    "youtube": [
      "Ironman Cervia race report",
      "Ironman Italy Emilia Romagna bike course",
      "Ironman Cervia 2025",
      "Ironman Italy 2026"
    ],
    "google": [
      "Ironman Cervia race report",
      "Ironman Cervia recensione gara"
    ],
    "years": [
      2022,
      2023,
      2024,
      2025,
      2026
    ]
  }
};
export default seed;
