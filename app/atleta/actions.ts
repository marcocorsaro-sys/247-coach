"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAiCoachMode } from "@/lib/ai/mode";
import { aiAthleteIds } from "@/lib/server/appScope";
import { generateInitialPlan, upcomingPlanText, weeklyReview } from "@/lib/ai/plan";
import { triageMessage } from "@/lib/ai/triage";
import { coachName } from "@/lib/ai/coachMessage";
import { rebuildRouteCatalog, syncTracks } from "@/lib/server/routes";
import { profilePhotoUrl, verifyIntervals } from "@/lib/intervals/api";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { syncIcuActivities } from "@/lib/server/icuSync";
import { removePushedPlanned, pushAllPublishedWeeksFromNow } from "@/lib/server/icuPush";
import { resolveViewAs } from "@/lib/server/viewAs";
import { fileToText, summarizeReferencePlan } from "@/lib/server/referencePlan";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

/**
 * L'atleta autenticato — oppure, se un coach sta usando "Entra come atleta",
 * l'atleta impersonato (user.id resta il coach; le azioni operano sull'atleta
 * effettivo dove le policy RLS lo consentono).
 */
async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, athleteId: null as string | null };
  const va = await resolveViewAs(supabase, user.id);
  return { supabase, user, athleteId: va.athleteId ?? user.id };
}

// --- dispositivi / Intervals.icu ----------------------------------------------

/**
 * L'atleta collega (o aggiorna) la propria connessione Intervals.icu: API key,
 * athlete id e canali dichiarati (garmin, polar, suunto, strava, ...). Chiave
 * vuota = scollega. La verifica avviene subito contro l'API.
 */
export async function saveMyIntervalsConnection(formData: FormData) {
  const { supabase, user, athleteId } = await me();
  if (!user) redirect("/login");

  const apiKey = str(formData.get("api_key"));
  const intervalsId = str(formData.get("intervals_athlete_id"));
  const channels = formData
    .getAll("channels")
    .map((v) => String(v))
    .filter(Boolean)
    .join(", ");

  if (!apiKey) {
    await supabase.from("intervals_connections").delete().eq("athlete_id", athleteId!);
    redirect("/atleta?icu=off#dispositivi");
  }

  const v = await verifyIntervals({ intervals_athlete_id: intervalsId, api_key: apiKey! });
  await supabase.from("intervals_connections").upsert(
    {
      athlete_id: athleteId!,
      intervals_athlete_id: intervalsId,
      api_key: apiKey,
      channels: channels || null,
      enabled: true,
      // In 247 l'invio all'orologio si regola nella card dedicata: qui non si tocca.
      ...(formData.has("push_planned_ctl") ? { push_planned: formData.get("push_planned") != null } : {}),
      warmup_lap_press: formData.get("warmup_lap_press") != null,
      last_ok_at: v.ok ? new Date().toISOString() : null,
    } as never,
    { onConflict: "athlete_id" },
  );
  const photo = v.ok ? profilePhotoUrl(v.data) : null;
  if (photo) {
    await supabase.from("intervals_connections").update({ avatar_url: photo } as never).eq("athlete_id", athleteId!).is("avatar_url", null);
  }

  // Spunta tolta → i pianificati già inviati vanno RIMOSSI da Intervals
  // (e al sync spariscono da Garmin), non solo bloccati per il futuro.
  if (formData.has("push_planned_ctl") && formData.get("push_planned") == null && v.ok) {
    let deleted: number | null = null;
    try {
      deleted = (await removePushedPlanned(supabase, athleteId!)).deleted;
    } catch {
      /* best-effort: il blocco dei push futuri resta comunque attivo */
    }
    if (deleted != null) redirect(`/atleta?icu=pushoff&n=${deleted}#dispositivi`);
  }
  redirect(`/atleta?icu=${v.ok ? "ok" : "bad"}#dispositivi`);
}

