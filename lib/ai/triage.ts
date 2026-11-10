// ============================================================================
// Triage dei messaggi al coach (24/7 Coach): per ogni messaggio dell'atleta
// l'app decide se il piano va rivisto SUBITO (fastidio, sforzo fuori
// programma, settimana stravolta) o se basta tenerne conto nella revisione
// della domenica (desideri, disponibilità, preferenze), e risponde in modo
// umano. Chiamata breve a effort basso: pochi secondi.
// ============================================================================

import { generateStructured } from "@/lib/ai/claude";

export interface Triage {
  decision: "now" | "sunday" | "answer";
  reply: string;
  /** Funzione che l'atleta chiede o suggerisce e che l'app oggi non ha ("" se nessuna). */
  feature_request?: string;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    decision: {
      type: "string",
      enum: ["now", "sunday", "answer"],
      description:
        "now = il piano dei prossimi giorni va cambiato subito (fastidio/infortunio, malattia, sforzo molto lungo fuori programma, viaggio o impedimento che cambia questa settimana). sunday = il messaggio riguarda la settimana prossima o preferenze: lo si tiene per la revisione della domenica. answer = è una domanda o un commento: si risponde e basta, nessuna modifica.",
    },
    feature_request: {
      type: "string",
      description:
        "Se l'atleta chiede o suggerisce una funzione che l'app oggi NON ha (o un miglioramento di come funziona): descrivila in una frase chiara per il team, in italiano. Altrimenti stringa vuota.",
    },
    reply: {
      type: "string",
      description:
        "Risposta breve e concreta all'atleta (2-4 frasi), in italiano, da coach: cosa hai capito e cosa farai (se now: 'rivedo il piano da domani'; se sunday: 'ne tengo conto domenica quando costruisco la settimana'; se answer: la risposta).",
    },
  },
  required: ["decision", "feature_request", "reply"],
} as const;

export async function triageMessage(opts: {
  message: string;
  todayLabel: string; // es. "domenica 18 ottobre"
  upcoming: string; // piano prossimi giorni in testo
  lang?: "it" | "en";
  coachName?: string;
  context?: string; // es. prontezza di oggi
}): Promise<Triage> {
  const res = await generateStructured<Triage>({
    system:
      `Sei ${opts.coachName && opts.coachName !== "Coach" ? `${opts.coachName}, il coach personale dell'atleta su 24/7 Coach` : "24/7 Coach"}, allenatore di endurance.` + " Leggi il messaggio dell'atleta e decidi se il piano va cambiato subito, se basta tenerne conto nella revisione settimanale della domenica, o se è solo da rispondere. Sii concreto, caldo, mai prolisso. Non promettere mai funzioni che l'app non ha. L'app sa fare: cambiare la tabella (subito o domenica), mandare la buonanotte serale su Telegram con l'allenamento di domani, la prontezza e il meteo delle località che l'atleta imposta in app (Dispositivi → Il tuo coach), avvisare quando la tabella cambia, commentare gli allenamenti. Le impostazioni (nome del coach, località meteo, notifiche, giorno di riposo, obiettivi e gare) le cambia l'atleta in app: se te le chiede, digli dove farlo invece di dire che l'hai fatto. Le sedute che l'app manda a Intervals.icu arrivano anche su Zwift e ROUVY, se l'atleta li ha collegati a Intervals: Zwift → su intervals.icu/settings riquadro Zwift → Connect, poi trova le sedute dei prossimi 7 giorni nella home di Zwift e in Workouts → Custom → Intervals.icu (l'FTP su Zwift deve essere uguale a quello di Intervals); ROUVY → su riders.rouvy.com Connected Apps → Intervals.icu → Connect, poi in ROUVY Workouts → My Collections → Intervals.icu (allenamento del giorno). Quindi a «me lo mandi su Zwift/ROUVY?» rispondi di sì e spiega come collegarlo se non l'ha fatto. Non sai invece scegliere un percorso o un allenamento del catalogo ROUVY/Zwift al posto suo: lì consiglia tu che tipo di percorso scegliere. Quando l'atleta chiede confronti con gare passate (mezze, maratone, 10 km) ricevi nel contesto lo storico delle sue corse su quelle distanze: usalo per confrontare tempo, passo, FC media ed efficienza (metri per battito), tenendo conto dello stato di forma del giorno (TSB). Se l'atleta chiede una cosa che l'app non sa ancora fare o propone un'idea per migliorarla: non inventare e non dire solo «non posso»; ringrazia, di' che questa funzione oggi non c'è, che il team ci ragiona per inserirla e che tornerai da lui a breve, e compila feature_request. Le soglie di corsa (FC soglia, passo soglia) l'app le ricalcola da una gara o un test recente se l'atleta scrive «ricalcola le soglie».  Sul calendario Intervals/Garmin: le versioni superate della tabella vengono tolte in automatico a ogni aggiornamento; le attività svolte su Intervals non le puoi cancellare, le cancella l'atleta (le attività doppie Garmin+Strava l'app le esclude già dai calcoli)." + (opts.lang === "en" ? " Write the reply to the athlete in English." : ""),
    prompt: `OGGI: ${opts.todayLabel}\n${opts.context ? `${opts.context}\n` : ""}\nPIANO DEI PROSSIMI GIORNI:\n${opts.upcoming}\n\nMESSAGGIO DELL'ATLETA:\n"${opts.message}"`,
    schema: SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 800,
    effort: "low",
  });
  if (!res.ok || !res.data) {
    return { decision: "now", reply: opts.lang === "en" ? "Got it: I'll review the plan from tomorrow taking this into account." : "Ricevuto: rivedo il piano da domani tenendone conto." };
  }
  return res.data;
}
