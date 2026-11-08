// ============================================================================
// Forma dell'atleta — modello impulso/risposta alla TrainingPeaks (PMC):
//   carico giornaliero = somma del training_load delle attività del giorno
//   CTL (fitness)   = media mobile esponenziale a 42 giorni
//   ATL (fatica)    = media mobile esponenziale a 7 giorni
//   TSB (freschezza)= CTL(ieri) − ATL(ieri)
// Il training_load viene da Intervals (icu_training_load: potenza/FC/passo).
// Per i giorni senza attività il carico è 0: la forma decade da sola.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export interface FormPoint {
  date: string; // YYYY-MM-DD
  load: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface FormSummary {
  today: FormPoint;
  series: FormPoint[]; // ultimi 90 giorni
  rampRate: number; // Δ CTL ultimi 7 giorni
  weekLoad: number; // carico ultimi 7 giorni
  state: "fresco" | "in forma" | "neutro" | "affaticato" | "sovraccarico";
  advice: string;
}

const K_CTL = 1 - Math.exp(-1 / 42);
const K_ATL = 1 - Math.exp(-1 / 7);

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function classify(tsb: number, rampRate: number): { state: FormSummary["state"]; advice: string } {
  if (tsb > 15) return { state: "fresco", advice: "Sei riposato: buon momento per un lungo o una seduta di qualità." };
  if (tsb >= -10) return { state: "in forma", advice: "Equilibrio tra carico e recupero: si può costruire." };
  if (tsb >= -25)
    return rampRate > 6
      ? { state: "affaticato", advice: "Carico in salita rapida: attento ai segnali, tieni le facili davvero facili." }
      : { state: "neutro", advice: "Stai assorbendo carico: normale in un blocco di costruzione." };
  return { state: "sovraccarico", advice: "Freschezza molto bassa: serve uno scarico prima di spingere ancora." };
}

/** Calcola CTL/ATL/TSB sugli ultimi `days` giorni (+ 120 di avvio per convergere). */
export async function computeForm(
  db: SupabaseClient,
  athleteId: string,
  days = 90,
): Promise<FormSummary | null> {
  const warm = 120;
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - (days + warm));
  const { data } = await db
    .from("icu_activities")
    .select("start_date, training_load, moving_time_s, average_heartrate").eq("is_duplicate" as never, false as never)
    .eq("athlete_id", athleteId)
    .gte("start_date", from.toISOString())
    .order("start_date");
  const rows = (data ?? []) as { start_date: string | null; training_load: number | null; moving_time_s: number | null; average_heartrate: number | null }[];
  if (!rows.length) return null;

  const loadByDay = new Map<string, number>();
  for (const r of rows) {
    if (!r.start_date) continue;
    const d = r.start_date.slice(0, 10);
    // fallback se Intervals non ha calcolato il load: TRIMP grezzo da durata
    const load = r.training_load ?? (r.moving_time_s ? (r.moving_time_s / 3600) * 55 : 0);
    loadByDay.set(d, (loadByDay.get(d) ?? 0) + load);
  }

  const series: FormPoint[] = [];
  let ctl = 0;
  let atl = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days + warm; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = iso(d);
    const load = loadByDay.get(key) ?? 0;
    const tsb = ctl - atl; // forma di oggi = stato di ieri
    ctl = ctl + K_CTL * (load - ctl);
    atl = atl + K_ATL * (load - atl);
    if (i <= days) series.push({ date: key, load: Math.round(load), ctl: round1(ctl), atl: round1(atl), tsb: round1(tsb) });
  }
  const last = series[series.length - 1];
  const weekAgo = series[Math.max(0, series.length - 8)];
  const rampRate = round1(last.ctl - weekAgo.ctl);
  const weekLoad = series.slice(-7).reduce((s, p) => s + p.load, 0);
  const { state, advice } = classify(last.tsb, rampRate);
  return { today: last, series, rampRate, weekLoad, state, advice };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Riga per il prompt del coach. */
export function formText(f: FormSummary | null): string {
  if (!f) return "FORMA (PMC): nessun dato di carico.";
  const trend = f.series.slice(-28).filter((_, i) => i % 7 === 0).map((p) => `${p.date.slice(5)}: CTL ${Math.round(p.ctl)}/ATL ${Math.round(p.atl)}/TSB ${Math.round(p.tsb)}`).join("; ");
  return `FORMA (modello PMC da Intervals, oggi): CTL (fitness) ${Math.round(f.today.ctl)}, ATL (fatica) ${Math.round(f.today.atl)}, TSB (freschezza) ${Math.round(f.today.tsb)} → ${f.state}. Ramp rate CTL ultimi 7 gg: ${f.rampRate > 0 ? "+" : ""}${f.rampRate}. Carico ultimi 7 gg: ${Math.round(f.weekLoad)}. Andamento: ${trend}. Regola: ramp rate CTL prudente 3-5/settimana, TSB sotto -25 = scarico, TSB +5/+15 nei giorni di gara.`;
}
