// ============================================================================
// Modello degli allenamenti strutturati (step e blocchi ripetuti) e template
// rapidi per il super-editor. I blocchi vengono poi appiattiti in righe
// session_steps con eventuale parent_step_id per i gruppi "ripeti".
// ============================================================================

import type { Discipline } from "./zones";

export type StepType =
  | "warmup"
  | "interval"
  | "recovery"
  | "steady"
  | "cooldown"
  | "rest"
  | "repeat";

export type TargetType = "zone" | "rpe" | "open";

/** Step semplice (foglia). */
export interface SimpleStep {
  kind: "step";
  step_type: Exclude<StepType, "repeat">;
  /** Una delle due misure è valorizzata; l'altra è null. */
  duration_seconds: number | null;
  distance_meters: number | null;
  /** Misura libera/range scritta a mano ("45-60'", "8x100", "INSERISCI"). */
  raw_fragment: string | null;
  target_type: TargetType;
  /** Per "zone": numero zona (1-7). Per "rpe": valore 1-10. Per "open"/"text": null. */
  target_low: number | null;
  target_high: number | null;
  /** Per "text": target libero ("z3 alto RPE 7", "progressione"). */
  target_unit: string | null;
  /** Recupero della ripetuta/step ("15''"). */
  recovery_text: string | null;
  cadence_rpm: number | null;
  note: string | null;
}

/** Gruppo "ripeti N volte" con figli step semplici. */
export interface RepeatGroup {
  kind: "repeat";
  repeat_count: number;
  children: SimpleStep[];
}

export type Block = SimpleStep | RepeatGroup;

// --- etichette ---------------------------------------------------------------

export const STEP_TYPE_LABEL: Record<Exclude<StepType, "repeat">, string> = {
  warmup: "Riscaldamento",
  interval: "Ripetuta",
  recovery: "Recupero",
  steady: "Costante",
  cooldown: "Defaticamento",
  rest: "Pausa",
};

export const STEP_TYPE_OPTIONS: [Exclude<StepType, "repeat">, string][] = [
  ["warmup", "Riscaldamento"],
  ["steady", "Costante"],
  ["interval", "Ripetuta"],
  ["recovery", "Recupero"],
  ["cooldown", "Defaticamento"],
  ["rest", "Pausa"],
];

// --- formattazione tempo / distanza -----------------------------------------

