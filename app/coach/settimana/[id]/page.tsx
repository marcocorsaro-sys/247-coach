import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessCoachArea } from "@/lib/server/viewAs";
import type { Tables } from "@/supabase/database.types";
import {
  saveWeek,
  addSession,
  deleteSession,
  publishWeek,
  unpublishWeek,
  deleteWeek,
  structureWeekAction,
} from "./actions";

// Lo strutturatore AI gira in background (after) dentro le action di questa
// pagina: serve il tempo di una chiamata al modello + il ri-push.
export const maxDuration = 300;
import { weekLabel, fmtRange, weekDates, MESI_SHORT } from "@/lib/training/weeks";
import ConfirmButton from "@/components/ConfirmButton";
import CoachNav from "@/components/CoachNav";

const GIORNI_SHORT = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const DISC: Record<string, { cls: string; label: string; sym: string }> = {
  swim: { cls: "disc-swim", label: "Nuoto", sym: "●" },
  bike: { cls: "disc-bike", label: "Bici", sym: "◆" },
  run: { cls: "disc-run", label: "Corsa", sym: "▲" },
  athletics: { cls: "disc-ath", label: "Forza", sym: "✦" },
  other: { cls: "disc-rest", label: "Altro", sym: "○" },
};

type SessionRow = Pick<
  Tables<"sessions">,
  "id" | "day_of_week" | "discipline" | "title" | "volume_value" | "volume_unit" | "raw_text"
>;

