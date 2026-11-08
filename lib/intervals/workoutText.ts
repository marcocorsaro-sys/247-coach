// ============================================================================
// Conversione degli step strutturati di una sessione nel TESTO workout di
// Intervals.icu (che lo interpreta in step strutturati e, con "Upload planned
// workouts" attivo, lo sincronizza su Garmin Connect).
//
// Priorità dei target (fedeltà ai numeri della coach):
//  1. RANGE PERSONALIZZATI incollati da Irene (athlete_custom_zones): il testo
//     del range viene riusato quasi verbatim come target assoluto;
//  2. zone calcolate dal modello (valori assoluti: passo s/km, bpm, watt);
//  3. testo libero dello step (target_unit) così com'è.
// Le righe che Intervals non riesce a interpretare restano visibili come testo:
// il peggio che può succedere è un allenamento "testuale", mai numeri inventati.
// ============================================================================

import {
  type Discipline,
  type Fitness,
  fmtPace,
  hrZones,
  runPaceZones,
  powerZones,
  swimPaceZones,
} from "@/lib/training/zones";
import type { CustomZones } from "@/lib/training/customZones";

export interface IcuStepRow {
  id: string;
  parent_step_id: string | null;
  sort_order: number;
  step_type: string;
  repeat_count: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  raw_fragment: string | null;
  target_type: string | null;
  target_low: number | null;
  target_high: number | null;
  target_unit: string | null;
  recovery_text: string | null;
  note: string | null;
  cadence_rpm?: number | null;
}

/** Tipo attività Intervals per la disciplina. */
export function icuType(d: Discipline): string {
  if (d === "run") return "Run";
  if (d === "bike") return "Ride";
  if (d === "swim") return "Swim";
  if (d === "athletics") return "WeightTraining";
  return "Workout";
}

/** Durata/misura dello step nella sintassi Intervals ("10m", "90s", "75mtr"). */
function fmtMeasure(row: IcuStepRow): string {
  const s = row.duration_seconds;
  if (s && s > 0) {
    if (s % 60 === 0) return `${s / 60}m`;
    if (s > 90 && s % 30 === 0) return `${Math.floor(s / 60)}m${s % 60}s`;
    return `${s}s`;
  }
  const m = row.distance_meters;
  if (m && m > 0) {
    // Le distanze vanno in METRI, non in km: in km i 75m diventavano "0.07km"
    // (toFixed(2) tronca 0.075) e la vasca da 75 arrivava all'orologio come 70
    // — segnalato dall'atleta. Attenzione: in Intervals "75m" significa 75
    // MINUTI, l'unità dei metri è "mtr" (verificato via API).
    const meters = Math.round(m);
    if (meters < 1000) return `${meters}mtr`;
    const km = meters / 1000;
    return `${Number.isInteger(km) ? km : parseFloat(km.toFixed(3))}km`;
  }
  return "";
}

/** true se il testo sembra un range di passo "4:19-4:05" (senza unità). */
const PACE_RANGE = /^\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/;
const PACE_SINGLE = /^[<>]?\s*\d{1,2}:\d{2}$/;

/** Normalizza il range personalizzato in un target Intervals plausibile. */
function normalizeCustomRange(text: string, d: Discipline): string {
  const t = text.trim().replace(/–/g, "-");
  // Un passo senza la parola chiave "Pace" viene ignorato dal parser di
  // Intervals: se il testo contiene già l'unità del passo la si aggiunge qui.
  if (/\/km|\/100m/i.test(t)) return /pace/i.test(t) ? t : `${t} Pace`;
  const hasUnit = /bpm|w\b|watt|%/i.test(t);
  if (hasUnit) return t;
  if (d === "run" && (PACE_RANGE.test(t) || PACE_SINGLE.test(t))) return `${t}/km Pace`;
  if (d === "swim" && (PACE_RANGE.test(t) || PACE_SINGLE.test(t))) return `${t}/100m Pace`;
  return t; // bici a FC o altro: verbatim (Irene scrive già l'unità quando serve)
}

