// ============================================================================
// Generatore di file .FIT Workout (formato workout nativo Garmin) dagli step
// strutturati di una sessione, tramite l'SDK ufficiale @garmin/fitsdk (gestisce
// header, definition messages e CRC). Il file si copia nell'orologio via USB in
// GARMIN/NEWFILES e viene importato come allenamento.
//
// Offset FIT dei target custom:
//  - FC:     bpm + 100   (1..100 = %max, 100+ = bpm assoluti)
//  - Potenza: watt + 1000 (0..1000 = %FTP, 1000+ = watt assoluti)
//  - Velocità: m/s * 1000 (mm/s)
// ============================================================================

import {
  type Discipline,
  type Fitness,
  hrZones,
  runPaceZones,
  powerZones,
} from "./zones";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - @garmin/fitsdk non espone tipi TS
import { Encoder, Profile } from "@garmin/fitsdk";

export interface FitStepRow {
  id: string;
  parent_step_id: string | null;
  sort_order: number;
  step_type: string; // warmup|interval|recovery|steady|cooldown|rest|repeat
  repeat_count: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  target_type: string | null; // zone|rpe|open|...
  target_low: number | null;
  target_high: number | null;
  cadence_rpm: number | null;
  note: string | null;
}

// enum FIT (valori numerici, indipendenti dai nomi del Profile)
const FILE_WORKOUT = 5;
const SPORT: Record<string, number> = { swim: 5, bike: 2, run: 1, athletics: 0, other: 0 };
const INT_ACTIVE = 0, INT_REST = 1, INT_WARMUP = 2, INT_COOLDOWN = 3;
const DUR_TIME = 0, DUR_DISTANCE = 1, DUR_OPEN = 5, DUR_REPEAT = 6;
const TGT_SPEED = 0, TGT_HR = 1, TGT_OPEN = 2, TGT_POWER = 4;

function intensity(stepType: string): number {
  if (stepType === "warmup") return INT_WARMUP;
  if (stepType === "cooldown") return INT_COOLDOWN;
  if (stepType === "recovery" || stepType === "rest") return INT_REST;
  return INT_ACTIVE;
}

function clampZone(z: number, max: number): number {
  return Math.max(1, Math.min(max, Math.round(z)));
}

interface Target {
  targetType: number;
  low?: number;
  high?: number;
}
const OPEN: Target = { targetType: TGT_OPEN };

function hrTarget(loZ: number, hiZ: number, f: Fitness): Target {
  const hz = hrZones(f);
  if (hz.length) {
    const lo = hz.find((z) => z.n === clampZone(loZ, hz.length));
    const hi = hz.find((z) => z.n === clampZone(hiZ, hz.length));
    if (lo?.lowVal && hi?.highVal) {
      return { targetType: TGT_HR, low: Math.round(lo.lowVal) + 100, high: Math.round(hi.highVal) + 100 };
    }
  }
  return OPEN;
}

function resolveTarget(row: FitStepRow, d: Discipline, f: Fitness): Target {
  if (row.target_type !== "zone" || row.target_low == null) return OPEN;
  const loZ = row.target_low;
  const hiZ = row.target_high ?? row.target_low;

  if (d === "run") {
    const pz = runPaceZones(f);
    if (pz.length) {
      const lo = pz.find((z) => z.n === clampZone(loZ, pz.length));
      const hi = pz.find((z) => z.n === clampZone(hiZ, pz.length));
      if (lo?.highVal && hi?.lowVal) {
        const slowSec = lo.highVal; // zona più bassa = più lenta
        const fastSec = hi.lowVal; // zona più alta = più veloce
        return {
          targetType: TGT_SPEED,
          low: Math.round((1000 / slowSec) * 1000),
          high: Math.round((1000 / fastSec) * 1000),
        };
      }
    }
    return hrTarget(loZ, hiZ, f);
  }

  if (d === "bike") {
    const pw = powerZones(f);
    if (pw.length) {
      const lo = pw.find((z) => z.n === clampZone(loZ, pw.length));
      const hi = pw.find((z) => z.n === clampZone(hiZ, pw.length));
      if (lo?.lowVal && hi?.highVal) {
        return { targetType: TGT_POWER, low: Math.round(lo.lowVal) + 1000, high: Math.round(hi.highVal) + 1000 };
      }
    }
    return hrTarget(loZ, hiZ, f);
  }

  if (d === "swim") return OPEN; // FC in acqua poco affidabile

  return hrTarget(loZ, hiZ, f);
}