/** Importa le attività svolte (ultimi 90 giorni) da Intervals.icu. */
export async function syncMyIcuActivities() {
  const { supabase, user, athleteId } = await me();
  if (!user) redirect("/login");

  const conn = await loadIntervalsConnection(supabase, athleteId!);
  if (!conn) redirect("/atleta?icu=noconn#dispositivi");

  const res = await syncIcuActivities(supabase, athleteId!, conn!);
  revalidatePath("/atleta");
  if (res.ok) redirect(`/atleta?icu=synced&n=${res.imported}#dispositivi`);
  redirect(`/atleta?icu=syncerr&d=${encodeURIComponent((res.detail ?? "").slice(0, 200))}#dispositivi`);
}

// --- dialogo col coach AI (solo 24/7 Coach) ----------------------------------

/**
 * L'atleta scrive al coach ("oggi ho fatto 200 km in bici", "ho l'anca
 * contratta"): il messaggio viene salvato nello storico e il piano viene
 * rivisto in background da domani in avanti.
 */
export async function sendCoachFeedback(formData: FormData) {
  if (!isAiCoachMode()) redirect("/atleta");
  const { user, athleteId } = await me();
  if (!user) redirect("/login");
  const message = str(formData.get("message"));
  if (!message) redirect("/atleta#coach");

  const admin = createAdminClient();

  // 1) Triage: l'app decide se cambiare subito, tenere per domenica o solo rispondere.
  const today = new Date();
  const todayLabel = today.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const upcoming = await upcomingPlanText(admin, athleteId!);
  const { data: lp } = await admin.from("profiles").select("lang").eq("id", athleteId!).maybeSingle();
  const t = await triageMessage({ message, todayLabel, upcoming, lang: (lp as { lang?: string } | null)?.lang === "en" ? "en" : "it", coachName: await coachName(athleteId!) });

  const { error } = await admin.from("ai_feedback").insert({
    athlete_id: athleteId,
    message,
    kind: t.decision === "sunday" ? "next_week" : "message",
    decision: t.decision,
    coach_reply: t.reply,
    // 'answer' non deve rientrare nei prompt come richiesta aperta
    consumed_at: t.decision === "answer" ? new Date().toISOString() : null,
  } as never);
  if (error) {
    console.error("[coach-feedback]", error.message);
    redirect("/atleta?fb=err#coach");
  }

  if (t.decision !== "now") {
    revalidatePath("/atleta");
    redirect("/atleta#coach");
  }

  // 2) Cambio subito: lock sincrono + revisione in background da domani.
  await admin
    .from("ai_athlete_profiles")
    .update({ ai_generation_started_at: new Date().toISOString(), ai_last_error: null })
    .eq("athlete_id", athleteId!);
  await admin
    .from("ai_adaptive_events" as never)
    .update({ resolved_at: new Date().toISOString() } as never)
    .eq("athlete_id", athleteId!)
    .eq("action", "asked")
    .is("resolved_at", null);
  after(async () => {
    try {
      await generateInitialPlan(athleteId!, { feedback: message! });
    } catch (e) {
      console.error("[coach-feedback] revisione fallita", (e as Error).message);
    }
  });
  redirect("/onboarding?generating=1&fb=1");
}

/**
 * Forced refresh della revisione settimanale: l'atleta dice desideri e
 * disponibilità per la prossima settimana ("sabato ho 4 ore, domenica niente",
 * "vorrei un lungo in bici") e il coach rigenera la settimana successiva da
 * attività reali + feedback, senza aspettare la domenica pomeriggio.
 */
