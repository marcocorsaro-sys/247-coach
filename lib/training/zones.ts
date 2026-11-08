// ============================================================================
// Calcolo delle zone di allenamento a partire dalla scheda fisiologica.
// Le zone alimentano sia la visualizzazione nella scheda atleta, sia la
// conversione dei target degli step in valori concreti per l'export Garmin.
// ============================================================================

export type Discipline = "swim" | "bike" | "run" | "athletics" | "other";

/** Modello di calcolo delle zone. */
export type ZoneModel = "standard" | "irene";

/** Sottoinsieme di athlete_fitness usato per i calcoli. */
export interface Fitness {
  max_hr: number | null;
  resting_hr: number | null;
  lthr: number | null;
  threshold_pace_run_s_per_km: number | null;
  ftp_watts: number | null;
  css_swim_s_per_100m: number | null;
  /** Tempo (s) del test nuoto 400m max: base del modello passi nuoto di Irene. */
  swim_test_400_s?: number | null;
  /** Modello zone scelto per l'atleta (default "standard"). */
  zone_model?: ZoneModel | string | null;
}

export interface Zone {
  n: number;
  name: string;
  /** Stringa leggibile, es. "150–162 bpm" o "4:30–4:10 /km". */
  range: string;
  /** Limite numerico inferiore (bpm, W, oppure s/km|s/100m). */
  lowVal: number | null;
  /** Limite numerico superiore. */
  highVal: number | null;
}

// --- definizioni dei modelli (percentuali / moltiplicatori) ----------------

const HR_LTHR: { n: number; name: string; lo: number; hi: number }[] = [
  { n: 1, name: "Z1 · Recupero", lo: 0.7, hi: 0.85 },
  { n: 2, name: "Z2 · Fondo", lo: 0.85, hi: 0.89 },
  { n: 3, name: "Z3 · Medio", lo: 0.9, hi: 0.94 },
  { n: 4, name: "Z4 · Soglia", lo: 0.95, hi: 1.0 },
  { n: 5, name: "Z5 · VO2max", lo: 1.0, hi: 1.06 },
];

const HR_MAX: { n: number; name: string; lo: number; hi: number }[] = [
  { n: 1, name: "Z1 · Recupero", lo: 0.6, hi: 0.7 },
  { n: 2, name: "Z2 · Fondo", lo: 0.7, hi: 0.8 },
  { n: 3, name: "Z3 · Medio", lo: 0.8, hi: 0.87 },
  { n: 4, name: "Z4 · Soglia", lo: 0.87, hi: 0.93 },
  { n: 5, name: "Z5 · VO2max", lo: 0.93, hi: 1.0 },
];

// Moltiplicatori del passo soglia (corsa). >1 = più lento.
const PACE_RUN: { n: number; name: string; lo: number; hi: number }[] = [
  { n: 1, name: "Z1 · Recupero", lo: 1.2, hi: 1.4 },
  { n: 2, name: "Z2 · Fondo", lo: 1.1, hi: 1.2 },
  { n: 3, name: "Z3 · Medio", lo: 1.04, hi: 1.1 },
  { n: 4, name: "Z4 · Soglia", lo: 0.99, hi: 1.04 },
  { n: 5, name: "Z5 · VO2max", lo: 0.9, hi: 0.99 },
];

// Coggan power zones (% FTP).
const POWER: { n: number; name: string; lo: number; hi: number }[] = [
  { n: 1, name: "Z1 · Recupero", lo: 0, hi: 0.55 },
  { n: 2, name: "Z2 · Fondo", lo: 0.56, hi: 0.75 },
  { n: 3, name: "Z3 · Medio", lo: 0.76, hi: 0.9 },
  { n: 4, name: "Z4 · Soglia", lo: 0.91, hi: 1.05 },
  { n: 5, name: "Z5 · VO2max", lo: 1.06, hi: 1.2 },
  { n: 6, name: "Z6 · Anaerobico", lo: 1.21, hi: 1.5 },
  { n: 7, name: "Z7 · Neuromusc.", lo: 1.51, hi: 2.0 },
];

