import Link from "next/link";
import SiteLink from "@/components/SiteLink";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/supabase/database.types";
import {
  type Fitness,
  fmtPace,
  ageFromBirth,
} from "@/lib/training/zones";
import { zoneGroups as buildZoneGroups } from "@/lib/training/customZones";
import { loadCustomZones } from "@/lib/server/customZones";
import { type StepLite } from "@/lib/training/describe";
import { CATEGORY_LABEL } from "@/lib/training/categories";
import { weekLabel } from "@/lib/training/weeks";
import AthleteWeekNav from "./AthleteWeekNav";
import AthleteWeek, { type DaySession, type VacationSlot } from "./AthleteWeek";
import { loadVacationByDay } from "@/lib/server/vacation";
import { BRAND_DOT, BRAND_NAME } from "@/lib/branding";
import AthleteSectionNav from "./AthleteSectionNav";
import LangToggle from "@/components/LangToggle";
import { getT } from "@/lib/app-i18n/server";
import type { TFn } from "@/lib/app-i18n";
import ConfirmButton from "@/components/ConfirmButton";
import StravaActivityList from "@/components/StravaActivityList";
import {
  type StravaActivityLite,
  type StravaActivityFull,
  fmtActivityDate,
  bucketByWeekday,
} from "@/lib/strava/format";
import { loadIntervalsConnection, ICU_CHANNELS } from "@/lib/server/intervals";
import { syncIcuActivities as syncIcuActivitiesServer } from "@/lib/server/icuSync";
import { pushAllPublishedWeeksFromNow } from "@/lib/server/icuPush";
import { resolveViewAs } from "@/lib/server/viewAs";
import RefreshAfterSync from "@/components/RefreshAfterSync";
import { isAiCoachMode } from "@/lib/ai/mode";
import { computeForm } from "@/lib/ai/fitness";
import FormCard from "@/components/FormCard";
import { createAdminClient } from "@/lib/supabase/admin";
import CalendarFeedCard from "@/components/CalendarFeedCard";
import McpCard from "@/components/McpCard";
import ReadinessCard from "@/components/ReadinessCard";
import TodayCard from "@/components/TodayCard";
import WatchPushCard from "@/components/WatchPushCard";
import HumanCoachCard from "@/components/HumanCoachCard";
import CoachPrefsCard from "@/components/CoachPrefsCard";
import ReferencePlanCard from "@/components/ReferencePlanCard";
import { coachName } from "@/lib/ai/coachMessage";
import CoachChat, { type ChatItem } from "@/components/CoachChat";
import {
  addRace,
  deleteRace,
  setRacePriority,
  sendCoachFeedback,
  requestWeeklyReview,
  refreshMyRoutes,
  addMetric,
  deleteMetric,
  saveMyIntervalsConnection,
  syncMyIcuActivities,
} from "./actions";

// La action "Scrivi al tuo coach" rivede il piano in background (after):
// serve il tempo di una chiamata al modello.
export const maxDuration = 300;

const DISC_LABEL: Record<string, string> = {
  run: "Corsa",
  bike: "Bici",
  swim: "Nuoto",
  athletics: "Forza",
  other: "Altro",
};

// Lock anti-sovrapposizione per l'auto-sync in background (per istanza server:
// evita push doppi quando l'atleta apre due pagine in rapida successione).
const icuSyncRunning = new Set<string>();