export async function requestWeeklyReview(formData: FormData) {
  if (!isAiCoachMode()) redirect("/atleta");
  const { supabase, user, athleteId } = await me();
  if (!user) redirect("/login");
  const note = str(formData.get("note"));

  if (note) {
    const { error } = await supabase
      .from("ai_feedback" as never)
      .insert({ athlete_id: athleteId, message: note, kind: "next_week" } as never);
    if (error) {
      console.error("[weekly-refresh]", error.message);
      redirect("/atleta?fb=err#revisione");
    }
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_athlete_profiles")
    .select("ai_generation_started_at")
    .eq("athlete_id", athleteId!)
    .maybeSingle();
  const startedAt = (data as { ai_generation_started_at: string | null } | null)?.ai_generation_started_at;
  const running = startedAt != null && Date.now() - new Date(startedAt).getTime() < 10 * 60_000;
  if (!running) {
    await admin
      .from("ai_athlete_profiles")
      .update({ ai_generation_started_at: new Date().toISOString(), ai_last_error: null })
      .eq("athlete_id", athleteId!);
    after(async () => {
      try {
        await weeklyReview(athleteId!);
      } catch (e) {
        console.error("[weekly-refresh] revisione fallita", (e as Error).message);
      }
    });
  }
  redirect("/onboarding?generating=1&fb=1");
}

/** Scarica le tracce GPS mancanti da Intervals e ricostruisce i percorsi abituali. */
export async function refreshMyRoutes() {
  if (!isAiCoachMode()) redirect("/atleta");
  const { user, athleteId } = await me();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const conn = await loadIntervalsConnection(admin as never, athleteId!);
  if (conn) {
    try {
      const t = await syncTracks(admin, athleteId!, conn, { days: 400, limit: 80 });
      await rebuildRouteCatalog(admin, athleteId!, { prune: t.fetched < 80 });
    } catch (e) {
      console.error("[routes]", (e as Error).message);
    }
  }
  revalidatePath("/atleta");
  redirect("/atleta?routes=ok");
}

// --- gare --------------------------------------------------------------------

export async function addRace(formData: FormData) {
  const { supabase, user, athleteId } = await me();
  if (!user) return;
  const name = str(formData.get("name"));
  if (!name) return;

  await supabase.from("races").insert({
    athlete_id: athleteId!,
    name,
    race_date: str(formData.get("race_date")),
    location: str(formData.get("location")),
    distance_label: str(formData.get("distance_label")),
    target_time: str(formData.get("target_time")),
    priority: str(formData.get("priority")),
  } as never);

  revalidatePath("/atleta");
  revalidatePath("/onboarding");
}

export async function deleteRace(formData: FormData) {
  const { supabase, user, athleteId } = await me();
  if (!user) return;
  const id = String(formData.get("race_id") ?? "");
  if (!id) return;
  await supabase.from("races").delete().eq("id", id).eq("athlete_id", athleteId!);
  revalidatePath("/atleta");
  revalidatePath("/onboarding");
}

/** Cambia la priorità di una gara (A = obiettivo principale, B, C o nessuna). */
export async function setRacePriority(formData: FormData) {
  const { supabase, user, athleteId } = await me();
  if (!user) return;
  const id = String(formData.get("race_id") ?? "");
  if (!id) return;
  const p = str(formData.get("priority"));
  await supabase
    .from("races")
    .update({ priority: p && ["A", "B", "C"].includes(p) ? p : null, ...(formData.has("target_time") ? { target_time: str(formData.get("target_time")) } : {}) } as never)
    .eq("id", id)
    .eq("athlete_id", athleteId!);
  revalidatePath("/atleta");
  revalidatePath("/onboarding");
}

// --- test / metriche ---------------------------------------------------------

export async function addMetric(formData: FormData) {
  const { supabase, user, athleteId } = await me();
  if (!user) return;
  const key = str(formData.get("metric_key"));
  if (!key) return;

  await supabase.from("athlete_metrics").insert({
    athlete_id: athleteId!,
    metric_key: key,
    metric_value: num(formData.get("metric_value")),
    metric_text: str(formData.get("metric_text")),
    unit: str(formData.get("unit")),
    discipline: str(formData.get("discipline")),
    recorded_at: str(formData.get("recorded_at")) ?? new Date().toISOString().slice(0, 10),
    recorded_by: user.id,
    note: str(formData.get("note")),
  } as never);

  revalidatePath("/atleta");
}

export async function deleteMetric(formData: FormData) {
  const { supabase, user, athleteId } = await me();
  if (!user) return;
  const id = String(formData.get("metric_id") ?? "");
  if (!id) return;
  await supabase.from("athlete_metrics").delete().eq("id", id).eq("athlete_id", athleteId!);
  revalidatePath("/atleta");
}

// --- completamento allenamenti ----------------------------------------------

/** L'atleta flagga (o sflagga) una sessione come svolta. */
export async function toggleSessionDone(sessionId: string, done: boolean) {
  const { supabase, user, athleteId } = await me();
  if (!user) return;
  if (!sessionId) return;

  const { data: prevData } = await supabase
    .from("session_logs")
    .select("status, athlete_note")
    .eq("session_id", sessionId)
    .eq("athlete_id", athleteId!)
    .maybeSingle();
  const prev = prevData as unknown as { status: string; athlete_note: string | null } | null;

  if (done) {
    await supabase.from("session_logs").upsert(
      {
        session_id: sessionId,
        athlete_id: athleteId!,
        status: "completed",
        completed_at: new Date().toISOString(),
        // Il motivo di un "non svolto" non vale più; una nota normale resta.
        ...(prev?.status === "skipped" ? { athlete_note: null } : {}),
      } as never,
      { onConflict: "session_id,athlete_id" },
    );
  } else if (prev && prev.status !== "skipped" && prev.athlete_note) {
    // Togliere "svolto" non deve cancellare la nota che l'atleta ha scritto.
    await supabase
      .from("session_logs")
      .update({ status: "planned", completed_at: null } as never)
      .eq("session_id", sessionId)
      .eq("athlete_id", athleteId!);
  } else {
    await supabase
      .from("session_logs")
      .delete()
      .eq("session_id", sessionId)
      .eq("athlete_id", athleteId!);
  }

  revalidatePath("/atleta");
}

/**
 * L'atleta scrive (o toglie) una nota su una seduta, svolta o no, senza
 * cambiarne lo stato. La coach la legge in griglia e nel riquadro in cima
 * alla scheda dell'atleta.
 */
/** Copia al titolare (Telegram) di note e sedute saltate, solo per atleti sotto osservazione. */
async function ownerCopySession(athleteId: string, sessionId: string, what: string) {
  try {
    const { ownerCopyFromAthlete } = await import("@/lib/notify/athlete");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data } = await createAdminClient().from("sessions").select("title, day_of_week, training_weeks(week_start)").eq("id", sessionId).maybeSingle();
    const s = data as { title: string | null; day_of_week: number; training_weeks: { week_start: string } | null } | null;
    const d = s?.training_weeks ? new Date(`${s.training_weeks.week_start}T12:00:00Z`) : null;
    if (d) d.setUTCDate(d.getUTCDate() + (s?.day_of_week ?? 0));
    const day = d ? d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";
    await ownerCopyFromAthlete(athleteId, `${what} su "${s?.title ?? "seduta"}" (${day})`);
  } catch { /* mai bloccare l'atleta */ }
}

