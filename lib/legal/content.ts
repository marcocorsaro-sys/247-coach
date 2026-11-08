// Testi legali di 24/7 Coach (italiano e inglese). Titolare e contatto in un solo posto.
export const LEGAL = {
  owner: "77OS S.R.L.",
  address: "Via Andrea Solari 11, 20144 Milano (MI), Italia",
  vat: "P.IVA e C.F. 11689230966 · REA MI-2619421",
  email: "dev@77os.it",
  pec: "77ossrl@legalmail.it",
  web: "https://77os.it/it",
  site: "https://247coachai.com",
  updated: "2026-11-02",
};

type Sec = { h: string; p: string[] };
export type Doc = { title: string; lead: string; sections: Sec[] };
type Pair = { it: Doc; en: Doc };

export const PRIVACY: Pair = {
  it: {
    title: "Informativa sulla privacy",
    lead: `24/7 Coach (${LEGAL.site}) è una soluzione di 77OS S.R.L. (https://77os.it) di guida alle gare Ironman e 70.3 e di piani di allenamento generati con intelligenza artificiale. Questa informativa spiega quali dati trattiamo, perché e quali diritti hai (Regolamento UE 2016/679, GDPR). Ultimo aggiornamento: 2 novembre 2026.`,
    sections: [
      { h: "1. Titolare del trattamento", p: [`${LEGAL.owner}, ${LEGAL.address}, ${LEGAL.vat}. Sito: ${LEGAL.web}. Per qualsiasi richiesta sulla privacy scrivi a ${LEGAL.email} (PEC: ${LEGAL.pec}).`] },
      { h: "2. Quali dati raccogliamo", p: [
        "Dati dell'account: nome, indirizzo email e password (conservata solo in forma cifrata) oppure, se accedi con Google, nome, email e foto del profilo forniti da Google.",
        "Dati di allenamento che inserisci tu: obiettivi, gare, disponibilità settimanale, livello, misure e soglie (per esempio peso, frequenza cardiaca, FTP, passo), infortuni o limitazioni che scegli di indicare.",
        "Dati importati da Intervals.icu, solo se li colleghi: attività svolte (durata, distanza, ritmo, potenza, frequenza cardiaca, carico) provenienti da Garmin, Strava o altri dispositivi collegati a Intervals. Conserviamo la tua API key di Intervals per leggere le attività e, se lo consenti, inviare gli allenamenti pianificati al tuo orologio.",
        "Dati tecnici minimi: log di accesso, indirizzo IP e informazioni sul browser, usati per sicurezza e funzionamento del servizio.",
        "Non raccogliamo dati di pagamento: il servizio è gratuito durante la fase alpha (fino al 31 dicembre 2026).",
      ] },
      { h: "3. Finalità e base giuridica", p: [
        "Erogare il servizio, creare e adattare il tuo piano di allenamento (esecuzione del contratto, art. 6.1.b GDPR).",
        "Sicurezza, prevenzione degli abusi e manutenzione tecnica (legittimo interesse, art. 6.1.f).",
        "Comunicazioni di servizio, per esempio avvisi sul piano o recupero della password (esecuzione del contratto).",
        "Dati relativi alla salute o alla condizione fisica, se li inserisci: li trattiamo solo per costruire il tuo piano, sulla base del tuo consenso esplicito (art. 9.2.a), che puoi revocare in ogni momento cancellando il dato o l'account.",
      ] },
      { h: "4. Accesso con Google", p: [
        "Se scegli “Accedi con Google” riceviamo dal tuo account Google solo nome, indirizzo email e foto del profilo, per creare e riconoscere il tuo account. Non accediamo a Gmail, Drive, Calendario né ad altri dati Google.",
        "L'uso e il trasferimento a qualsiasi altra app delle informazioni ricevute dalle API di Google rispetteranno la Google API Services User Data Policy, inclusi i requisiti di Limited Use. I dati Google non sono venduti, non sono usati per pubblicità e non sono condivisi con terzi se non per far funzionare il servizio.",
      ] },
      { h: "5. Intelligenza artificiale", p: [
        "I piani e i testi sono generati con modelli di intelligenza artificiale (Anthropic, Claude). Per generarli inviamo al fornitore le informazioni necessarie sul tuo profilo e sul tuo storico di allenamento. Secondo i termini del fornitore per l'uso via API, questi dati non vengono usati per addestrare i suoi modelli. I contenuti generati possono contenere errori: vedi i Termini di servizio.",
      ] },
      { h: "6. Con chi condividiamo i dati (responsabili del trattamento)", p: [
        "Supabase (database e autenticazione), Vercel (hosting), Anthropic (generazione dei piani), Intervals.icu (solo se lo colleghi, su tua istruzione), Google (solo per l'accesso). Per ricevere avvisi interni sui nuovi iscritti possiamo usare Telegram o email: in quel caso inviamo nome ed email del nuovo iscritto al titolare.",
        "Non vendiamo i tuoi dati e non li usiamo per pubblicità. Alcuni fornitori sono fuori dallo Spazio Economico Europeo (per esempio negli Stati Uniti): il trasferimento avviene con le garanzie previste dal GDPR (clausole contrattuali standard o decisione di adeguatezza).",
      ] },
      { h: "7. Conservazione", p: [
        "Conserviamo i dati finché il tuo account è attivo. Quando elimini l'account cancelliamo o rendiamo anonimi i tuoi dati entro 30 giorni, salvo obblighi di legge. Puoi scollegare Intervals in qualsiasi momento e revocare l'accesso dalle impostazioni del tuo account Intervals o Google.",
      ] },
      { h: "8. I tuoi diritti", p: [
        `Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità dei dati e opporti al trattamento, scrivendo a ${LEGAL.email}. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).`,
      ] },
      { h: "9. Cookie", p: [
        "Usiamo solo cookie tecnici necessari per l'accesso e la sessione. Non usiamo cookie di profilazione né pubblicità.",
      ] },
      { h: "10. Minori", p: ["Il servizio è destinato a persone di almeno 16 anni."] },
      { h: "11. Modifiche", p: ["Se cambiamo questa informativa pubblicheremo la nuova versione su questa pagina, aggiornando la data in alto."] },
    ],
  },
  en: {
    title: "Privacy Policy",
    lead: `24/7 Coach (${LEGAL.site}), a solution by 77OS S.R.L. (https://77os.it), is an Ironman and 70.3 race guide and an AI-generated training plan service. This policy explains what data we process, why, and your rights (EU Regulation 2016/679, GDPR). Last updated: 2 November 2026.`,
    sections: [
      { h: "1. Data controller", p: [`${LEGAL.owner}, ${LEGAL.address}, VAT no. 11689230966. Website: ${LEGAL.web}. For any privacy request write to ${LEGAL.email} (certified email: ${LEGAL.pec}).`] },
      { h: "2. Data we collect", p: [
        "Account data: name, email address and password (stored only in encrypted form) or, if you sign in with Google, the name, email and profile picture provided by Google.",
        "Training data you enter: goals, races, weekly availability, level, measurements and thresholds (for example weight, heart rate, FTP, pace), and any injuries or limitations you choose to share.",
        "Data imported from Intervals.icu, only if you connect it: completed activities (duration, distance, pace, power, heart rate, load) coming from Garmin, Strava or other devices linked to Intervals. We store your Intervals API key to read activities and, if you allow it, to send planned workouts to your watch.",
        "Minimal technical data: access logs, IP address and browser information, used for security and to operate the service.",
        "We do not collect payment data: the service is free during the alpha phase (until 31 December 2026).",
      ] },
      { h: "3. Purposes and legal basis", p: [
        "Providing the service and building and adapting your training plan (performance of a contract, Art. 6(1)(b) GDPR).",
        "Security, abuse prevention and technical maintenance (legitimate interest, Art. 6(1)(f)).",
        "Service communications, for example plan notices or password recovery (performance of a contract).",
        "Health or fitness-related data, if you enter it: processed only to build your plan, on the basis of your explicit consent (Art. 9(2)(a)), which you can withdraw at any time by deleting the data or your account.",
      ] },
      { h: "4. Sign in with Google", p: [
        "If you choose “Sign in with Google” we receive from your Google account only your name, email address and profile picture, to create and recognise your account. We do not access Gmail, Drive, Calendar or any other Google data.",
        "The use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements. Google user data is not sold, not used for advertising and not shared with third parties except as needed to operate the service.",
      ] },
      { h: "5. Artificial intelligence", p: [
        "Plans and texts are generated with AI models (Anthropic, Claude). To generate them we send the provider the information needed about your profile and training history. Under the provider's API terms, this data is not used to train its models. Generated content may contain errors: see the Terms of Service.",
      ] },
      { h: "6. Who we share data with (processors)", p: [
        "Supabase (database and authentication), Vercel (hosting), Anthropic (plan generation), Intervals.icu (only if you connect it, on your instruction), Google (sign-in only). To receive internal alerts about new sign-ups we may use Telegram or email: in that case the new user's name and email are sent to the controller.",
        "We do not sell your data and do not use it for advertising. Some providers are outside the European Economic Area (for example in the United States): transfers rely on the safeguards required by the GDPR (standard contractual clauses or an adequacy decision).",
      ] },
      { h: "7. Retention", p: [
        "We keep data while your account is active. When you delete your account we erase or anonymise your data within 30 days, unless the law requires otherwise. You can disconnect Intervals at any time and revoke access from your Intervals or Google account settings.",
      ] },
      { h: "8. Your rights", p: [
        `You may request access, rectification, erasure, restriction, portability and object to processing by writing to ${LEGAL.email}. You also have the right to lodge a complaint with your data protection authority (in Italy: Garante per la protezione dei dati personali, www.garanteprivacy.it).`,
      ] },
      { h: "9. Cookies", p: ["We use only technical cookies needed for sign-in and the session. We use no profiling cookies and no advertising."] },
      { h: "10. Children", p: ["The service is intended for people aged 16 or over."] },
      { h: "11. Changes", p: ["If we change this policy we will publish the new version on this page and update the date at the top."] },
    ],
  },
};

