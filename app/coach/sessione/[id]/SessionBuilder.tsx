"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  type StepType,
  STEP_TYPE_OPTIONS,
  templatesFor,
  type TemplateKey,
  buildTemplate,
  defaultWorkoutName,
  type Block,
  type SimpleStep,
  fmtDuration,
} from "@/lib/training/workouts";
import {
  type Discipline,
  type Fitness,
  zonesForDiscipline,
} from "@/lib/training/zones";
import { saveSession, type SaveStepInput } from "./actions";

const GIORNI = [
  "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica",
];
const MESI_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/** Data del giorno `d` (0=lun) della settimana che inizia con weekStartISO. */
function dayDateLabel(weekStartISO: string, d: number): string {
  const [y, m, dd] = weekStartISO.slice(0, 10).split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, dd ?? 1);
  base.setDate(base.getDate() + d);
  return `${base.getDate()} ${MESI_SHORT[base.getMonth()]}`;
}
const DISCS: [Discipline, string][] = [
  ["swim", "Nuoto"],
  ["bike", "Bici"],
  ["run", "Corsa"],
  ["athletics", "Forza/mobilità"],
  ["other", "Altro"],
];
const VOL_UNITS: [string, string][] = [
  ["time", "tempo"],
  ["distance", "distanza"],
  ["other", "altro"],
];

type MeasureUnit = "min" | "sec" | "m" | "km" | "testo" | "open";
type TargetMode = "open" | "zone" | "rpe" | "text";

const MEASURE_UNITS: { value: MeasureUnit; label: string }[] = [
  { value: "min", label: "minuti" },
  { value: "sec", label: "secondi" },
  { value: "m", label: "metri" },
  { value: "km", label: "km" },
  { value: "testo", label: "testo/range" },
  { value: "open", label: "libero" },
];

interface UIStep {
  uid: string;
  step_type: Exclude<StepType, "repeat">;
  measureValue: string;
  measureUnit: MeasureUnit;
  targetMode: TargetMode;
  zone: number;
  rpe: number;
  /** Target libero quando targetMode === "text" ("z3 alto RPE 7", "progressione"). */
  targetText: string;
  /** Recupero dello step ("15''", "30\""). */
  recovery: string;
  cadence: string;
  /** Attrezzi (nuoto): "pull+palette", "pinne", ... */
  equipment: string;
  note: string;
}

type UIBlock =
  | { uid: string; kind: "step"; data: UIStep }
  | { uid: string; kind: "repeat"; reps: number; children: UIStep[] };

export interface DBStep {
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
  cadence_rpm: number | null;
  equipment: string | null;
  note: string | null;
}

/** Attrezzi rapidi per il nuoto (chip toggle, oltre al testo libero). */
const SWIM_GEAR = ["pull", "palette", "pinne", "tavoletta", "snorkel"];

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// --- misura: valore + unità <-> secondi/metri --------------------------------

/** Da secondi/metri/testo (DB) a valore+unità per i campi guidati. */
function toMeasure(
  dur: number | null,
  dist: number | null,
  raw: string | null,
): { measureValue: string; measureUnit: MeasureUnit } {
  if (raw != null && raw.trim() !== "")
    return { measureValue: raw, measureUnit: "testo" };
  if (dur != null && dur > 0)
    return dur % 60 === 0
      ? { measureValue: String(dur / 60), measureUnit: "min" }
      : { measureValue: String(dur), measureUnit: "sec" };
  if (dist != null && dist > 0)
    return dist % 1000 === 0
      ? { measureValue: String(dist / 1000), measureUnit: "km" }
      : { measureValue: String(dist), measureUnit: "m" };
  return { measureValue: "", measureUnit: "open" };
}