export async function setSessionNote(sessionId: string, note: string | null) {
  const { supabase, user, athleteId } = await me();
  if (!user) return;
  if (!sessionId) return;
  const clean = (note ?? "").trim().slice(0, 500) || null;

  if (clean) {
    // Solo le colonne indicate vengono aggiornate: lo stato resta com'è, e se
    // la riga non c'è nasce "planned" (il valore di default).
    await supabase.from("session_logs").upsert(
      { session_id: sessionId, athlete_id: athleteId!, athlete_note: clean } as never,
      { onConflict: "session_id,athlete_id" },
    );
    await ownerCopySession(athleteId!, sessionId, `📝 nota: "${clean}"`);
  } else {
    const { data } = await supabase
      .from("session_logs")
      .select("status")
      .eq("session_id", sessionId)
      .eq("athlete_id", athleteId!)
      .maybeSingle();
    const row = data as unknown as { status: string } | null;
    if (row?.status === "planned") {
      await supabase.from("session_logs").delete().eq("session_id", sessionId).eq("athlete_id", athleteId!);
    } else if (row) {
      await supabase
        .from("session_logs")
        .update({ athlete_note: null } as never)
        .eq("session_id", sessionId)
        .eq("athlete_id", athleteId!);
    }
  }

  revalidatePath("/atleta");
}