export default async function WeekEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    imported?: string;
    published?: string;
    unpublished?: string;
    notify?: string;
    structuring?: string;
  }>;
}) {
  const { id } = await params;
  const { saved, imported, published, unpublished, notify, structuring } = await searchParams;

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

  const { data: weekData } = await supabase
    .from("training_weeks")
    .select("id, athlete_id, label, week_start, status, coach_comment")
    .eq("id", id)
    .single();
  const week = weekData as unknown as Pick<
    Tables<"training_weeks">,
    "id" | "athlete_id" | "label" | "week_start" | "status" | "coach_comment"
  > | null;
  if (!week) redirect("/coach");

  const { data: athData } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", week.athlete_id)
    .single();
  const ath = athData as unknown as { full_name: string | null; email: string } | null;

  const { data: sessData } = await supabase
    .from("sessions")
    .select("id, day_of_week, discipline, title, volume_value, volume_unit, raw_text")
    .eq("week_id", id)
    .order("day_of_week", { ascending: true })
    .order("sort_order", { ascending: true });
  const sessions = (sessData ?? []) as unknown as SessionRow[];

  // Quanti step strutturati ha ogni sessione (per il badge "pronto per Garmin").
  const stepCount = new Map<string, number>();
  if (sessions.length > 0) {
    const { data: stepRows } = await supabase
      .from("session_steps")
      .select("session_id")
      .in(
        "session_id",
        sessions.map((s) => s.id),
      );
    for (const r of (stepRows ?? []) as unknown as { session_id: string }[]) {
      stepCount.set(r.session_id, (stepCount.get(r.session_id) ?? 0) + 1);
    }
  }

  // RPE inserito dall'atleta per ciascuna sessione (feedback lato coach).
  const rpeBySession = new Map<string, number>();
  if (sessions.length > 0) {
    const { data: logRows } = await supabase
      .from("session_logs")
      .select("session_id, rpe_actual")
      .eq("athlete_id", week.athlete_id)
      .in("session_id", sessions.map((s) => s.id));
    for (const r of (logRows ?? []) as unknown as { session_id: string; rpe_actual: number | null }[]) {
      if (r.rpe_actual != null) rpeBySession.set(r.session_id, r.rpe_actual);
    }
  }

  const dates = weekDates(week.week_start);
  const daysWithSessions = new Set(sessions.map((s) => s.day_of_week)).size;
  const athName = ath?.full_name ?? ath?.email ?? "atleta";
  const isPublished = week.status === "published";

  return (
    <div className="wrap-tight">
      <CoachNav
        label="EDITOR"
        crumbs={[
          { href: "/coach/atleti", label: "Atleti" },
          { href: `/coach/atleta/${week.athlete_id}`, label: athName },
          {
            href: `/coach/atleta/${week.athlete_id}/griglia?w=${week.week_start.slice(0, 10)}`,
            label: weekLabel(week.week_start),
          },
          { label: "Editor classico" },
        ]}
      />

      {published ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Tabella pubblicata — ora è visibile all&apos;atleta
          {notify ? <span style={{ marginLeft: 8, opacity: 0.85 }}>· {notify}</span> : null}
        </div>
      ) : null}
      {unpublished ? (
        <div className="pill warn" style={{ marginBottom: 16 }}>
          Tabella ritirata — tornata in bozza, non più visibile all&apos;atleta
        </div>
      ) : null}
      {saved ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Nota salvata
        </div>
      ) : null}
      {structuring ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✨ Strutturazione AI avviata — gli step compaiono tra circa un minuto (ricarica la
          pagina); se l&apos;atleta è collegato, gli allenamenti aggiornati ripartono da soli verso
          l&apos;orologio
        </div>
      ) : null}
      {imported ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Settimana importata — controlla e arricchisci le sessioni
        </div>
      ) : null}

      {/* ---- testata + pubblicazione (nome NON modificabile = weekNN) ---- */}
      <div className="hero">
        <div>
          <span className="mono">
            // {athName} · {fmtRange(week.week_start)}
          </span>
          <h1>
            {weekLabel(week.week_start)}
            <em>.</em>
          </h1>
          <div style={{ marginTop: 10 }}>
            {isPublished ? (
              <span className="pill ok">✓ Disponibile a {athName}</span>
            ) : (
              <span className="pill warn">Bozza — non ancora visibile all&apos;atleta</span>
            )}
          </div>
        </div>
        <div className="hero-actions">
          <Link
            className="btn btn-subtle"
            href={`/coach/atleta/${week.athlete_id}/griglia?w=${week.week_start.slice(0, 10)}`}
          >
            ▦ Griglia
          </Link>
          <form action={structureWeekAction}>
            <input type="hidden" name="wk_id" value={week.id} />
            <input type="hidden" name="force" value="1" />
            <button
              className="btn btn-subtle"
              type="submit"
              title="Converte le sedute in testo libero in step strutturati (intervalli e target) per l'orologio. Gli step scritti a mano nel builder non vengono toccati."
            >
              ✨ Struttura per l&apos;orologio (AI)
            </button>
          </form>
          {isPublished ? (
            <form action={unpublishWeek}>
              <input type="hidden" name="wk_id" value={week.id} />
              <button className="btn btn-subtle" type="submit">
                Ritira (torna a bozza)
              </button>
            </form>
          ) : (
            <form action={publishWeek}>
              <input type="hidden" name="wk_id" value={week.id} />
              <button className="btn btn-primary btn-lg" type="submit">
                ✓ Pubblica · rendi disponibile a {athName}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* nota della settimana (salvataggio indipendente dalla pubblicazione) */}
      <form action={saveWeek}>
        <input type="hidden" name="wk_id" value={week.id} />
        <div className="card">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Nota della settimana (visibile all&apos;atleta)</label>
            <textarea
              className="input"
              name="wk_comment"
              rows={2}
              defaultValue={week.coach_comment ?? ""}
              placeholder="Nota visibile all'atleta…"
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-subtle btn-sm" type="submit">
              Salva nota
            </button>
          </div>
        </div>
      </form>

      {/* ---- i 7 giorni della settimana ---- */}
      <h2 className="sec">
        <span className="l">Allenamenti</span>
        <span className="mono">
          {sessions.length} in {daysWithSessions} giorni
        </span>
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {dates.map((date, d) => {
          const items = sessions.filter((s) => s.day_of_week === d);
          return (
            <div className="card day-card" key={d}>
              <div className="day-card-head">
                <div className="day-card-date">
                  <span className="mono">{GIORNI_SHORT[d]}</span>
                  <strong>
                    {date.getDate()} {MESI_SHORT[date.getMonth()]}
                  </strong>
                </div>
                <form action={addSession}>
                  <input type="hidden" name="wk_id" value={week.id} />
                  <input type="hidden" name="add_day" value={d} />
                  <button className="btn btn-ghost btn-sm" type="submit">
                    + Aggiungi allenamento
                  </button>
                </form>
              </div>

              {items.length === 0 ? (
                <div className="day-empty">Riposo</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  {items.map((s) => {
                    const disc = DISC[s.discipline] ?? DISC.other;
                    const n = stepCount.get(s.id) ?? 0;
                    return (
                      <div className="sess-row" key={s.id}>
                        <span className={`disc ${disc.cls}`}>
                          {disc.sym} {disc.label}
                        </span>
                        <div className="sess-row-main">
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <strong>{s.title ?? disc.label}</strong>
                            {s.volume_value ? (
                              <span className="mono">{s.volume_value}</span>
                            ) : null}
                            {n > 0 ? (
                              <span className="pill ok pill-plain">{n} step · pronto Garmin</span>
                            ) : (
                              <span className="pill warn pill-plain">da costruire</span>
                            )}
                            {rpeBySession.has(s.id) ? (
                              <span
                                className="pill pill-plain"
                                style={{ background: "rgba(251,191,36,.15)", color: "var(--amber, #fbbf24)" }}
                                title="RPE inserito dall'atleta"
                              >
                                RPE {rpeBySession.get(s.id)}
                              </span>
                            ) : null}
                          </div>
                          {s.raw_text ? <div className="sess-raw">{s.raw_text}</div> : null}
                        </div>
                        <div className="sess-row-actions">
                          <Link className="btn btn-subtle btn-sm" href={`/coach/sessione/${s.id}`}>
                            {n > 0 ? "✎ Modifica" : "⚙ Costruisci"}
                          </Link>
                          <form action={deleteSession}>
                            <input type="hidden" name="session_id" value={s.id} />
                            <input type="hidden" name="week_id" value={week.id} />
                            <ConfirmButton
                              message="Eliminare questo allenamento?"
                              className="btn btn-subtle btn-sm"
                              style={{ color: "var(--rose)" }}
                            >
                              ✕
                            </ConfirmButton>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <form action={deleteWeek}>
          <input type="hidden" name="week_id" value={week.id} />
          <ConfirmButton
            message={`Eliminare la tabella ${weekLabel(week.week_start)} e tutti i suoi allenamenti? L'operazione non è reversibile.`}
            className="btn btn-ghost btn-sm"
            style={{ color: "var(--rose)" }}
          >
            🗑 Elimina questa tabella
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