/** Da valore+unità a secondi/metri/testo per il salvataggio. */
function measureToDb(
  value: string,
  unit: MeasureUnit,
): { dur: number | null; dist: number | null; raw: string | null } {
  if (unit === "open") return { dur: null, dist: null, raw: null };
  if (unit === "testo") return { dur: null, dist: null, raw: value.trim() || null };
  const n = parseFloat(value.replace(",", "."));
  if (!isFinite(n) || n <= 0) return { dur: null, dist: null, raw: null };
  if (unit === "min") return { dur: Math.round(n * 60), dist: null, raw: null };
  if (unit === "sec") return { dur: Math.round(n), dist: null, raw: null };
  if (unit === "km") return { dur: null, dist: Math.round(n * 1000), raw: null };
  return { dur: null, dist: Math.round(n), raw: null }; // m
}

// --- conversioni -------------------------------------------------------------

// Il target libero è persistito come target_type "open" + target_unit valorizzato
// (il vincolo DB su target_type non ammette un valore "text" dedicato).
function targetModeOf(t: string | null, unit: string | null): TargetMode {
  if (unit?.trim()) return "text";
  if (t === "zone") return "zone";
  if (t === "rpe") return "rpe";
  return "open";
}

function simpleToUI(s: SimpleStep): UIStep {
  return {
    uid: uid(),
    step_type: s.step_type,
    ...toMeasure(s.duration_seconds, s.distance_meters, s.raw_fragment),
    targetMode: targetModeOf(s.target_type, s.target_unit),
    zone: s.target_type === "zone" ? clamp(s.target_low ?? 2, 1, 7) : 2,
    rpe: s.target_type === "rpe" ? clamp(s.target_low ?? 5, 1, 10) : 5,
    targetText: s.target_unit ?? "",
    recovery: s.recovery_text ?? "",
    cadence: s.cadence_rpm ? String(s.cadence_rpm) : "",
    equipment: "",
    note: s.note ?? "",
  };
}

function dbToUI(s: DBStep): UIStep {
  const st = (s.step_type === "repeat" ? "steady" : s.step_type) as Exclude<StepType, "repeat">;
  return {
    uid: uid(),
    step_type: st,
    ...toMeasure(s.duration_seconds, s.distance_meters, s.raw_fragment),
    targetMode: targetModeOf(s.target_type, s.target_unit),
    zone: s.target_type === "zone" ? clamp(s.target_low ?? 2, 1, 7) : 2,
    rpe: s.target_type === "rpe" ? clamp(s.target_low ?? 5, 1, 10) : 5,
    targetText: s.target_unit ?? "",
    recovery: s.recovery_text ?? "",
    cadence: s.cadence_rpm ? String(s.cadence_rpm) : "",
    equipment: s.equipment ?? "",
    note: s.note ?? "",
  };
}

function blockFromTemplate(b: Block): UIBlock {
  if (b.kind === "repeat") {
    return { uid: uid(), kind: "repeat", reps: b.repeat_count, children: b.children.map(simpleToUI) };
  }
  return { uid: uid(), kind: "step", data: simpleToUI(b) };
}