// --- estrazione robusta dei numeri dai range incollati dalla coach ---------
// I range arrivano in formati liberi ("6' 07'' - 5' 40''", "165 - 224",
// "/  facile-moderato - Z2 …"): Intervals però capisce solo target puliti
// ("6:07-5:40/km", "165-224W"). Qui si estraggono i numeri e si ricompone
// un target che l'orologio sa usare.

/** Ampiezza del lato "aperto" di una zona scritta con < o > (vedi sotto). */
const OPEN_SPAN_RUN = 90; // s/km
const OPEN_SPAN_SWIM = 25; // s/100m

/** Passi "M:SS" (in secondi) da testi tipo "6' 07''", "6:07", "6’07”". */
function extractPaces(text: string): number[] {
  const out: number[] = [];
  const re = /(\d{1,2})\s*[:'’′]\s*(\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(Number(m[1]) * 60 + Number(m[2]));
  return out;
}

/** Interi (watt/bpm) escludendo le cifre che appartengono a un passo. */
function extractInts(text: string): number[] {
  const cleaned = text.replace(/(\d{1,2})\s*[:'’′]\s*(\d{2})/g, " ");
  return (cleaned.match(/\d{2,4}/g) ?? []).map(Number);
}

/**
 * FC in sintassi che Intervals capisce: i bpm assoluti vengono IGNORATI dal
 * parser (verificato via API: "10m 150-162bpm", "150bpm HR", "HR 150-162" →
 * nessun target); funzionano solo "%  HR" (percentuale della soglia) e
 * "Zn HR" (zona). Se conosciamo la soglia (LTHR) convertiamo i bpm in
 * percentuale precisa, altrimenti ripieghiamo sulla zona.
 */
function hrTarget(loBpm: number, hiBpm: number, loZ: number, hiZ: number, f: Fitness): string {
  if (f.lthr && f.lthr > 0) {
    const lo = Math.round((loBpm / f.lthr) * 100);
    const hi = Math.round((hiBpm / f.lthr) * 100);
    return lo === hi ? `${lo}% HR` : `${lo}-${hi}% HR`;
  }
  const zl = Math.max(1, Math.min(5, Math.round(loZ)));
  const zh = Math.max(1, Math.min(5, Math.round(hiZ)));
  return zl === zh ? `Z${zl} HR` : `Z${zl}-Z${zh} HR`;
}

/**
 * Target assoluto pulito da uno o due range personalizzati (lo=zona bassa,
 * hi=zona alta dello step). Ritorna null se dal testo non esce nessun numero.
 */
function customZoneTarget(
  loText: string,
  hiText: string,
  d: Discipline,
  f: Fitness,
  loZ: number,
  hiZ: number,
): string | null {
  if (d === "run" || d === "swim") {
    // La parola chiave "Pace" è OBBLIGATORIA: senza, il parser di Intervals
    // ignora il valore e lo step arriva all'orologio senza target
    // (verificato via API: "4m 5:30/km" → solo durata, "4m 5:30/km Pace" → ok).
    const unit = d === "run" ? "/km" : "/100m";
    const all = [...extractPaces(loText), ...extractPaces(hiText)];
    if (!all.length) return null;
    const slow = Math.max(...all);
    const fast = Math.min(...all);
    if (slow !== fast) return `${fmtPace(slow)}-${fmtPace(fast)}${unit} Pace`;
    // Zona APERTA: la coach scrive un solo numero con "<" o ">"
    // (es. "riscaldamento Z1 > 6'07''" = più lento di 6:07). Mandando il
    // valore da solo, l'orologio lo trasforma in una forbice STRETTA attorno
    // ad esso (5:58-6:16) — cioè l'opposto di "vai piano quanto vuoi".
    // Si costruisce quindi il lato mancante del range.
    const span = d === "run" ? OPEN_SPAN_RUN : OPEN_SPAN_SWIM;
    const both = `${loText} ${hiText}`;
    if (/>/.test(both)) return `${fmtPace(fast + span)}-${fmtPace(fast)}${unit} Pace`;
    if (/</.test(both)) {
      return `${fmtPace(fast)}-${fmtPace(Math.max(30, fast - span))}${unit} Pace`;
    }
    return `${fmtPace(fast)}${unit} Pace`;
  }
  // bici (watt) o generico (bpm)
  const nums = [...extractInts(loText), ...extractInts(hiText)].filter((n) => n >= 40 && n <= 2000);
  if (!nums.length) return null;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const both = `${loText} ${hiText}`;
  const isHr = /bpm|\bfc\b|cardio/i.test(both) && !/w\b|watt|pedal/i.test(both);
  if (isHr) return hrTarget(lo, hi, loZ, hiZ, f);
  return lo === hi ? `${lo}W` : `${lo}-${hi}W`;
}

/**
 * Target assoluto per una coppia di zone 1-N: prima i range personalizzati
 * della coach (ripuliti), poi le zone calcolate dal modello. Le righe di
 * intestazione senza numeri (es. "WATT / Pedali") vengono ignorate.
 */
function zoneAbsoluteTarget(
  loZ: number,
  hiZ: number,
  d: Discipline,
  f: Fitness,
  custom: CustomZones,
): string {
  const list = (custom[d] ?? []).filter((z) => /\d/.test(z.range));
  if (list.length) {
    const idx = (n: number) => Math.max(0, Math.min(list.length - 1, Math.round(n) - 1));
    const lo = list[idx(loZ)];
    const hi = list[idx(hiZ)];
    const merged = customZoneTarget(lo.range, hi.range, d, f, loZ, hiZ);
    if (merged) return merged;
    // testo senza numeri interpretabili: comportamento precedente (verbatim)
    const loTxt = normalizeCustomRange(lo.range, d);
    if (hi !== lo) return `${loTxt} ${normalizeCustomRange(hi.range, d)}`;
    return loTxt;
  }
  return computedTarget(loZ, hiZ, d, f);
}

/** RPE → zona equivalente (1-2→Z1, 3-4→Z2, 5-6→Z3, 7-8→Z4, 9+→Z5). */
function rpeToZone(rpe: number): number {
  if (rpe <= 2) return 1;
  if (rpe <= 4) return 2;
  if (rpe <= 6) return 3;
  if (rpe <= 8) return 4;
  return 5;
}

/** Target assoluto dalle zone CALCOLATE (fallback quando mancano i range di Irene). */
function computedTarget(loZ: number, hiZ: number, d: Discipline, f: Fitness): string {
  const pick = <T extends { n: number }>(zs: T[], n: number) =>
    zs.find((z) => z.n === Math.max(1, Math.min(zs.length, Math.round(n))));
  if (d === "run") {
    const zs = runPaceZones(f);
    const lo = pick(zs, loZ);
    const hi = pick(zs, hiZ);
    if (lo?.highVal && hi?.lowVal) return `${fmtPace(lo.highVal)}-${fmtPace(hi.lowVal)}/km Pace`;
  }
  if (d === "bike") {
    const zs = powerZones(f);
    const lo = pick(zs, loZ);
    const hi = pick(zs, hiZ);
    if (lo?.lowVal && hi?.highVal) return `${Math.round(lo.lowVal)}-${Math.round(hi.highVal)}W`;
  }
  if (d === "swim") {
    // lowVal = estremo veloce, highVal = estremo lento (come nella corsa):
    // il range va scritto lento→veloce, altrimenti su una zona sola i due
    // estremi coincidevano ("2:24-2:24") e il target perdeva ampiezza.
    const zs = swimPaceZones(f);
    const lo = pick(zs, loZ);
    const hi = pick(zs, hiZ);
    if (lo?.highVal && hi?.lowVal) return `${fmtPace(lo.highVal)}-${fmtPace(hi.lowVal)}/100m Pace`;
  }
  const hz = hrZones(f);
  const lo = pick(hz, loZ);
  const hi = pick(hz, hiZ);
  if (lo?.lowVal && hi?.highVal) {
    return hrTarget(Math.round(lo.lowVal), Math.round(hi.highVal), loZ, hiZ, f);
  }
  return "";
}

/** Target di uno step come testo assoluto (mai "Z2": sempre numeri). */
function targetText(
  row: IcuStepRow,
  d: Discipline,
  f: Fitness,
  custom: CustomZones,
): string {
  if (row.target_type === "zone" && row.target_low != null) {
    return zoneAbsoluteTarget(row.target_low, row.target_high ?? row.target_low, d, f, custom);
  }
  if (row.target_type === "rpe" && row.target_low != null) {
    // L'orologio non capisce l'RPE: si traduce nella zona equivalente e si
    // manda il passo/potenza assoluto; l'RPE resta leggibile nelle note.
    const loZ = rpeToZone(row.target_low);
    const hiZ = rpeToZone(row.target_high ?? row.target_low);
    const abs = zoneAbsoluteTarget(loZ, hiZ, d, f, custom);
    if (abs) return abs;
    return `RPE ${row.target_low}`;
  }
  if (row.target_unit?.trim()) return row.target_unit.trim();
  return "";
}

/**
 * La nota della coach ("pinne, facili", "recupero da fermo", "camminata"):
 * va in fondo alla riga, DOPO il target. Verificato via API che il parser di
 * Intervals ignora il testo in coda anche quando contiene numeri
 * ("Pinne: 75mt facili RPE 1-2" → step invariato), mentre una nota su riga
 * separata gli fa perdere il target: quindi sempre in coda, mai a capo.
 */
function noteSuffix(row: IcuStepRow): string {
  const raw = (row.note ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const short = raw.length > 70 ? `${raw.slice(0, 69).trimEnd()}…` : raw;
  return ` ${short}`;
}

function leafLine(
  row: IcuStepRow,
  d: Discipline,
  f: Fitness,
  custom: CustomZones,
  lapPress = false,
): string {
  const dur = fmtMeasure(row);
  const tgt = targetText(row, d, f, custom);
  const cad = row.cadence_rpm && row.cadence_rpm > 0 ? `${Math.round(row.cadence_rpm)}rpm` : "";
  const rec = row.recovery_text?.trim() ? ` rec ${row.recovery_text.trim()}` : "";
  // "press lap": lo step dura finché l'atleta non preme il tasto giro
  // (verificato: Intervals lo traduce in until_lap_press). Utile per uscire
  // di città in bici prima di iniziare il lavoro vero. La durata va SEMPRE
  // lasciata — fa da limite massimo — altrimenti la riga non ha misura e il
  // parser la scarta insieme all'intero step (verificato via API).
  const lap = lapPress && dur ? " press lap" : "";
  const body = [dur, tgt, cad].filter(Boolean).join(" ");
  if (body) return `- ${body}${lap}${rec}${noteSuffix(row)}`;
  // niente misura né target: tengo comunque la riga come testo leggibile
  const free = row.raw_fragment?.trim() || row.note?.trim() || "step";
  return `- ${free}${lap}${rec}`;
}

const SECTION: Record<string, string> = {
  warmup: "Warmup",
  cooldown: "Cooldown",
};

/**
 * Totali della sessione dagli step (ripetute moltiplicate): secondi per gli
 * step a tempo, metri per quelli a distanza. Servono per il titolo dell'evento.
 */
export function totalsFromSteps(steps: IcuStepRow[]): { seconds: number; meters: number } {
  const top = steps.filter((s) => !s.parent_step_id);
  const childrenOf = (pid: string) => steps.filter((s) => s.parent_step_id === pid);
  let seconds = 0;
  let meters = 0;
  const add = (r: IcuStepRow, mult: number) => {
    if (r.duration_seconds && r.duration_seconds > 0) seconds += r.duration_seconds * mult;
    else if (r.distance_meters && r.distance_meters > 0) meters += r.distance_meters * mult;
  };
  for (const row of top) {
    if (row.step_type === "repeat") {
      const reps = row.repeat_count && row.repeat_count > 0 ? row.repeat_count : 1;
      for (const c of childrenOf(row.id)) add(c, reps);
    } else {
      add(row, 1);
    }
  }
  return { seconds, meters };
}

/**
 * Resa TESTUALE del workout nella sintassi Intervals.
 *
 * Non è più ciò che viaggia verso l'orologio (vedi buildIcuWorkoutDoc e la
 * nota sulla precedenza in icuPush): resta la rappresentazione leggibile,
 * usata per i test e per capire a colpo d'occhio cosa produrrebbe una seduta.
 * Ritorna null se non ci sono step.
 */
export function buildIcuWorkoutText(opts: {
  steps: IcuStepRow[];
  discipline: Discipline;
  fitness: Fitness;
  customZones: CustomZones;
  /** Riscaldamento aperto fino al tasto giro (preferenza dell'atleta). */
  warmupLapPress?: boolean;
}): string | null {
  const { steps, discipline, fitness, customZones, warmupLapPress } = opts;
  // Solo bici e corsa: in vasca il tasto giro serve ad altro, e il
  // riscaldamento a distanza non ha senso "aperto".
  const lapOk = warmupLapPress === true && (discipline === "bike" || discipline === "run");
  const top = steps
    .filter((s) => !s.parent_step_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  if (top.length === 0) return null;

  const childrenOf = (pid: string) =>
    steps.filter((s) => s.parent_step_id === pid).sort((a, b) => a.sort_order - b.sort_order);

  const lines: string[] = [];
  for (const row of top) {
    if (row.step_type === "repeat") {
      const reps = row.repeat_count && row.repeat_count > 0 ? row.repeat_count : 1;
      lines.push("");
      lines.push(`${reps}x`);
      for (const c of childrenOf(row.id)) {
        lines.push(leafLine(c, discipline, fitness, customZones));
      }
      lines.push("");
      continue;
    }
    const section = SECTION[row.step_type];
    if (section) {
      lines.push("");
      lines.push(section);
    }
    lines.push(
      leafLine(row, discipline, fitness, customZones, lapOk && row.step_type === "warmup"),
    );
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ===========================================================================
// Documento strutturato (workout_doc)
//
// Il TESTO qui sopra viene interpretato da Intervals e resta leggibile
// nell'app, ma il testo in coda alla riga (le note della coach) si ferma lì:
// non arriva all'orologio. Il campo che Intervals mostra sul dispositivo è
// "Testo da mostrare all'atleta", cioè `text` dentro workout_doc — quindi le
// note vanno mandate ANCHE per quella via.
//
// Le forme dei campi sono quelle che il parser di Intervals produce da solo
// (verificate creando eventi di prova e rileggendoli via API), così il
// documento che costruiamo è indistinguibile dal suo.
// ===========================================================================

export interface IcuDocStep {
  duration?: number;
  distance?: number;
  pace?: { units: string; value?: number; start?: number; end?: number };
  power?: { units: string; value?: number; start?: number; end?: number };
  hr?: { units: string; value?: number; start?: number; end?: number };
  cadence?: { units: string; value: number };
  warmup?: boolean;
  cooldown?: boolean;
  until_lap_press?: boolean;
  text?: string;
  reps?: number;
  steps?: IcuDocStep[];
}

function paceToSecs(t: string): number | null {
  const m = t.match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Traduce il target testuale che abbiamo appena costruito nella forma del
 * documento. Le stringhe le generiamo noi (vedi targetText), quindi il
 * riconoscimento è esatto e non "indovinato".
 */
function docTarget(tgt: string): Pick<IcuDocStep, "pace" | "power" | "hr"> {
  if (!tgt) return {};
  const isPace = /\/km|\/100m/.test(tgt);
  if (isPace) {
    const units = tgt.includes("/100m") ? "secs/100m" : "secs/km";
    const parts = tgt.match(/\d{1,2}:\d{2}/g) ?? [];
    const [p0, p1] = parts;
    if (p0 && p1) {
      const a = paceToSecs(p0);
      const b = paceToSecs(p1);
      if (a != null && b != null) return { pace: { units, start: a, end: b } };
    }
    const one = paceToSecs(tgt);
    if (one != null) return { pace: { units, value: one } };
    return {};
  }
  if (/\bZ[1-5]\b/i.test(tgt) && /HR/i.test(tgt)) {
    const z = tgt.match(/Z([1-5])/i);
    if (z) return { hr: { units: "hr_zone", value: Number(z[1]) } };
  }
  const nums = (tgt.match(/\d+/g) ?? []).map(Number);
  if (!nums.length) return {};
  const isHr = /HR/i.test(tgt);
  const units = isHr ? "%hr" : "w";
  const key = isHr ? "hr" : "power";
  const body =
    nums.length >= 2 ? { units, start: nums[0], end: nums[1] } : { units, value: nums[0] };
  return { [key]: body } as Pick<IcuDocStep, "power" | "hr">;
}

function docLeaf(
  row: IcuStepRow,
  d: Discipline,
  f: Fitness,
  custom: CustomZones,
  lapPress: boolean,
): IcuDocStep {
  const step: IcuDocStep = {};
  if (row.duration_seconds && row.duration_seconds > 0) step.duration = row.duration_seconds;
  else if (row.distance_meters && row.distance_meters > 0) {
    step.distance = Math.round(row.distance_meters);
  }

  // Nel nuoto il passo viaggia come NOTA, non come target — la stessa scelta
  // che fa TrainingPeaks. Due ragioni, entrambe segnalate da chi nuota:
  //  - con pinne o palette il passo previsto non ha più senso e l'orologio
  //    vibra a vuoto per tutta la vasca;
  //  - Garmin, sui workout di nuoto importati, mostra comunque il passo in
  //    min/km invece che in min/100m: un numero che non vuol dire niente.
  // Restando una nota, l'atleta il riferimento ce l'ha e nessuno lo richiama.
  const tgt = targetText(row, d, f, custom);
  const paceAsNote = d === "swim" && /\/100m|\/km/.test(tgt);
  if (!paceAsNote) Object.assign(step, docTarget(tgt));

  if (row.cadence_rpm && row.cadence_rpm > 0) {
    step.cadence = { units: "rpm", value: Math.round(row.cadence_rpm) };
  }
  if (row.step_type === "warmup") step.warmup = true;
  if (row.step_type === "cooldown") step.cooldown = true;
  if (lapPress) step.until_lap_press = true;

  // Testo mostrato sull'orologio: la nota della coach, più il recupero e la
  // cadenza (che su molti computerini non compaiono come secondo target).
  const bits = [
    // Il passo del nuoto apre la riga: sta sostituendo un target, e se il
    // testo va tagliato è l'ultima cosa che deve sparire.
    paceAsNote ? tgt.replace(/\s*Pace\s*$/i, "").trim() : "",
    (row.note ?? "").replace(/\s+/g, " ").trim(),
    row.recovery_text?.trim() ? `rec ${row.recovery_text.trim()}` : "",
    row.cadence_rpm && row.cadence_rpm > 0 ? `${Math.round(row.cadence_rpm)} rpm` : "",
    lapPress ? "premi LAP per iniziare" : "",
  ].filter(Boolean);
  if (bits.length) {
    const txt = bits.join(" · ");
    step.text = txt.length > 80 ? `${txt.slice(0, 79).trimEnd()}…` : txt;
  }
  return step;
}

/**
 * Documento strutturato della sessione. Ritorna null se non ci sono step
 * (in quel caso viaggia solo il testo libero).
 */
export function buildIcuWorkoutDoc(opts: {
  steps: IcuStepRow[];
  discipline: Discipline;
  fitness: Fitness;
  customZones: CustomZones;
  warmupLapPress?: boolean;
}): { steps: IcuDocStep[] } | null {
  const { steps, discipline, fitness, customZones, warmupLapPress } = opts;
  const lapOk = warmupLapPress === true && (discipline === "bike" || discipline === "run");
  const top = steps.filter((s) => !s.parent_step_id).sort((a, b) => a.sort_order - b.sort_order);
  if (top.length === 0) return null;
  const childrenOf = (pid: string) =>
    steps.filter((s) => s.parent_step_id === pid).sort((a, b) => a.sort_order - b.sort_order);

  const out: IcuDocStep[] = [];
  for (const row of top) {
    if (row.step_type === "repeat") {
      const reps = row.repeat_count && row.repeat_count > 0 ? row.repeat_count : 1;
      const kids = childrenOf(row.id).map((c) =>
        docLeaf(c, discipline, fitness, customZones, false),
      );
      if (kids.length) out.push({ reps, text: `${reps}x`, steps: kids });
      continue;
    }
    out.push(
      docLeaf(row, discipline, fitness, customZones, lapOk && row.step_type === "warmup"),
    );
  }
  return out.length ? { steps: out } : null;
}