type Mesg = Record<string, number | string>;

export function buildWorkoutFit(opts: {
  name: string;
  discipline: Discipline;
  steps: FitStepRow[];
  fitness: Fitness;
}): Uint8Array {
  const { name, discipline, steps, fitness } = opts;
  const encoder = new Encoder();

  // file_id (type = workout)
  const FIT_EPOCH = 631_065_600; // secondi tra Unix epoch e 1989-12-31
  encoder.onMesg(Profile.MesgNum.FILE_ID, {
    type: FILE_WORKOUT,
    manufacturer: 255, // development
    product: 0,
    serialNumber: 1,
    timeCreated: Math.floor(Date.now() / 1000) - FIT_EPOCH,
  } as Mesg);

  const top = steps.filter((s) => !s.parent_step_id).sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (pid: string) =>
    steps.filter((s) => s.parent_step_id === pid).sort((a, b) => a.sort_order - b.sort_order);

  const stepMsgs: Mesg[] = [];

  const pushLeaf = (row: FitStepRow) => {
    const t = resolveTarget(row, discipline, fitness);
    const msg: Mesg = {
      messageIndex: stepMsgs.length,
      intensity: intensity(row.step_type),
      targetType: t.targetType,
      targetValue: 0,
    };
    if (row.duration_seconds && row.duration_seconds > 0) {
      msg.durationType = DUR_TIME;
      msg.durationValue = Math.round(row.duration_seconds * 1000); // ms
    } else if (row.distance_meters && row.distance_meters > 0) {
      msg.durationType = DUR_DISTANCE;
      msg.durationValue = Math.round(row.distance_meters * 100); // cm
    } else {
      msg.durationType = DUR_OPEN;
    }
    if (t.low != null && t.high != null) {
      msg.customTargetValueLow = t.low;
      msg.customTargetValueHigh = t.high;
    }
    const label = (row.note ?? "").trim();
    if (label) msg.wktStepName = label.slice(0, 30);
    stepMsgs.push(msg);
  };

  for (const row of top) {
    if (row.step_type === "repeat") {
      const firstChildIndex = stepMsgs.length;
      for (const c of childrenOf(row.id)) pushLeaf(c);
      const reps = row.repeat_count && row.repeat_count > 1 ? row.repeat_count : 2;
      stepMsgs.push({
        messageIndex: stepMsgs.length,
        durationType: DUR_REPEAT,
        durationValue: firstChildIndex, // step a cui tornare
        targetType: TGT_OPEN,
        targetValue: reps, // numero di ripetizioni (repeat_steps)
      });
    } else {
      pushLeaf(row);
    }
  }

  if (stepMsgs.length === 0) {
    stepMsgs.push({ messageIndex: 0, intensity: INT_ACTIVE, durationType: DUR_OPEN, targetType: TGT_OPEN, targetValue: 0 });
  }

  // workout (prima degli step)
  encoder.onMesg(Profile.MesgNum.WORKOUT, {
    messageIndex: 0,
    wktName: name.slice(0, 30) || "Allenamento",
    sport: SPORT[discipline] ?? 0,
    subSport: 0,
    numValidSteps: stepMsgs.length,
  } as Mesg);

  for (const m of stepMsgs) encoder.onMesg(Profile.MesgNum.WORKOUT_STEP, m);

  return encoder.close() as Uint8Array;
}
