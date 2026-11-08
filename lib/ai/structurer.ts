// ============================================================================
// Strutturatore AI — converte le sedute scritte in testo libero (le tabelle
// di Irene, importate da Excel o scritte in app) in step strutturati
// (session_steps), così il push su Intervals genera workout nativi Garmin
// con intervalli e target invece di una semplice descrizione.
//
// Regole di ingaggio:
//  - lavora SOLO sulle sedute senza step manuali: se il coach ha usato il
//    builder, quegli step sono legge e non vengono toccati;
//  - gli step creati qui sono marcati ai_generated=true e possono essere
//    rigenerati (force) senza rischio;
//  - stessi guard-rail del coach AI: zone 1-5/RPE/testo (mai valori assoluti
//    inventati), coerenza somma step ↔ durata dichiarata.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStructured } from "@/lib/ai/claude";
import {
  STEP,
  type AiStep,
  sanitizeSteps,
  repairStepsCoherence,
  insertSessionSteps,
} from "@/lib/ai/plan";
import { alignRepeatsWithText } from "@/lib/ai/repeatsFromText";

const STRUCTURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sessions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          session_id: { type: "string", description: "Id della seduta, copiato ESATTAMENTE dall'input" },
          steps: { type: "array", items: STEP },
        },
        required: ["session_id", "steps"],
      },
    },
  },
  required: ["sessions"],
} as const;

const SYSTEM = `Converti sedute di allenamento scritte in testo libero (dalla coach, in italiano) in step strutturati per l'orologio (Intervals.icu → Garmin/Suunto/Polar).
Regole sui target:
- target_type "zone": SOLO numeri di zona 1-5; l'app li traduce nei valori personali dell'atleta. Se il testo usa nomi di zone personalizzate (es. "F2", "A1", "fondo medio"), mappale sulla zona 1-5 più vicina usando l'elenco fornito.
- target_type "rpe": 1-10, quando il testo parla di sensazioni/sforzo percepito.
- target_type "text": quando il target è libero (es. "progressivo", "tecnica"); metti la dicitura in note.
- NON inventare MAI passi al km, watt o battiti assoluti: se il testo li indica esplicitamente, riportali in note (testo), non come target numerico.
Struttura:
- Rispetta fedelmente il testo: riscaldamento, ripetute (step_type "repeat" con repeat_count e sub_steps), recuperi (recovery_text), defaticamento. Non aggiungere lavoro che il testo non prevede.
- OGNI step a tempo ha duration_seconds; per il nuoto usa distance_meters.
- La somma delle durate (ripetute moltiplicate) deve corrispondere alla durata dichiarata della seduta (tolleranza ±10%).
- Se il testo NON descrive una struttura (es. "1h facile"), va bene un solo step "work" con la durata totale e il target che si evince.
- session_id va copiato esattamente; non inventare sedute non richieste.`;

export interface StructureResult {
  ok: boolean;
  candidates: number;
  structured: number;
  error?: string;
}

interface SessRow {
  id: string;
  discipline: string | null;
  title: string | null;
  volume_value: string | null;
  notes: string | null;
  raw_text: string | null;
}

/** Contesto zone/soglie dell'atleta per aiutare la mappatura dei target. */
async function zonesContext(admin: SupabaseClient, athleteId: string): Promise<string> {
  const { data } = await admin
    .from("athlete_custom_zones")
    .select("discipline, zone_name, range_text")
    .eq("athlete_id", athleteId)
    .order("discipline")
    .order("sort_order");
  const zones = (data ?? []) as { discipline: string; zone_name: string; range_text: string }[];
  if (!zones.length) return "Zone personalizzate: nessuna definita (usa zone 1-5 standard o RPE).";
  return `Zone personalizzate dell'atleta (mappa i nomi del testo su zona 1-5):\n${zones
    .map((z) => `  ${z.discipline} ${z.zone_name}: ${z.range_text}`)
    .join("\n")}`;
}

/**
 * Struttura con l'AI tutte le sedute di una settimana che non hanno step
 * scritti a mano. Con force=true rigenera anche gli step AI esistenti.
 */
