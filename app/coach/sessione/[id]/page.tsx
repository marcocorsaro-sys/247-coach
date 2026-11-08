import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessCoachArea } from "@/lib/server/viewAs";
import type { Tables } from "@/supabase/database.types";
import { type Discipline, type Fitness, zonesForDiscipline } from "@/lib/training/zones";
import { copySession } from "@/app/coach/settimana/[id]/actions";
import { sendSessionToIntervals } from "./actions";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { weekLabel, fmtRange } from "@/lib/training/weeks";
import SessionBuilder, { type DBStep } from "./SessionBuilder";
import CoachNav from "@/components/CoachNav";

const DISC_LABEL: Record<string, string> = {
  swim: "Nuoto",
  bike: "Bici",
  run: "Corsa",
  athletics: "Forza",
  other: "Altro",
};

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; icu?: string; icu_detail?: string }>;
}) {
  const { id } = await params;
  const { saved, icu, icu_detail } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!(await canAccessCoachArea(supabase, user.id))) {
    redirect("/atleta");
  }

  const { data: sessData } = await supabase
    .from("sessions")
    .select("id, week_id, day_of_week, discipline, title, volume_value, volume_unit, raw_text, notes")
    .eq("id", id)
    .single();
  const sess = sessData as unknown as Pick<
    Tables<"sessions">,
    | "id"
    | "week_id"
    | "day_of_week"
    | "discipline"
    | "title"
    | "volume_value"
    | "volume_unit"
    | "raw_text"
    | "notes"
  > | null;
  if (!sess) redirect("/coach");

  const { data: weekData } = await supabase
    .from("training_weeks")
    .select("id, athlete_id, label, week_start")
    .eq("id", sess.week_id)
    .single();
  const week = weekData as unknown as Pick<
    Tables<"training_weeks">,
    "id" | "athlete_id" | "label" | "week_start"
  > | null;
  if (!week) redirect("/coach");

  const [stepsRes, fitRes, athRes] = await Promise.all([
    supabase
      .from("session_steps")
      .select(
        "id, parent_step_id, sort_order, step_type, repeat_count, duration_seconds, distance_meters, raw_fragment, target_type, target_low, target_high, target_unit, recovery_text, cadence_rpm, equipment, note",
      )
      .eq("session_id", id)
      .order("sort_order", { ascending: true }),
    supabase.from("athlete_fitness").select("*").eq("athlete_id", week.athlete_id).maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", week.athlete_id).single(),
  ]);

  const steps = (stepsRes.data ?? []) as unknown as DBStep[];
  const fit = (fitRes.data ?? null) as unknown as Tables<"athlete_fitness"> | null;
  const ath = athRes.data as unknown as { full_name: string | null; email: string } | null;
  const icuConn = await loadIntervalsConnection(supabase, week.athlete_id);

  const fitness: Fitness = {
    max_hr: fit?.max_hr ?? null,
    resting_hr: fit?.resting_hr ?? null,
    lthr: fit?.lthr ?? null,
    threshold_pace_run_s_per_km: fit?.threshold_pace_run_s_per_km ?? null,
    ftp_watts: fit?.ftp_watts ?? null,
    css_swim_s_per_100m: fit?.css_swim_s_per_100m ?? null,
    swim_test_400_s: fit?.swim_test_400_s ?? null,
    zone_model: fit?.zone_model ?? "standard",
  };

  const discipline = sess.discipline as Discipline;
  const refZones = zonesForDiscipline(discipline, fitness);

  return (
    <div className="wrap-tight">
      <CoachNav
        label="ALLENAMENTO"
        crumbs={[
          { href: "/coach/atleti", label: "Atleti" },
          { href: `/coach/atleta/${week.athlete_id}`, label: ath?.full_name ?? ath?.email ?? "Atleta" },
          {
            href: `/coach/atleta/${week.athlete_id}/griglia?w=${week.week_start.slice(0, 10)}`,
            label: weekLabel(week.week_start),
          },
          { label: DISC_LABEL[discipline] ?? "Allenamento" },
        ]}
      />

      {saved ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Allenamento salvato
        </div>
      ) : null}
      {icu === "ok" ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Inviato a Intervals.icu — arriverà su Garmin al prossimo sync
          {icu_detail ? ` · ${icu_detail}` : ""}
        </div>
      ) : null}
      {icu === "noconn" ? (
        <div className="pill warn" style={{ marginBottom: 16 }}>
          ⚠ Intervals.icu non collegato per questo atleta: configuralo nella sua
          scheda (sezione &quot;Garmin via Intervals.icu&quot;).
        </div>
      ) : null}
      {icu === "err" ? (
        <div className="pill err" style={{ marginBottom: 16, whiteSpace: "pre-wrap" }}>
          ✗ Invio a Intervals fallito — {icu_detail ?? "errore sconosciuto"}
        </div>
      ) : null}

      <div className="hero">
        <div>
          <span className="mono">
            // {ath?.full_name ?? ath?.email ?? "atleta"} · {weekLabel(week.week_start)} ·{" "}
            {DISC_LABEL[discipline] ?? discipline}
          </span>
          <h1>
            Costruisci <em>allenamento</em>.
          </h1>
        </div>
        <div className="hero-actions">
          <form action={sendSessionToIntervals}>
            <input type="hidden" name="session_id" value={id} />
            <button
              className="btn btn-primary"
              type="submit"
              title={
                icuConn
                  ? "Pubblica sul calendario Intervals.icu → Garmin Connect"
                  : "Intervals.icu non collegato: configuralo nella scheda atleta"
              }
            >
              ⌚ Invia a Garmin{icuConn ? "" : " (non collegato)"}
            </button>
          </form>
          <form action={copySession}>
            <input type="hidden" name="session_id" value={id} />
            <input type="hidden" name="week_id" value={week.id} />
            <button className="btn btn-subtle" type="submit">
              ⧉ Duplica sessione
            </button>
          </form>
          <Link className="btn btn-subtle" href={`/coach/settimana/${week.id}`}>
            ← Torna alla settimana
          </Link>
        </div>
      </div>

      <SessionBuilder
        sessionId={sess.id}
        weekId={week.id}
        athleteName={ath?.full_name ?? ath?.email ?? "atleta"}
        weekLabelStr={weekLabel(week.week_start)}
        weekRange={fmtRange(week.week_start)}
        weekStartISO={week.week_start}
        initialTitle={sess.title ?? ""}
        initialDiscipline={discipline}
        initialDay={sess.day_of_week}
        initialVolumeValue={sess.volume_value ?? ""}
        initialVolumeUnit={sess.volume_unit ?? "time"}
        initialNotes={sess.notes ?? sess.raw_text ?? ""}
        rawText={sess.raw_text ?? ""}
        initialSteps={steps}
        fitness={fitness}
      />

      {refZones.length > 0 ? (
        <>
          <h2 className="sec">
            <span className="l">Zone di riferimento · {DISC_LABEL[discipline] ?? discipline}</span>
          </h2>
          <div className="card">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {refZones.map((z) => (
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
        </>
      ) : null}
    </div>
  );
}