/**
 * L'atleta segna una seduta come NON svolta, con il motivo (facoltativo ma
 * utile: è quello che la coach legge in griglia). Per annullare si usa
 * toggleSessionDone(id, false), che cancella la riga di log.
 */
export async function setSessionSkipped(sessionId: string, note: string | null) {
  const { supabase, user, athleteId } = await me();
  if (!user) return;
  if (!sessionId) return;
  const clean = (note ?? "").trim().slice(0, 500) || null;

  await supabase.from("session_logs").upsert(
    {
      session_id: sessionId,
      athlete_id: athleteId!,
      status: "skipped",
      completed_at: null,
      rpe_actual: null,
      athlete_note: clean,
    } as never,
    { onConflict: "session_id,athlete_id" },
  );
  await ownerCopySession(athleteId!, sessionId, `⏭️ seduta saltata${clean ? `: "${clean}"` : ""}`);

  revalidatePath("/atleta");
}

/**
 * L'atleta imposta il proprio RPE percepito (1–10) su una sessione svolta.
 * Aggiorna la riga di log esistente (creata quando ha segnato "svolto"): non
 * tocca lo stato né l'orario di completamento. rpe=null azzera il valore.
 */
export async function setSessionRpe(sessionId: string, rpe: number | null) {
  const { supabase, user, athleteId } = await me();
  if (!user || !sessionId) return;
  const val = rpe != null && rpe >= 1 && rpe <= 10 ? Math.round(rpe) : null;

  // Se non esiste ancora un log (raro: RPE senza "svolto"), lo creo completato.
  const { data: existing } = await supabase
    .from("session_logs")
    .select("id")
    .eq("session_id", sessionId)
    .eq("athlete_id", athleteId!)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("session_logs")
      .update({ rpe_actual: val } as never)
      .eq("session_id", sessionId)
      .eq("athlete_id", athleteId!);
  } else {
    await supabase.from("session_logs").insert(
      {
        session_id: sessionId,
        athlete_id: athleteId!,
        status: "completed",
        completed_at: new Date().toISOString(),
        rpe_actual: val,
      } as never,
    );
  }

  revalidatePath("/atleta");
}

// --- ferie: scelta dal roaster + completamento ------------------------------

/** L'atleta sceglie un allenamento del roaster per un giorno di ferie. */
export async function pickVacationWorkout(dayId: string, workoutId: string) {
  const { supabase, user, athleteId } = await me();
  if (!user || !dayId) return;

  await supabase.from("vacation_picks").upsert(
    {
      vacation_day_id: dayId,
      athlete_id: athleteId!,
      vacation_workout_id: workoutId || null,
    } as never,
    { onConflict: "vacation_day_id,athlete_id" },
  );
  revalidatePath("/atleta");
}

/** L'atleta marca (o smarca) come svolto un giorno di ferie. */
export async function toggleVacationDone(dayId: string, done: boolean) {
  const { supabase, user, athleteId } = await me();
  if (!user || !dayId) return;

  await supabase.from("vacation_picks").upsert(
    {
      vacation_day_id: dayId,
      athlete_id: athleteId!,
      status: done ? "completed" : "planned",
      completed_at: done ? new Date().toISOString() : null,
    } as never,
    { onConflict: "vacation_day_id,athlete_id" },
  );
  revalidatePath("/atleta");
}