export const TERMS: Pair = {
  it: {
    title: "Termini di servizio",
    lead: `Usando 24/7 Coach (${LEGAL.site}) accetti questi termini. Ultimo aggiornamento: 2 novembre 2026.`,
    sections: [
      { h: "1. Il servizio", p: ["24/7 Coach offre schede e guide per le gare Ironman e 70.3, un magazine e piani di allenamento generati con intelligenza artificiale, adattati ai dati che inserisci o colleghi (per esempio tramite Intervals.icu)."] },
      { h: "2. Fase alpha e gratuità", p: ["Il servizio è in fase alpha ed è gratuito fino al 31 dicembre 2026. Funzioni, limiti e prezzi possono cambiare: ti avviseremo prima di introdurre un pagamento. Il servizio è fornito “così com'è”, senza garanzia di continuità o assenza di errori."] },
      { h: "3. Non è consulenza medica", p: [
        "I piani e i contenuti hanno scopo informativo e sportivo. Non sostituiscono il parere di un medico o di un allenatore qualificato. Prima di iniziare o cambiare un programma di allenamento, soprattutto in presenza di problemi di salute, consulta un medico. Ti alleni sotto la tua esclusiva responsabilità e devi interrompere l'attività in caso di dolore o malessere.",
      ] },
      { h: "4. Contenuti generati e dati sulle gare", p: [
        "Piani, testi e analisi sono generati con intelligenza artificiale a partire da fonti pubbliche e dai tuoi dati, e possono contenere errori o informazioni non aggiornate (date, percorsi, dislivelli, tempi limite). Verifica sempre le informazioni ufficiali dell'organizzatore prima di iscriverti o partire.",
      ] },
      { h: "5. Marchi e affiliazione", p: [
        "24/7 Coach è un servizio indipendente di 77OS S.R.L. e non è affiliato, sponsorizzato né approvato da The IRONMAN Group né da Challenge Family. “IRONMAN”, “IRONMAN 70.3” e gli altri marchi citati appartengono ai rispettivi proprietari e i nomi delle gare sono usati solo a scopo descrittivo.",
      ] },
      { h: "6. Il tuo account", p: ["Devi avere almeno 16 anni, fornire dati veritieri e custodire le tue credenziali. Sei responsabile dell'attività svolta con il tuo account. Puoi eliminare l'account in qualsiasi momento scrivendoci."] },
      { h: "7. Uso consentito", p: ["Non puoi usare il servizio per scopi illeciti, tentare di accedere a dati altrui, aggirare i limiti tecnici, fare scraping massivo o rivendere i contenuti senza autorizzazione."] },
      { h: "8. Servizi di terze parti", p: ["Il collegamento con Intervals.icu, Garmin, Strava o Google è facoltativo e soggetto ai termini di quei servizi. Puoi revocarlo in qualsiasi momento."] },
      { h: "9. Proprietà intellettuale", p: ["I contenuti, il software e il marchio di 24/7 Coach appartengono a 77OS S.R.L.. Ti concediamo un uso personale e non esclusivo del servizio. I dati che inserisci restano tuoi."] },
      { h: "10. Limitazione di responsabilità", p: ["Nei limiti consentiti dalla legge, il titolare non risponde di danni indiretti, infortuni, mancati risultati sportivi o decisioni prese sulla base dei contenuti del servizio. Restano salvi i diritti inderogabili dei consumatori."] },
      { h: "11. Modifiche e recesso", p: ["Possiamo aggiornare questi termini o il servizio; le modifiche rilevanti saranno comunicate sul sito. Puoi smettere di usare il servizio in ogni momento."] },
      { h: "12. Legge applicabile", p: ["Questi termini sono regolati dalla legge italiana. Per i consumatori resta competente il foro di residenza o domicilio."] },
      { h: "13. Contatti", p: [`${LEGAL.owner} · ${LEGAL.address} · ${LEGAL.vat} · ${LEGAL.email} · PEC ${LEGAL.pec} · ${LEGAL.web}`] },
    ],
  },
  en: {
    title: "Terms of Service",
    lead: `By using 24/7 Coach (${LEGAL.site}) you accept these terms. Last updated: 2 November 2026.`,
    sections: [
      { h: "1. The service", p: ["24/7 Coach provides Ironman and 70.3 race pages and guides, a magazine and AI-generated training plans, adapted to the data you enter or connect (for example through Intervals.icu)."] },
      { h: "2. Alpha phase and free use", p: ["The service is in alpha and free until 31 December 2026. Features, limits and pricing may change: we will tell you before introducing any payment. The service is provided “as is”, with no guarantee of continuity or of being error-free."] },
      { h: "3. Not medical advice", p: ["Plans and content are for information and sport purposes only. They do not replace the advice of a doctor or a qualified coach. Before starting or changing a training programme, especially if you have health issues, consult a physician. You train at your own risk and must stop in case of pain or illness."] },
      { h: "4. Generated content and race data", p: ["Plans, texts and analyses are generated by artificial intelligence from public sources and your data, and may contain errors or outdated information (dates, courses, elevation, cut-off times). Always check the organiser's official information before registering or travelling."] },
      { h: "5. Trademarks and affiliation", p: ["24/7 Coach is an independent service of 77OS S.R.L. and is not affiliated with, sponsored by or endorsed by The IRONMAN Group or Challenge Family. “IRONMAN”, “IRONMAN 70.3” and other trademarks mentioned belong to their respective owners; race names are used descriptively only."] },
      { h: "6. Your account", p: ["You must be at least 16, provide accurate information and keep your credentials safe. You are responsible for activity under your account. You can delete your account at any time by writing to us."] },
      { h: "7. Acceptable use", p: ["You may not use the service for unlawful purposes, try to access other people's data, bypass technical limits, scrape at scale or resell the content without permission."] },
      { h: "8. Third-party services", p: ["Connecting Intervals.icu, Garmin, Strava or Google is optional and subject to those services' terms. You can revoke it at any time."] },
      { h: "9. Intellectual property", p: ["The content, software and brand of 24/7 Coach belong to 77OS S.R.L.. We grant you a personal, non-exclusive right to use the service. The data you enter remains yours."] },
      { h: "10. Limitation of liability", p: ["To the extent permitted by law, the controller is not liable for indirect damages, injuries, missed sporting results or decisions taken on the basis of the service's content. Mandatory consumer rights remain unaffected."] },
      { h: "11. Changes and termination", p: ["We may update these terms or the service; material changes will be announced on the site. You may stop using the service at any time."] },
      { h: "12. Governing law", p: ["These terms are governed by Italian law. For consumers, the courts of their place of residence or domicile remain competent."] },
      { h: "13. Contact", p: [`${LEGAL.owner} · ${LEGAL.address} · ${LEGAL.vat} · ${LEGAL.email} · PEC ${LEGAL.pec} · ${LEGAL.web}`] },
    ],
  },
};
