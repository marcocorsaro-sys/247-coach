// ============================================================================
// Calcolatore di performance di gara. Modello puro (nessuna dipendenza), tutto
// in unità SI internamente: metri, km, secondi, watt, kg, °C. La conversione
// km/miglia/yard/piedi sta nell'interfaccia (vedi UNIT sotto).
// Il modello è una stima ragionata, non una previsione: ogni formula è
// dichiarata qui e gli esiti vanno letti come ordini di grandezza (±3-5 %).
// ============================================================================

export const UNIT = { YD: 0.9144, MI: 1.609344, FT: 0.3048, LB: 0.45359237 } as const;
export type Water = "mare" | "lago" | "fiume" | "piscina";
export type BikeMode = "speed" | "power" | "ftp";

export interface CalcInput {
  // percorso
  swimM: number; bikeKm: number; bikeDplus: number; runKm: number; runDplus: number; water: Water;
  // nuoto
  swimPace100: number;      // s / 100 m, ritmo di piscina (il modello aggiunge l'acque libere)
  wetsuit: boolean;
  chop: 0 | 1 | 2 | 3;      // mare: calmo … mosso
  crowd: 0 | 1 | 2;         // partenza: onda piccola … lavatrice
  // bici
  bikeMode: BikeMode;
  bikeSpeedFlat: number;    // km/h su piatto, aria ferma
  bikeWatts: number;        // potenza (NP) target
  ftp: number; ifPct: number; // FTP e intensità (0.55-1.1)
  massKg: number; bikeKg: number; cda: number; crr: number;
  descMaxKmh: number;       // tetto in discesa (tecnica/coraggio)
  windKmh: number;          // vento medio sul percorso (km/h): su un giro costa sempre
  // corsa
  runPaceKm: number;        // s / km su piatto, a gambe fresche
  // condizioni
  tempC: number; altitudeM: number; acclimated: boolean;
  t1: number; t2: number;   // s
}

export interface CalcResult {
  swimS: number; t1: number; bikeS: number; t2: number; runS: number; totalS: number;
  swimPaceOw100: number;    // s / 100 m effettivo in acque libere
  bikeAvgKmh: number; bikeFlatKmh: number; watts: number; wkg: number; ifBike: number | null; kj: number; kcal: number;
  runPaceEff: number;       // s / km effettivo
  runPenalty: { fatigue: number; heat: number; altitude: number; elevationS: number };
  segs: { kind: "flat" | "climb" | "descent"; km: number; grade: number; kmh: number; s: number }[];
}

export const DEFAULTS: Record<"full" | "half" | "olympic" | "sprint", Pick<CalcInput, "swimM" | "bikeKm" | "bikeDplus" | "runKm" | "runDplus" | "t1" | "t2" | "ifPct">> = {
  full: { swimM: 3800, bikeKm: 180, bikeDplus: 1200, runKm: 42.195, runDplus: 80, t1: 270, t2: 180, ifPct: 0.72 },
  half: { swimM: 1900, bikeKm: 90, bikeDplus: 600, runKm: 21.0975, runDplus: 40, t1: 180, t2: 120, ifPct: 0.8 },
  olympic: { swimM: 1500, bikeKm: 40, bikeDplus: 250, runKm: 10, runDplus: 20, t1: 120, t2: 60, ifPct: 0.88 },
  sprint: { swimM: 750, bikeKm: 20, bikeDplus: 100, runKm: 5, runDplus: 10, t1: 90, t2: 45, ifPct: 0.92 },
};

export const BASE: CalcInput = {
  ...DEFAULTS.half, water: "lago",
  swimPace100: 110, wetsuit: true, chop: 1, crowd: 1,
  bikeMode: "speed", bikeSpeedFlat: 34, bikeWatts: 200, ftp: 250, massKg: 75, bikeKg: 9, cda: 0.3, crr: 0.004, descMaxKmh: 55, windKmh: 4,
  runPaceKm: 320, tempC: 20, altitudeM: 0, acclimated: false,
};

const G = 9.80665;
const DRIVETRAIN = 0.975;

export function airDensity(tempC: number, altitudeM: number): number {
  const p = 101325 * Math.exp(-altitudeM / 8434);
  return p / (287.05 * (tempC + 273.15));
}

/** Potenza alla ruota (W) richiesta a velocità v (m/s), pendenza g (0.05 = 5 %), vento contrario w (m/s). */
function powerAt(v: number, g: number, w: number, mass: number, cda: number, crr: number, rho: number): number {
  const th = Math.atan(g);
  const va = v + w;
  return 0.5 * rho * cda * va * Math.abs(va) * v + crr * mass * G * Math.cos(th) * v + mass * G * Math.sin(th) * v;
}