// Moltiplicatori della CSS (nuoto). >1 = più lento.
const PACE_SWIM: { n: number; name: string; lo: number; hi: number }[] = [
  { n: 1, name: "Z1 · Recupero", lo: 1.12, hi: 1.25 },
  { n: 2, name: "Z2 · Fondo (A1)", lo: 1.06, hi: 1.12 },
  { n: 3, name: "Z3 · Medio (A2)", lo: 1.02, hi: 1.06 },
  { n: 4, name: "Z4 · Soglia (CSS)", lo: 0.98, hi: 1.02 },
  { n: 5, name: "Z5 · VO2max", lo: 0.9, hi: 0.98 },
];

// === Modello "Irene" (Trisutto, dal foglio Calcolo_TEST) ====================

const isIrene = (f: Fitness) => f.zone_model === "irene";

// Bici: % dell'FTP (= watt medi del test 20' meno 5%).
const POWER_IRENE: { n: number; name: string; lo: number; hi: number }[] = [
  { n: 1, name: "FR · Recupero", lo: 0, hi: 0.55 },
  { n: 2, name: "FL · Fondo lento", lo: 0.56, hi: 0.75 },
  { n: 3, name: "FM · Fondo medio", lo: 0.76, hi: 0.9 },
  { n: 4, name: "SA · Soglia", lo: 0.91, hi: 1.05 },
  { n: 5, name: "VO2 · VO2max", lo: 1.06, hi: 1.2 },
];

// Corsa: % della VELOCITÀ media del test 3/4km. Il passo è base/percentuale
// (più alta è la % di velocità, più veloce è il passo).
const PACE_RUN_IRENE: { n: number; name: string; slowPct: number; fastPct: number }[] = [
  { n: 1, name: "FL · Fondo lento", slowPct: 0.7, fastPct: 0.8 },
  { n: 2, name: "FM · Fondo medio", slowPct: 0.8, fastPct: 0.93 },
  { n: 3, name: "SA · Soglia", slowPct: 0.93, fastPct: 1.03 },
];

// Nuoto: tabella passi derivata dal test 400m max. I valori sono quelli del
// foglio Calcolo_TEST per un 400 da SWIM_T0 secondi e scalano linearmente col
// tempo del test ("cambiando il valore sui 400mt cambiano in automatico").
const SWIM_T0 = 482; // 8:02 del foglio di esempio
const SWIM_DIST = [50, 100, 200, 400] as const;
const SWIM_IRENE: { n: number; name: string; d: Record<number, number> }[] = [
  { n: 1, name: "GA1 · Fondo lento", d: { 50: 67, 100: 143, 200: 287, 400: 589 } },
  { n: 2, name: "GA2 · Fondo medio", d: { 50: 62, 100: 129, 200: 261, 400: 525 } },
  { n: 3, name: "WSA · Soglia", d: { 50: 52, 100: 115, 200: 241, 400: 502 } },
];

// --- formattazione ----------------------------------------------------------

