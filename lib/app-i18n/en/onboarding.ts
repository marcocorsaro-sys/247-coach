// Onboarding 24/7 Coach (app/onboarding).
const en: Record<string, string> = {
  // hero
  "Raccontami di": "Tell me about",
  "te": "yourself",
  "Queste risposte sono quello che il miglior coach ti chiederebbe al primo incontro. Più sei preciso, migliore sarà il piano. Il tuo storico Garmin/Strava lo leggo da solo se colleghi Intervals.":
    "These are the questions the best coach would ask you at your first meeting. The more precise you are, the better your plan. If you connect Intervals, I'll read your Garmin/Strava history myself.",
  // come funziona
  "// COME FUNZIONA · 10 MINUTI": "// HOW IT WORKS · 10 MINUTES",
  "Racconti chi sei": "Tell me who you are",
  "Obiettivo, gara, disponibilità e livello: le domande che ti farebbe un coach al primo incontro.":
    "Goal, race, availability and level: the questions a coach would ask at your first meeting.",
  "Colleghi il tuo storico": "Connect your history",
  "✓ Intervals già collegato.": "✓ Intervals already connected.",
  "Consigliato: con Intervals leggo anni di Garmin/Strava e il piano parte da dati veri. Guida passo-passo in fondo (sezione 5).":
    "Recommended: with Intervals I read years of Garmin/Strava data and your plan starts from real numbers. Step-by-step guide at the bottom (section 5).",
  "Ricevi il piano": "Get your plan",
  "In 2-4 minuti scrivo periodizzazione e prime due settimane. Poi lo adatto a come ti alleni davvero.":
    "In 2-4 minutes I write your periodization and first two weeks. Then I adapt it to how you actually train.",
  "→ Vai subito al collegamento Intervals": "→ Go straight to connecting Intervals",
  // generazione in corso
  "💬 Ho letto il tuo messaggio: sto adattando il piano…": "💬 I read your message: adapting your plan…",
  "Rivedo le sedute da domani in avanti in base a quello che mi hai scritto, con la stessa cura del piano iniziale: ci vogliono":
    "I'm reworking your sessions from tomorrow onwards based on what you wrote, with the same care as the initial plan: it takes",
  "2-4 minuti": "2-4 minutes",
  "Appena pronto ti porto alla tabella aggiornata, con la spiegazione di cosa ho cambiato e perché.":
    "As soon as it's ready I'll take you to the updated plan, with an explanation of what I changed and why.",
  "🤖 Sto costruendo il tuo piano…": "🤖 Building your plan…",
  "Analizzo il tuo storico, l'obiettivo e i vincoli, poi scrivo la periodizzazione e le prime due settimane. Di solito ci vogliono":
    "I'm analysing your history, goal and constraints, then writing the periodization and first two weeks. It usually takes",
  "Questa pagina si aggiorna da sola: puoi anche chiuderla e tornare più tardi.":
    "This page refreshes by itself: you can also close it and come back later.",
  "Il coach sta lavorando — la pagina si aggiorna da sola": "The coach is working — the page refreshes by itself",
  "La generazione non è andata a buon fine:": "Plan generation failed:",
  "Riprova qui sotto — se succede ancora, scrivi a chi gestisce l'app.":
    "Try again below — if it happens again, contact whoever runs the app.",
  // dati salvati
  "✓ Dati salvati.": "✓ Data saved.",
  "Il tuo piano esiste già: rigenerarlo lo ricostruisce da zero sulle prossime due settimane.":
    "You already have a plan: regenerating it rebuilds the next two weeks from scratch.",
  "Ora posso costruire il tuo piano: analizzo storico, obiettivo e vincoli. Premi una volta sola: ci vogliono 2-3 minuti e la pagina ti tiene aggiornato.":
    "Now I can build your plan: I'll analyse your history, goal and constraints. Press once only: it takes 2-3 minutes and the page keeps you updated.",
  "Rigenera il piano": "Regenerate plan",
  "Genera il mio piano": "Generate my plan",
  "← Torna al tuo piano": "← Back to your plan",
  // 1 · sport
  "1 · Sport ed esperienza": "1 · Sport and experience",
  "Focus": "Focus",
  "Trail running": "Trail running",
  "Ultra endurance (trail + bici lunga)": "Ultra endurance (trail + long rides)",
  "Livello": "Level",
  "Principiante": "Beginner",
  "Intermedio": "Intermediate",
  "Avanzato": "Advanced",
  "Background (anni di sport, gare fatte, da dove vieni)": "Background (years of sport, races done, where you come from)",
  "Es. corro da 5 anni, 2 mezze maratone, primo triathlon l'anno scorso…":
    "E.g. running for 5 years, 2 half marathons, first triathlon last year…",
  "Infortuni o limitazioni attuali": "Current injuries or limitations",
  "Es. fascite plantare a marzo, ora ok; evitare troppa corsa su asfalto":
    "E.g. plantar fasciitis in March, fine now; avoid too much running on tarmac",
  // 2 · obiettivo
  "2 · Obiettivo": "2 · Goal",
  "Raccontami il tuo obiettivo": "Tell me your goal",
  "Es. finire il mio primo 70.3 a giugno sotto le 6 ore": "E.g. finish my first 70.3 in June in under 6 hours",
  "Le tue gare in calendario (A ⭐ = obiettivo principale)": "Your scheduled races (A ⭐ = main goal)",
  "Salva priorità": "Save priority",
  "Elimina gara": "Delete race",
  "🏁 Scegli la tua gara dal catalogo ({n} gare Ironman e 70.3)": "🏁 Pick your race from the catalogue ({n} Ironman and 70.3 races)",
  "— nessuna / la inserisco a mano —": "— none / I'll enter it manually —",
  "Gara selezionata:": "Selected race:",
  "Scegli le tue gare dal catalogo del circuito Ironman →": "Pick your races from the Ironman circuit catalogue →",
  "(poi torna qui)": "(then come back here)",
  "— oppure inseriscine una a mano:": "— or enter one manually:",
  "Gara obiettivo (nome)": "Goal race (name)",
  "Es. Ironman 70.3 Jesolo": "E.g. Ironman 70.3 Jesolo",
  "Data": "Date",
  "Distanza": "Distance",
  "Tempo obiettivo": "Target time",
  "es. 5h45'": "e.g. 5h45'",
  "Priorità": "Priority",
  // 3 · tempo
  "3 · Tempo e mezzi": "3 · Time and resources",
  "Giorni a settimana": "Days per week",
  "Ore a settimana": "Hours per week",
  "Max minuti/seduta lun-ven": "Max minutes/session Mon-Fri",
  "Ore max nel weekend": "Max hours at the weekend",
  "Palestra (sedute/sett.)": "Gym (sessions/week)",
  "Palestra: cosa fai e con chi": "Gym: what you do and with whom",
  "Es. forza gambe 2x/sett. su scheda della mia trainer, martedì e giovedì":
    "E.g. leg strength 2x/week on my trainer's programme, Tuesday and Thursday",
  "Vincoli fissi": "Fixed constraints",
  "Es. piscina solo martedì e giovedì; il lungo solo la domenica; mercoledì riposo":
    "E.g. pool only Tuesday and Thursday; long session only on Sunday; Wednesday rest",
  "Attrezzatura": "Equipment",
  "Es. bici con rulli smart, palestra, zona collinare per il trail":
    "E.g. bike with smart trainer, gym, hilly area for trail",
  // 4 · dati fisici
  "4 · Dati fisici e soglie (se le conosci)": "4 · Body data and thresholds (if you know them)",
  "Data di nascita": "Date of birth",
  "Altezza (cm)": "Height (cm)",
  "Peso (kg)": "Weight (kg)",
  "Massa grassa (%)": "Body fat (%)",
  "FC riposo": "Resting HR",
  "FC max": "Max HR",
  "FC soglia": "Threshold HR",
  "FTP bici (W)": "Bike FTP (W)",
  "Passo soglia corsa": "Run threshold pace",
  "es. 4:30": "e.g. 4:30",
  "CSS nuoto /100m": "Swim CSS /100m",
  "es. 1:45": "e.g. 1:45",
  "Se non le conosci, nessun problema: il piano inserirà i test per stabilirle.":
    "If you don't know them, no problem: the plan will include tests to set them.",
  // 5 · intervals
  "5 · Collega il tuo storico (Garmin/Strava via Intervals)": "5 · Connect your history (Garmin/Strava via Intervals)",
  "Cos'è Intervals.icu:": "What Intervals.icu is:",
  "un servizio gratuito che raccoglie le attività di Garmin, Strava, Polar, Coros, Suunto e le espone in modo sicuro. Io lo uso per due cose:":
    "a free service that collects your activities from Garmin, Strava, Polar, Coros, Suunto and shares them securely. I use it for two things:",
  "leggere il tuo storico": "reading your history",
  "(volumi, ritmi, potenza, carico) e": "(volume, pace, power, load) and",
  "mandare gli allenamenti del piano sul tuo orologio": "sending your plan's workouts to your watch",
  "Non pubblico nulla e non modifico le tue attività.": "I don't publish anything or change your activities.",
  "Crea l'account.": "Create an account.",
  "Vai su": "Go to",
  ", con email o con Google. È gratis.": ", with email or Google. It's free.",
  "Collega il tuo dispositivo.": "Connect your device.",
  "In Intervals apri l'icona ingranaggio": "In Intervals open the gear icon",
  "sezione": "section",
  "e premi": "and press",
  "su": "on",
  "(o Strava, Polar, Coros, Suunto). Autorizza l'accesso. Per Garmin spunta anche":
    "(or Strava, Polar, Coros, Suunto). Authorise access. For Garmin also tick",
  ": serve a ricevere gli allenamenti sull'orologio.": ": it's needed to receive workouts on your watch.",
  "Aspetta l'import.": "Wait for the import.",
  "Intervals scarica lo storico in qualche minuto (a volte fino a mezz'ora). Se usi Strava, scarica solo ciò che Strava mette a disposizione.":
    "Intervals downloads your history in a few minutes (sometimes up to half an hour). If you use Strava, it only gets what Strava makes available.",
  "Prendi la API key.": "Get the API key.",
  "Sempre in": "Still in",
  "scorri fino in fondo a": "scroll to the bottom to",
  "Copiala e incollala qui sotto.": "Copy it and paste it below.",
  "Copia il tuo Athlete ID.": "Copy your Athlete ID.",
  "È il codice tipo": "It's the code like",
  "che trovi nella stessa sezione": "that you'll find in the same",
  "e nell'indirizzo del tuo calendario su Intervals. Se lo lasci vuoto funziona lo stesso: con la API key riconosco il tuo account.":
    "section and in the URL of your Intervals calendar. If you leave it empty it still works: I recognise your account from the API key.",
  "Premi \"Salva i miei dati\".": "Press \"Save my data\".",
  "Verifico la chiave e importo le attività. Se qualcosa non torna ti avviso qui in alto.":
    "I check the key and import your activities. If something's wrong I'll let you know at the top.",
  "📲 Ricevi questa guida su Telegram": "📲 Get this guide on Telegram",
  "🔒 La chiave resta salvata solo sul tuo profilo, la puoi rigenerare o revocare da Intervals in qualsiasi momento.":
    "🔒 The key is stored only on your profile; you can regenerate or revoke it from Intervals at any time.",
  "Puoi anche saltare questo passaggio e collegarlo dopo: il piano parte lo stesso dalle risposte che hai dato, con meno precisione sui carichi iniziali.":
    "You can also skip this step and connect later: the plan still starts from your answers, with less precision on initial loads.",
  "✓ Intervals collegato": "✓ Intervals connected",
  "API key Intervals.icu": "Intervals.icu API key",
  "incolla la API key": "paste the API key",
  "Athlete ID": "Athlete ID",
  "⌚ Invia gli allenamenti del piano al mio orologio": "⌚ Send my plan's workouts to my watch",
  "Togli la spunta se sull'orologio segui già un altro piano e non vuoi doppioni: leggo comunque le tue attività svolte.":
    "Untick if you already follow another plan on your watch and don't want duplicates: I'll still read your completed activities.",
  "Salva i miei dati": "Save my data",
  "// IL TUO OBIETTIVO": "// YOUR GOAL",
  "Nessuna gara obiettivo": "No target race yet",
  "tra {n} settimane": "in {n} weeks",
  "non indicato": "not set",
  "Disponibilità": "Availability",
  "h/settimana": "h/week",
  "feriali max": "weekdays max",
  "weekend max": "weekend max",
  "Altre gare": "Other races",
  "Modifica gara e obiettivo": "Edit race and goal",
  "Modifica disponibilità": "Edit availability",
  "salvando, il coach ricalibra la tabella da domani.": "when you save, your coach recalibrates the plan from tomorrow.",
  "tempo obiettivo": "target time",
  "Salva priorità e tempo obiettivo": "Save priority and target time",
  "Salva e aggiorna la tabella": "Save and update my plan",
  "Il coach ricalibra le prossime settimane da domani con i nuovi obiettivi e la nuova disponibilità (2-4 minuti). Quello che hai già fatto resta.": "Your coach recalibrates the coming weeks from tomorrow with your new goals and availability (2-4 minutes). What you've already done stays.",
  "Giorno di riposo preferito": "Preferred rest day",
  "Lun": "Mon", "Mar": "Tue", "Mer": "Wed", "Gio": "Thu", "Ven": "Fri", "Sab": "Sat", "Dom": "Sun",
  "Nessuna spunta = decide il coach. In quel giorno non ci saranno sedute.": "None ticked = your coach decides. No sessions on that day.",
  "Riposo": "Rest",
  "lo sceglie il coach": "coach decides",
};
export default en;
