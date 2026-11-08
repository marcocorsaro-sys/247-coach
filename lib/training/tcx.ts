// ============================================================================
// Generatore di file TCX Workout (Garmin Training Center Database v2) a
// partire dagli step di una sessione. I target espressi come "zona" vengono
// convertiti in valori concreti (FC in bpm, passo in m/s) usando la scheda
// fisiologica dell'atleta.
//
// Limiti noti di TCX Workout:
//  - i nomi (workout e step) sono RestrictedToken_t, max 15 caratteri;
//  - l'intensità ammette solo "Active" | "Resting";
//  - la potenza non è esprimibile come target: per la bici si ripiega su FC
//    (se disponibile la soglia) e i watt finiscono nel nome dello step.
// ============================================================================

import {
  type Discipline,
  type Fitness,
  hrZones,
  runPaceZones,
  swimPaceZones,
  powerZones,
} from "./zones";

export interface TcxStepRow {
  id: string;
  parent_step_id: string | null;
  sort_order: number;
  step_type: string; // warmup|interval|recovery|steady|cooldown|rest|repeat
  repeat_count: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  target_type: string | null; // zone|rpe|open|hr|pace|power|cadence
  target_low: number | null;
  target_high: number | null;
  cadence_rpm: number | null;
  note: string | null;
}