export async function structureWeek(
  weekId: string,
  opts: { force?: boolean } = {},
): Promise<StructureResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, candidates: 0, structured: 0, error: "ANTHROPIC_API_KEY non configurata" };
  }
  const admin = createAdminClient();

  const { data: wkData } = await admin
    .from("training_weeks")
    .select("id, athlete_id, week_start")
    .eq("id", weekId)
    .maybeSingle();
  const wk = wkData as { id: string; athlete_id: string; week_start: string } | null;
  if (!wk) return { ok: false, candidates: 0, structured: 0, error: "Settimana non trovata" };

  const { data: sessData } = await admin
    .from("sessions")
    .select("id, discipline, title, volume_value, notes, raw_text")
    .eq("week_id", weekId)
    .order("day_of_week");
  const sessions = (sessData ?? []) as unknown as SessRow[];
  if (!sessions.length) return { ok: true, candidates: 0, structured: 0 };

  // Step esistenti: una seduta con step manuali è intoccabile; una con soli
  // step AI è candidata solo in modalità force.
  const { data: stepData } = await admin
    .from("session_steps")
    .select("session_id, ai_generated")
    .in("session_id", sessions.map((s) => s.id));
  const hasManual = new Set<string>();
  const hasAny = new Set<string>();
  for (const r of (stepData ?? []) as { session_id: string; ai_generated: boolean }[]) {
    hasAny.add(r.session_id);
    if (!r.ai_generated) hasManual.add(r.session_id);
  }

  const candidates = sessions.filter((s) => {
    if (hasManual.has(s.id)) return false;
    if (hasAny.has(s.id) && !opts.force) return false;
    const text = (s.notes ?? s.raw_text ?? "").trim();
    return Boolean(text || s.volume_value);
  });
  if (!candidates.length) return { ok: true, candidates: 0, structured: 0 };

  const zones = await zonesContext(admin, wk.athlete_id);
  const prompt = `${zones}

SEDUTE DA STRUTTURARE (settimana del ${wk.week_start}):
${candidates
  .map(
    (s) => `---
session_id: ${s.id}
disciplina: ${s.discipline ?? "?"}
titolo: ${s.title ?? "—"}
durata/volume dichiarati: ${s.volume_value ?? "—"}
testo della coach:
${(s.notes ?? s.raw_text ?? "").trim() || "(nessun testo: un solo step con la durata dichiarata)"}`,
  )
  .join("\n")}

RICHIESTA: per OGNI seduta sopra, genera gli step strutturati.`;

  const res = await generateStructured<{ sessions: { session_id: string; steps: AiStep[] }[] }>({
    system: SYSTEM,
    prompt,
    schema: STRUCTURE_SCHEMA as unknown as Record<string, unknown>,
  });
  if (!res.ok || !res.data) {
    return { ok: false, candidates: candidates.length, structured: 0, error: res.error };
  }

  const byId = new Map(candidates.map((s) => [s.id, s]));
  let structured = 0;
  for (const out of res.data.sessions) {
    const sess = byId.get(out.session_id);
    if (!sess || !out.steps?.length) continue;
    const steps = sanitizeSteps(out.steps);
    // Dove la coach ha scritto le ripetute per esteso, comanda il testo: il
    // modello le ha sbagliate almeno una volta e nessuno se n'era accorto.
    const realigned = alignRepeatsWithText(steps, sess.notes ?? sess.raw_text);
    if (realigned) {
      console.warn(
        "[structurer] seduta", sess.id,
        `— ${realigned} valori di ripetute riportati al testo della coach`,
      );
    }
    repairStepsCoherence(steps, sess.volume_value ?? "");

    // Rimpiazza solo step AI (mai quelli manuali; qui non ce ne sono).
    const { error: delErr } = await admin
      .from("session_steps")
      .delete()
      .eq("session_id", sess.id)
      .eq("ai_generated", true);
    if (delErr) continue;
    try {
      await insertSessionSteps(admin, sess.id, steps, true);
      structured++;
    } catch (e) {
      console.error("[structurer] seduta", sess.id, (e as Error).message);
    }
  }

  return { ok: true, candidates: candidates.length, structured };
}

/**
 * Backfill: struttura tutte le settimane pubblicate da oggi in avanti (di un
 * atleta, o di tutti). Usato dalla route /api/ai/structure.
 */
export async function structureUpcomingWeeks(
  opts: { athleteId?: string; force?: boolean } = {},
): Promise<{ weeks: number; structured: number; errors: string[] }> {
  const admin = createAdminClient();
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const mondayISO = monday.toISOString().slice(0, 10);

  let q = admin
    .from("training_weeks")
    .select("id")
    .eq("status", "published")
    .gte("week_start", mondayISO);
  if (opts.athleteId) q = q.eq("athlete_id", opts.athleteId);
  const { data } = await q;
  const weekIds = ((data ?? []) as { id: string }[]).map((w) => w.id);

  let structured = 0;
  const errors: string[] = [];
  for (const id of weekIds) {
    const r = await structureWeek(id, { force: opts.force });
    structured += r.structured;
    if (!r.ok && r.error) errors.push(`${id}: ${r.error}`);
  }
  return { weeks: weekIds.length, structured, errors };
}