function dbToBlocks(steps: DBStep[]): UIBlock[] {
  const tops = steps.filter((s) => !s.parent_step_id).sort((a, b) => a.sort_order - b.sort_order);
  return tops.map((t) => {
    if (t.step_type === "repeat") {
      const kids = steps
        .filter((s) => s.parent_step_id === t.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(dbToUI);
      return {
        uid: uid(),
        kind: "repeat" as const,
        reps: t.repeat_count && t.repeat_count > 1 ? t.repeat_count : 2,
        children: kids.length ? kids : [emptyStep()],
      };
    }
    return { uid: uid(), kind: "step" as const, data: dbToUI(t) };
  });
}

function emptyStep(over: Partial<UIStep> = {}): UIStep {
  return {
    uid: uid(),
    step_type: "steady",
    measureValue: "",
    measureUnit: "min",
    targetMode: "open",
    zone: 2,
    rpe: 5,
    targetText: "",
    recovery: "",
    cadence: "",
    equipment: "",
    note: "",
    ...over,
  };
}

// --- appiattimento per il salvataggio ---------------------------------------

function stepToInput(s: UIStep, localId: number, sort: number, parent: number | null): SaveStepInput {
  const { dur, dist, raw } = measureToDb(s.measureValue, s.measureUnit);
  const cad = s.cadence.trim() ? parseInt(s.cadence, 10) : null;
  return {
    localId,
    parentLocalId: parent,
    sort_order: sort,
    step_type: s.step_type,
    repeat_count: null,
    duration_seconds: dur,
    distance_meters: dist,
    raw_fragment: raw,
    // "text" non è un valore ammesso dal vincolo DB: lo salviamo come "open"
    // con il testo libero in target_unit.
    target_type: s.targetMode === "text" ? "open" : s.targetMode,
    target_low: s.targetMode === "zone" ? s.zone : s.targetMode === "rpe" ? s.rpe : null,
    target_high: s.targetMode === "zone" ? s.zone : null,
    target_unit: s.targetMode === "text" ? s.targetText.trim() || null : null,
    recovery_text: s.recovery.trim() || null,
    cadence_rpm: cad != null && !isNaN(cad) ? cad : null,
    equipment: s.equipment.trim() || null,
    note: s.note.trim() || null,
  };
}

function flatten(blocks: UIBlock[]): SaveStepInput[] {
  const out: SaveStepInput[] = [];
  let local = 0;
  let order = 0;
  for (const b of blocks) {
    if (b.kind === "repeat") {
      const parentId = local++;
      out.push({
        localId: parentId,
        parentLocalId: null,
        sort_order: order++,
        step_type: "repeat",
        repeat_count: Math.max(2, b.reps),
        duration_seconds: null,
        distance_meters: null,
        raw_fragment: null,
        target_type: null,
        target_low: null,
        target_high: null,
        target_unit: null,
        recovery_text: null,
        cadence_rpm: null,
        equipment: null,
        note: null,
      });
      let c = 0;
      for (const child of b.children) out.push(stepToInput(child, local++, c++, parentId));
    } else {
      out.push(stepToInput(b.data, local++, order++, null));
    }
  }
  return out;
}

// --- profilo grafico dell'allenamento ---------------------------------------

const TYPE_INTENSITY: Record<string, number> = {
  warmup: 0.3,
  cooldown: 0.25,
  recovery: 0.22,
  rest: 0.12,
  steady: 0.5,
  interval: 0.85,
};

/** Intensità 0..1 dello step (zona/RPE se impostati, altrimenti dal tipo). */
function stepIntensity(s: UIStep): number {
  if (s.targetMode === "zone") return clamp(s.zone / 7, 0.12, 1);
  if (s.targetMode === "rpe") return clamp(s.rpe / 10, 0.12, 1);
  return TYPE_INTENSITY[s.step_type] ?? 0.4;
}

/** Larghezza relativa (in secondi) dello step per il profilo. */
function segSeconds(s: UIStep): number {
  const { dur, dist } = measureToDb(s.measureValue, s.measureUnit);
  if (dur && dur > 0) return dur;
  if (dist && dist > 0) return Math.max(45, Math.round(dist / 4));
  return 90;
}

function intensityColor(i: number): string {
  if (i < 0.33) return "#34d399"; // facile
  if (i < 0.55) return "#a3e635"; // moderato
  if (i < 0.75) return "#fbbf24"; // medio/soglia
  if (i < 0.9) return "#fb923c"; // duro
  return "#fb7185"; // massimale
}

interface ProfileSeg {
  sec: number;
  intensity: number;
}

function WorkoutProfile({ segs }: { segs: ProfileSeg[] }) {
  if (segs.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        height: 76,
        padding: "0 2px",
      }}
    >
      {segs.map((s, i) => (
        <div
          key={i}
          style={{
            flexGrow: Math.max(1, s.sec),
            flexBasis: 0,
            minWidth: 3,
            height: `${Math.round(16 + s.intensity * 84)}%`,
            background: intensityColor(s.intensity),
            borderRadius: "3px 3px 0 0",
            opacity: 0.92,
          }}
        />
      ))}
    </div>
  );
}

