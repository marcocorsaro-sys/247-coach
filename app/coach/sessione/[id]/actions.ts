"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pushSessionToIntervals } from "@/lib/server/icuPush";

/** Step appiattito inviato dal builder (parent espresso come indice locale). */
export interface SaveStepInput {
  localId: number;
  parentLocalId: number | null;
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

export interface SaveSessionInput {
  sessionId: string;
  weekId: string;
  title: string | null;
  discipline: string;
  day_of_week: number;
  volume_value: string | null;
  volume_unit: string | null;
  notes: string | null;
  steps: SaveStepInput[];
}

export async function saveSession(input: SaveSessionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // --- meta sessione ---
  await supabase
    .from("sessions")
    .update({
      title: input.title,
      discipline: input.discipline,
      day_of_week: input.day_of_week,
      volume_value: input.volume_value,
      volume_unit: input.volume_unit,
      notes: input.notes,
    } as never)
    .eq("id", input.sessionId);

  // --- sostituisci gli step ---
  await supabase.from("session_steps").delete().eq("session_id", input.sessionId);

  const steps = input.steps;
  if (steps.length > 0) {
    const base = (s: SaveStepInput) => ({
      session_id: input.sessionId,
      sort_order: s.sort_order,
      step_type: s.step_type,
      repeat_count: s.repeat_count,
      duration_seconds: s.duration_seconds,
      distance_meters: s.distance_meters,
      raw_fragment: s.raw_fragment,
      target_type: s.target_type,
      target_low: s.target_low,
      target_high: s.target_high,
      target_unit: s.target_unit,
      recovery_text: s.recovery_text,
      cadence_rpm: s.cadence_rpm,
      equipment: s.equipment,
      note: s.note,
    });

    const parents = steps.filter((s) => s.parentLocalId == null);
    const children = steps.filter((s) => s.parentLocalId != null);

    const { data: insParents } = await supabase
      .from("session_steps")
      .insert(parents.map((p) => ({ ...base(p), parent_step_id: null })) as never)
      .select("id");
    const newParents = (insParents ?? []) as unknown as { id: string }[];

    const idMap = new Map<number, string>();
    parents.forEach((p, i) => {
      if (newParents[i]) idMap.set(p.localId, newParents[i].id);
    });

    if (children.length > 0) {
      await supabase.from("session_steps").insert(
        children.map((c) => ({
          ...base(c),
          parent_step_id: c.parentLocalId != null ? idMap.get(c.parentLocalId) ?? null : null,
        })) as never,
      );
    }
  }

  // Push automatico: se la settimana è GIÀ pubblicata, l'allenamento salvato
  // riparte subito verso Intervals/dispositivo (best-effort, non blocca).
  const { data: wkData } = await supabase
    .from("training_weeks")
    .select("status")
    .eq("id", input.weekId)
    .single();
  if ((wkData as unknown as { status: string } | null)?.status === "published") {
    try {
      await pushSessionToIntervals(supabase, input.sessionId);
    } catch (e) {
      console.error("[icu-push] su salvataggio", input.sessionId, (e as Error).message);
    }
  }

  revalidatePath(`/coach/sessione/${input.sessionId}`);
  redirect(`/coach/sessione/${input.sessionId}?saved=1`);
}

// --- invio a Garmin via Intervals.icu ---------------------------------------

/**
 * Pubblica la sessione come allenamento PIANIFICATO sul calendario Intervals
 * dell'atleta (che, con "Upload planned workouts" attivo, lo sincronizza sul
 * dispositivo). Idempotente per sessione: ripubblicare aggiorna l'evento
 * invece di duplicarlo. L'esito viene mostrato in pagina.
 */
export async function sendSessionToIntervals(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const r = await pushSessionToIntervals(supabase, sessionId);
  const p = new URLSearchParams({ icu: r.status });
  if (r.detail) p.set("icu_detail", r.detail.slice(0, 300));
  redirect(`/coach/sessione/${sessionId}?${p.toString()}`);
}