// --- aggiungi una gara dal catalogo Ironman ----------------------------------

export async function addRaceFromCatalog(formData: FormData) {
  const { supabase, user, athleteId } = await me();
  if (!user) return;
  const catalogId = String(formData.get("catalog_id") ?? "");
  if (!catalogId) return;

  const { data } = await supabase
    .from("race_catalog")
    .select("name, race_date, location, race_type")
    .eq("id", catalogId)
    .single();
  const c = data as unknown as {
    name: string;
    race_date: string;
    location: string | null;
    race_type: string | null;
  } | null;
  if (!c) return;

  await supabase.from("races").insert({
    athlete_id: athleteId!,
    name: c.name,
    race_date: c.race_date,
    location: c.location,
    distance_label: c.race_type,
    sport: "triathlon",
  } as never);

  revalidatePath("/atleta");
  revalidatePath("/onboarding");
  redirect("/atleta#gare");
}

/** Rigenera il link MCP personale (revoca il vecchio in Claude/ChatGPT). */
export async function regenerateMcpToken() {
  const { user, athleteId } = await me();
  if (!user) redirect("/login");
  if (!isAiCoachMode() || !(await aiAthleteIds()).has(athleteId!)) redirect("/atleta");
  const admin = createAdminClient();
  await admin.from("profiles").update({ mcp_token: crypto.randomUUID() } as never).eq("id", athleteId!);
  revalidatePath("/atleta/dispositivi");
  redirect("/atleta/dispositivi?mcp=new#mcp");
}

/** Nome del coach, canali di notifica (buonanotte serale, avvisi di revisione). */
export async function saveCoachPrefs(formData: FormData) {
  const { user, athleteId } = await me();
  if (!user) redirect("/login");
  if (!isAiCoachMode() || !(await aiAthleteIds()).has(athleteId!)) redirect("/atleta");
  const name = (str(formData.get("coach_name")) ?? "").replace(/[<>]/g, "").slice(0, 30).trim();
  const admin = createAdminClient();
  await admin
    .from("ai_athlete_profiles")
    .update({
      coach_name: name || null,
      notify_evening: formData.get("notify_evening") === "on",
      notify_plan: formData.get("notify_plan") === "on",
      weather_weekday: (str(formData.get("weather_weekday")) ?? "").replace(/[<>]/g, "").slice(0, 60) || null,
      weather_weekend: (str(formData.get("weather_weekend")) ?? "").replace(/[<>]/g, "").slice(0, 60) || null,
    } as never)
    .eq("athlete_id", athleteId!);
  revalidatePath("/atleta");
  const back = str(formData.get("back")) ?? "/atleta/dispositivi#coach-prefs";
  redirect(back.startsWith("/") ? back : "/atleta");
}

/**
 * Piano di riferimento: file (xlsx/csv/txt) o testo incollato → sintesi AI →
 * ai_athlete_profiles.reference_plan → tabella rigenerata in background.
 */
