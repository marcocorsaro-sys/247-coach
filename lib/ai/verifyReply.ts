// ============================================================================
// Verifica della risposta del coach prima che parta (24/7 Coach).
// Un secondo controllo, separato da chi ha scritto la bozza, rilegge la
// risposta con gli stessi dati (piano, prontezza, attività recenti, storico,
// soglie del profilo) e la corregge se: dice di non poter fare cose che l'app
// fa, contraddice i dati, inventa numeri, sbaglia date o gare, dà consigli
// incoerenti con lo stato di forma. Se è giusta la lascia com'è.
// Attivo per gli atleti con ai_athlete_profiles.verify_replies = true.
// ============================================================================
import { generateStructured } from "@/lib/ai/claude";

export type Verdict = { ok: boolean; issues: string; reply: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ok: { type: "boolean", description: "true se la bozza è corretta e utile così com'è" },
    issues: { type: "string", description: "Se ok=false: elenco breve degli errori trovati (per il registro interno). Vuoto se ok." },
    reply: { type: "string", description: "La risposta finale da mandare all'atleta: identica alla bozza se ok=true, altrimenti la versione corretta, stesso tono e lunghezza simile." },
  },
  required: ["ok", "issues", "reply"],
} as const;

const CAPABILITIES = `COSA L'APP SA FARE DAVVERO (il coach NON deve dire che non può farle):
- vede tutte le attività dell'atleta importate da Intervals.icu (anche lo storico di anni: nel contesto arrivano quelle pertinenti alla domanda) e la prontezza (HRV, FC a riposo, sonno, TSB);
- ricalcola le soglie di corsa quando l'atleta lo chiede («ricalcola le soglie»), dal miglior sforzo degli ultimi 6 mesi;
- rivede il piano subito o nella revisione della domenica; manda i workout su Intervals/Garmin e pulisce i duplicati da solo; tramite Intervals.icu le sedute arrivano anche su Zwift (Workouts → Custom → Intervals.icu, se Zwift è collegato in intervals.icu/settings) e su ROUVY (Workouts → My Collections → Intervals.icu, se Intervals è collegato in ROUVY Connected Apps): dire che «non arrivano su Zwift/ROUVY» è SBAGLIATO;
- manda il messaggio della sera con meteo e seduta di domani, e i commenti dopo gli allenamenti su Telegram.
COSA NON SA FARE: cancellare attività da Intervals/Garmin, cambiare impostazioni dell'orologio, leggere dati che non sono su Intervals.
Se l'atleta chiede una funzione che non c'è o propone un miglioramento, la risposta giusta è: grazie, oggi non c'è, il team ci ragiona per inserirla e il coach torna da lui a breve. Correggi le bozze che rifiutano seccamente o che fingono di poterlo fare.`;

export async function verifyCoachReply(opts: {
  coachName: string;
  message: string;
  draft: string;
  decision: string;
  context: string; // tutto il contesto dato alla bozza + soglie del profilo
  todayLabel: string;
  upcoming: string;
}): Promise<Verdict | null> {
  const res = await generateStructured<Verdict>({
    system: `Sei il responsabile tecnico che controlla le risposte di ${opts.coachName}, coach AI di endurance su 24/7 Coach, prima che arrivino all'atleta. Controlla con rigore la bozza contro i dati: numeri (tempi, passi, FC, distanze, date) presi davvero dal contesto e calcolati bene; gare riconosciute correttamente (data, ora, distanza, non il nome generico dell'orologio); nessun rifiuto o "non posso" su cose che l'app sa fare; nessuna promessa di cose che non sa fare; consiglio coerente con stato di forma, piano e vicinanza alle gare; risposta che risponde davvero alla domanda. Se la bozza è giusta lasciala identica. Se è sbagliata o elusiva riscrivila tu, con i dati del contesto, nella voce di ${opts.coachName}, in italiano, concisa. Non aggiungere mai frasi sul fatto che la risposta è stata controllata.\n\n${CAPABILITIES}`,
    prompt: `OGGI: ${opts.todayLabel}\n${opts.context}\n\nPIANO DEI PROSSIMI GIORNI:\n${opts.upcoming}\n\nMESSAGGIO DELL'ATLETA:\n"${opts.message}"\n\nDECISIONE DELLA BOZZA: ${opts.decision}\nBOZZA DI RISPOSTA:\n"${opts.draft}"`,
    schema: SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 2000,
    effort: "medium",
  });
  return res.ok && res.data ? res.data : null;
}