/** Secondi → "m:ss". */
export function fmtPace(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds) || seconds <= 0) return "—";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** "m:ss" o "mm:ss" → secondi. Tollerante (anche solo numero = secondi). */
export function parsePace(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const m = t.match(/^(\d+):([0-5]?\d)$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Velocità in km/h ("12,5" o "12.5") → passo in s/km. */
export function parseSpeedKmh(text: string | null | undefined): number | null {
  if (!text) return null;
  const v = parseFloat(String(text).trim().replace(",", "."));
  if (!isFinite(v) || v <= 0) return null;
  return Math.round(3600 / v);
}

/** Passo in s/km → velocità in km/h (numero, 1 decimale a monte). */
export function paceToKmh(sPerKm: number | null | undefined): number | null {
  if (!sPerKm || sPerKm <= 0) return null;
  return 3600 / sPerKm;
}

/**
 * Etichetta range corsa con passo E velocità. Irene ragiona sempre in km/h,
 * quindi mostriamo entrambi (il passo più veloce = km/h più alto).
 */
function runRangeLabel(fastSpk: number, slowSpk: number): string {
  const kmhHi = (3600 / fastSpk).toFixed(1);
  const kmhLo = (3600 / slowSpk).toFixed(1);
  return `${fmtPace(fastSpk)}–${fmtPace(slowSpk)} /km · ${kmhLo}–${kmhHi} km/h`;
}

// --- generatori di zone ------------------------------------------------------

export function hrZones(f: Fitness): Zone[] {
  if (f.lthr && f.lthr > 0) {
    return HR_LTHR.map((z) => {
      const lo = Math.round(f.lthr! * z.lo);
      const hi = Math.round(f.lthr! * z.hi);
      return { n: z.n, name: z.name, lowVal: lo, highVal: hi, range: `${lo}–${hi} bpm` };
    });
  }
  if (f.max_hr && f.max_hr > 0) {
    return HR_MAX.map((z) => {
      const lo = Math.round(f.max_hr! * z.lo);
      const hi = Math.round(f.max_hr! * z.hi);
      return { n: z.n, name: z.name, lowVal: lo, highVal: hi, range: `${lo}–${hi} bpm` };
    });
  }
  return [];
}

export function runPaceZones(f: Fitness): Zone[] {
  const t = f.threshold_pace_run_s_per_km;
  if (!t || t <= 0) return [];
  if (isIrene(f)) {
    // t = andatura media del test; passo zona = t / percentuale-di-velocità.
    return PACE_RUN_IRENE.map((z) => {
      const fast = Math.round(t / z.fastPct); // %velocità più alta = passo più veloce
      const slow = Math.round(t / z.slowPct);
      return {
        n: z.n,
        name: z.name,
        lowVal: fast,
        highVal: slow,
        range: runRangeLabel(fast, slow),
      };
    });
  }
  return PACE_RUN.map((z) => {
    const fast = Math.round(t * z.lo); // valore minore = più veloce
    const slow = Math.round(t * z.hi);
    return {
      n: z.n,
      name: z.name,
      lowVal: fast,
      highVal: slow,
      range: runRangeLabel(fast, slow),
    };
  });
}

export function powerZones(f: Fitness): Zone[] {
  const ftp = f.ftp_watts;
  if (!ftp || ftp <= 0) return [];
  const model = isIrene(f) ? POWER_IRENE : POWER;
  return model.map((z) => {
    const lo = Math.round(ftp * z.lo);
    const hi = Math.round(ftp * z.hi);
    return { n: z.n, name: z.name, lowVal: lo, highVal: hi, range: `${lo}–${hi} W` };
  });
}

export function swimPaceZones(f: Fitness): Zone[] {
  if (isIrene(f)) {
    const t = f.swim_test_400_s;
    if (!t || t <= 0) return [];
    return SWIM_IRENE.map((z) => {
      const scaled = (d: number) => Math.round(z.d[d] * (t / SWIM_T0));
      const per100 = scaled(100);
      const breakdown = SWIM_DIST.map((d) => `${d}:${fmtPace(scaled(d))}`).join(" · ");
      return {
        n: z.n,
        name: z.name,
        lowVal: per100,
        highVal: per100,
        range: `${fmtPace(per100)} /100m · ${breakdown}`,
      };
    });
  }
  const c = f.css_swim_s_per_100m;
  if (!c || c <= 0) return [];
  return PACE_SWIM.map((z) => {
    const fast = Math.round(c * z.lo);
    const slow = Math.round(c * z.hi);
    return {
      n: z.n,
      name: z.name,
      lowVal: fast,
      highVal: slow,
      range: `${fmtPace(fast)}–${fmtPace(slow)} /100m`,
    };
  });
}

/** Zone "principali" per disciplina, scelte in base ai dati disponibili. */
export function zonesForDiscipline(d: Discipline, f: Fitness): Zone[] {
  switch (d) {
    case "run":
      return runPaceZones(f).length ? runPaceZones(f) : hrZones(f);
    case "bike":
      return powerZones(f).length ? powerZones(f) : hrZones(f);
    case "swim":
      return swimPaceZones(f);
    default:
      return hrZones(f);
  }
}

/** Età in anni interi a partire dalla data di nascita (ISO). */
export function ageFromBirth(birth: string | null | undefined): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