export function disciplineToSport(d: Discipline): "Running" | "Biking" | "Other" {
  if (d === "run") return "Running";
  if (d === "bike") return "Biking";
  return "Other";
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Tronca a 15 caratteri (limite schema TCX) e ripulisce. */
function tok(s: string): string {
  return xmlEscape(s.replace(/\s+/g, " ").trim().slice(0, 15)) || "Step";
}

function intensity(stepType: string): "Active" | "Resting" {
  return stepType === "recovery" || stepType === "rest" ? "Resting" : "Active";
}

interface ResolvedTarget {
  kind: "none" | "hr" | "speed";
  low?: number;
  high?: number;
  /** etichetta corta per il nome dello step */
  label: string;
}

function clampZone(z: number, max: number): number {
  return Math.max(1, Math.min(max, Math.round(z)));
}

/** Converte il target di uno step in qualcosa esprimibile in TCX. */
function resolveTarget(row: TcxStepRow, d: Discipline, f: Fitness): ResolvedTarget {
  if (row.target_type !== "zone" || row.target_low == null) {
    if (row.target_type === "rpe" && row.target_low != null) {
      return { kind: "none", label: `RPE ${row.target_low}` };
    }
    return { kind: "none", label: "" };
  }
  const loZ = row.target_low;
  const hiZ = row.target_high ?? row.target_low;

  if (d === "run") {
    const pz = runPaceZones(f);
    if (pz.length) {
      const lo = pz.find((z) => z.n === clampZone(loZ, pz.length));
      const hi = pz.find((z) => z.n === clampZone(hiZ, pz.length));
      if (lo?.highVal && hi?.lowVal) {
        const slowSec = lo.highVal; // zona più bassa = più lento
        const fastSec = hi.lowVal; // zona più alta = più veloce
        return {
          kind: "speed",
          low: 1000 / slowSec,
          high: 1000 / fastSec,
          label: zoneLabel(loZ, hiZ),
        };
      }
    }
    return hrTarget(loZ, hiZ, f);
  }

  if (d === "bike") {
    const hr = hrTarget(loZ, hiZ, f);
    const pw = powerZones(f);
    if (pw.length) {
      const lo = pw.find((z) => z.n === clampZone(loZ, pw.length));
      const hi = pw.find((z) => z.n === clampZone(hiZ, pw.length));
      const wlabel = lo?.lowVal && hi?.highVal ? `${lo.lowVal}-${hi.highVal}W` : zoneLabel(loZ, hiZ);
      return { ...hr, label: wlabel.slice(0, 15) };
    }
    return hr;
  }

  if (d === "swim") {
    const sz = swimPaceZones(f);
    if (sz.length) {
      const lo = sz.find((z) => z.n === clampZone(loZ, sz.length));
      const hi = sz.find((z) => z.n === clampZone(hiZ, sz.length));
      // il nuoto in TCX è poco affidabile: lasciamo None e mettiamo il passo nel nome
      const label = lo && hi ? zoneLabel(loZ, hiZ) : "";
      return { kind: "none", label };
    }
    return { kind: "none", label: zoneLabel(loZ, hiZ) };
  }

  return hrTarget(loZ, hiZ, f);
}

function hrTarget(loZ: number, hiZ: number, f: Fitness): ResolvedTarget {
  const hz = hrZones(f);
  if (hz.length) {
    const lo = hz.find((z) => z.n === clampZone(loZ, hz.length));
    const hi = hz.find((z) => z.n === clampZone(hiZ, hz.length));
    if (lo?.lowVal && hi?.highVal) {
      return { kind: "hr", low: lo.lowVal, high: hi.highVal, label: zoneLabel(loZ, hiZ) };
    }
  }
  return { kind: "none", label: zoneLabel(loZ, hiZ) };
}

function zoneLabel(loZ: number, hiZ: number): string {
  return loZ === hiZ ? `Z${loZ}` : `Z${loZ}-${hiZ}`;
}

function durationXml(row: TcxStepRow): string {
  if (row.duration_seconds && row.duration_seconds > 0) {
    return `<Duration xsi:type="Time_t"><Seconds>${Math.round(
      row.duration_seconds,
    )}</Seconds></Duration>`;
  }
  if (row.distance_meters && row.distance_meters > 0) {
    return `<Duration xsi:type="Distance_t"><Meters>${Math.round(
      row.distance_meters,
    )}</Meters></Duration>`;
  }
  return `<Duration xsi:type="UserInitiated_t" />`;
}

function targetXml(t: ResolvedTarget): string {
  if (t.kind === "hr" && t.low != null && t.high != null) {
    return (
      `<Target xsi:type="HeartRate_t">` +
      `<HeartRateZone xsi:type="CustomHeartRateZone_t">` +
      `<Low xsi:type="HeartRateInBeatsPerMinute_t"><Value>${Math.round(t.low)}</Value></Low>` +
      `<High xsi:type="HeartRateInBeatsPerMinute_t"><Value>${Math.round(t.high)}</Value></High>` +
      `</HeartRateZone></Target>`
    );
  }
  if (t.kind === "speed" && t.low != null && t.high != null) {
    return (
      `<Target xsi:type="Speed_t">` +
      `<SpeedZone xsi:type="CustomSpeedZone_t">` +
      `<LowInMetersPerSecond>${t.low.toFixed(3)}</LowInMetersPerSecond>` +
      `<HighInMetersPerSecond>${t.high.toFixed(3)}</HighInMetersPerSecond>` +
      `</SpeedZone></Target>`
    );
  }
  return `<Target xsi:type="None_t" />`;
}

function stepName(row: TcxStepRow, t: ResolvedTarget, fallback: string): string {
  const base = row.note?.trim() || t.label || fallback;
  return tok(base);
}

function leafStepXml(row: TcxStepRow, d: Discipline, f: Fitness, stepId: number): string {
  const t = resolveTarget(row, d, f);
  const fb =
    row.step_type === "warmup"
      ? "Risc."
      : row.step_type === "cooldown"
        ? "Defat."
        : row.step_type === "recovery" || row.step_type === "rest"
          ? "Recupero"
          : "Lavoro";
  return (
    `<Step xsi:type="Step_t">` +
    `<StepId>${stepId}</StepId>` +
    `<Name>${stepName(row, t, fb)}</Name>` +
    durationXml(row) +
    `<Intensity>${intensity(row.step_type)}</Intensity>` +
    targetXml(t) +
    `</Step>`
  );
}

/**
 * Costruisce il workout TCX completo.
 * Le righe `steps` devono includere sia i top-level che i figli dei repeat.
 */
export function buildWorkoutTcx(opts: {
  name: string;
  discipline: Discipline;
  steps: TcxStepRow[];
  fitness: Fitness;
  scheduledOn?: string | null;
}): string {
  const { name, discipline, steps, fitness, scheduledOn } = opts;
  const sport = disciplineToSport(discipline);

  const top = steps
    .filter((s) => !s.parent_step_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (pid: string) =>
    steps.filter((s) => s.parent_step_id === pid).sort((a, b) => a.sort_order - b.sort_order);

  let stepId = 0;
  const blocks: string[] = [];

  for (const row of top) {
    stepId++;
    if (row.step_type === "repeat") {
      const reps = row.repeat_count && row.repeat_count > 1 ? row.repeat_count : 2;
      const kids = childrenOf(row.id)
        .map((c) => leafStepXml(c, discipline, fitness, ++stepId))
        .map((x) => x.replace("<Step ", "<Child "))
        .map((x) => x.replace("</Step>", "</Child>"));
      blocks.push(
        `<Step xsi:type="Repeat_t">` +
          `<StepId>${stepId - kids.length}</StepId>` +
          `<Repetitions>${reps}</Repetitions>` +
          kids.join("") +
          `</Step>`,
      );
    } else {
      blocks.push(leafStepXml(row, discipline, fitness, stepId));
    }
  }

  // garanzia: un workout valido deve avere almeno uno step
  if (blocks.length === 0) {
    blocks.push(
      `<Step xsi:type="Step_t"><StepId>1</StepId><Name>Sessione</Name>` +
        `<Duration xsi:type="UserInitiated_t" /><Intensity>Active</Intensity>` +
        `<Target xsi:type="None_t" /></Step>`,
    );
  }

  const scheduled = scheduledOn ? `<ScheduledOn>${xmlEscape(scheduledOn)}</ScheduledOn>` : "";

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<TrainingCenterDatabase ` +
    `xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 ` +
    `http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">\n` +
    `  <Workouts>\n` +
    `    <Workout Sport="${sport}">\n` +
    `      <Name>${tok(name)}</Name>\n` +
    `      ${blocks.join("\n      ")}\n` +
    `      ${scheduled}\n` +
    `    </Workout>\n` +
    `  </Workouts>\n` +
    `</TrainingCenterDatabase>\n`
  );
}
