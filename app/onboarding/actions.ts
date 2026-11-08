"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAiCoachMode } from "@/lib/ai/mode";
import { parsePace } from "@/lib/training/zones";
import { profilePhotoUrl, verifyIntervals } from "@/lib/intervals/api";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { syncIcuActivities } from "@/lib/server/icuSync";
import { removePushedPlanned } from "@/lib/server/icuPush";
import { resolveViewAs } from "@/lib/server/viewAs";
import { after } from "next/server";
import { generateInitialPlan } from "@/lib/ai/plan";

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/** Salva tutti i dati dell'onboarding (profilo AI, fitness, gara, Intervals). */
export async function saveOnboarding(formData: FormData) {
  if (!isAiCoachMode()) redirect("/atleta");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Super admin che modifica per conto dell'atleta (switch vista).
  const va = await resolveViewAs(supabase, user!.id);
  const athleteId = va.athleteId ?? user!.id;

  // ---- profilo AI --------------------------------------------------------
  await supabase
    .from("ai_athlete_profiles" as never)
    .upsert(
      {
        athlete_id: athleteId,
        sport: str(formData.get("sport")) ?? "triathlon",
        experience_level: str(formData.get("experience_level")),
        experience_notes: str(formData.get("experience_notes")),
        injuries: str(formData.get("injuries")),
        availability_days: num(formData.get("availability_days")),
        availability_hours: num(formData.get("availability_hours")),
        weekday_minutes_max: num(formData.get("weekday_minutes_max")),
        weekend_hours_max: num(formData.get("weekend_hours_max")),
        strength_sessions_per_week: num(formData.get("strength_sessions_per_week")),
        strength_notes: str(formData.get("strength_notes")),
        fixed_constraints: str(formData.get("fixed_constraints")),
        rest_days: formData.getAll("rest_days").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
        equipment: str(formData.get("equipment")),
        goal_notes: str(formData.get("goal_notes")),
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "athlete_id" },
    );

  // ---- fitness (solo campi compilati) ------------------------------------
  const paceStr = str(formData.get("threshold_pace"));
  const cssStr = str(formData.get("css_100m"));
  const fitness: Record<string, unknown> = {
    athlete_id: athleteId,
    birth_date: str(formData.get("birth_date")),
    height_cm: num(formData.get("height_cm")),
    weight_kg: num(formData.get("weight_kg")),
    body_fat_pct: num(formData.get("body_fat_pct")),
    resting_hr: num(formData.get("resting_hr")),
    max_hr: num(formData.get("max_hr")),
    lthr: num(formData.get("lthr")),
    ftp_watts: num(formData.get("ftp_watts")),
    threshold_pace_run_s_per_km: paceStr ? parsePace(paceStr) : null,
    css_swim_s_per_100m: cssStr ? parsePace(cssStr) : null,
    updated_by: athleteId,
    updated_at: new Date().toISOString(),
  };
  for (const k of Object.keys(fitness)) {
    if (fitness[k] == null && k !== "athlete_id") delete fitness[k];
  }
  // Le policy di athlete_fitness permettono la scrittura solo a coach/admin
  // (nell'app di Irene le soglie le gestisce lei): qui l'atleta salva i SUOI
  // dati dall'onboarding, quindi si scrive col client di servizio.
  const adminDb = createAdminClient();
  const { error: fitErr } = await adminDb
    .from("athlete_fitness")
    .upsert(fitness as never, { onConflict: "athlete_id" });
  if (fitErr) console.error("[onboarding] salvataggio fitness fallito:", fitErr.message);

  // ---- gara dal catalogo del sito (opzionale) ------------------------------
  const catalogSlug = str(formData.get("catalog_race"));
  if (catalogSlug) {
    const { data: ev } = await adminDb
      .from("event_races" as never)
      .select("official_name, name, distance, race_date, city, country")
      .eq("slug", catalogSlug)
      .maybeSingle();
    const e = ev as { official_name: string | null; name: string; distance: string; race_date: string; city: string | null; country: string | null } | null;
    if (e) {
      const name = e.official_name ?? e.name;
      const { data: dup } = await supabase.from("races").select("id").eq("athlete_id", athleteId).eq("name", name).eq("race_date", e.race_date).maybeSingle();
      if (!dup) {
        await supabase.from("races").insert({
          athlete_id: athleteId,
          name,
          race_date: e.race_date,
          location: [e.city, e.country].filter(Boolean).join(", ") || null,
          sport: "triathlon",
          distance_label: e.distance === "full" ? "Ironman 226" : "70.3",
          target_time: str(formData.get("race_target")),
          priority: str(formData.get("race_priority")) ?? "A",
        } as never);
      }
    }
  }

  // ---- gara obiettivo (opzionale) ----------------------------------------
  const raceName = str(formData.get("race_name"));
  const raceDate = str(formData.get("race_date"));
  if (raceName && raceDate) {
    await supabase.from("races").insert({
      athlete_id: athleteId,
      name: raceName,
      race_date: raceDate,
      distance_label: str(formData.get("race_distance")),
      target_time: str(formData.get("race_target")),
      priority: str(formData.get("race_priority")) ?? "A",
    } as never);
  }

  // ---- Intervals.icu (opzionale ma raccomandato) -------------------------
  const apiKey = str(formData.get("icu_api_key"));
  if (apiKey) {
    const conn = {
      intervals_athlete_id: str(formData.get("icu_athlete_id")),
      api_key: apiKey,
    };
    const v = await verifyIntervals(conn);
    await supabase.from("intervals_connections" as never).upsert(
      {
        athlete_id: athleteId,
        api_key: apiKey,
        intervals_athlete_id: conn.intervals_athlete_id,
        enabled: true,
        push_planned: formData.get("push_planned") != null,
        last_ok_at: v.ok ? new Date().toISOString() : null,
      } as never,
      { onConflict: "athlete_id" },
    );
    // Foto profilo da Intervals, solo se non ne abbiamo già una.
    const photo = v.ok ? profilePhotoUrl(v.data) : null;
    if (photo) {
      await adminDb.from("intervals_connections").update({ avatar_url: photo } as never).eq("athlete_id", athleteId).is("avatar_url", null);
    }
    // Import immediato dello storico: serve al piano. Finestra larga (2 anni):
    // il parametro è in GIORNI, non in numero di attività.
    if (v.ok) {
      const stored = await loadIntervalsConnection(supabase, athleteId);
      if (stored) {
        try {
          await syncIcuActivities(supabase, athleteId, stored, 730);
        } catch {
          /* lo storico arriverà col sync successivo */
        }
      }
      // Spunta orologio tolta → rimuovi eventuali pianificati già inviati.
      if (formData.get("push_planned") == null) {
        try {
          await removePushedPlanned(supabase, athleteId);
        } catch {
          /* best-effort */
        }
      }
    }
  }

  // Profilo/obiettivi modificati con un piano già attivo: ricalibra subito.
  if (formData.get("regen") === "1") {
    await adminDb
      .from("ai_athlete_profiles")
      .update({ ai_generation_started_at: new Date().toISOString(), ai_last_error: null } as never)
      .eq("athlete_id", athleteId);
    after(async () => {
      try {
        await generateInitialPlan(athleteId, {
          feedback: "L'atleta ha aggiornato profilo, obiettivi, gare e/o disponibilità nella scheda. Ricalibra il piano da domani rispettando i nuovi dati (gara A, tempo obiettivo, ore disponibili, vincoli) e spiega in athlete_message cosa è cambiato.",
        });
      } catch (e) {
        console.error("[onboarding-regen]", (e as Error).message);
      }
    });
    redirect("/onboarding?generating=1&fb=1");
  }
  redirect("/onboarding?saved=1");
}
