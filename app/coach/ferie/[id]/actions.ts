"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Aggiorna etichetta, date e nota del periodo. */
export async function savePeriod(formData: FormData) {
  const periodId = String(formData.get("period_id") ?? "");
  if (!periodId) return;
  const start = str(formData.get("start_date"));
  const end = str(formData.get("end_date"));
  const { supabase } = await client();

  const patch: Record<string, unknown> = {
    label: str(formData.get("label")),
    note: str(formData.get("note")),
  };
  if (start && end) {
    const [s, e] = start <= end ? [start, end] : [end, start];
    patch.start_date = s;
    patch.end_date = e;
  }
  await supabase.from("vacation_periods").update(patch as never).eq("id", periodId);
  revalidatePath(`/coach/ferie/${periodId}`);
}

/** Pubblica/ritira il periodo (lo rende visibile o meno all'atleta). */
export async function togglePeriodPublish(formData: FormData) {
  const periodId = String(formData.get("period_id") ?? "");
  const publish = String(formData.get("publish") ?? "") === "1";
  if (!periodId) return;
  const { supabase } = await client();
  await supabase
    .from("vacation_periods")
    .update({ status: publish ? "published" : "draft" } as never)
    .eq("id", periodId);
  revalidatePath(`/coach/ferie/${periodId}`);
}

/** Aggiunge un allenamento al roaster del periodo. */
export async function addWorkout(formData: FormData) {
  const periodId = String(formData.get("period_id") ?? "");
  const discipline = str(formData.get("discipline")) ?? "swim";
  const title = str(formData.get("title"));
  if (!periodId || !title) return;
  const { supabase } = await client();

  await supabase.from("vacation_workouts").insert({
    period_id: periodId,
    discipline,
    title,
    intensity_label: str(formData.get("intensity_label")),
    volume_value: str(formData.get("volume_value")),
    description: str(formData.get("description")),
    sort_order: 50,
  } as never);
  revalidatePath(`/coach/ferie/${periodId}`);
}

/** Rimuove un allenamento dal roaster. */
export async function deleteWorkout(formData: FormData) {
  const periodId = String(formData.get("period_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  if (!workoutId) return;
  const { supabase } = await client();
  await supabase.from("vacation_workouts").delete().eq("id", workoutId);
  revalidatePath(`/coach/ferie/${periodId}`);
}

/**
 * Attiva/disattiva una disciplina su un giorno del periodo: se la riga esiste
 * la rimuove, altrimenti la crea. È il "metti nuoto su questo giorno".
 */
export async function toggleDayDiscipline(formData: FormData) {
  const periodId = String(formData.get("period_id") ?? "");
  const date = str(formData.get("date"));
  const discipline = str(formData.get("discipline"));
  if (!periodId || !date || !discipline) return;
  const { supabase } = await client();

  const { data: existing } = await supabase
    .from("vacation_days")
    .select("id")
    .eq("period_id", periodId)
    .eq("date", date)
    .eq("discipline", discipline)
    .maybeSingle();
  const row = existing as unknown as { id: string } | null;

  if (row) {
    await supabase.from("vacation_days").delete().eq("id", row.id);
  } else {
    await supabase.from("vacation_days").insert({
      period_id: periodId,
      date,
      discipline,
      sort_order: 50,
    } as never);
  }
  revalidatePath(`/coach/ferie/${periodId}`);
}