/** Secondi → "mm:ss" oppure "h:mm:ss". */
export function fmtDuration(s: number | null | undefined): string {
  if (s == null || !isFinite(s) || s <= 0) return "";
  const sec = Math.round(s);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const r = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** "mm:ss" / "h:mm:ss" / "45" (minuti) → secondi. */
export function parseDuration(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.trim();
  if (t === "") return null;
  if (/^\d+$/.test(t)) return parseInt(t, 10) * 60; // numero nudo = minuti
  const parts = t.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/** Metri → "1000 m" o "1.5 km". */
export function fmtDistance(m: number | null | undefined): string {
  if (m == null || !isFinite(m) || m <= 0) return "";
  if (m >= 1000) {
    const km = m / 1000;
    return `${Number.isInteger(km) ? km : km.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} km`;
  }
  return `${Math.round(m)} m`;
}

/** "1000", "1000 m", "1.5 km", "1,5km" → metri. */
export function parseDistance(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.trim().toLowerCase().replace(",", ".");
  if (t === "") return null;
  const km = t.match(/^([\d.]+)\s*km$/);
  if (km) return Math.round(parseFloat(km[1]) * 1000);
  const m = t.match(/^([\d.]+)\s*m?$/);
  if (m) return Math.round(parseFloat(m[1]));
  return null;
}

// --- costruzione step --------------------------------------------------------

export function makeStep(over: Partial<SimpleStep> = {}): SimpleStep {
  return {
    kind: "step",
    step_type: "steady",
    duration_seconds: null,
    distance_meters: null,
    raw_fragment: null,
    target_type: "open",
    target_low: null,
    target_high: null,
    target_unit: null,
    recovery_text: null,
    cadence_rpm: null,
    note: null,
    ...over,
  };
}

function zoneStep(over: Partial<SimpleStep>): SimpleStep {
  return makeStep({ target_type: "zone", ...over });
}

// --- template ----------------------------------------------------------------

export type TemplateKey =
  | "warmup"
  | "cooldown"
  | "ripetute"
  | "fartlek"
  | "progressivo"
  | "fondo"
  | "medio"
  | "combinato"
  | "swim_tecnica"
  | "swim_css"
  | "bike_sweetspot"
  | "bike_vo2"
  | "brick";

/** `disciplines` assente = preset valido per ogni disciplina. */
export const TEMPLATES: {
  key: TemplateKey;
  label: string;
  hint: string;
  disciplines?: Discipline[];
}[] = [
  { key: "fondo", label: "Fondo lento", hint: "Costante in Z2" },
  { key: "medio", label: "Medio", hint: "Costante in Z3" },
  { key: "ripetute", label: "Ripetute", hint: "Risc. + N× (sforzo + recupero) + defat." },
  { key: "progressivo", label: "Progressivo", hint: "Intensità crescente a blocchi" },
  { key: "fartlek", label: "Fartlek", hint: "Variazioni di ritmo", disciplines: ["run", "bike"] },
  { key: "swim_tecnica", label: "Tecnica + serie", hint: "Drills + serie aerobica", disciplines: ["swim"] },
  { key: "swim_css", label: "Soglia (CSS)", hint: "Serie a ritmo soglia nuoto", disciplines: ["swim"] },
  { key: "bike_sweetspot", label: "Sweet spot", hint: "Blocchi sotto-soglia", disciplines: ["bike"] },
  { key: "bike_vo2", label: "VO2max", hint: "Ripetute brevi ad alta intensità", disciplines: ["bike"] },
  { key: "brick", label: "Brick bici→corsa", hint: "Bici + transizione + corsa", disciplines: ["bike", "run"] },
  { key: "combinato", label: "Multi-blocco", hint: "Blocchi a intensità diverse" },
  { key: "warmup", label: "+ Riscaldamento", hint: "Blocco di riscaldamento" },
  { key: "cooldown", label: "+ Defaticamento", hint: "Blocco di defaticamento" },
];

/** Preset rilevanti per la disciplina corrente (per una UI più pulita). */
export function templatesFor(d: Discipline): typeof TEMPLATES {
  return TEMPLATES.filter((t) => !t.disciplines || t.disciplines.includes(d));
}

const useDistance = (d: Discipline) => d === "run" || d === "swim";

/** Genera i blocchi di un template, con default sensati per la disciplina. */
export function buildTemplate(key: TemplateKey, d: Discipline): Block[] {
  const dist = useDistance(d);
  const warm = (): SimpleStep =>
    zoneStep({ step_type: "warmup", duration_seconds: 15 * 60, target_low: 1, target_high: 2 });
  const cool = (): SimpleStep =>
    zoneStep({ step_type: "cooldown", duration_seconds: 10 * 60, target_low: 1, target_high: 1 });

  switch (key) {
    case "warmup":
      return [warm()];
    case "cooldown":
      return [cool()];

    case "ripetute": {
      const effort: SimpleStep = zoneStep({
        step_type: "interval",
        duration_seconds: dist ? null : 3 * 60,
        distance_meters: dist ? (d === "swim" ? 100 : 1000) : null,
        target_low: 4,
        target_high: 4,
      });
      const recov: SimpleStep = zoneStep({
        step_type: "recovery",
        duration_seconds: dist && d === "run" ? null : 2 * 60,
        distance_meters: dist && d === "run" ? 200 : null,
        target_low: 1,
        target_high: 1,
      });
      return [
        warm(),
        { kind: "repeat", repeat_count: d === "swim" ? 8 : 6, children: [effort, recov] },
        cool(),
      ];
    }

    case "fartlek": {
      const fast: SimpleStep = zoneStep({
        step_type: "interval",
        duration_seconds: 60,
        target_low: 5,
        target_high: 5,
      });
      const easy: SimpleStep = zoneStep({
        step_type: "recovery",
        duration_seconds: 60,
        target_low: 2,
        target_high: 2,
      });
      return [warm(), { kind: "repeat", repeat_count: 8, children: [fast, easy] }, cool()];
    }

    case "progressivo":
      return [
        warm(),
        zoneStep({ step_type: "steady", duration_seconds: 10 * 60, target_low: 2, target_high: 2 }),
        zoneStep({ step_type: "steady", duration_seconds: 10 * 60, target_low: 3, target_high: 3 }),
        zoneStep({ step_type: "steady", duration_seconds: 5 * 60, target_low: 4, target_high: 4 }),
        cool(),
      ];

    case "fondo":
      return [
        zoneStep({
          step_type: "steady",
          duration_seconds: 60 * 60,
          distance_meters: null,
          target_low: 2,
          target_high: 2,
        }),
      ];

    case "medio":
      return [
        warm(),
        zoneStep({ step_type: "steady", duration_seconds: 40 * 60, target_low: 3, target_high: 3 }),
        cool(),
      ];

    case "combinato":
      return [
        warm(),
        zoneStep({
          step_type: "steady",
          duration_seconds: 30 * 60,
          target_low: 3,
          target_high: 3,
          note: "Blocco 1",
        }),
        makeStep({ step_type: "rest", duration_seconds: 3 * 60, note: "Transizione" }),
        zoneStep({
          step_type: "steady",
          duration_seconds: 20 * 60,
          target_low: 3,
          target_high: 4,
          note: "Blocco 2",
        }),
        cool(),
      ];

    case "swim_tecnica":
      return [
        zoneStep({ step_type: "warmup", distance_meters: 300, target_low: 1, target_high: 2 }),
        {
          kind: "repeat",
          repeat_count: 4,
          children: [
            zoneStep({ step_type: "interval", distance_meters: 50, target_low: 2, target_high: 2, note: "Drill tecnica" }),
            zoneStep({ step_type: "recovery", distance_meters: 50, target_low: 1, target_high: 1 }),
          ],
        },
        {
          kind: "repeat",
          repeat_count: 6,
          children: [
            zoneStep({ step_type: "interval", distance_meters: 100, target_low: 3, target_high: 3 }),
          ],
        },
        zoneStep({ step_type: "cooldown", distance_meters: 200, target_low: 1, target_high: 1 }),
      ];

    case "swim_css":
      return [
        zoneStep({ step_type: "warmup", distance_meters: 400, target_low: 1, target_high: 2 }),
        {
          kind: "repeat",
          repeat_count: 8,
          children: [
            zoneStep({ step_type: "interval", distance_meters: 100, target_low: 4, target_high: 4 }),
            makeStep({ step_type: "rest", duration_seconds: 15, note: "Recupero" }),
          ],
        },
        zoneStep({ step_type: "cooldown", distance_meters: 200, target_low: 1, target_high: 1 }),
      ];

    case "bike_sweetspot":
      return [
        warm(),
        {
          kind: "repeat",
          repeat_count: 3,
          children: [
            zoneStep({ step_type: "interval", duration_seconds: 8 * 60, target_low: 3, target_high: 4, note: "Sweet spot 88–94% FTP" }),
            zoneStep({ step_type: "recovery", duration_seconds: 4 * 60, target_low: 1, target_high: 1 }),
          ],
        },
        cool(),
      ];

    case "bike_vo2":
      return [
        warm(),
        {
          kind: "repeat",
          repeat_count: 6,
          children: [
            zoneStep({ step_type: "interval", duration_seconds: 3 * 60, target_low: 5, target_high: 5 }),
            zoneStep({ step_type: "recovery", duration_seconds: 3 * 60, target_low: 1, target_high: 1 }),
          ],
        },
        cool(),
      ];

    case "brick":
      return [
        zoneStep({ step_type: "warmup", duration_seconds: 10 * 60, target_low: 1, target_high: 2, note: "Bici" }),
        zoneStep({ step_type: "steady", duration_seconds: 40 * 60, target_low: 3, target_high: 3, note: "Bici — fondo medio" }),
        makeStep({ step_type: "rest", duration_seconds: 3 * 60, note: "Transizione T2 (cambio)" }),
        zoneStep({ step_type: "steady", duration_seconds: 20 * 60, target_low: 3, target_high: 3, note: "Corsa a piedi (brick)" }),
        cool(),
      ];
  }
}

// --- nome di default dell'allenamento ---------------------------------------

const DISC_PREFIX: Record<Discipline, string> = {
  swim: "Swim",
  bike: "Bike",
  run: "Run",
  athletics: "Strength",
  other: "Workout",
};

/** "Swim — 04/05/2026 — 45:00" (durata omessa se sconosciuta). */
export function defaultWorkoutName(
  discipline: Discipline,
  dateISO: string | null,
  totalSeconds: number,
): string {
  const prefix = DISC_PREFIX[discipline] ?? "Workout";
  const parts = [prefix];
  if (dateISO) {
    const [y, m, d] = dateISO.slice(0, 10).split("-");
    if (y && m && d) parts.push(`${d}/${m}/${y}`);
  }
  const dur = fmtDuration(totalSeconds);
  if (dur) parts.push(dur);
  return parts.join(" — ");
}

// --- appiattimento per la persistenza ---------------------------------------

/** Riga pronta per session_steps (senza id/session_id, con parent locale). */
export interface FlatStepRow {
  localId: number;
  parentLocalId: number | null;
  sort_order: number;
  step_type: StepType;
  repeat_count: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  raw_fragment: string | null;
  target_type: TargetType | null;
  target_low: number | null;
  target_high: number | null;
  target_unit: string | null;
  cadence_rpm: number | null;
  recovery_text: string | null;
  note: string | null;
}

/** Appiattisce i blocchi in righe ordinate con parent locali. */
export function flattenBlocks(blocks: Block[]): FlatStepRow[] {
  const rows: FlatStepRow[] = [];
  let id = 0;
  let order = 0;
  for (const b of blocks) {
    if (b.kind === "repeat") {
      const parentId = id++;
      rows.push({
        localId: parentId,
        parentLocalId: null,
        sort_order: order++,
        step_type: "repeat",
        repeat_count: b.repeat_count,
        duration_seconds: null,
        distance_meters: null,
        raw_fragment: null,
        target_type: null,
        target_low: null,
        target_high: null,
        target_unit: null,
        cadence_rpm: null,
        recovery_text: null,
        note: null,
      });
      let childOrder = 0;
      for (const c of b.children) {
        rows.push({ ...stepToRow(c, id++, childOrder++), parentLocalId: parentId });
      }
    } else {
      rows.push(stepToRow(b, id++, order++));
    }
  }
  return rows;
}

function stepToRow(s: SimpleStep, localId: number, sort: number): FlatStepRow {
  return {
    localId,
    parentLocalId: null,
    sort_order: sort,
    step_type: s.step_type,
    repeat_count: null,
    duration_seconds: s.duration_seconds,
    distance_meters: s.distance_meters,
    raw_fragment: s.raw_fragment,
    target_type: s.target_type,
    target_low: s.target_low,
    target_high: s.target_high,
    target_unit: s.target_unit,
    cadence_rpm: s.cadence_rpm,
    recovery_text: s.recovery_text,
    note: s.note,
  };
}
