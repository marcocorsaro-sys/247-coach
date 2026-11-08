"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { createWeek, publishAllWeeks, toggleWeekPublish, sendWeekNotice } from "./actions";
import { duplicateWeek, deleteWeek } from "@/app/coach/settimana/[id]/actions";
import ConfirmButton from "@/components/ConfirmButton";
import { weekLabel, fmtRange, mondayOf, toISODate, addDays } from "@/lib/training/weeks";

const DISC_COLOR: Record<string, string> = {
  swim: "var(--cyan)",
  bike: "var(--amber)",
  run: "var(--lime)",
  athletics: "var(--violet)",
  other: "var(--text-3)",
};
const GIORNI_MINI = ["L", "M", "M", "G", "V", "S", "D"];
const GIORNI_FULL = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const STATUS_LABEL: Record<string, string> = {
  draft: "Bozza",
  published: "Pubblicata",
  archived: "Archiviata",
};

export interface WeekItem {
  id: string;
  week_start: string;
  status: string;
  byDay: Record<number, string[]>;
}

function WeekPreview({ byDay }: { byDay: Record<number, string[]> }) {
  return (
    <div className="wk-preview">
      {[0, 1, 2, 3, 4, 5, 6].map((d) => {
        const ds = byDay[d] ?? [];
        return (
          <div key={d} className="wk-day" title={GIORNI_FULL[d]}>
            <span className="wk-dl">{GIORNI_MINI[d]}</span>
            <div className="wk-dots">
              {ds.length > 0 ? (
                ds.map((disc, i) => (
                  <i key={i} style={{ background: DISC_COLOR[disc] ?? "var(--text-3)" }} />
                ))
              ) : (
                <i className="empty" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function WeeksPanel({
  athleteId,
  weeks,
}: {
  athleteId: string;
  weeks: WeekItem[];
}) {
  const thisMonday = toISODate(mondayOf(new Date()));
  const [weekStart, setWeekStart] = useState(thisMonday);
  const dateRef = useRef<HTMLInputElement>(null);

  const openCalendar = () => {
    const el = dateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  // Anteprima della settimana scelta (qualunque giorno → la sua settimana lun→dom).
  const previewMonday = weekStart ? toISODate(mondayOf(weekStart)) : "";

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const w of weeks) set.add(new Date(w.week_start).getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [weeks]);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(
    years.includes(currentYear) ? currentYear : (years[0] ?? currentYear),
  );

  const shown = weeks.filter((w) => new Date(w.week_start).getFullYear() === year);
  const draftCount = weeks.filter((w) => w.status === "draft").length;
  const lastWeekId = weeks[0]?.id;

  return (
    <>
      {/* crea / importa */}
      <div className="card" style={{ marginBottom: 14 }}>
        <form
          action={createWeek}
          style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <input type="hidden" name="athlete_id" value={athleteId} />
          <div className="field" style={{ width: 170 }}>
            <label className="label">Settimana da creare</label>
            <input
              ref={dateRef}
              className="input"
              type="date"
              name="week_start"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-subtle btn-sm"
            onClick={openCalendar}
            style={{ marginBottom: 2 }}
          >
            📅 Calendario
          </button>
          <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setWeekStart(thisMonday)}
            >
              Questa
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setWeekStart(toISODate(addDays(mondayOf(new Date()), 7)))}
            >
              Prossima
            </button>
          </div>
          <button className="btn btn-primary" type="submit" style={{ marginBottom: 2 }}>
            + Crea tabella
          </button>
        </form>
        {previewMonday ? (
          <div className="mono" style={{ color: "var(--text-2)", fontSize: ".8rem", marginTop: 8 }}>
            → {weekLabel(previewMonday)} · {fmtRange(previewMonday)}
            {weeks.some((w) => w.week_start.slice(0, 10) === previewMonday) ? (
              <span style={{ color: "var(--amber)" }}> · esiste già, aprirò quella</span>
            ) : null}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <Link className="btn btn-subtle btn-sm" href={`/coach/importa?athlete=${athleteId}`}>
            ↑ Importa da Excel
          </Link>
          {lastWeekId ? (
            <form action={duplicateWeek}>
              <input type="hidden" name="week_id" value={lastWeekId} />
              <button className="btn btn-ghost btn-sm" type="submit">
                ⧉ Duplica ultima
              </button>
            </form>
          ) : null}
          {draftCount > 0 ? (
            <form action={publishAllWeeks} style={{ marginLeft: "auto" }}>
              <input type="hidden" name="athlete_id" value={athleteId} />
              <button className="btn btn-subtle btn-sm" type="submit" style={{ color: "var(--lime)" }}>
                ✓ Pubblica tutte ({draftCount})
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessuna tabella. Crea una settimana o importa l&apos;Excel di Irene.
        </div>
      ) : (
        <>
          {/* tab anni */}
          {years.length > 1 ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`btn btn-sm ${y === year ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {shown.map((w) => (
              <div className="card week-row" key={w.id}>
                <div className="week-row-main">
                  <div>
                    <Link
                      href={`/coach/atleta/${athleteId}/griglia?w=${w.week_start.slice(0, 10)}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <strong style={{ fontSize: "1.02rem" }}>{weekLabel(w.week_start)}</strong>
                    </Link>
                    <div className="mono" style={{ marginTop: 6, color: "var(--text-2)" }}>
                      {fmtRange(w.week_start)}
                    </div>
                  </div>
                  <WeekPreview byDay={w.byDay} />
                </div>
                <div className="week-row-side">
                  <span
                    className={`pill ${w.status === "published" ? "ok" : w.status === "draft" ? "warn" : "pill-plain"}`}
                  >
                    {STATUS_LABEL[w.status] ?? w.status}
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link
                      className="btn btn-primary btn-sm"
                      href={`/coach/atleta/${athleteId}/griglia?w=${w.week_start.slice(0, 10)}`}
                    >
                      ▦ Griglia
                    </Link>
                    <Link className="btn btn-subtle btn-sm" href={`/coach/settimana/${w.id}`}>
                      ⚙ Editor
                    </Link>
                    <form action={toggleWeekPublish}>
                      <input type="hidden" name="athlete_id" value={athleteId} />
                      <input type="hidden" name="week_id" value={w.id} />
                      <input type="hidden" name="publish" value={w.status === "published" ? "0" : "1"} />
                      <button className="btn btn-ghost btn-sm" type="submit">
                        {w.status === "published" ? "Ritira" : "Pubblica"}
                      </button>
                    </form>
                    <form action={sendWeekNotice}>
                      <input type="hidden" name="athlete_id" value={athleteId} />
                      <input type="hidden" name="week_id" value={w.id} />
                      <button
                        className="btn btn-ghost btn-sm"
                        type="submit"
                        title="Invia all'atleta un'email che annuncia questa tabella"
                      >
                        ✉ Avvisa
                      </button>
                    </form>
                    <form action={duplicateWeek}>
                      <input type="hidden" name="week_id" value={w.id} />
                      <button className="btn btn-ghost btn-sm" type="submit">
                        ⧉ Duplica
                      </button>
                    </form>
                    <form action={deleteWeek}>
                      <input type="hidden" name="week_id" value={w.id} />
                      <ConfirmButton
                        message={`Eliminare la tabella ${weekLabel(w.week_start)} e tutti i suoi allenamenti? L'operazione non è reversibile.`}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--rose)" }}
                      >
                        🗑 Elimina
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
