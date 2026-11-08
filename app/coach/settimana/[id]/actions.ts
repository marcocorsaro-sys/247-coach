"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mondayOf, addDays, toISODate, weekLabel } from "@/lib/training/weeks";
import { notifyWeekPublished } from "@/lib/notify";
import { pushWeekToIntervals } from "@/lib/server/icuPush";
import { structureWeek } from "@/lib/ai/structurer";

// Colonne copiate quando si clona una sessione.
const SESSION_COLS =
  "day_of_week, discipline, title, intensity_label, volume_value, volume_unit, raw_text, sort_order";
const STEP_COLS =
  "id, parent_step_id, sort_order, step_type, repeat_count, duration_seconds, distance_meters, target_type, target_low, target_high, target_unit, cadence_rpm, recovery_text, raw_fragment, equipment, note";

type StepRow = {
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
  target_unit: string | null;
  cadence_rpm: number | null;
  recovery_text: string | null;
  raw_fragment: string | null;
  equipment: string | null;
  note: string | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Clona gli step di una sessione sorgente in una nuova sessione, rimappando i parent. */
async function cloneSteps(
  supabase: SupabaseClient,
  oldSessionId: string,
  newSessionId: string,
) {
  const { data } = await supabase
    .from("session_steps")
    .select(STEP_COLS)
    .eq("session_id", oldSessionId)
    .order("sort_order", { ascending: true });
  const steps = (data ?? []) as unknown as StepRow[];
  if (steps.length === 0) return;

  const strip = (s: StepRow) => ({
    session_id: newSessionId,
    sort_order: s.sort_order,
    step_type: s.step_type,
    repeat_count: s.repeat_count,
    duration_seconds: s.duration_seconds,
    distance_meters: s.distance_meters,
    target_type: s.target_type,
    target_low: s.target_low,
    target_high: s.target_high,
    target_unit: s.target_unit,
    cadence_rpm: s.cadence_rpm,
    recovery_text: s.recovery_text,
    raw_fragment: s.raw_fragment,
    equipment: s.equipment,
    note: s.note,
  });

  const parents = steps.filter((s) => !s.parent_step_id);
  const children = steps.filter((s) => s.parent_step_id);

  const { data: insParents } = await supabase
    .from("session_steps")
    .insert(parents.map((p) => ({ ...strip(p), parent_step_id: null })) as never)
    .select("id");
  const newParents = (insParents ?? []) as unknown as { id: string }[];

  const idMap = new Map<string, string>();
  parents.forEach((p, i) => {
    if (newParents[i]) idMap.set(p.id, newParents[i].id);
  });

  if (children.length > 0) {
    await supabase.from("session_steps").insert(
      children.map((c) => ({
        ...strip(c),
        parent_step_id: c.parent_step_id ? idMap.get(c.parent_step_id) ?? null : null,
      })) as never,
    );
  }
}

/** Duplica un'intera tabella settimanale (settimana + sessioni + step) come bozza. */
export async function duplicateWeek(formData: FormData) {
  const weekId = String(formData.get("week_id") ?? "");
  if (!weekId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: srcData } = await supabase
    .from("training_weeks")
    .select("athlete_id, coach_id, label, week_start, coach_comment")
    .eq("id", weekId)
    .single();
  const src = srcData as unknown as {
    athlete_id: string;
    coach_id: string | null;
    label: string | null;
    week_start: string;
    coach_comment: string | null;
  } | null;
  if (!src) return;

  // Primo lunedì libero dopo la settimana sorgente (no sovrapposizioni).
  const { data: existing } = await supabase
    .from("training_weeks")
    .select("week_start")
    .eq("athlete_id", src.athlete_id);
  const taken = new Set(
    ((existing ?? []) as unknown as { week_start: string }[]).map((r) =>
      r.week_start.slice(0, 10),
    ),
  );
  let nextStart = addDays(mondayOf(src.week_start), 7);
  for (let i = 0; i < 520 && taken.has(toISODate(nextStart)); i++) {
    nextStart = addDays(nextStart, 7);
  }
  const newWeekStart = toISODate(nextStart);

  const { data: newWeekData } = await supabase
    .from("training_weeks")
    .insert({
      athlete_id: src.athlete_id,
      coach_id: user.id,
      created_by: user.id,
      week_start: newWeekStart,
      label: weekLabel(nextStart),
      status: "draft",
      previous_week_id: weekId,
      coach_comment: src.coach_comment,
    } as never)
    .select("id")
    .single();
  const newWeek = newWeekData as unknown as { id: string } | null;
  if (!newWeek) return;

  const { data: sessData } = await supabase
    .from("sessions")
    .select(`id, ${SESSION_COLS}`)
    .eq("week_id", weekId)
    .order("sort_order", { ascending: true });
  const sessions = (sessData ?? []) as unknown as ({ id: string } & Record<string, unknown>)[];

  for (const s of sessions) {
    const { id: oldId, ...rest } = s;
    const { data: newSessData } = await supabase
      .from("sessions")
      .insert({ ...rest, week_id: newWeek.id } as never)
      .select("id")
      .single();
    const newSess = newSessData as unknown as { id: string } | null;
    if (newSess) await cloneSteps(supabase, oldId, newSess.id);
  }

  redirect(`/coach/atleta/${src.athlete_id}/griglia?w=${newWeekStart}`);
}

/** Duplica una singola sessione (con i suoi step) nella stessa settimana. */
export async function copySession(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  const weekId = String(formData.get("week_id") ?? "");
  if (!sessionId || !weekId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: srcData } = await supabase
    .from("sessions")
    .select(SESSION_COLS)
    .eq("id", sessionId)
    .single();
  const src = srcData as unknown as Record<string, unknown> | null;
  if (!src) return;

  const { data: newSessData } = await supabase
    .from("sessions")
    .insert({ ...src, week_id: weekId, sort_order: 90 } as never)
    .select("id")
    .single();
  const newSess = newSessData as unknown as { id: string } | null;
  if (newSess) await cloneSteps(supabase, sessionId, newSess.id);

  revalidatePath(`/coach/settimana/${weekId}`);
  redirect(`/coach/settimana/${weekId}?saved=1`);
}

/** Aggiunge un allenamento vuoto a un giorno e apre il builder. */
export async function addSession(formData: FormData) {
  const weekId = String(formData.get("wk_id") ?? "");
  const day = parseInt(String(formData.get("add_day") ?? "0"), 10);
  if (!weekId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("sessions")
    .insert({
      week_id: weekId,
      day_of_week: Number.isFinite(day) ? day : 0,
      discipline: "run",
      volume_unit: "time",
      sort_order: 50,
    } as never)
    .select("id")
    .single();
  const sess = data as unknown as { id: string } | null;

  if (sess) redirect(`/coach/sessione/${sess.id}`);
  redirect(`/coach/settimana/${weekId}`);
}

/** Elimina un allenamento dalla settimana. */
export async function deleteSession(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  const weekId = String(formData.get("week_id") ?? "");
  if (!sessionId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("sessions").delete().eq("id", sessionId);
  revalidatePath(`/coach/settimana/${weekId}`);
  redirect(`/coach/settimana/${weekId}`);
}

export async function saveWeek(formData: FormData) {
  const weekId = String(formData.get("wk_id") ?? "");
  if (!weekId) redirect("/coach");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Solo la nota della settimana. Il nome (label) deriva da week_start; lo stato
  // si gestisce con i pulsanti Pubblica/Ritira (publishWeek/unpublishWeek).
  const comment = String(formData.get("wk_comment") ?? "").trim() || null;
  await supabase
    .from("training_weeks")
    .update({ coach_comment: comment } as never)
    .eq("id", weekId);

  redirect(`/coach/settimana/${weekId}?saved=1`);
}

/** Pubblica la tabella: la rende visibile all'atleta e notifica via email+SMS. */
export async function publishWeek(formData: FormData) {
  const weekId = String(formData.get("wk_id") ?? "");
  if (!weekId) redirect("/coach");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("training_weeks")
    .update({ status: "published", published_at: new Date().toISOString() } as never)
    .eq("id", weekId);

  // Notifica in tempo reale all'atleta (email + SMS). Best-effort: qualunque
  // errore qui NON deve impedire/annullare la pubblicazione.
  const notify = await notifyAthleteOfPublish(supabase, weekId);

  // Push automatico verso Intervals/dispositivo (Garmin, Suunto, ...): tutti
  // gli allenamenti della settimana partono da soli se l'atleta è collegato.
  const push = await pushWeekToIntervals(supabase, weekId);
  const pushMsg =
    push.sent == null
      ? null
      : `${push.sent} allenamenti inviati al dispositivo${push.failed ? ` (${push.failed} falliti)` : ""}`;

  // Strutturatore AI in background: le sedute senza step (testo libero)
  // vengono convertite in step strutturati e ri-inviate al dispositivo.
  after(async () => {
    try {
      const r = await structureWeek(weekId);
      if (r.structured > 0) await pushWeekToIntervals(supabase, weekId);
    } catch (e) {
      console.error("[structurer] publishWeek", (e as Error).message);
    }
  });

  const parts = [notify, pushMsg].filter(Boolean).join(" · ");
  redirect(`/coach/settimana/${weekId}?published=1${parts ? `&notify=${encodeURIComponent(parts)}` : ""}`);
}

/**
 * Pulsante "✨ Struttura per l'orologio": avvia in background la conversione
 * AI delle sedute in testo libero in step strutturati, poi ri-invia la
 * settimana al dispositivo. Con force=1 rigenera anche gli step AI esistenti
 * (mai quelli scritti a mano nel builder).
 */
export async function structureWeekAction(formData: FormData) {
  const weekId = String(formData.get("wk_id") ?? "");
  if (!weekId) redirect("/coach");
  const force = String(formData.get("force") ?? "") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  after(async () => {
    try {
      const r = await structureWeek(weekId, { force });
      if (r.structured > 0) await pushWeekToIntervals(supabase, weekId);
      console.log("[structurer] settimana", weekId, "strutturate", r.structured, "di", r.candidates);
    } catch (e) {
      console.error("[structurer] action", (e as Error).message);
    }
  });

  redirect(`/coach/settimana/${weekId}?structuring=1`);
}

/**
 * Recupera atleta + etichetta settimana e invia la notifica di pubblicazione.
 * Restituisce un riepilogo breve per il banner (o null se nulla da segnalare).
 * Non solleva mai: ogni errore viene loggato e ingoiato.
 */
async function notifyAthleteOfPublish(
  supabase: SupabaseClient,
  weekId: string,
): Promise<string | null> {
  try {
    const { data: wkData } = await supabase
      .from("training_weeks")
      .select("label, week_start, athlete_id")
      .eq("id", weekId)
      .single();
    const wk = wkData as unknown as {
      label: string | null;
      week_start: string;
      athlete_id: string;
    } | null;
    if (!wk) return null;

    const { data: athData } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", wk.athlete_id)
      .single();
    const ath = athData as unknown as {
      full_name: string | null;
      email: string | null;
      phone: string | null;
    } | null;

    const res = await notifyWeekPublished({
      athleteName: ath?.full_name ?? "atleta",
      athleteEmail: ath?.email ?? null,
      athletePhone: ath?.phone ?? null,
      weekLabel: wk.label ?? weekLabel(mondayOf(wk.week_start)),
      appUrl:
        process.env.NEXT_PUBLIC_APP_URL ?? "https://irene-coletto-tabella.vercel.app",
    });

    console.log("[publish-notify]", weekId, JSON.stringify(res));

    const sent: string[] = [];
    if (res.email.status === "sent") sent.push("email");
    if (res.sms.status === "sent") sent.push("SMS");
    if (sent.length) return `Notifica inviata: ${sent.join(" + ")}`;

    const errored =
      res.email.status === "error" || res.sms.status === "error";
    if (errored) return "Notifica non inviata (errore provider) — vedi i log";
    return "Notifica non configurata (email/SMS): atleta avvisato solo in app";
  } catch (e) {
    console.error("[publish-notify] errore", (e as Error).message);
    return null;
  }
}

/** Elimina l'intera tabella settimanale (sessioni e step vanno a cascata). */
export async function deleteWeek(formData: FormData) {
  const weekId = String(formData.get("week_id") ?? "");
  if (!weekId) redirect("/coach");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("training_weeks")
    .select("athlete_id")
    .eq("id", weekId)
    .single();
  const athleteId = (data as unknown as { athlete_id: string } | null)?.athlete_id ?? null;

  await supabase.from("training_weeks").delete().eq("id", weekId);

  if (athleteId) {
    revalidatePath(`/coach/atleta/${athleteId}`);
    redirect(`/coach/atleta/${athleteId}`);
  }
  redirect("/coach");
}

/** Ritira la tabella: torna in bozza, non più visibile all'atleta. */
export async function unpublishWeek(formData: FormData) {
  const weekId = String(formData.get("wk_id") ?? "");
  if (!weekId) redirect("/coach");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("training_weeks")
    .update({ status: "draft" } as never)
    .eq("id", weekId);

  redirect(`/coach/settimana/${weekId}?unpublished=1`);
}