export async function uploadReferencePlan(formData: FormData) {
  const { user, athleteId } = await me();
  if (!user) redirect("/login");
  if (!isAiCoachMode() || !(await aiAthleteIds()).has(athleteId!)) redirect("/atleta");
  const back = (str(formData.get("back")) ?? "/atleta/dispositivi").replace(/#.*$/, "");
  const admin = createAdminClient();
  if (formData.get("remove") === "1") {
    await admin.from("ai_athlete_profiles").update({ reference_plan: null } as never).eq("athlete_id", athleteId!);
    revalidatePath(back);
    redirect(`${back}?ref=removed#piano-riferimento`);
  }
  let raw = (str(formData.get("text")) ?? "").slice(0, 60_000);
  let source = "testo incollato dall'atleta";
  const file = formData.get("file");
  if (file && typeof file === "object" && "arrayBuffer" in file && (file as File).size > 0) {
    const f = file as File;
    try {
      raw = fileToText(Buffer.from(await f.arrayBuffer()), f.name);
      source = `file "${f.name}" caricato dall'atleta`;
    } catch (e) {
      redirect(`${back}?ref=err&msg=${encodeURIComponent((e as Error).message)}#piano-riferimento`);
    }
  }
  if (raw.trim().length < 40) redirect(`${back}?ref=err&msg=${encodeURIComponent("Il file o il testo è vuoto.")}#piano-riferimento`);
  let summary = "";
  try {
    summary = await summarizeReferencePlan(raw, { source });
  } catch (e) {
    redirect(`${back}?ref=err&msg=${encodeURIComponent((e as Error).message)}#piano-riferimento`);
  }
  await admin.from("ai_athlete_profiles").update({ reference_plan: summary, ai_generation_started_at: new Date().toISOString(), ai_last_error: null } as never).eq("athlete_id", athleteId!);
  const id = athleteId!;
  after(async () => {
    try {
      await generateInitialPlan(id, { feedback: "Ho caricato un piano di riferimento (tabelle di un mio ex allenatore o piano che seguivo): ispirati a fasi e sedute adattandole alle mie soglie reali." });
    } catch (e) {
      console.error("[ref-plan] rigenerazione fallita", (e as Error).message);
    }
  });
  revalidatePath(back);
  redirect(`${back}?ref=ok#piano-riferimento`);
}

/** "Adatta adesso" dalla card Oggi: l'atleta ha fatto altro, il coach rivede da domani. */
export async function adaptFromToday(formData: FormData) {
  if (!isAiCoachMode()) redirect("/atleta");
  const { user, athleteId } = await me();
  if (!user) redirect("/login");
  if (!(await aiAthleteIds()).has(athleteId!)) redirect("/atleta");
  const note = (str(formData.get("note")) ?? "Oggi ho fatto un allenamento diverso dal previsto.").slice(0, 1000);
  const admin = createAdminClient();
  await admin.from("ai_feedback").insert({ athlete_id: athleteId, message: note, kind: "message", decision: "now", coach_reply: "Ricevuto: adatto la tabella da domani in base a quello che hai fatto oggi." } as never);
  await admin.from("ai_athlete_profiles").update({ ai_generation_started_at: new Date().toISOString(), ai_last_error: null } as never).eq("athlete_id", athleteId!);
  const id = athleteId!;
  after(async () => {
    try { await generateInitialPlan(id, { feedback: note }); } catch (e) { console.error("[adapt-today]", (e as Error).message); }
  });
  revalidatePath("/atleta");
  redirect("/atleta?plan=generating#oggi");
}


/** 247: cosa mandare all'orologio (niente / settimana in corso / anche la prossima / tutto). Effetto immediato. */
export async function saveWatchPush(formData: FormData) {
  const { supabase, user, athleteId } = await me();
  if (!user) redirect("/login");
  const mode = String(formData.get("mode") ?? "all");
  const admin = createAdminClient();
  const id = athleteId!;
  if (mode === "off") {
    await admin.from("intervals_connections").update({ push_planned: false } as never).eq("athlete_id", id);
    let n = 0;
    try { n = (await removePushedPlanned(supabase, id)).deleted ?? 0; } catch { /* best effort */ }
    redirect(`/atleta/dispositivi?watch=off&n=${n}#orologio`);
  }
  const days = mode === "week" ? 0 : mode === "two" ? 7 : null;
  await admin.from("intervals_connections").update({ push_planned: true, push_days: days } as never).eq("athlete_id", id);
  after(async () => {
    try { await pushAllPublishedWeeksFromNow(createAdminClient() as never, id); } catch (e) { console.error("[watch-push]", (e as Error).message); }
  });
  redirect(`/atleta/dispositivi?watch=${mode}#orologio`);
}