/** Velocità (m/s) a potenza alla ruota Pw (bisezione; f non decresce oltre il minimo, una sola radice per Pw ≥ 0). */
export function speedFromWheelPower(Pw: number, g: number, w: number, mass: number, cda: number, crr: number, rho: number): number {
  let lo = 0.01, hi = 40;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (powerAt(mid, g, w, mass, cda, crr, rho) < Pw) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Potenza pedalata (W) per tenere vFlat km/h su piatto, aria ferma, densità standard. */
export function wattsForFlatSpeed(kmh: number, mass: number, cda: number, crr: number): number {
  return powerAt(kmh / 3.6, 0, 0, mass, cda, crr, 1.2) / DRIVETRAIN;
}
export function flatSpeedForWatts(W: number, mass: number, cda: number, crr: number): number {
  return speedFromWheelPower(W * DRIVETRAIN, 0, 0, mass, cda, crr, 1.2) * 3.6;
}

export function bikeWattsOf(i: CalcInput): number {
  const mass = i.massKg + i.bikeKg + 1.5;
  if (i.bikeMode === "power") return i.bikeWatts;
  if (i.bikeMode === "ftp") return i.ftp * i.ifPct;
  return wattsForFlatSpeed(i.bikeSpeedFlat, mass, i.cda, i.crr);
}

export function compute(i: CalcInput): CalcResult {
  // ----- nuoto
  const openWater = i.water === "piscina" ? 0 : 0.03 + i.chop * 0.02 + i.crowd * 0.012; // orientamento, onda, traffico
  const swimF = 1 + openWater - (i.wetsuit ? 0.035 : 0);                                  // la muta dà galleggiamento
  const swimPaceOw100 = i.swimPace100 * swimF;
  const swimS = (i.swimM / 100) * swimPaceOw100;

  // ----- bici (fisica a tre tipi di tratto: salita, discesa, piano)
  const mass = i.massKg + i.bikeKg + 1.5;
  const rho = airDensity(i.tempC, i.altitudeM);
  const W = bikeWattsOf(i);
  const Pw = W * DRIVETRAIN;
  const w = (i.windKmh / 3.6) * 0.4;                // su un percorso ad anello il vento costa sempre: ~40 % del vento medio come contrario netto
  const D = i.bikeKm, up = Math.max(0, i.bikeDplus);
  let dc = up / 50, dd = up / 40;                   // km: salita al 5 %, discesa al 4 %
  const cap = 0.85 * D;
  if (dc + dd > cap && dc + dd > 0) { const s = cap / (dc + dd); dc *= s; dd *= s; }
  const gc = dc > 0 ? up / (dc * 1000) : 0, gd = dd > 0 ? up / (dd * 1000) : 0;
  const df = Math.max(0, D - dc - dd);
  const segs: CalcResult["segs"] = [];
  const add = (kind: "flat" | "climb" | "descent", km: number, g: number, v: number) => {
    if (km <= 0) return;
    segs.push({ kind, km, grade: g, kmh: v * 3.6, s: (km * 1000) / v });
  };
  add("flat", df, 0, speedFromWheelPower(Pw * 0.98, 0, w, mass, i.cda, i.crr, rho));   // il piano un filo sotto la NP…
  add("climb", dc, gc, speedFromWheelPower(Pw * 1.06, gc, w, mass, i.cda, i.crr, rho)); // …la salita un filo sopra; in discesa si ricupera
  const vCoast = speedFromWheelPower(0, -gd, w, mass, i.cda, i.crr, rho);
  add("descent", dd, -gd, Math.min(vCoast, i.descMaxKmh / 3.6));
  const bikeS = segs.reduce((a, s) => a + s.s, 0);
  const kj = segs.reduce((a, s) => a + s.s * (s.kind === "climb" ? 1.06 : s.kind === "flat" ? 0.98 : 0) * W, 0) / 1000;
  const kcal = kj / 4.184 / 0.24;
  const bikeFlatKmh = flatSpeedForWatts(W, mass, i.cda, i.crr);
  const ifBike = i.ftp > 0 ? W / i.ftp : null;

  // ----- corsa
  const full = i.runKm > 30, half = i.runKm > 15;
  const relIF = ifBike ? ifBike / (full ? 0.72 : half ? 0.8 : 0.9) : 1;
  const base = full ? 0.1 : half ? 0.05 : i.runKm > 7 ? 0.025 : 0.015;
  const fatigue = base * Math.min(1.8, Math.max(0.5, 0.45 + 0.55 * relIF)); // bici più forte del solito ⇒ più cara in corsa
  const tc = i.tempC;
  const heatRaw = tc > 12 ? 0.0035 * (Math.min(tc, 20) - 12) + 0.006 * Math.max(0, tc - 20) : 0;
  const heat = heatRaw * (i.acclimated ? 0.6 : 1);
  const altitude = Math.max(0, i.altitudeM - 500) / 1000 * 0.025;
  const runPaceEff = i.runPaceKm * (1 + fatigue + heat + altitude);
  const elevationS = Math.max(0, i.runDplus) * 0.003 * i.runPaceKm;
  const runS = i.runKm * runPaceEff + elevationS;

  const totalS = swimS + i.t1 + bikeS + i.t2 + runS;
  return {
    swimS, t1: i.t1, bikeS, t2: i.t2, runS, totalS, swimPaceOw100,
    bikeAvgKmh: (D / bikeS) * 3600, bikeFlatKmh, watts: W, wkg: W / i.massKg, ifBike, kj, kcal,
    runPaceEff, runPenalty: { fatigue, heat, altitude, elevationS }, segs,
  };
}

// ---------------------------------------------------------------- obiettivo
/** Cerca il fattore k (1 = come adesso) con cui tutte e tre le frazioni vanno più forti per chiudere in targetS. */
export function solveTarget(i: CalcInput, targetS: number): { k: number; input: CalcInput; res: CalcResult; reachable: boolean } {
  const W0 = bikeWattsOf(i);
  const make = (k: number): CalcInput => ({ ...i, swimPace100: i.swimPace100 / k, runPaceKm: i.runPaceKm / k, bikeMode: "power", bikeWatts: W0 * k ** 3 });
  let lo = 0.5, hi = 1.8;
  if (compute(make(hi)).totalS > targetS) { const x = make(hi); return { k: hi, input: x, res: compute(x), reachable: false }; }
  for (let n = 0; n < 50; n++) { const m = (lo + hi) / 2; if (compute(make(m)).totalS > targetS) lo = m; else hi = m; }
  const k = (lo + hi) / 2, x = make(k);
  return { k, input: x, res: compute(x), reachable: true };
}

// ------------------------------------------------------------- sensibilità
export interface Lever { id: string; saveS: number }
/** Quanto tempo cambia con un piccolo miglioramento (valore positivo = risparmio). */
export function levers(i: CalcInput): Lever[] {
  const base = compute(i).totalS;
  const W0 = bikeWattsOf(i);
  const asPower = (x: Partial<CalcInput>): CalcInput => ({ ...i, bikeMode: "power", bikeWatts: W0, ...x });
  const out: Lever[] = [
    { id: "watts", saveS: base - compute(asPower({ bikeWatts: W0 + 5 })).totalS },
    { id: "mass", saveS: base - compute({ ...i, massKg: i.massKg - 1, bikeMode: "power", bikeWatts: W0 }).totalS },
    { id: "cda", saveS: base - compute({ ...i, cda: Math.max(0.15, i.cda - 0.01) }).totalS },
    { id: "swim", saveS: base - compute({ ...i, swimPace100: i.swimPace100 - 3 }).totalS },
    { id: "run", saveS: base - compute({ ...i, runPaceKm: i.runPaceKm - 10 }).totalS },
    { id: "trans", saveS: base - compute({ ...i, t1: Math.max(0, i.t1 - 30), t2: Math.max(0, i.t2 - 30) }).totalS },
    { id: "heat", saveS: base - compute({ ...i, acclimated: true }).totalS },
    { id: "descent", saveS: base - compute({ ...i, descMaxKmh: i.descMaxKmh + 5 }).totalS },
  ];
  if (!i.wetsuit) out.push({ id: "wetsuit", saveS: base - compute({ ...i, wetsuit: true }).totalS });
  return out.filter((l) => l.saveS > 0.5).sort((a, b) => b.saveS - a.saveS);
}

// ---------------------------------------------------------------- formati
export function fmtHMS(s: number, withHours = true): string {
  if (!isFinite(s)) return "–";
  const t = Math.round(s), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return withHours || h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
export function fmtPace(s: number): string {
  if (!isFinite(s) || s <= 0) return "–";
  let m = Math.floor(s / 60), sec = Math.round(s % 60);
  if (sec === 60) { m += 1; sec = 0; }
  return `${m}:${String(sec).padStart(2, "0")}`;
}
/** "1:45", "105", "1h05:00" → secondi; null se non valido. */
export function parseClock(v: string): number | null {
  const s = v.trim().replace(",", ".");
  if (!s) return null;
  const p = s.split(":").map(Number);
  if (p.some((x) => !isFinite(x) || x < 0)) return null;
  if (p.length === 1) return p[0];
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return null;
}
