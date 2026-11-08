// Descrizione leggibile degli step di una sessione, per le viste in lettura.
import { type Discipline, type Fitness, zonesForDiscipline } from "./zones";
import { fmtDuration, fmtDistance } from "./workouts";

export interface StepLite {
  id: string;
  parent_step_id: string | null;
  sort_order: number;
  step_type: string;
  repeat_count: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  target_type: string | null;
  target_low: number | null;
  target_high: number | null;
  /** Misura libera/range scritta a mano ("45-60'", "8x100", "INSERISCI"). */
  raw_fragment: string | null;
  /** Target libero scritto a mano ("z3 alto RPE 7", "progressione", "CSS"). */
  target_unit: string | null;
  /** Recupero della ripetuta/step ("rec 15''"). */
  recovery_text: string | null;
  /** Attrezzi dello step (nuoto: "pull+palette", "pinne", ...). */
  equipment: string | null;
  note: string | null;
}

const STEP_LABEL: Record<string, string> = {
  warmup: "Riscaldamento",
  interval: "Lavoro",
  recovery: "Recupero",
  steady: "Costante",
  cooldown: "Defaticamento",
  rest: "Pausa",
};

function measure(s: StepLite): string {
  // La misura libera (range/testo) ha la precedenza: è ciò che Irene scrive a mano.
  if (s.raw_fragment?.trim()) return s.raw_fragment.trim();
  if (s.duration_seconds) return fmtDuration(s.duration_seconds);
  if (s.distance_meters) return fmtDistance(s.distance_meters);
  return "—";
}

export function targetText(s: StepLite, d: Discipline, f: Fitness): string {
  // Target libero scritto a mano (progressione, "z3 alto RPE 7", ecc.):
  // persistito come target_unit con target_type "open".
  if (s.target_unit?.trim() && s.target_type !== "zone" && s.target_type !== "rpe")
    return s.target_unit.trim();
  if (s.target_type === "zone" && s.target_low != null) {
    const zs = zonesForDiscipline(d, f);
    const z = zs.find((zz) => zz.n === s.target_low);
    const lbl = `Z${s.target_low}${
      s.target_high && s.target_high !== s.target_low ? `-${s.target_high}` : ""
    }`;
    return z ? `${lbl} (${z.range})` : lbl;
  }
  if (s.target_type === "rpe" && s.target_low != null) return `RPE ${s.target_low}`;
  return "";
}

export interface StepLineView {
  label: string;
  detail: string;
}
export interface StepBlockView extends StepLineView {
  reps?: number;
  children?: StepLineView[];
}

export function describeSteps(steps: StepLite[], d: Discipline, f: Fitness): StepBlockView[] {
  const tops = steps.filter((s) => !s.parent_step_id).sort((a, b) => a.sort_order - b.sort_order);
  const recovery = (s: StepLite): string => {
    const r = s.recovery_text?.trim();
    return r ? (/\brec/i.test(r) ? r : `rec ${r}`) : "";
  };
  const equip = (s: StepLite): string => {
    const e = s.equipment?.trim();
    return e ? `🛟 ${e}` : "";
  };
  const line = (s: StepLite): StepLineView => {
    const t = targetText(s, d, f);
    const detail = [measure(s), t, recovery(s), equip(s)].filter(Boolean).join(" · ");
    return { label: s.note?.trim() || STEP_LABEL[s.step_type] || "Step", detail };
  };
  return tops.map((t) => {
    if (t.step_type === "repeat") {
      const children = steps
        .filter((s) => s.parent_step_id === t.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(line);
      const rec = recovery(t);
      return {
        label: `${t.repeat_count ?? 2}× ripeti`,
        detail: rec,
        reps: t.repeat_count ?? 2,
        children,
      };
    }
    return line(t);
  });
}

// --- profilo grafico dell'allenamento (intensità nel tempo) -----------------
// Stessa logica/colori del builder coach, ma calcolata dagli StepLite salvati
// così che l'atleta veda lo stesso grafichino a barre colorate.

export interface ProfileSeg {
  sec: number;
  intensity: number;
}

const clampI = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const TYPE_INTENSITY: Record<string, number> = {
  warmup: 0.3,
  cooldown: 0.25,
  recovery: 0.22,
  rest: 0.12,
  steady: 0.5,
  interval: 0.85,
};

/** Intensità 0..1 dello step: zona/RPE se impostati, altrimenti dal tipo. */
function stepIntensity(s: StepLite): number {
  if (s.target_type === "zone" && s.target_low != null) return clampI(s.target_low / 7, 0.12, 1);
  if (s.target_type === "rpe" && s.target_low != null) return clampI(s.target_low / 10, 0.12, 1);
  return TYPE_INTENSITY[s.step_type] ?? 0.4;
}

/** Larghezza relativa (in secondi) dello step per il profilo. */
function segSeconds(s: StepLite): number {
  if (s.duration_seconds && s.duration_seconds > 0) return s.duration_seconds;
  if (s.distance_meters && s.distance_meters > 0) return Math.max(45, Math.round(s.distance_meters / 4));
  return 90;
}

/** Segmenti del profilo (le ripetute vengono espanse reps×figli). */
export function workoutProfile(steps: StepLite[]): ProfileSeg[] {
  const tops = steps.filter((s) => !s.parent_step_id).sort((a, b) => a.sort_order - b.sort_order);
  const out: ProfileSeg[] = [];
  for (const t of tops) {
    if (t.step_type === "repeat") {
      const kids = steps
        .filter((s) => s.parent_step_id === t.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const reps = Math.max(1, t.repeat_count ?? 1);
      for (let r = 0; r < reps; r++)
        for (const c of kids) out.push({ sec: segSeconds(c), intensity: stepIntensity(c) });
    } else {
      out.push({ sec: segSeconds(t), intensity: stepIntensity(t) });
    }
  }
  return out;
}

/** Colore per intensità: verde=facile → rosa=massimale. */
export function intensityColor(i: number): string {
  // Tema 24/7: scala "ghiaccio → arancio percorso" (bici/facile → massimale).
  if (process.env.NEXT_PUBLIC_APP_MODE === "ai_coach") {
    if (i < 0.33) return "#4f9be8"; // Z1 recupero — blu
    if (i < 0.55) return "#3ec46d"; // Z2 fondo — verde
    if (i < 0.75) return "#f2c200"; // Z3 medio — giallo
    if (i < 0.9) return "#ff8a1f"; // Z4 soglia — arancio
    return "#ff3b3b"; // Z5 massimale — rosso
  }
  if (i < 0.33) return "#34d399"; // facile
  if (i < 0.55) return "#a3e635"; // moderato
  if (i < 0.75) return "#fbbf24"; // medio/soglia
  if (i < 0.9) return "#fb923c"; // duro
  return "#fb7185"; // massimale
}

/** Durata totale stimata in secondi (i blocchi ripetuti contano reps×figli a tempo). */
export function totalSeconds(steps: StepLite[]): number {
  const byParent = new Map<string | null, StepLite[]>();
  for (const s of steps) {
    const k = s.parent_step_id;
    byParent.set(k, [...(byParent.get(k) ?? []), s]);
  }
  let tot = 0;
  for (const s of byParent.get(null) ?? []) {
    if (s.step_type === "repeat") {
      const kids = steps.filter((c) => c.parent_step_id === s.id);
      const sub = kids.reduce((acc, k) => acc + (k.duration_seconds ?? 0), 0);
      tot += sub * (s.repeat_count ?? 1);
    } else {
      tot += s.duration_seconds ?? 0;
    }
  }
  return tot;
}
