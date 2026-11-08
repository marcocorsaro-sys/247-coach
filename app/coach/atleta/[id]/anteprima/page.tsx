import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCoachAccess } from "@/lib/server/viewAs";
import type { Tables } from "@/supabase/database.types";
import { type Fitness, fmtPace, ageFromBirth } from "@/lib/training/zones";
import { zoneGroups as buildZoneGroups } from "@/lib/training/customZones";
import { loadCustomZones } from "@/lib/server/customZones";
import { type StepLite } from "@/lib/training/describe";
import { weekLabel } from "@/lib/training/weeks";
import { CATEGORY_LABEL } from "@/lib/training/categories";
import AthleteWeekNav from "@/app/atleta/AthleteWeekNav";
import AthleteWeek, { type DaySession, type VacationSlot } from "@/app/atleta/AthleteWeek";
import CoachNav from "@/components/CoachNav";
import StravaActivityList from "@/components/StravaActivityList";
import {
  type StravaActivityFull,
  type StravaActivityLite,
  bucketByWeekday,
  fmtActivityDate,
} from "@/lib/strava/format";
import { loadVacationByDay } from "@/lib/server/vacation";
import { loadIntervalsConnection } from "@/lib/server/intervals";

const MESI_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const DISC_LABEL: Record<string, string> = {
  run: "Corsa",
  bike: "Bici",
  swim: "Nuoto",
  athletics: "Forza",
  other: "Altro",
};
function fmtDay(d: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getDate()} ${MESI_SHORT[dt.getMonth()]}`;
}
function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(d).getTime() - t.getTime()) / 86_400_000);
}

export default async function AthletePreview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ w?: string }>;
}) {
  const { id } = await params;
  const { w: selectedParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const coachAccess = await resolveCoachAccess(supabase, user.id);
  if (!coachAccess.allowed) redirect("/atleta");
  const coachId = coachAccess.coachId!;

  // Verifica che sia un atleta di questo coach.
  const { data: rel } = await supabase
    .from("coaching_relationships")
    .select("athlete_id")
    .eq("coach_id", coachId)
    .eq("athlete_id", id)
    .maybeSingle();
  if (!rel && !coachAccess.isAdmin) redirect("/coach");

  const { data: athData } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", id)
    .single();
  const ath = athData as unknown as { full_name: string | null; email: string } | null;
  const athName = ath?.full_name ?? ath?.email ?? "atleta";

  // Tutti gli atleti del coach: switcher per "entrare" in un'altra vista atleta
  // senza credenziali (il coach vede solo i propri, garantito dalla RLS).
  const { data: allRels } = await supabase
    .from("coaching_relationships")
    .select("athlete_id")
    .eq("coach_id", coachId)
    .eq("active", true);
  const allIds = ((allRels ?? []) as unknown as { athlete_id: string }[]).map((r) => r.athlete_id);
  let roster: { id: string; full_name: string | null; email: string }[] = [];
  if (allIds.length > 0) {
    const { data: rosterData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", allIds)
      .order("full_name", { ascending: true });
    roster = (rosterData ?? []) as unknown as typeof roster;
  }

  const { data: catData } = await supabase
    .from("athlete_categories")
    .select("category")
    .eq("athlete_id", id);
  const categories = ((catData ?? []) as unknown as { category: string }[]).map((c) => c.category);

  // Pubblicate + bozze: così Irene rivede una tabella PRIMA di pubblicarla.
  // Le bozze sono marcate "non ancora visibile": l'atleta vede solo le pubblicate.
  const { data: weeksData } = await supabase
    .from("training_weeks")
    .select("id, week_start, status")
    .eq("athlete_id", id)
    .in("status", ["published", "draft"])
    .order("week_start", { ascending: false });
  const weeks = (weeksData ?? []) as unknown as {
    id: string;
    week_start: string;
    status: string;
  }[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inWeek = (ws: string) => {
    const s = new Date(ws);
    s.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - s.getTime()) / 86_400_000);
    return diff >= 0 && diff <= 6 ? diff : -1;
  };
  const week =
    weeks.find((w) => w.id === selectedParam) ??
    weeks.find((w) => inWeek(w.week_start) >= 0) ??
    weeks[0];
  const todayIdx = week ? inWeek(week.week_start) : -1;

  let sessions: DaySession[] = [];
  let doneIds: string[] = [];
  const rpeById: Record<string, number> = {};
  const skippedNotes: Record<string, string> = {};
  const notesById: Record<string, string> = {};
  const stepsBySession = new Map<string, StepLite[]>();
  if (week) {
    const { data } = await supabase
      .from("sessions")
      .select("id, day_of_week, discipline, title, volume_value, raw_text, notes")
      .eq("week_id", week.id)
      .order("day_of_week", { ascending: true })
      .order("sort_order", { ascending: true });
    sessions = (data ?? []) as unknown as DaySession[];
    const sids = sessions.map((s) => s.id);
    if (sids.length > 0) {
      const { data: sd } = await supabase
        .from("session_steps")
        .select(
          "id, session_id, parent_step_id, sort_order, step_type, repeat_count, duration_seconds, distance_meters, raw_fragment, target_type, target_low, target_high, target_unit, recovery_text, equipment, note",
        )
        .in("session_id", sids)
        .order("sort_order", { ascending: true });
      for (const r of (sd ?? []) as unknown as (StepLite & { session_id: string })[]) {
        const arr = stepsBySession.get(r.session_id) ?? [];
        arr.push(r);
        stepsBySession.set(r.session_id, arr);
      }

      const { data: logsData } = await supabase
        .from("session_logs")
        .select("session_id, status, rpe_actual, athlete_note")
        .eq("athlete_id", id)
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
  const stepsObj = Object.fromEntries(stepsBySession);

  // Attività svolte (via Intervals.icu) nella settimana, raggruppate per giorno.
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
      .eq("athlete_id", id)
      .gte("start_date", from.toISOString())
      .lt("start_date", to.toISOString())
      .order("start_date", { ascending: true });
    stravaByDay = bucketByWeekday(
      (weekActs ?? []) as unknown as StravaActivityFull[],
      week.week_start,
    );
  }

  let vacationByDay: Record<number, VacationSlot[]> = {};
  if (week) {
    vacationByDay = await loadVacationByDay(supabase, id, week.week_start);
  }

  const fitnessRow = await supabase
    .from("athlete_fitness")
    .select("*")
    .eq("athlete_id", id)
    .maybeSingle();
  const fit = (fitnessRow.data ?? null) as unknown as Tables<"athlete_fitness"> | null;
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
  const customZones = await loadCustomZones(supabase, id);
  const zoneGroups = buildZoneGroups(f, customZones);
  const age = ageFromBirth(fit?.birth_date ?? null);

  // Dispositivi + ultime attività (come le vede l'atleta).
  const icuConn = await loadIntervalsConnection(supabase, id);
  const { data: icuActData } = await supabase
    .from("icu_activities")
    .select(
      "id, name, sport_type, discipline, start_date, distance_m, moving_time_s, average_heartrate, total_elevation_gain, average_watts",
    ).eq("is_duplicate" as never, false as never)
    .eq("athlete_id", id)
    .order("start_date", { ascending: false })
    .limit(15);
  const icuActivities = (icuActData ?? []) as unknown as StravaActivityLite[];

  const { data: metricsData } = await supabase
    .from("athlete_metrics")
    .select("id, metric_key, metric_value, metric_text, unit, discipline, recorded_at")
    .eq("athlete_id", id)
    .order("recorded_at", { ascending: false });
  const metrics = (metricsData ?? []) as unknown as Pick<
    Tables<"athlete_metrics">,
    "id" | "metric_key" | "metric_value" | "metric_text" | "unit" | "discipline" | "recorded_at"
  >[];

  const { data: racesData } = await supabase
    .from("races")
    .select("id, name, race_date, location, priority")
    .eq("athlete_id", id)
    .order("race_date", { ascending: true });
  const races = (racesData ?? []) as unknown as Pick<
    Tables<"races">,
    "id" | "name" | "race_date" | "location" | "priority"
  >[];

  return (
    <div className="wrap-tight">
      <CoachNav
        label="ANTEPRIMA ATLETA"
        crumbs={[
          { href: "/coach/atleti", label: "Atleti" },
          { href: `/coach/atleta/${id}`, label: athName },
          { label: "Anteprima" },
        ]}
      />

      <div className="pill warn" style={{ marginBottom: 12 }}>
        👁 Vista atleta — stai vedendo l&apos;app come la vede <strong style={{ marginLeft: 4 }}>{athName}</strong> (sola lettura).
      </div>

      {roster.length > 1 ? (
        <div
          className="card"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "12px 16px", marginBottom: 16 }}
        >
          <span className="mono" style={{ color: "var(--text-2)" }}>// ENTRA COME</span>
          {roster.map((a) => (
            <Link
              key={a.id}
              href={`/coach/atleta/${a.id}/anteprima`}
              className={`btn btn-sm ${a.id === id ? "btn-primary" : "btn-subtle"}`}
            >
              {a.full_name ?? a.email}
            </Link>
          ))}
        </div>
      ) : null}

      {week?.status === "draft" ? (
        <div className="pill err" style={{ marginBottom: 16 }}>
          📝 BOZZA — questa settimana <strong style={{ margin: "0 4px" }}>non è ancora visibile</strong>
          all&apos;atleta. Stai rivedendo come apparirà una volta pubblicata.
        </div>
      ) : null}

      <div className="hero">
        <div>
          <span className="mono">// VISTA ATLETA</span>
          <h1>
            Ciao <em>{athName.split(" ")[0]}</em>.
          </h1>
          {categories.length > 0 ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {categories.map((c) => (
                <span key={c} className="pill violet pill-plain">
                  {CATEGORY_LABEL[c] ?? c}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {weeks.length > 1 ? (
        <AthleteWeekNav
          weeks={weeks.map((w) => ({ id: w.id, week_start: w.week_start }))}
          selectedId={week?.id ?? null}
        />
      ) : null}

      {!week ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessuna tabella (né pubblicata né in bozza) per questo atleta.
        </div>
      ) : (
        <>
          <h2 className="sec">
            <span className="l">{weekLabel(week.week_start)}</span>
            <span className="mono">dal {fmtDay(week.week_start)}</span>
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
            readOnly
          />
        </>
      )}

      {(fit?.weight_kg != null || f.ftp_watts != null || f.lthr != null ||
        f.threshold_pace_run_s_per_km != null || age != null) ? (
        <>
          <h2 className="sec">
            <span className="l">La sua scheda</span>
          </h2>
          <div className="bento-4">
            {fit?.weight_kg != null ? (
              <div className="card kpi">
                <div className="v">{fit.weight_kg}<span style={{ fontSize: ".9rem" }}> kg</span></div>
                <div className="l">Peso</div>
              </div>
            ) : null}
            {f.ftp_watts != null ? (
              <div className="card kpi">
                <div className="v lime">{f.ftp_watts}<span style={{ fontSize: ".9rem" }}> W</span></div>
                <div className="l">FTP bici</div>
              </div>
            ) : null}
            {f.lthr != null ? (
              <div className="card kpi">
                <div className="v">{f.lthr}<span style={{ fontSize: ".9rem" }}> bpm</span></div>
                <div className="l">FC soglia</div>
              </div>
            ) : null}
            {f.threshold_pace_run_s_per_km != null ? (
              <div className="card kpi">
                <div className="v">{fmtPace(f.threshold_pace_run_s_per_km)}</div>
                <div className="l">Passo soglia /km</div>
              </div>
            ) : null}
            {age != null ? (
              <div className="card kpi">
                <div className="v">{age}</div>
                <div className="l">Età</div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {zoneGroups.length > 0 ? (
        <>
          <h2 className="sec">
            <span className="l">Le sue zone</span>
          </h2>
          <div className="grid-2">
            {zoneGroups.map((g) => (
              <div className="card" key={g.title}>
                <div className="mono" style={{ color: "var(--text-2)", marginBottom: 10 }}>
                  {g.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {g.zones.map((z) => (
                    <div
                      key={z.n}
                      style={{ display: "flex", justifyContent: "space-between", fontSize: ".88rem" }}
                    >
                      <span style={{ color: "var(--text-2)" }}>{z.name}</span>
                      <strong>{z.range}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <h2 className="sec">
        <span className="l">I suoi test</span>
      </h2>
      {metrics.length > 0 ? (
        <div className="grid-3">
          {metrics.map((m) => (
            <div className="card" key={m.id}>
              <div className="v lime" style={{ fontSize: "1.4rem" }}>
                {m.metric_value ?? m.metric_text ?? "—"}
                {m.unit ? <span style={{ fontSize: ".9rem" }}> {m.unit}</span> : null}
              </div>
              <div className="l" style={{ marginTop: 6 }}>
                {m.metric_key}
                {m.discipline ? ` · ${DISC_LABEL[m.discipline] ?? m.discipline}` : ""}
              </div>
              <div className="mono" style={{ color: "var(--text-2)", marginTop: 4 }}>
                {fmtDay(m.recorded_at)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessun test registrato.
        </div>
      )}

      <h2 className="sec">
        <span className="l">Gare obiettivo</span>
      </h2>
      {races.length > 0 ? (
        <div className="grid-3">
          {races.map((r) => {
            const d = daysUntil(r.race_date);
            return (
              <div className="card" key={r.id}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{r.name}</strong>
                  {r.priority ? <span className="pill violet pill-plain">{r.priority}</span> : null}
                </div>
                <div className="mono" style={{ marginTop: 8, color: "var(--text-2)" }}>
                  {r.location ? `${r.location} · ` : ""}
                  {fmtDay(r.race_date)}
                  {d !== null ? ` — fra ${d} giorni` : ""}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessuna gara obiettivo.
        </div>
      )}

      <h2 className="sec">
        <span className="l">Dispositivi &amp; attività</span>
        {icuConn?.last_ok_at ? (
          <span className="mono" style={{ color: "var(--text-2)" }}>
            ultimo sync {fmtActivityDate(icuConn.last_ok_at)}
          </span>
        ) : null}
      </h2>
      {icuConn ? (
        <>
          <div className="pill ok pill-plain" style={{ marginBottom: 10 }}>
            Intervals.icu collegato
            {icuConn.channels ? ` · ${icuConn.channels}` : ""}
          </div>
          <StravaActivityList activities={icuActivities} />
        </>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Dispositivi non collegati: l&apos;atleta (o tu dalla sua scheda) può
          collegare Intervals.icu.
        </div>
      )}
    </div>
  );
}