const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const MESI_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function initials(name: string | null, email: string): string {
  const base = (name || email).trim();
  const parts = base.split(/\s+/);
  const ini = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (ini || base.slice(0, 2)).toUpperCase();
}
function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(d).getTime() - t.getTime()) / 86_400_000);
}
function fmtDay(d: string | null, t: TFn): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getDate()} ${t(MESI_SHORT[dt.getMonth()])}`;
}

type Sess = Pick<
  Tables<"sessions">,
  "id" | "day_of_week" | "discipline" | "title" | "volume_value" | "raw_text" | "notes"
> & { route_id?: string | null; route_note?: string | null; route?: DaySession["route"] };

export type AthleteView = "home" | "profilo" | "dispositivi";
export type PageProps = {
  searchParams: Promise<{ w?: string; icu?: string; n?: string; d?: string; plan?: string; msg?: string; fb?: string; ref?: string }>;
};

/**
 * Nell'app 24/7 Coach la home mostra solo tabella + coach; scheda/test/gare
 * stanno in /atleta/profilo e i dispositivi in /atleta/dispositivi. Nell'app
 * di Irene `view` non conta: tutto in una pagina come sempre.
 */
export async function AthleteOverviewView({ searchParams }: PageProps, view: AthleteView) {
  const ai = isAiCoachMode();
  const { t, lang } = await getT();
  const show = (sec: "settimana" | "coach" | "scheda" | "test" | "gare" | "dispositivi") => {
    if (!ai) return sec !== "coach";
    if (view === "home") return sec === "settimana" || sec === "coach";
    if (view === "profilo") return sec === "scheda" || sec === "test" || sec === "gare";
    return sec === "dispositivi";
  };
  const { w: selectedParam, icu: icuParam, n: icuN, d: icuD, plan: planParam, msg: planMsg, fb: fbParam, ref: refParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // "Entra come atleta": se un coach ha attivato l'impersonificazione, questa
  // pagina mostra ESATTAMENTE l'app dell'atleta scelto (in sola lettura).
  const va = await resolveViewAs(supabase, user.id);
  if (va.role === "coach" && !va.impersonating) redirect("/coach");
  const athleteId = va.athleteId!;

  // App 24/7 Coach: prima dell'onboarding non c'è nulla da vedere qui.
  let aiRationale: string | null = null;
  let aiLastMessage: string | null = null;
  let aiLastReviewAt: string | null = null;
  let chatItems: ChatItem[] = [];
  let lastWorkout: { label: string; when: string } | null = null;
  let form: Awaited<ReturnType<typeof computeForm>> = null;
  // Coach adattivo: domande aperte del coach + note delle revisioni automatiche
  // degli ultimi giorni (dal confronto quotidiano piano ↔ attività svolte).
  let coachQuestions: { id: string; detail: string }[] = [];
  let coachAutoNotes: { id: string; coach_note: string }[] = [];
  if (isAiCoachMode() && !va.impersonating) {
    const { data: aiProfData } = await supabase
      .from("ai_athlete_profiles" as never)
      .select("onboarding_completed_at, ai_rationale, ai_last_message, last_review_at, plan_generated_at, tour_completed_at")
      .eq("athlete_id", athleteId)
      .maybeSingle();
    const aiProf = aiProfData as {
      onboarding_completed_at: string | null; ai_rationale: string | null;
      ai_last_message: string | null; last_review_at: string | null; plan_generated_at: string | null;
      tour_completed_at: string | null;
    } | null;
    // Primo accesso: percorso guidato (dati, obiettivi, tempo, basi, come funziona).
    if (!aiProf?.tour_completed_at) redirect("/benvenuto");
    if (!aiProf?.onboarding_completed_at) redirect("/onboarding");
    aiRationale = aiProf?.ai_rationale ?? null;
    aiLastMessage = aiProf?.ai_last_message ?? null;
    aiLastReviewAt = aiProf?.last_review_at ?? null;

    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    const { data: evData } = await supabase
      .from("ai_adaptive_events" as never)
      .select("id, action, detail, coach_note, resolved_at, event_date")
      .eq("athlete_id", athleteId)
      .gte("event_date", fiveDaysAgo)
      .order("event_date", { ascending: false });
    const events = (evData ?? []) as unknown as {
      id: string; action: string; detail: string;
      coach_note: string | null; resolved_at: string | null; event_date: string;
    }[];
    coachQuestions = events
      .filter((e) => e.action === "asked" && !e.resolved_at)
      .map((e) => ({ id: e.id, detail: e.detail }));
    coachAutoNotes = events
      .filter((e) => e.action === "revised" && e.coach_note)
      .slice(0, 2)
      .map((e) => ({ id: e.id, coach_note: e.coach_note! }));

    // Timeline del dialogo: messaggi dell'atleta + risposte/note del coach.
    const { data: fbData } = await supabase
      .from("ai_feedback" as never)
      .select("message, created_at, kind, decision, coach_reply")
      .eq("athlete_id", athleteId)
      .gte("created_at", aiProf?.plan_generated_at ?? new Date(Date.now() - 45 * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(8);
    for (const f of (fbData ?? []) as unknown as { message: string; created_at: string; kind: string | null; decision: string | null; coach_reply: string | null }[]) {
      chatItems.push({ who: "me", text: f.message, when: f.created_at });
      if (f.coach_reply) {
        chatItems.push({
          who: "coach",
          text: f.coach_reply,
          when: new Date(new Date(f.created_at).getTime() + 1000).toISOString(),
          tone: (f.decision as "now" | "sunday" | "answer" | null) ?? (f.kind === "next_week" ? "sunday" : "now"),
        });
      }
    }
    for (const e of events) {
      if (aiProf?.plan_generated_at && `${e.event_date}T23:59:59` < aiProf.plan_generated_at) continue;
      chatItems.push({
        who: "coach",
        text: e.action === "asked" ? e.detail : (e.coach_note ?? e.detail),
        when: `${e.event_date}T06:00:00`,
        tone: e.action === "asked" ? "ask" : "auto",
      });
    }
    if (aiProf?.ai_last_message && aiProf.last_review_at) {
      chatItems.push({ who: "coach", text: aiProf.ai_last_message, when: aiProf.last_review_at, tone: "weekly" });
    }
    chatItems.sort((a, b) => a.when.localeCompare(b.when));
    // Ultimo allenamento (36h) non ancora commentato: invito a scrivere al coach.
    {
      const { data: la } = await supabase
        .from("icu_activities")
        .select("discipline, start_date, moving_time_s, distance_m").eq("is_duplicate" as never, false as never)
        .eq("athlete_id", athleteId)
        .gte("start_date", new Date(Date.now() - 36 * 3600 * 1000).toISOString())
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      const a = la as { discipline: string; start_date: string; moving_time_s: number | null; distance_m: number | null } | null;
      const commented = a ? chatItems.some((c) => c.who === "me" && c.when >= a.start_date) : true;
      if (a && !commented) {
        const disc = ({ swim: t("Nuoto"), bike: t("Bici"), run: t("Corsa") } as Record<string, string>)[a.discipline] ?? a.discipline;
        const min = a.moving_time_s ? `${Math.round(a.moving_time_s / 60)}'` : "";
        const dist = a.distance_m ? (a.discipline === "swim" ? `${Math.round(a.distance_m)} m` : `${(a.distance_m / 1000).toFixed(1)} km`) : "";
        lastWorkout = { label: [disc, dist, min].filter(Boolean).join(" · "), when: a.start_date };
      }
    }
    chatItems = chatItems.slice(-12);
    form = await computeForm(supabase as never, athleteId);
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", athleteId)
    .single();
  const profile = profileData as unknown as Pick<Tables<"profiles">, "full_name" | "role"> | null;

  const { data: weeksData } = await supabase
    .from("training_weeks")
    .select("id, label, week_start, status")
    .eq("athlete_id", athleteId)
    .eq("status", "published")
    .order("week_start", { ascending: false });
  const weeks = (weeksData ?? []) as unknown as Pick<
    Tables<"training_weeks">,
    "id" | "label" | "week_start" | "status"
  >[];

  // settimana che contiene oggi, altrimenti la più recente
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inWeek = (ws: string) => {
    const start = new Date(ws);
    start.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - start.getTime()) / 86_400_000);
    return diff >= 0 && diff <= 6 ? diff : -1;
  };
  // Default: la settimana corrente; se il piano parte nel futuro, la prima
  // settimana in arrivo (non l'ultima generata).
  const todayISO = today.toISOString().slice(0, 10);
  const nextUp = [...weeks].filter((w) => w.week_start >= todayISO).sort((a, b) => a.week_start.localeCompare(b.week_start))[0];
  const week =
    weeks.find((w) => w.id === selectedParam) ??
    weeks.find((w) => inWeek(w.week_start) >= 0) ??
    nextUp ??
    weeks[0];
  const todayIdx = week ? inWeek(week.week_start) : -1;

  let sessions: Sess[] = [];
  let doneIds: string[] = [];
  const rpeById: Record<string, number> = {};
  const skippedNotes: Record<string, string> = {};
  const notesById: Record<string, string> = {};
  const stepsBySession = new Map<string, StepLite[]>();
  const fitnessRow = await supabase
    .from("athlete_fitness")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const fit = (fitnessRow.data ?? null) as unknown as Tables<"athlete_fitness"> | null;

  if (week) {
    const { data } = await supabase
      .from("sessions")
      .select("id, day_of_week, discipline, title, volume_value, raw_text, notes, route_id, route_note")
      .eq("week_id", week.id)
      .order("day_of_week", { ascending: true })
      .order("sort_order", { ascending: true });
    sessions = (data ?? []) as unknown as Sess[];
    const sids = sessions.map((s) => s.id);
    if (sids.length > 0) {
      const { data: sd } = await supabase
        .from("session_steps")
        .select(
          "id, session_id, parent_step_id, sort_order, step_type, repeat_count, duration_seconds, distance_meters, raw_fragment, target_type, target_low, target_high, target_unit, recovery_text, equipment, note",
        )
        .in("session_id", sids)
        .order("sort_order", { ascending: true });
      const rows = (sd ?? []) as unknown as (StepLite & { session_id: string })[];
      for (const r of rows) {
        const arr = stepsBySession.get(r.session_id) ?? [];
        arr.push(r);
        stepsBySession.set(r.session_id, arr);
      }

      const { data: logsData } = await supabase
        .from("session_logs")
        .select("session_id, status, rpe_actual, athlete_note")
        .eq("athlete_id", athleteId)
        .in("session_id", sids);
      const logs = (logsData ?? []) as unknown as {
        session_id: string;
        status: string;
        rpe_actual: number | null;
        athlete_note: string | null;
      }[];
      doneIds = logs.filter((l) => l.status === "completed").map((l) => l.session_id);
      for (const l of logs) {
        if (l.rpe_actual != null) rpeById[l.session_id] = l.rpe_actual;
        if (l.status === "skipped") skippedNotes[l.session_id] = l.athlete_note ?? "";
        else if (l.athlete_note) notesById[l.session_id] = l.athlete_note;
      }
    }
  }

  // Percorsi suggeriti dal coach per le sedute della settimana.
  const routeIds = Array.from(new Set(sessions.map((x) => (x as { route_id?: string | null }).route_id).filter((x): x is string => !!x)));
  if (routeIds.length) {
    const { data: rts } = await supabase
      .from("athlete_routes" as never)
      .select("id, name, distance_km, elevation_m, typical_minutes, times_done, terrain, points")
      .in("id", routeIds);
    const byId = new Map(((rts ?? []) as unknown as { id: string; name: string; distance_km: number; elevation_m: number; typical_minutes: number | null; times_done: number; terrain: string | null; points: [number, number][] }[]).map((r) => [r.id, r]));
    sessions = sessions.map((x) => {
      const rid = (x as { route_id?: string | null }).route_id;
      const r = rid ? byId.get(rid) : null;
      return r
        ? { ...x, route: { name: r.name, distance_km: Number(r.distance_km), elevation_m: Number(r.elevation_m), typical_minutes: r.typical_minutes, times_done: r.times_done, terrain: r.terrain, points: r.points, note: (x as { route_note?: string | null }).route_note ?? null } }
        : x;
    });
  }

  const stepsObj = Object.fromEntries(stepsBySession);

  // Connessione Intervals.icu + AUTO-SYNC all'apertura: se il collegamento è
  // attivo e l'ultimo sync è più vecchio di 30 minuti, push degli allenamenti
  // pianificati e import delle attività svolte — ma DOPO aver risposto
  // (after()): la pagina non aspetta mai Intervals, i dati freschi arrivano
  // alla navigazione successiva.
  const icuConn = await loadIntervalsConnection(supabase, athleteId);
  let icuSyncStarted = false;
  if (icuConn && !va.impersonating) {
    const last = icuConn.last_ok_at ? new Date(icuConn.last_ok_at).getTime() : 0;
    if (Date.now() - last > 30 * 60_000 && !icuSyncRunning.has(athleteId)) {
      icuSyncRunning.add(athleteId);
      icuSyncStarted = true;
      after(async () => {
        try {
          // Prima le attività svolte (è quello che l'atleta aspetta di vedere
          // e dura pochi secondi), poi l'invio degli allenamenti, che con le
          // pause tra un lotto e l'altro può durare decine di secondi.
          await syncIcuActivitiesServer(supabase, athleteId, icuConn, 30);
          await pushAllPublishedWeeksFromNow(supabase, athleteId);
        } catch (e) {
          console.error("[auto-sync]", athleteId, (e as Error).message);
        } finally {
          icuSyncRunning.delete(athleteId);
        }
      });
    }
  }

  // Attività svolte (via Intervals.icu, qualunque piattaforma) della settimana
  // visualizzata, raggruppate per giorno.
  let stravaByDay: Record<number, StravaActivityFull[]> = {};
  if (week) {
    const wkStart = new Date(`${week.week_start.slice(0, 10)}T00:00:00`);
    const from = new Date(wkStart);
    from.setDate(from.getDate() - 1);
    const to = new Date(wkStart);
    to.setDate(to.getDate() + 8);
    const { data: weekActs } = await supabase
      .from("icu_activities")
      .select(
        "id, name, sport_type, discipline, start_date, distance_m, moving_time_s, elapsed_time_s, average_heartrate, max_heartrate, average_speed, max_speed, average_watts, average_cadence, total_elevation_gain, calories, trainer, raw",
      ).eq("is_duplicate" as never, false as never)
      .eq("athlete_id", athleteId)
      .gte("start_date", from.toISOString())
      .lt("start_date", to.toISOString())
      .order("start_date", { ascending: true });
    stravaByDay = bucketByWeekday(
      (weekActs ?? []) as unknown as StravaActivityFull[],
      week.week_start,
    );
  }

  // Giorni di ferie della settimana visualizzata (menu da cui l'atleta sceglie).
  let vacationByDay: Record<number, VacationSlot[]> = {};
  if (week) {
    vacationByDay = await loadVacationByDay(supabase, athleteId, week.week_start);
  }

  const { data: racesData } = await supabase
    .from("races")
    .select("id, name, race_date, location, priority")
    .eq("athlete_id", athleteId)
    .order("race_date", { ascending: true });
  const races = (racesData ?? []) as unknown as Pick<
    Tables<"races">,
    "id" | "name" | "race_date" | "location" | "priority"
  >[];

  const { data: catData } = await supabase
    .from("athlete_categories")
    .select("category")
    .eq("athlete_id", athleteId);
  const categories = ((catData ?? []) as unknown as { category: string }[]).map((c) => c.category);

  const { data: metricsData } = await supabase
    .from("athlete_metrics")
    .select("id, metric_key, metric_value, metric_text, unit, discipline, recorded_at, note")
    .eq("athlete_id", athleteId)
    .order("recorded_at", { ascending: false });
  const metrics = (metricsData ?? []) as unknown as Pick<
    Tables<"athlete_metrics">,
    "id" | "metric_key" | "metric_value" | "metric_text" | "unit" | "discipline" | "recorded_at" | "note"
  >[];

  // --- Attività importate via Intervals.icu (qualunque piattaforma) ---
  const { data: icuActData } = await supabase
    .from("icu_activities")
    .select(
      "id, name, sport_type, discipline, start_date, distance_m, moving_time_s, average_heartrate, total_elevation_gain, average_watts",
    ).eq("is_duplicate" as never, false as never)
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: false })
    .limit(15);
  const icuActivities = (icuActData ?? []) as unknown as StravaActivityLite[];
  const icuChannels = (icuConn?.channels ?? "")
    .split(",")
    .map((c: string) => c.trim().toLowerCase())
    .filter(Boolean);
  const ICU_NOTICE: Record<string, { ok: boolean; text: string }> = {
    ok: { ok: true, text: t("Intervals.icu collegato e verificato.") },
    bad: { ok: false, text: t("Salvato, ma la chiave non risponde: controlla API key e athlete ID.") },
    off: { ok: true, text: t("Intervals.icu scollegato.") },
    noconn: { ok: false, text: t("Prima collega Intervals.icu qui sotto.") },
    synced: { ok: true, text: t("Sincronizzate {n} attività.", { n: icuN ?? "0" }) },
    pushoff: {
      ok: true,
      text: t("Invio all'orologio disattivato: rimossi {n} allenamenti pianificati da Intervals — spariranno da Garmin al prossimo sync.", { n: icuN ?? "0" }),
    },
    syncerr: { ok: false, text: t("Sincronizzazione fallita: {d}", { d: icuD ?? t("errore") }) },
  };
  const icuNotice = icuParam ? ICU_NOTICE[icuParam] ?? null : null;

  const f: Fitness = {
    max_hr: fit?.max_hr ?? null,
    resting_hr: fit?.resting_hr ?? null,
    lthr: fit?.lthr ?? null,
    threshold_pace_run_s_per_km: fit?.threshold_pace_run_s_per_km ?? null,
    ftp_watts: fit?.ftp_watts ?? null,
    css_swim_s_per_100m: fit?.css_swim_s_per_100m ?? null,
    swim_test_400_s: fit?.swim_test_400_s ?? null,
    zone_model: fit?.zone_model ?? "standard",
  };
  const age = ageFromBirth(fit?.birth_date ?? null);
  const customZones = await loadCustomZones(supabase, athleteId);
  const zoneGroups = buildZoneGroups(f, customZones);
  const hasFitness =
    age != null ||
    fit?.weight_kg != null ||
    f.ftp_watts != null ||
    f.lthr != null ||
    f.threshold_pace_run_s_per_km != null ||
    f.css_swim_s_per_100m != null;

  const firstName = (profile?.full_name ?? "").split(" ")[0] || t("atleta");
  const coachNameStr = ai ? await coachName(athleteId) : null;
  const shadowPlan = ai
    ? !!((await createAdminClient().from("ai_athlete_profiles").select("shadow_plan").eq("athlete_id", athleteId).maybeSingle()).data as { shadow_plan?: boolean } | null)?.shadow_plan
    : false;
  const coachNameOrNull = coachNameStr === "Coach" ? null : coachNameStr;
  return (
    <div className="wrap-tight">
      {icuSyncStarted ? <RefreshAfterSync athleteId={athleteId} /> : null}
      <nav className="topnav">
        <a className="brand" href={ai ? (lang === "en" ? "/en" : "/it") : undefined} style={{ color: "inherit", textDecoration: "none" }}>
          <span className="dot">{BRAND_DOT}</span>
          <span className="name">
            {BRAND_NAME}<em>.</em>
          </span>
          <span className="mono" style={{ marginLeft: 14 }}>
            {t("// ATLETA")}
          </span>
        </a>
        <AthleteSectionNav view={view}>
          <LangToggle lang={lang} />
        </AthleteSectionNav>
        <div className="nav-right">
          {icuConn?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar avatar-photo" src={icuConn.avatar_url} alt="" />
          ) : (
            <div className="avatar av-violet">{initials(profile?.full_name ?? null, "A")}</div>
          )}
          <SiteLink />
          <form action="/auth/signout" method="post">
            <button className="btn btn-subtle btn-sm" type="submit">
              {t("Esci")}
            </button>
          </form>
        </div>
      </nav>

      <div className="hero">
        {icuConn?.avatar_url && ai ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hero-photo" src={icuConn.avatar_url} alt={profile?.full_name ?? ""} />
        ) : null}
        <div>
          <span className="mono">
            // {t(GIORNI[(today.getDay() + 6) % 7])} {today.getDate()} {t(MESI_SHORT[today.getMonth()])}
          </span>
          <h1>
            {t("Ciao")} <em>{firstName}</em>.
          </h1>
          {categories.length > 0 ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {categories.map((c) => (
                <span key={c} className="pill violet pill-plain">
                  {t(CATEGORY_LABEL[c] ?? c)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------------- 24/7 COACH: forma, coach, piano ---------------- */}
      {planParam === "ready" ? (
        <div className="card" style={{ marginBottom: 16, borderLeft: "6px solid var(--lime)" }}>
          <strong>{t("Il tuo piano è pronto")}</strong>
          {planMsg ? (
            <p style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{planMsg}</p>
          ) : null}
        </div>
      ) : null}
      {isAiCoachMode() && !aiRationale ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>{t("Il tuo coach non ha ancora costruito il piano")}</strong>
          <div style={{ marginTop: 10 }}>
            <Link className="btn btn-primary btn-sm" href="/onboarding">
              {t("Controlla obiettivi e genera il piano")}
            </Link>
          </div>
        </div>
      ) : null}
      {ai && view === "home" ? <HumanCoachCard athleteId={athleteId} t={t} compact /> : null}
      {ai && view === "home" ? <TodayCard athleteId={athleteId} t={t} coachName={coachNameOrNull} /> : null}
      {ai && view === "home" ? <ReadinessCard athleteId={athleteId} t={t} form={form} /> : null}
      {ai && shadowPlan ? (
        <div className="card" style={{ margin: "0 0 12px", fontSize: ".86rem", color: "var(--text-2)", borderColor: "rgba(103,232,249,.35)" }}>
          👥 <b style={{ color: "var(--text)" }}>{t("Tabella ombra")}</b> · {t("segui il piano di un altro allenatore: qui vedi la tua forma e la tabella che proporrebbe 24/7 Coach per il tuo obiettivo, ma non viene inviata all'orologio né al calendario Intervals.")}
        </div>
      ) : null}
      {aiRationale && show("coach") ? (
        <details className="card" style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            {t("Come è costruito il tuo piano")}
          </summary>
          <p style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.65, color: "var(--text-2)" }}>
            {aiRationale}
          </p>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn btn-subtle btn-sm" href="/onboarding">
              {t("Cambia obiettivi / rigenera il piano")}
            </Link>
            <form action={refreshMyRoutes}>
              <button className="btn btn-subtle btn-sm" type="submit">{t("Aggiorna i miei percorsi")}</button>
            </form>
          </div>
        </details>
      ) : null}

      {show("settimana") ? (<>
      <AthleteWeekNav
        weeks={weeks.map((w) => ({ id: w.id, week_start: w.week_start }))}
        selectedId={week?.id ?? null}
      />

      {/* ---------------- SETTIMANA (vista per giorno) ---------------- */}
      {!week ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          {t("Nessuna tabella pubblicata al momento.")}
        </div>
      ) : (
        <>
          <h2 className="sec" id="settimana">
            <span className="l">
              {weekLabel(week.week_start)}
              <span style={{ color: "var(--text-2)", fontWeight: 500, fontSize: ".9rem" }}>
                {t("dal {d}", { d: fmtDay(week.week_start, t) })}
              </span>
            </span>
            <Link className="btn btn-subtle btn-sm" href="/atleta/mese">🗓 {t("Vista mese")}</Link>
          </h2>
          <AthleteWeek
            weekStart={week.week_start}
            todayIdx={todayIdx}
            sessions={sessions}
            stepsBySession={stepsObj}
            doneIds={doneIds}
            rpeById={rpeById}
            skippedNotes={skippedNotes}
            notesById={notesById}
            fitness={f}
            stravaByDay={stravaByDay}
            vacationByDay={vacationByDay}
            readOnly={va.impersonating}
          />
        </>
      )}
      {ai && view === "home" ? <CoachPrefsCard athleteId={athleteId} t={t} compact /> : null}

      </>) : null}

      {ai && show("coach") && !va.impersonating ? (
        <CoachChat
          items={chatItems}
          action={sendCoachFeedback}
          reviewAction={requestWeeklyReview}
          lastWorkout={lastWorkout}
          error={fbParam === "err"}
          coachName={coachNameOrNull}
        />
      ) : null}

      {show("scheda") ? (<>
      {/* ---------------- SCHEDA & ZONE ---------------- */}
      {/* La sezione esiste SEMPRE (il tab "Scheda" punta qui): senza dati
          mostra dove inserirli, invece di sparire e far sembrare rotto il tab. */}
      <h2 className="sec" id="scheda">
        <span className="l">{t("La tua scheda")}</span>
        {isAiCoachMode() ? (
          <Link className="mono" href="/onboarding" style={{ textDecoration: "underline" }}>
            ✏️ {t("Modifica dati e soglie →")}
          </Link>
        ) : null}
      </h2>
      {!hasFitness ? (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ color: "var(--text-2)", marginBottom: 12 }}>
            {t("Nessun dato ancora: età, peso e soglie non sono stati inseriti.")}
          </div>
          {isAiCoachMode() ? (
            <Link className="btn btn-primary" href="/onboarding">
              ✏️ {t("Inserisci i tuoi dati (sezione 4 · Dati fisici e soglie)")}
            </Link>
          ) : (
            <span className="mono" style={{ color: "var(--text-2)" }}>
              {t("Li inserisce la tua coach: chiedi a lei.")}
            </span>
          )}
        </div>
      ) : null}
      {hasFitness ? (
        <>
          <div className="bento-4">
            {fit?.weight_kg != null ? (
              <div className="card kpi">
                <div className="v">
                  {fit.weight_kg}
                  <span style={{ fontSize: ".9rem" }}> kg</span>
                </div>
                <div className="l">{t("Peso")}</div>
              </div>
            ) : null}
            {f.ftp_watts != null ? (
              <div className="card kpi">
                <div className="v lime">
                  {f.ftp_watts}
                  <span style={{ fontSize: ".9rem" }}> W</span>
                </div>
                <div className="l">{t("FTP bici")}</div>
              </div>
            ) : null}
            {f.lthr != null ? (
              <div className="card kpi">
                <div className="v">
                  {f.lthr}
                  <span style={{ fontSize: ".9rem" }}> bpm</span>
                </div>
                <div className="l">{t("FC soglia")}</div>
              </div>
            ) : null}
            {f.threshold_pace_run_s_per_km != null ? (
              <div className="card kpi">
                <div className="v">{fmtPace(f.threshold_pace_run_s_per_km)}</div>
                <div className="l">{t("Passo soglia /km")}</div>
              </div>
            ) : null}
            {age != null ? (
              <div className="card kpi">
                <div className="v">{age}</div>
                <div className="l">{t("Età")}</div>
              </div>
            ) : null}
          </div>

          {zoneGroups.length > 0 ? (
            <div className="grid-2" style={{ marginTop: 14 }}>
              {zoneGroups.map((g) => (
                <div className="card" key={g.title}>
                  <div className="mono" style={{ color: "var(--text-2)", marginBottom: 10 }}>
                    {g.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {g.zones.map((z) => (
                      <div key={z.n} className="zone-row">
                        <span style={{ color: "var(--text-2)" }}>{z.name}</span>
                        <b>{z.range}</b>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      </>) : null}
      {show("test") ? (<>
      {/* ---------------- TEST FISICI ---------------- */}
      <h2 className="sec" id="test">
        <span className="l">{t("I tuoi test")}</span>
      </h2>
      {metrics.length > 0 ? (
        <div className="grid-3">
          {metrics.map((m) => (
            <div className="card" key={m.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="v lime" style={{ fontSize: "1.4rem" }}>
                  {m.metric_value ?? m.metric_text ?? "—"}
                  {m.unit ? <span style={{ fontSize: ".9rem" }}> {m.unit}</span> : null}
                </div>
                <form action={deleteMetric}>
                  <input type="hidden" name="metric_id" value={m.id} />
                  <ConfirmButton
                    message={t("Eliminare questo test?")}
                    className="btn btn-subtle btn-sm"
                    style={{ color: "var(--rose)" }}
                  >
                    ✕
                  </ConfirmButton>
                </form>
              </div>
              <div className="l" style={{ marginTop: 6 }}>
                {m.metric_key}
                {m.discipline ? ` · ${t(DISC_LABEL[m.discipline] ?? m.discipline)}` : ""}
              </div>
              <div className="mono" style={{ color: "var(--text-2)", marginTop: 4 }}>
                {fmtDay(m.recorded_at, t)}
              </div>
              {m.note ? (
                <div style={{ fontSize: ".82rem", color: "var(--text-2)", marginTop: 6 }}>{m.note}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          {t("Nessun test registrato. Aggiungi il primo qui sotto.")}
        </div>
      )}

      <form action={addMetric}>
        <div
          className="card"
          style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="field" style={{ flex: 1, minWidth: 150 }}>
            <label className="label">{t("Test / soglia")}</label>
            <input className="input" name="metric_key" type="text" placeholder={t("Es. Soglia 5km")} />
          </div>
          <div className="field" style={{ width: 100 }}>
            <label className="label">{t("Valore")}</label>
            <input className="input" name="metric_value" type="text" inputMode="decimal" />
          </div>
          <div className="field" style={{ width: 84 }}>
            <label className="label">{t("Unità")}</label>
            <input className="input" name="unit" type="text" placeholder="bpm" />
          </div>
          <div className="field" style={{ width: 120 }}>
            <label className="label">{t("Disciplina")}</label>
            <select className="input" name="discipline" defaultValue="">
              <option value="">—</option>
              <option value="run">{t("Corsa")}</option>
              <option value="bike">{t("Bici")}</option>
              <option value="swim">{t("Nuoto")}</option>
              <option value="athletics">{t("Forza")}</option>
              <option value="other">{t("Altro")}</option>
            </select>
          </div>
          <div className="field" style={{ width: 150 }}>
            <label className="label">Data</label>
            <input className="input" name="recorded_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <button className="btn btn-primary" type="submit">
            + {t("Aggiungi test")}
          </button>
        </div>
      </form>

      </>) : null}
      {show("gare") ? (<>
      {/* ---------------- GARE ---------------- */}
      <h2 className="sec" id="gare">
        <span className="l">{t("Gare obiettivo")}</span>
        <Link className="mono" href="/atleta/calendario" style={{ textDecoration: "underline" }}>
          📅 {t("Calendario gare Ironman →")}
        </Link>
      </h2>
      {races.length > 0 ? (
        <div className="grid-3">
          {races.map((r) => {
            const d = daysUntil(r.race_date);
            const isMain = r.priority === "A";
            return (
              <div
                className="card"
                key={r.id}
                style={isMain ? { borderColor: "var(--lime)" } : undefined}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <strong>{r.name}</strong>
                  <form action={deleteRace}>
                    <input type="hidden" name="race_id" value={r.id} />
                    <ConfirmButton
                      message={t("Eliminare la gara \"{name}\"?", { name: r.name })}
                      className="btn btn-subtle btn-sm"
                      style={{ color: "var(--rose)" }}
                    >
                      ✕
                    </ConfirmButton>
                  </form>
                </div>
                <div className="mono" style={{ marginTop: 8, color: "var(--text-2)" }}>
                  {r.location ? `${r.location} · ` : ""}
                  {fmtDay(r.race_date, t)}
                  {d !== null ? ` — ${t("fra {d} giorni", { d })}` : ""}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                  {isMain ? (
                    <span className="pill ok pill-plain">⭐ {t("Obiettivo principale")}</span>
                  ) : r.priority ? (
                    <span className="pill violet pill-plain">{t("Priorità {p}", { p: r.priority })}</span>
                  ) : null}
                  <form
                    action={setRacePriority}
                    style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}
                  >
                    <input type="hidden" name="race_id" value={r.id} />
                    <select
                      className="input"
                      name="priority"
                      defaultValue={r.priority ?? ""}
                      style={{ width: 72, padding: "5px 8px", fontSize: ".8rem" }}
                    >
                      <option value="">—</option>
                      <option value="A">A ⭐</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                    <button className="btn btn-subtle btn-sm" type="submit" title={t("Salva priorità")}>
                      ✓
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ color: "var(--text-2)", marginBottom: 12 }}>
            {t("Nessuna gara obiettivo ancora.")}
          </div>
          <Link className="btn btn-subtle btn-sm" href="/atleta/calendario">
            📅 {t("Sfoglia il calendario Ironman →")}
          </Link>
          <div className="mono" style={{ color: "var(--text-2)", fontSize: ".78rem", marginTop: 10 }}>
            {t("oppure inseriscine una manualmente qui sotto")}
          </div>
        </div>
      )}

      <form action={addRace}>
        <div
          className="card"
          style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="field" style={{ flex: 1, minWidth: 150 }}>
            <label className="label">{t("Nome gara")}</label>
            <input className="input" name="name" type="text" placeholder={t("Es. Maratona di Venezia")} />
          </div>
          <div className="field" style={{ width: 150 }}>
            <label className="label">Data</label>
            <input className="input" name="race_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="field" style={{ width: 140 }}>
            <label className="label">{t("Luogo")}</label>
            <input className="input" name="location" type="text" />
          </div>
          <div className="field" style={{ width: 110 }}>
            <label className="label">{t("Distanza")}</label>
            <input className="input" name="distance_label" type="text" placeholder="10 km" />
          </div>
          <div className="field" style={{ width: 110 }}>
            <label className="label">{t("Obiettivo")}</label>
            <input className="input" name="target_time" type="text" placeholder="42:00" />
          </div>
          <div className="field" style={{ width: 84 }}>
            <label className="label">{t("Priorità")}</label>
            <select className="input" name="priority" defaultValue="">
              <option value="">—</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit">
            + {t("Aggiungi gara")}
          </button>
        </div>
      </form>

      </>) : null}
      {show("dispositivi") ? (<>
      {/* ---------------- DISPOSITIVI (via Intervals.icu) ---------------- */}
      <h2 className="sec" id="dispositivi">
        <span className="l">{t("Dispositivi & attività")}</span>
      </h2>

      {ai ? <CoachPrefsCard athleteId={athleteId} t={t} /> : null}
      {ai ? <HumanCoachCard athleteId={athleteId} t={t} /> : null}
      {ai ? <ReferencePlanCard athleteId={athleteId} t={t} back="/atleta/dispositivi" status={refParam} msg={planMsg} /> : null}
      {ai ? <CalendarFeedCard athleteId={athleteId} t={t} /> : null}
      {ai ? <McpCard athleteId={athleteId} t={t} /> : null}

      {icuNotice ? (
        <div
          className="card"
          style={{
            marginBottom: 12,
            color: icuNotice.ok ? "var(--lime)" : "var(--rose)",
            fontSize: ".88rem",
          }}
        >
          {icuNotice.text}
        </div>
      ) : null}

      <form action={saveMyIntervalsConnection} className="card">
        <div style={{ fontSize: ".95rem", lineHeight: 1.65, color: "var(--text-2)" }}>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>{t("Come funziona (si fa una volta sola):")}</strong>
          </p>
          <ol style={{ margin: "8px 0 0 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <li>
              {t("Crea un account gratuito su")} <b>intervals.icu</b> {t("e lì, in")}{" "}
              <b>Settings</b>, {t("collega il tuo dispositivo (Garmin, Polar, Suunto, Strava, …) attivando")} <b>&quot;Upload planned workouts&quot;</b>.{" "}
              <em>{t("Il collegamento vero ai dispositivi avviene lì, non qui.")}</em>
            </li>
            <li>
              {t("Copia la API key da Intervals →")} <b>Settings → Developer</b> {t("e incollala qui sotto.")}
            </li>
          </ol>
          <p style={{ margin: "10px 0 0" }}>
            <strong style={{ color: "var(--text)" }}>{t("Da quel momento:")}</strong>{" "}
            {t("gli allenamenti pubblicati dalla coach ti arrivano")}{" "}
            <b>{t("sull'orologio")}</b> {t("(Garmin/Suunto/COROS/Wahoo, il giorno stesso al sync) e sul calendario Garmin Connect/Intervals; le attività che")}{" "}
            <b>{t("svolgi")}</b> {t("tornano")} <b>{t("qui sotto e nella tua settimana")}</b>{t(", giorno per giorno, con tutte le metriche. Tu non devi fare nient'altro.")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 8 }}>
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label className="label">{t("API key Intervals.icu")}</label>
            <input
              className="input"
              name="api_key"
              type="text"
              autoComplete="off"
              placeholder={t("incolla la API key")}
              defaultValue={icuConn?.api_key ?? ""}
            />
          </div>
          <div className="field" style={{ width: 140 }}>
            <label className="label">Athlete ID</label>
            <input
              className="input"
              name="intervals_athlete_id"
              type="text"
              placeholder="i123456"
              defaultValue={icuConn?.intervals_athlete_id ?? ""}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            {icuConn ? t("Aggiorna") : t("Collega")}
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          {!ai ? (<>
          <input type="hidden" name="push_planned_ctl" value="1" />
          <label
            className="mono"
            style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              name="push_planned"
              defaultChecked={(icuConn as { push_planned?: boolean } | null)?.push_planned !== false}
            />
            ⌚ {t("Invia gli allenamenti pianificati al mio orologio")}
          </label>
          <div className="mono" style={{ color: "var(--text-2)", fontSize: ".72rem", marginTop: 4 }}>
            {t("Togli la spunta se sull'orologio vuoi tenere solo gli allenamenti di un altro piano: le attività svolte continuano comunque ad arrivare qui.")}
          </div>
          </>) : null}
          <label
            className="mono"
            style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", marginTop: 10 }}
          >
            <input
              type="checkbox"
              name="warmup_lap_press"
              defaultChecked={
                (icuConn as { warmup_lap_press?: boolean } | null)?.warmup_lap_press === true
              }
            />
            🔄 {t("Riscaldamento aperto fino al tasto giro (bici e corsa)")}
          </label>
          <div className="mono" style={{ color: "var(--text-2)", fontSize: ".72rem", marginTop: 4 }}>
            {t("Con la spunta il riscaldamento non ha una durata fissa: il lavoro parte quando premi")} <em>lap</em>{t(". Comodo per uscire di città prima di iniziare.")}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="label">
            {t("Quali dispositivi usi (informativo — il collegamento si fa su intervals.icu)")}
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            {ICU_CHANNELS.map(([value, label]) => (
              <label
                key={value}
                className="mono"
                style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  name="channels"
                  value={value}
                  defaultChecked={icuChannels.includes(value)}
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </div>
      </form>
      {ai && icuConn ? <WatchPushCard conn={icuConn as { push_planned?: boolean; push_days?: number | null }} t={t} /> : null}

      {icuConn ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{t("Intervals.icu collegato")}</strong>
                <div className="mono" style={{ color: "var(--text-2)", fontSize: ".78rem", marginTop: 4 }}>
                  {icuConn.last_ok_at
                    ? t("Ultimo sync: {d}", { d: fmtActivityDate(icuConn.last_ok_at) })
                    : t("Mai sincronizzato — premi “Sincronizza attività”.")}
                </div>
              </div>
              <span className="pill ok">{t("Connesso")}</span>
              <form action={syncMyIcuActivities}>
                <button className="btn btn-primary btn-sm" type="submit">
                  ⟳ {t("Sincronizza attività")}
                </button>
              </form>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <StravaActivityList activities={icuActivities} />
          </div>
        </>
      ) : null}
      </>) : null}
    </div>
  );
}