function NumBadge({ n }: { n: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 24,
        height: 24,
        padding: "0 7px",
        borderRadius: 8,
        background: "var(--s2)",
        border: "1px solid var(--line)",
        fontSize: ".78rem",
        fontWeight: 800,
        color: "var(--text-2)",
      }}
    >
      {n}
    </span>
  );
}

// --- editor di un singolo step ----------------------------------------------

function StepEditor({
  step,
  zoneOpts,
  discipline,
  onChange,
  onRemove,
}: {
  step: UIStep;
  zoneOpts: { value: string; label: string }[];
  discipline: Discipline;
  onChange: (s: UIStep) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<UIStep>) => onChange({ ...step, ...patch });
  const targetValue = step.targetMode === "zone" ? `z${step.zone}` : step.targetMode;

  // Attrezzi (nuoto): chip toggle che compongono una stringa "pull + palette".
  const gearTokens = step.equipment
    .split(/[+,]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const toggleGear = (g: string) => {
    const next = gearTokens.includes(g)
      ? gearTokens.filter((t) => t !== g)
      : [...gearTokens, g];
    set({ equipment: next.join(" + ") });
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "flex-end",
        padding: "10px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div className="field" style={{ width: 130 }}>
        <label className="label">Tipo</label>
        <select
          className="input"
          value={step.step_type}
          onChange={(e) => set({ step_type: e.target.value as Exclude<StepType, "repeat"> })}
        >
          {STEP_TYPE_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ width: step.measureUnit === "testo" ? 150 : 84 }}>
        <label className="label">Quanto</label>
        <input
          className="input"
          type="text"
          inputMode={step.measureUnit === "testo" ? "text" : "decimal"}
          value={step.measureValue}
          disabled={step.measureUnit === "open"}
          placeholder={
            step.measureUnit === "open"
              ? "—"
              : step.measureUnit === "testo"
                ? "es. 8x100 · 45-60'"
                : "0"
          }
          onChange={(e) =>
            set({
              measureValue:
                step.measureUnit === "testo"
                  ? e.target.value
                  : e.target.value.replace(/[^\d.,]/g, ""),
            })
          }
        />
      </div>
      <div className="field" style={{ width: 104 }}>
        <label className="label">Unità</label>
        <select
          className="input"
          value={step.measureUnit}
          onChange={(e) => set({ measureUnit: e.target.value as MeasureUnit })}
        >
          {MEASURE_UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ flex: 1, minWidth: 170 }}>
        <label className="label">Target</label>
        <select
          className="input"
          value={targetValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "open") set({ targetMode: "open" });
            else if (v === "rpe") set({ targetMode: "rpe" });
            else if (v === "text") set({ targetMode: "text" });
            else set({ targetMode: "zone", zone: parseInt(v.slice(1), 10) });
          }}
        >
          <option value="open">Aperto</option>
          {zoneOpts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value="rpe">RPE…</option>
          <option value="text">Testo libero…</option>
        </select>
      </div>
      {step.targetMode === "rpe" ? (
        <div className="field" style={{ width: 80 }}>
          <label className="label">RPE</label>
          <input
            className="input"
            type="number"
            min={1}
            max={10}
            value={step.rpe}
            onChange={(e) => set({ rpe: clamp(parseInt(e.target.value, 10) || 5, 1, 10) })}
          />
        </div>
      ) : null}
      {step.targetMode === "text" ? (
        <div className="field" style={{ flex: 1, minWidth: 150 }}>
          <label className="label">Target (testo)</label>
          <input
            className="input"
            value={step.targetText}
            placeholder="es. z3 alto RPE 7 · progressione"
            onChange={(e) => set({ targetText: e.target.value })}
          />
        </div>
      ) : null}
      <div className="field" style={{ width: 90 }}>
        <label className="label">Rec.</label>
        <input
          className="input"
          value={step.recovery}
          placeholder="15''"
          onChange={(e) => set({ recovery: e.target.value })}
        />
      </div>
      <div className="field" style={{ width: 80 }}>
        <label className="label">Cad.</label>
        <input
          className="input"
          value={step.cadence}
          placeholder="—"
          onChange={(e) => set({ cadence: e.target.value })}
        />
      </div>
      <div className="field" style={{ flex: 1, minWidth: 140 }}>
        <label className="label">Nota</label>
        <input
          className="input"
          value={step.note}
          onChange={(e) => set({ note: e.target.value })}
        />
      </div>
      {discipline === "swim" ? (
        <div className="field" style={{ width: "100%", flexBasis: "100%" }}>
          <label className="label">Attrezzi</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {SWIM_GEAR.map((g) => {
              const on = gearTokens.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGear(g)}
                  className={on ? "btn btn-primary btn-sm" : "btn btn-subtle btn-sm"}
                  aria-pressed={on}
                >
                  {on ? "✓ " : ""}
                  {g}
                </button>
              );
            })}
          </div>
          <input
            className="input"
            value={step.equipment}
            placeholder="es. pull + palette · pinne"
            onChange={(e) => set({ equipment: e.target.value })}
          />
        </div>
      ) : null}
      <button
        type="button"
        className="btn btn-subtle btn-sm"
        onClick={onRemove}
        style={{ color: "var(--rose)", marginBottom: 2 }}
      >
        ✕
      </button>
    </div>
  );
}

