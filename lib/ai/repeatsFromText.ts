// ============================================================================
// Allineamento delle ripetute al testo della coach.
//
// Gli step strutturati li genera un modello leggendo il testo libero della
// tabella. Sulle ripetute il testo è però perfettamente esplicito — Irene
// scrive "2x (15'' fortini + 15'' facilissimi)" — e lì non serve interpretare:
// si legge. Un atleta ha trovato una piramide in cui il primo e l'ultimo
// blocco erano diventati 30'' invece di 15''; nessun controllo se ne era
// accorto, e la seduta sbagliata è finita sull'orologio.
//
// Qui il testo fa da fonte di verità: dove la struttura letta combacia con
// quella generata, ripetizioni e durate vengono riportate a quelle scritte.
// Dove non combacia non si indovina: si lascia stare e si segnala.
// ============================================================================

import type { AiStep } from "@/lib/ai/plan";

/** Un blocco di ripetute letto dal testo: "2x (15'' + 15'')". */
export interface TextRepeat {
  reps: number;
  /** Durate in secondi dei tratti dentro la parentesi, nell'ordine. */
  durations: number[];
}

/**
 * Normalizza gli apici: le tabelle arrivano da Excel e da telefoni diversi,
 * quindi i minuti sono ’ ‘ ´ ' e i secondi la loro versione doppia oppure ″.
 * Senza questo passaggio "15’’" non somiglia a "15''" e non viene visto.
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[″“”〃]/g, "''")
    .replace(/[′‘’ʼ´`]/g, "'");
}

/** Le durate dentro una parentesi, in secondi e nell'ordine di lettura. */
function durationsIn(group: string): number[] {
  const out: number[] = [];
  // '' e " = secondi, ' = minuti. L'ordine delle alternative conta: il doppio
  // apice va provato per primo, altrimenti "15''" viene letto come 15 minuti.
  const re = /(\d+(?:[.,]\d+)?)\s*(''|"|'|\bsec\b|\bs\b|\bmin\b|\bm\b)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(group)) !== null) {
    const value = parseFloat(m[1].replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) continue;
    const unit = m[2].toLowerCase();
    const seconds =
      unit === "''" || unit === '"' || unit === "sec" || unit === "s"
        ? value
        : value * 60;
    out.push(Math.round(seconds));
  }
  return out;
}

/**
 * Estrae i blocchi "Nx (…)" dal testo della coach, nell'ordine in cui li ha
 * scritti. I blocchi a distanza (nuoto: "8x50mt") vengono ignorati: lì la
 * fonte di verità sono i metri, non i secondi, e non è questo il posto.
 */
export function repeatsFromText(text: string | null | undefined): TextRepeat[] {
  if (!text) return [];
  const src = normalizeQuotes(text);
  const out: TextRepeat[] = [];
  const re = /(\d+)\s*x\s*\(([^)]*)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const reps = parseInt(m[1], 10);
    const group = m[2];
    if (!Number.isFinite(reps) || reps < 1 || reps > 60) continue;
    if (/\d\s*(mt|km|m\b)/i.test(group)) continue; // blocco a distanza
    const durations = durationsIn(group);
    if (durations.length) out.push({ reps, durations });
  }
  return out;
}

/**
 * Riporta ripetizioni e durate degli step generati a quelle scritte nel testo.
 *
 * Corregge solo quando le due letture hanno la stessa forma — stesso numero di
 * blocchi e, dentro ogni blocco, stesso numero di tratti. Se le forme non
 * combaciano il testo dice qualcosa che non abbiamo capito: meglio lasciare
 * gli step del modello che sovrascriverli a caso.
 *
 * Restituisce quanti valori sono stati corretti (0 = nulla da fare).
 */
export function alignRepeatsWithText(
  steps: AiStep[],
  text: string | null | undefined,
): number {
  const wanted = repeatsFromText(text);
  if (!wanted.length) return 0;

  const blocks = steps.filter(
    (s) => s.step_type === "repeat" && s.sub_steps && s.sub_steps.length > 0,
  );
  if (blocks.length !== wanted.length) return 0;

  // Prima si verifica che TUTTI i blocchi combacino per forma: correggerne
  // solo alcuni lascerebbe la seduta a metà, peggio di non toccarla.
  const aligned = blocks.every(
    (b, i) => b.sub_steps!.length === wanted[i].durations.length,
  );
  if (!aligned) return 0;

  let fixed = 0;
  blocks.forEach((block, i) => {
    const want = wanted[i];
    if (block.repeat_count !== want.reps) {
      block.repeat_count = want.reps;
      fixed++;
    }
    block.sub_steps!.forEach((sub, j) => {
      // I tratti a distanza restano com'erano: qui si parla solo di tempo.
      if (sub.duration_seconds == null) return;
      if (sub.duration_seconds !== want.durations[j]) {
        sub.duration_seconds = want.durations[j];
        fixed++;
      }
    });
  });
  return fixed;
}
