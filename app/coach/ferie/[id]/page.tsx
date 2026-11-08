import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessCoachArea } from "@/lib/server/viewAs";
import type { Tables } from "@/supabase/database.types";
import CoachNav from "@/components/CoachNav";
import ConfirmButton from "@/components/ConfirmButton";
import {
  DISCIPLINES,
  discMeta,
  datesBetween,
  fmtDayLabel,
  fmtPeriodRange,
} from "@/lib/training/vacation";
import {
  savePeriod,
  togglePeriodPublish,
  addWorkout,
  deleteWorkout,
  toggleDayDiscipline,
} from "./actions";

type Period = Pick<
  Tables<"vacation_periods">,
  "id" | "athlete_id" | "label" | "start_date" | "end_date" | "note" | "status"
>;
type Workout = Pick<
  Tables<"vacation_workouts">,
  "id" | "discipline" | "title" | "intensity_label" | "volume_value" | "description"
>;
type Day = Pick<Tables<"vacation_days">, "id" | "date" | "discipline">;
type Pick_ = Pick<
  Tables<"vacation_picks">,
  "id" | "vacation_day_id" | "vacation_workout_id" | "status"
>;

export default async function VacationEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!(await canAccessCoachArea(supabase, user.id))) redirect("/atleta");

  const { data: periodData } = await supabase
    .from("vacation_periods")
    .select("id, athlete_id, label, start_date, end_date, note, status")
    .eq("id", id)
    .single();
  const period = periodData as unknown as Period | null;
  if (!period) redirect("/coach");

  const { data: athData } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", period.athlete_id)
    .single();
  const ath = athData as unknown as { full_name: string | null; email: string } | null;

  const [woRes, dayRes, pickRes] = await Promise.all([
    supabase
      .from("vacation_workouts")
      .select("id, discipline, title, intensity_label, volume_value, description")
      .eq("period_id", id)
      .order("discipline", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("vacation_days").select("id, date, discipline").eq("period_id", id),
    supabase.from("vacation_picks").select("id, vacation_day_id, vacation_workout_id, status"),
  ]);
  const workouts = (woRes.data ?? []) as unknown as Workout[];
  const days = (dayRes.data ?? []) as unknown as Day[];
  const picks = (pickRes.data ?? []) as unknown as Pick_[];

  const dates = datesBetween(period.start_date, period.end_date);
  // disciplina proposta -> set di date attive
  const daySet = new Set(days.map((d) => `${d.date.slice(0, 10)}|${d.discipline}`));
  const dayIdByKey = new Map(days.map((d) => [`${d.date.slice(0, 10)}|${d.discipline}`, d.id]));
  const pickByDay = new Map(picks.map((p) => [p.vacation_day_id, p]));
  const workoutById = new Map(workouts.map((w) => [w.id, w]));
  const woByDiscipline = new Map<string, Workout[]>();
  for (const w of workouts) {
    const arr = woByDiscipline.get(w.discipline) ?? [];
    arr.push(w);
    woByDiscipline.set(w.discipline, arr);
  }

  const published = period.status === "published";

  return (
    <div className="wrap-tight">
      <CoachNav
        label="FERIE"
        crumbs={[
          { href: "/coach/atleti", label: "Atleti" },
          { href: `/coach/atleta/${period.athlete_id}`, label: ath?.full_name ?? ath?.email ?? "Atleta" },
          { label: period.label ?? "Ferie" },
        ]}
      />

      <div className="hero">
        <div>
          <span className="mono">// PERIODO FLESSIBILE</span>
          <h1>{period.label ?? "Ferie"}</h1>
          <p>
            {ath?.full_name ?? ath?.email} · {fmtPeriodRange(period.start_date, period.end_date)}
          </p>
        </div>
        <div className="hero-actions">
          <form action={togglePeriodPublish}>
            <input type="hidden" name="period_id" value={period.id} />
            <input type="hidden" name="publish" value={published ? "0" : "1"} />
            <button className={published ? "btn btn-subtle" : "btn btn-primary"} type="submit">
              {published ? "Ritira" : "Pubblica"}
            </button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 8 }}>
        <span className={`pill ${published ? "ok" : ""}`}>
          {published ? "● Pubblicato — visibile all'atleta" : "○ Bozza — non ancora visibile"}
        </span>
      </div>

      {/* -------- META PERIODO -------- */}
      <h2 className="sec"><span className="l">Dettagli periodo</span></h2>
      <form action={savePeriod}>
        <input type="hidden" name="period_id" value={period.id} />
        <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label className="label">Etichetta</label>
            <input className="input" name="label" type="text" defaultValue={period.label ?? ""} placeholder="Ferie agosto" />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label className="label">Inizio</label>
            <input className="input" name="start_date" type="date" defaultValue={period.start_date.slice(0, 10)} />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label className="label">Fine</label>
            <input className="input" name="end_date" type="date" defaultValue={period.end_date.slice(0, 10)} />
          </div>
          <div className="field" style={{ flexBasis: "100%" }}>
            <label className="label">Nota generale</label>
            <textarea className="input" name="note" rows={2} defaultValue={period.note ?? ""} placeholder="Indicazioni per il periodo (es. ascolta il corpo, sessioni libere…)" />
          </div>
          <button className="btn btn-primary" type="submit">Salva dettagli</button>
        </div>
      </form>

      {/* -------- ROASTER -------- */}
      <h2 className="sec"><span className="l">Roaster — il menu di allenamenti</span></h2>
      <p style={{ color: "var(--text-2)", marginTop: -4, marginBottom: 12, fontSize: ".9rem" }}>
        Crea gli allenamenti tra cui l&apos;atleta sceglierà (es. Nuoto 1, Nuoto 2, Bike lunga…).
        Poi, sotto, assegna le discipline ai giorni.
      </p>

      {DISCIPLINES.map((disc) => {
        const list = woByDiscipline.get(disc) ?? [];
        if (list.length === 0) return null;
        const m = discMeta(disc);
        return (
          <div key={disc} style={{ marginBottom: 12 }}>
            <div className="mono" style={{ color: "var(--text-2)", marginBottom: 6 }}>
              {m.sym} {m.label}
            </div>
            <div className="grid-3">
              {list.map((w) => (
                <div className="card" key={w.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{w.title}</strong>
                    <form action={deleteWorkout}>
                      <input type="hidden" name="period_id" value={period.id} />
                      <input type="hidden" name="workout_id" value={w.id} />
                      <ConfirmButton
                        message={`Eliminare "${w.title}" dal roaster?`}
                        className="btn btn-subtle btn-sm"
                        style={{ color: "var(--rose)" }}
                      >
                        ✕
                      </ConfirmButton>
                    </form>
                  </div>
                  <div className="mono" style={{ color: "var(--text-2)", marginTop: 4, fontSize: ".82rem" }}>
                    {[w.intensity_label, w.volume_value].filter(Boolean).join(" · ")}
                  </div>
                  {w.description ? (
                    <p style={{ fontSize: ".88rem", lineHeight: 1.5, marginTop: 8, whiteSpace: "pre-wrap" }}>
                      {w.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <form action={addWorkout}>
        <input type="hidden" name="period_id" value={period.id} />
        <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ width: 130 }}>
            <label className="label">Disciplina</label>
            <select className="input" name="discipline" defaultValue="swim">
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>{discMeta(d).label}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label className="label">Titolo</label>
            <input className="input" name="title" type="text" placeholder="Nuoto 1" />
          </div>
          <div className="field" style={{ width: 120 }}>
            <label className="label">Intensità</label>
            <input className="input" name="intensity_label" type="text" placeholder="facile" />
          </div>
          <div className="field" style={{ width: 120 }}>
            <label className="label">Volume</label>
            <input className="input" name="volume_value" type="text" placeholder="45'" />
          </div>
          <div className="field" style={{ flexBasis: "100%" }}>
            <label className="label">Descrizione</label>
            <textarea className="input" name="description" rows={2} placeholder="Corpo dell'allenamento, testo libero" />
          </div>
          <button className="btn btn-primary" type="submit">+ Aggiungi al roaster</button>
        </div>
      </form>

      {/* -------- GIORNI → DISCIPLINE -------- */}
      <h2 className="sec"><span className="l">Giorni del periodo</span></h2>
      <p style={{ color: "var(--text-2)", marginTop: -4, marginBottom: 12, fontSize: ".9rem" }}>
        Per ogni giorno, attiva le discipline proposte. L&apos;atleta sceglierà dal roaster
        l&apos;allenamento che preferisce per quella disciplina.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {dates.map((iso) => (
          <div className="card" key={iso} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ minWidth: 120 }}>{fmtDayLabel(iso)}</strong>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DISCIPLINES.map((disc) => {
                const key = `${iso}|${disc}`;
                const active = daySet.has(key);
                const m = discMeta(disc);
                const dayId = dayIdByKey.get(key);
                const pick = dayId ? pickByDay.get(dayId) : null;
                const chosen = pick?.vacation_workout_id
                  ? workoutById.get(pick.vacation_workout_id)
                  : null;
                return (
                  <form action={toggleDayDiscipline} key={disc}>
                    <input type="hidden" name="period_id" value={period.id} />
                    <input type="hidden" name="date" value={iso} />
                    <input type="hidden" name="discipline" value={disc} />
                    <button
                      type="submit"
                      className={`disc ${m.cls}`}
                      title={active ? "Rimuovi" : "Aggiungi"}
                      style={{
                        cursor: "pointer",
                        border: "none",
                        opacity: active ? 1 : 0.32,
                        filter: active ? undefined : "grayscale(.5)",
                      }}
                    >
                      {m.sym} {m.label}
                      {chosen ? <span style={{ marginLeft: 6 }}>→ {chosen.title}</span> : null}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