// --- builder principale ------------------------------------------------------

export default function SessionBuilder({
  sessionId,
  weekId,
  athleteName,
  weekLabelStr,
  weekRange,
  weekStartISO,
  initialTitle,
  initialDiscipline,
  initialDay,
  initialVolumeValue,
  initialVolumeUnit,
  initialNotes,
  rawText,
  initialSteps,
  fitness,
}: {
  sessionId: string;
  weekId: string;
  athleteName: string;
  weekLabelStr: string;
  weekRange: string;
  weekStartISO: string;
  initialTitle: string;
  initialDiscipline: Discipline;
  initialDay: number;
  initialVolumeValue: string;
  initialVolumeUnit: string;
  initialNotes: string;
  rawText: string;
  initialSteps: DBStep[];
  fitness: Fitness;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [discipline, setDiscipline] = useState<Discipline>(initialDiscipline);
  const [day, setDay] = useState(initialDay);
  const [volumeValue, setVolumeValue] = useState(initialVolumeValue);
  const [volumeUnit, setVolumeUnit] = useState(initialVolumeUnit || "time");
  const [notes, setNotes] = useState(initialNotes);
  const [blocks, setBlocks] = useState<UIBlock[]>(() => dbToBlocks(initialSteps));
  const [pending, startTransition] = useTransition();

  const totalSeconds = useMemo(() => {
    const stepSeconds = (s: UIStep) => measureToDb(s.measureValue, s.measureUnit).dur ?? 0;
    let total = 0;
    for (const b of blocks) {
      if (b.kind === "repeat") {
        const inner = b.children.reduce((acc, c) => acc + stepSeconds(c), 0);
        total += Math.max(1, b.reps) * inner;
      } else {
        total += stepSeconds(b.data);
      }
    }
    return total;
  }, [blocks]);

  // Data ISO del giorno selezionato (si aggiorna se cambi il giorno).
  const selectedDateISO = useMemo(() => {
    const [y, m, dd] = weekStartISO.slice(0, 10).split("-").map(Number);
    const b = new Date(y, (m ?? 1) - 1, dd ?? 1);
    b.setDate(b.getDate() + day);
    return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(
      b.getDate(),
    ).padStart(2, "0")}`;
  }, [weekStartISO, day]);

  const defaultName = useMemo(
    () => defaultWorkoutName(discipline, selectedDateISO, totalSeconds),
    [discipline, selectedDateISO, totalSeconds],
  );

  // Segmenti del profilo grafico (le ripetute vengono espanse).
  const profileSegs = useMemo(() => {
    const out: ProfileSeg[] = [];
    for (const b of blocks) {
      if (b.kind === "repeat") {
        for (let r = 0; r < Math.max(1, b.reps); r++)
          for (const c of b.children) out.push({ sec: segSeconds(c), intensity: stepIntensity(c) });
      } else {
        out.push({ sec: segSeconds(b.data), intensity: stepIntensity(b.data) });
      }
    }
    return out;
  }, [blocks]);

  // Riordino blocchi via drag-and-drop (maniglia ⠿). dragFrom è un ref per non
  // ridisegnare a ogni dragover; overIndex pilota solo l'indicatore visivo.
  const dragFrom = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const moveTo = (from: number, to: number) =>
    setBlocks((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });

  const dragHandleProps = (bi: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      dragFrom.current = bi;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(bi));
    },
    onDragEnd: () => {
      dragFrom.current = null;
      setOverIndex(null);
    },
    title: "Trascina per riordinare",
    style: { cursor: "grab", userSelect: "none" as const, color: "var(--text-2)", fontSize: "1.1rem" },
  });

  const dropZoneProps = (bi: number) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragFrom.current !== null) {
        e.preventDefault();
        if (overIndex !== bi) setOverIndex(bi);
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragFrom.current !== null) moveTo(dragFrom.current, bi);
      dragFrom.current = null;
      setOverIndex(null);
    },
  });

  const dropStyle = (bi: number): React.CSSProperties =>
    overIndex === bi && dragFrom.current !== null && dragFrom.current !== bi
      ? { outline: "2px dashed var(--lime)", outlineOffset: 2 }
      : {};

  const zoneOpts = useMemo(() => {
    const zs = zonesForDiscipline(discipline, fitness);
    if (zs.length) {
      return zs.map((z) => ({ value: `z${z.n}`, label: `${z.name} (${z.range})` }));
    }
    return [1, 2, 3, 4, 5].map((n) => ({ value: `z${n}`, label: `Z${n}` }));
  }, [discipline, fitness]);

  const noZones = zonesForDiscipline(discipline, fitness).length === 0;

  // --- mutazioni ---
  const updateBlock = (bi: number, fn: (b: UIBlock) => UIBlock) =>
    setBlocks((prev) => prev.map((b, i) => (i === bi ? fn(b) : b)));

  const removeBlock = (bi: number) => setBlocks((prev) => prev.filter((_, i) => i !== bi));

  const moveBlock = (bi: number, dir: -1 | 1) =>
    setBlocks((prev) => {
      const j = bi + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[bi], next[j]] = [next[j], next[bi]];
      return next;
    });

  const addStep = () =>
    setBlocks((prev) => [...prev, { uid: uid(), kind: "step", data: emptyStep() }]);

  const addRepeat = () =>
    setBlocks((prev) => [
      ...prev,
      { uid: uid(), kind: "repeat", reps: 4, children: [emptyStep({ step_type: "interval" })] },
    ]);

  const applyTemplate = (key: TemplateKey) =>
    setBlocks((prev) => [...prev, ...buildTemplate(key, discipline).map(blockFromTemplate)]);

  const setStepData = (bi: number, s: UIStep) =>
    updateBlock(bi, (b) => (b.kind === "step" ? { ...b, data: s } : b));

  const setChildData = (bi: number, ci: number, s: UIStep) =>
    updateBlock(bi, (b) =>
      b.kind === "repeat" ? { ...b, children: b.children.map((c, j) => (j === ci ? s : c)) } : b,
    );

  const setReps = (bi: number, n: number) =>
    updateBlock(bi, (b) => (b.kind === "repeat" ? { ...b, reps: clamp(n, 1, 50) } : b));

  const addChild = (bi: number) =>
    updateBlock(bi, (b) =>
      b.kind === "repeat" ? { ...b, children: [...b.children, emptyStep({ step_type: "interval" })] } : b,
    );

  const removeChild = (bi: number, ci: number) =>
    updateBlock(bi, (b) =>
      b.kind === "repeat" ? { ...b, children: b.children.filter((_, j) => j !== ci) } : b,
    );

  const save = () => {
    const steps = flatten(blocks);
    startTransition(async () => {
      await saveSession({
        sessionId,
        weekId,
        title: title.trim() || defaultName,
        discipline,
        day_of_week: day,
        volume_value: volumeValue.trim() || null,
        volume_unit: volumeUnit || null,
        notes: notes.trim() || null,
        steps,
      });
    });
  };

  // Scorciatoia ⌘/Ctrl+S per salvare senza tornare al tasto in fondo.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      {/* contesto: chi · quando — resta visibile mentre scorri */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "var(--bg)",
          borderBottom: "1px solid var(--line)",
          padding: "10px 2px",
          marginBottom: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <span className="mono" style={{ color: "var(--text-2)" }}>👤 {athleteName}</span>
        <span className="pill ok pill-plain">{weekLabelStr}</span>
        <span className="mono" style={{ color: "var(--text-2)", fontSize: ".8rem" }}>{weekRange}</span>
        <strong style={{ color: "var(--lime)", fontSize: "1.05rem" }}>
          {GIORNI[day]} {dayDateLabel(weekStartISO, day)}
        </strong>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={save}
          style={{ marginLeft: "auto" }}
          title="Salva l'allenamento (Ctrl/⌘+S)"
        >
          {pending ? "Salvataggio…" : "💾 Salva"}
        </button>
      </div>

      {/* meta */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label className="label">Nome allenamento</label>
            <input
              className="input"
              value={title}
              placeholder={defaultName}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label className="label">Disciplina</label>
            <select
              className="input"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as Discipline)}
            >
              {DISCS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ width: 140 }}>
            <label className="label">Giorno</label>
            <select className="input" value={day} onChange={(e) => setDay(parseInt(e.target.value, 10))}>
              {GIORNI.map((g, i) => (
                <option key={i} value={i}>
                  {g} · {dayDateLabel(weekStartISO, i)}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ width: 110 }}>
            <label className="label">Volume</label>
            <input
              className="input"
              value={volumeValue}
              onChange={(e) => setVolumeValue(e.target.value)}
            />
          </div>
          <div className="field" style={{ width: 110 }}>
            <label className="label">Unità</label>
            <select
              className="input"
              value={volumeUnit}
              onChange={(e) => setVolumeUnit(e.target.value)}
            >
              {VOL_UNITS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mono" style={{ color: "var(--text-2)", marginTop: 10, fontSize: ".78rem" }}>
          {title.trim()
            ? `Durata totale stimata: ${fmtDuration(totalSeconds) || "—"}`
            : `Nome vuoto → userò: ${defaultName}`}
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label className="label">Allenamento in testo libero (mostrato all&apos;atleta)</label>
          <textarea
            className="input"
            value={notes}
            rows={4}
            placeholder={
              "Scrivi qui l'allenamento così come lo segni di solito. Gli step strutturati qui sotto sono facoltativi (servono per l'export Garmin).\n\nEs. nuoto:\n3x200 facili con pinne rec 30''\n8x50 pull+palette (nel 4° 25 forti) rec 15''\n12x100 pull (3 facili, 3 medi, 3 forti) rec 15''\n100 defaticamento"
            }
            onChange={(e) => setNotes(e.target.value)}
            style={{ resize: "vertical", fontFamily: "inherit", whiteSpace: "pre-wrap" }}
          />
        </div>

        {rawText ? (
          <details style={{ marginTop: 10 }}>
            <summary className="mono" style={{ color: "var(--text-2)", cursor: "pointer", fontSize: ".78rem" }}>
              Testo originale importato
            </summary>
            <div
              className="mono"
              style={{ whiteSpace: "pre-wrap", color: "var(--text-2)", fontSize: ".8rem", marginTop: 6 }}
            >
              {rawText}
            </div>
          </details>
        ) : null}

        {noZones ? (
          <div className="mono" style={{ color: "var(--amber)", marginTop: 10, fontSize: ".8rem" }}>
            ⚠ Nessuna zona per questa disciplina: compila la scheda fisiologica per target precisi.
          </div>
        ) : null}
      </div>

      {/* template */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="mono" style={{ color: "var(--text-2)", marginBottom: 10 }}>
          // PRESET {DISCS.find(([v]) => v === discipline)?.[1]?.toUpperCase() ?? ""}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {templatesFor(discipline).map((t) => (
            <button
              key={t.key}
              type="button"
              className="btn btn-ghost btn-sm"
              title={t.hint}
              onClick={() => applyTemplate(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* profilo grafico */}
      {profileSegs.length > 0 ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div
            className="mono"
            style={{
              color: "var(--text-2)",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>// PROFILO</span>
            <span>durata ~{fmtDuration(totalSeconds) || "—"}</span>
          </div>
          <WorkoutProfile segs={profileSegs} />
          <div
            className="mono"
            style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10, fontSize: ".72rem", color: "var(--text-2)" }}
          >
            <span><i style={{ background: "#34d399", display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 4 }} />facile</span>
            <span><i style={{ background: "#a3e635", display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 4 }} />moderato</span>
            <span><i style={{ background: "#fbbf24", display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 4 }} />soglia</span>
            <span><i style={{ background: "#fb923c", display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 4 }} />duro</span>
            <span><i style={{ background: "#fb7185", display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 4 }} />max</span>
          </div>
        </div>
      ) : null}

      {/* blocchi */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {blocks.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
            Nessuno step. Usa un template oppure aggiungi step manualmente.
          </div>
        ) : null}

        {blocks.map((b, bi) =>
          b.kind === "repeat" ? (
            <div
              key={b.uid}
              className="card"
              {...dropZoneProps(bi)}
              style={{ borderLeft: "3px solid var(--lime)", paddingLeft: 16, ...dropStyle(bi) }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span {...dragHandleProps(bi)}>⠿</span>
                <NumBadge n={bi + 1} />
                <strong className="mono" style={{ color: "var(--lime)" }}>
                  ⟳ RIPETI
                </strong>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={50}
                  value={b.reps}
                  onChange={(e) => setReps(bi, parseInt(e.target.value, 10) || 1)}
                  style={{ width: 70 }}
                />
                <span style={{ color: "var(--text-2)" }}>volte</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button type="button" className="btn btn-subtle btn-sm" onClick={() => moveBlock(bi, -1)}>
                    ↑
                  </button>
                  <button type="button" className="btn btn-subtle btn-sm" onClick={() => moveBlock(bi, 1)}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-subtle btn-sm"
                    style={{ color: "var(--rose)" }}
                    onClick={() => removeBlock(bi)}
                  >
                    Elimina gruppo
                  </button>
                </div>
              </div>
              {b.children.map((c, ci) => (
                <StepEditor
                  key={c.uid}
                  step={c}
                  zoneOpts={zoneOpts}
                  discipline={discipline}
                  onChange={(s) => setChildData(bi, ci, s)}
                  onRemove={() => removeChild(bi, ci)}
                />
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => addChild(bi)}
              >
                + step nel gruppo
              </button>
            </div>
          ) : (
            <div key={b.uid} className="card" {...dropZoneProps(bi)} style={dropStyle(bi)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span {...dragHandleProps(bi)}>⠿</span>
                  <NumBadge n={bi + 1} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="btn btn-subtle btn-sm" onClick={() => moveBlock(bi, -1)}>
                    ↑
                  </button>
                  <button type="button" className="btn btn-subtle btn-sm" onClick={() => moveBlock(bi, 1)}>
                    ↓
                  </button>
                </div>
              </div>
              <StepEditor
                step={b.data}
                zoneOpts={zoneOpts}
                discipline={discipline}
                onChange={(s) => setStepData(bi, s)}
                onRemove={() => removeBlock(bi)}
              />
            </div>
          ),
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={addStep}>
          + Step
        </button>
        <button type="button" className="btn btn-ghost" onClick={addRepeat}>
          + Blocco ripetuto
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          style={{ marginLeft: "auto" }}
          disabled={pending}
          onClick={save}
        >
          {pending ? "Salvataggio…" : "Salva allenamento"}
        </button>
      </div>
    </div>
  );
}
