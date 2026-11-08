"use client";

import { useRef, useState, useTransition } from "react";
import RouteTrace from "@/components/RouteTrace";
import { type Discipline, type Fitness } from "@/lib/training/zones";
import {
  describeSteps,
  totalSeconds,
  workoutProfile,
  intensityColor,
  type StepLite,
} from "@/lib/training/describe";
import { fmtDuration } from "@/lib/training/workouts";
import { type StravaActivityFull } from "@/lib/strava/format";
import StravaActivityCard from "@/components/StravaActivityCard";
import { useT, useAppLang } from "@/components/AppLang";
import type { TFn } from "@/lib/app-i18n";
import { toggleSessionDone, pickVacationWorkout, toggleVacationDone, setSessionRpe, setSessionSkipped, setSessionNote } from "./actions";

const STRAVA_ORANGE = "#fc4c02";

const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const GIORNI_MINI = ["L", "M", "M", "G", "V", "S", "D"];
const GIORNI_MINI_EN = ["M", "T", "W", "T", "F", "S", "S"];
const MESI_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

const DISC_BASE: Record<string, { cls: string; label: string; sym: string }> = {
  swim: { cls: "disc-swim", label: "Nuoto", sym: "●" },
  bike: { cls: "disc-bike", label: "Bici", sym: "◆" },
  run: { cls: "disc-run", label: "Corsa", sym: "▲" },
  athletics: { cls: "disc-ath", label: "Forza", sym: "✦" },
  other: { cls: "disc-rest", label: "Altro", sym: "○" },
};

/** Disciplina con etichetta tradotta. */
function discOf(code: string, t: TFn) {
  const d = DISC_BASE[code] ?? DISC_BASE.other;
  return { ...d, label: t(d.label) };
}

export interface SessionRoute {
  name: string;
  distance_km: number;
  elevation_m: number;
  typical_minutes: number | null;
  times_done: number;
  terrain: string | null;
  points: [number, number][];
  note: string | null;
}

export interface DaySession {
  id: string;
  day_of_week: number;
  discipline: string;
  title: string | null;
  volume_value: string | null;
  raw_text: string | null;
  notes: string | null;
  route?: SessionRoute | null;
}

export interface VacationOption {
  id: string;
  title: string;
  intensity_label: string | null;
  volume_value: string | null;
  description: string | null;
}

export interface VacationSlot {
  dayId: string;
  discipline: string;
  note: string | null;
  options: VacationOption[];
  pickedWorkoutId: string | null;
  done: boolean;
}

/** Profilo intensità dell'allenamento: barre colorate (verde→rosa). */
function WorkoutProfile({ steps }: { steps: StepLite[] }) {
  const t = useT();
  const segs = workoutProfile(steps);
  if (segs.length < 2) return null; // con un solo blocco non racconta nulla
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height: 60,
          padding: "0 2px",
        }}
      >
        {segs.map((s, i) => (
          <div
            key={i}
            style={{
              flexGrow: Math.max(1, s.sec),
              flexBasis: 0,
              minWidth: 3,
              height: `${Math.round(16 + s.intensity * 84)}%`,
              background: intensityColor(s.intensity),
              borderRadius: "3px 3px 0 0",
              opacity: 0.92,
            }}
          />
        ))}
      </div>
      <div className="mono" style={{ color: "var(--text-2)", fontSize: ".68rem", marginTop: 4 }}>
        {t("intensità: facile → massimale")}
      </div>
    </div>
  );
}

/**
 * L'RPE in-app esiste solo su 24/7 Coach (serve alla revisione settimanale
 * del coach AI). Nell'app di Irene gli atleti annotano le sensazioni su
 * Garmin Connect/Strava come da sua indicazione.
 */
const SHOW_RPE = process.env.NEXT_PUBLIC_APP_MODE === "ai_coach";

/** Selettore RPE percepito (1–10) per una sessione svolta. */
function RpeControl({
  sessionId,
  initial,
  readOnly,
}: {
  sessionId: string;
  initial: number | null;
  readOnly: boolean;
}) {
  const t = useT();
  const [rpe, setRpe] = useState<number | null>(initial);
  const [pending, startTransition] = useTransition();

  if (readOnly) {
    return rpe != null ? (
      <div style={{ marginTop: 10 }}>
        <span className="pill" style={{ background: "rgba(251,191,36,.15)" }}>RPE {rpe}/10</span>
      </div>
    ) : null;
  }

  const choose = (v: number | null) => {
    setRpe(v);
    startTransition(() => {
      void setSessionRpe(sessionId, v);
    });
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ color: "var(--text-2)", fontSize: ".92rem", fontWeight: 600, marginBottom: 6 }}>
        {t("Come l'hai sentita? (RPE 1–10)")}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
          const sel = rpe === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => choose(sel ? null : n)}
              disabled={pending}
              aria-pressed={sel}
              style={{
                minWidth: 34,
                padding: "6px 0",
                borderRadius: 8,
                border: sel ? "1px solid var(--amber, #fbbf24)" : "1px solid var(--line)",
                background: sel ? "rgba(251,191,36,.18)" : "transparent",
                color: sel ? "var(--amber, #fbbf24)" : "var(--text-2)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepBlocks({
  steps,
  discipline,
  fitness,
}: {
  steps: StepLite[];
  discipline: Discipline;
  fitness: Fitness;
}) {
  const blocks = describeSteps(steps, discipline, fitness);
  if (blocks.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 14 }}>
      {blocks.map((b, i) =>
        b.children ? (
          <div key={i} style={{ borderLeft: "3px solid var(--lime)", paddingLeft: 14, margin: "6px 0" }}>
            <div
              style={{
                color: "var(--lime)",
                fontWeight: 800,
                fontSize: "1rem",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "baseline",
              }}
            >
              <span>{b.label}</span>
              {b.detail ? <span className="mono-data">{b.detail}</span> : null}
            </div>
            {b.children.map((c, j) => (
              <div key={j} className="step-row">
                <span>{c.label}</span>
                <span className="mono-data" style={{ textAlign: "right" }}>{c.detail}</span>
              </div>
            ))}
          </div>
        ) : (
          <div key={i} className="step-row">
            <span style={{ fontWeight: 600 }}>{b.label}</span>
            <span className="mono-data" style={{ textAlign: "right" }}>{b.detail}</span>
          </div>
        ),
      )}
    </div>
  );
}

function dayDate(weekStartISO: string, d: number): Date {
  const [y, m, dd] = weekStartISO.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, dd ?? 1);
  dt.setDate(dt.getDate() + d);
  return dt;
}

/** Card di scelta per un giorno di ferie: l'atleta sceglie dal roaster. */
function VacationPicker({ slot, readOnly }: { slot: VacationSlot; readOnly: boolean }) {
  const t = useT();
  const disc = discOf(slot.discipline, t);
  const [picked, setPicked] = useState<string | null>(slot.pickedWorkoutId);
  const [done, setDone] = useState<boolean>(slot.done);
  const [pending, startTransition] = useTransition();

  const choose = (workoutId: string) => {
    const next = picked === workoutId ? "" : workoutId;
    setPicked(next || null);
    startTransition(() => {
      void pickVacationWorkout(slot.dayId, next);
    });
  };
  const toggle = () => {
    const next = !done;
    setDone(next);
    startTransition(() => {
      void toggleVacationDone(slot.dayId, next);
    });
  };

  return (
    <div
      className="card"
      style={{
        borderTop: "3px solid var(--violet, #a78bfa)",
        background: done ? "rgba(163,230,53,.06)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className={`disc ${disc.cls}`}>
          {disc.sym} {disc.label}
        </span>
        <span className="pill" style={{ background: "rgba(167,139,250,.15)" }}>{t("Ferie · scegli tu")}</span>
      </div>
      {slot.note ? (
        <p style={{ fontSize: ".9rem", color: "var(--text-2)", marginTop: 8 }}>{slot.note}</p>
      ) : null}

      {slot.options.length === 0 ? (
        <p style={{ color: "var(--text-2)", marginTop: 10, fontSize: ".9rem" }}>
          {t("Il coach non ha ancora inserito allenamenti {disc} nel menu.", { disc: disc.label.toLowerCase() })}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {slot.options.map((o) => {
            const sel = picked === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => !readOnly && choose(o.id)}
                disabled={readOnly || pending}
                className="card"
                style={{
                  textAlign: "left",
                  cursor: readOnly ? "default" : "pointer",
                  border: sel ? "1px solid var(--lime)" : "1px solid var(--line)",
                  background: sel ? "rgba(163,230,53,.10)" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <strong>{sel ? "✓ " : ""}{o.title}</strong>
                  {o.volume_value ? (
                    <span className="mono" style={{ color: "var(--text-2)" }}>{o.volume_value}</span>
                  ) : null}
                </div>
                {o.intensity_label ? (
                  <div className="mono" style={{ color: "var(--text-2)", fontSize: ".8rem", marginTop: 2 }}>
                    {o.intensity_label}
                  </div>
                ) : null}
                {o.description ? (
                  <p style={{ fontSize: ".88rem", lineHeight: 1.5, marginTop: 6, whiteSpace: "pre-wrap" }}>
                    {o.description}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {!readOnly && picked ? (
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className={done ? "btn btn-primary btn-sm" : "btn btn-subtle btn-sm"}
            aria-pressed={done}
          >
            {done ? t("✓ Svolto") : t("Segna come svolto")}
          </button>
        </div>
      ) : null}
      {readOnly && done ? (
        <div style={{ marginTop: 14 }}>
          <span className="pill ok">{t("✓ Svolto")}</span>
        </div>
      ) : null}
    </div>
  );
}

/** La nota che l'atleta ha scritto su una seduta (svolta o no). */
function NoteLine({ note }: { note: string }) {
  const t = useT();
  return (
    <p style={{ marginTop: 10, fontSize: ".9rem", lineHeight: 1.5, whiteSpace: "pre-wrap", color: "var(--text-2)" }}>
      <span className="mono" style={{ fontSize: ".72rem", marginRight: 6 }}>{t("NOTA")}</span>«{note}»
    </p>
  );
}

/** Riquadro "non svolto" con il motivo scritto dall'atleta. */
function SkippedNote({ note }: { note: string }) {
  const t = useT();
  return (
    <div style={{ marginTop: 14 }}>
      <span className="pill warn">{t("✗ Non svolto")}</span>
      {note ? (
        <p style={{ marginTop: 8, fontSize: ".9rem", lineHeight: 1.5, whiteSpace: "pre-wrap", color: "var(--text-2)" }}>
          «{note}»
        </p>
      ) : null}
    </div>
  );
}

export default function AthleteWeek({
  weekStart,
  todayIdx,
  sessions,
  stepsBySession,
  doneIds,
  rpeById = {},
  skippedNotes = {},
  notesById = {},
  fitness,
  stravaByDay = {},
  vacationByDay = {},
  readOnly = false,
}: {
  weekStart: string;
  todayIdx: number;
  sessions: DaySession[];
  stepsBySession: Record<string, StepLite[]>;
  doneIds: string[];
  rpeById?: Record<string, number>;
  /** Sedute segnate "non svolte": id → motivo scritto dall'atleta ("" se nessuno). */
  skippedNotes?: Record<string, string>;
  /** Note scritte dall'atleta sulle sedute non "non svolte": id → testo. */
  notesById?: Record<string, string>;
  fitness: Fitness;
  stravaByDay?: Record<number, StravaActivityFull[]>;
  vacationByDay?: Record<number, VacationSlot[]>;
  readOnly?: boolean;
}) {
  const t = useT();
  const lang = useAppLang();
  const giorni = GIORNI.map((g) => t(g));
  const giorniMini = lang === "en" ? GIORNI_MINI_EN : GIORNI_MINI;
  const mesiShort = MESI_SHORT.map((m) => t(m));
  const daysWith = new Set(sessions.map((s) => s.day_of_week));
  const daysWithStrava = new Set(Object.keys(stravaByDay).map(Number).filter((d) => (stravaByDay[d]?.length ?? 0) > 0));
  const daysWithVacation = new Set(Object.keys(vacationByDay).map(Number).filter((d) => (vacationByDay[d]?.length ?? 0) > 0));
  const firstWith = sessions[0]?.day_of_week ?? 0;
  const [day, setDay] = useState<number>(todayIdx >= 0 ? todayIdx : firstWith);
  const [done, setDone] = useState<Set<string>>(() => new Set(doneIds));
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set(Object.keys(skippedNotes)));
  const [notes, setNotes] = useState<Record<string, string>>(() => ({ ...notesById, ...skippedNotes }));
  const [asking, setAsking] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const touchX = useRef<number | null>(null);

  // giorni in cui tutte le sessioni sono state svolte
  const fullyDoneDays = new Set(
    [...daysWith].filter((d) =>
      sessions.filter((s) => s.day_of_week === d).every((s) => done.has(s.id)),
    ),
  );

  const setNoteLocal = (sessionId: string, text: string) =>
    setNotes((prev) => {
      const copy = { ...prev };
      if (text) copy[sessionId] = text;
      else delete copy[sessionId];
      return copy;
    });

  const saveSkipped = (sessionId: string) => {
    const note = draft.trim();
    setSkipped((prev) => new Set(prev).add(sessionId));
    setNoteLocal(sessionId, note);
    setDone((prev) => {
      const copy = new Set(prev);
      copy.delete(sessionId);
      return copy;
    });
    setAsking(null);
    setDraft("");
    startTransition(() => {
      void setSessionSkipped(sessionId, note || null);
    });
  };

  const undoSkipped = (sessionId: string) => {
    setSkipped((prev) => {
      const copy = new Set(prev);
      copy.delete(sessionId);
      return copy;
    });
    setNoteLocal(sessionId, "");
    startTransition(() => {
      void toggleSessionDone(sessionId, false);
    });
  };

  const toggleDone = (sessionId: string) => {
    const next = !done.has(sessionId);
    if (next && skipped.has(sessionId)) {
      // Segnare "svolto" annulla il "non svolto": il motivo non vale più.
      setSkipped((prev) => {
        const copy = new Set(prev);
        copy.delete(sessionId);
        return copy;
      });
      setNoteLocal(sessionId, "");
    }
    setDone((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(sessionId);
      else copy.delete(sessionId);
      return copy;
    });
    startTransition(() => {
      void toggleSessionDone(sessionId, next);
    });
  };

  const openNote = (sessionId: string) => {
    setEditingNote(editingNote === sessionId ? null : sessionId);
    setNoteDraft(notes[sessionId] ?? "");
  };

  const saveNote = (sessionId: string) => {
    const text = noteDraft.trim();
    setNoteLocal(sessionId, text);
    setEditingNote(null);
    setNoteDraft("");
    startTransition(() => {
      void setSessionNote(sessionId, text || null);
    });
  };

  const go = (delta: number) => setDay((d) => Math.max(0, Math.min(6, d + delta)));

  const items = sessions.filter((s) => s.day_of_week === day);
  const stravaItems = stravaByDay[day] ?? [];
  const vacationItems = vacationByDay[day] ?? [];
  const sel = dayDate(weekStart, day);

  return (
    <div>
      {/* striscia giorni */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((d) => {
          const isSel = d === day;
          const isToday = d === todayIdx;
          const has = daysWith.has(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={`day-chip${isSel ? " sel" : ""}${isToday ? " today" : ""}`}
            >
              <div className="dn">{giorniMini[d]}</div>
              <div className="dd">{dayDate(weekStart, d).getDate()}</div>
              <div
                style={{
                  height: 8,
                  fontSize: ".6rem",
                  lineHeight: 1,
                  color: "var(--lime)",
                  display: "flex",
                  gap: 3,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {has ? (
                  fullyDoneDays.has(d) ? (
                    <span>✓</span>
                  ) : (
                    <i
                      style={{
                        display: "inline-block",
                        width: 5,
                        height: 5,
                        borderRadius: 5,
                        background: "var(--lime)",
                      }}
                    />
                  )
                ) : null}
                {daysWithStrava.has(d) ? (
                  <i
                    style={{
                      display: "inline-block",
                      width: 5,
                      height: 5,
                      borderRadius: 5,
                      background: STRAVA_ORANGE,
                    }}
                  />
                ) : null}
                {daysWithVacation.has(d) ? (
                  <i
                    style={{
                      display: "inline-block",
                      width: 5,
                      height: 5,
                      borderRadius: 5,
                      background: "var(--violet, #a78bfa)",
                    }}
                  />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* giorno selezionato */}
      <div
        onTouchStart={(e) => {
          touchX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
          if (dx <= -50) go(1);
          else if (dx >= 50) go(-1);
          touchX.current = null;
        }}
        style={{ marginTop: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 12px" }}>
          <button
            type="button"
            className="btn btn-subtle"
            onClick={() => go(-1)}
            disabled={day === 0}
            aria-label={t("Giorno precedente")}
          >
            ‹
          </button>
          <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className="day-title">
              {giorni[day]} {sel.getDate()} {mesiShort[sel.getMonth()]}
            </span>
            {day === todayIdx ? <span className="pill ok">{t("oggi")}</span> : null}
          </div>
          <button
            type="button"
            className="btn btn-subtle"
            onClick={() => go(1)}
            disabled={day === 6}
            aria-label={t("Giorno successivo")}
          >
            ›
          </button>
        </div>

        {items.length === 0 && stravaItems.length === 0 && vacationItems.length === 0 ? (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{t("Riposo 🌙")}</div>
            <div style={{ color: "var(--text-2)", marginTop: 6 }}>
              {t("Nessun allenamento in programma.")}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {vacationItems.map((slot) => (
              <VacationPicker key={slot.dayId} slot={slot} readOnly={readOnly} />
            ))}
            {items.map((s) => {
              const disc = discOf(s.discipline, t);
              const steps = stepsBySession[s.id] ?? [];
              const tot = totalSeconds(steps);
              const isDone = done.has(s.id);
              const isSkipped = skipped.has(s.id);
              return (
                <div
                  className="card"
                  key={s.id}
                  style={{
                    borderTop: "3px solid var(--lime)",
                    opacity: isDone ? 0.92 : 1,
                    background: isDone ? "rgba(163,230,53,.06)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span className={`disc ${disc.cls}`}>
                      {disc.sym} {disc.label}
                    </span>
                    {/* Titolo come su Garmin: durata totale · titolo (lo sport è nel chip). */}
                    <strong className="sess-title" style={{ fontSize: "1.2rem", letterSpacing: "-.3px" }}>
                      {[
                        tot > 0 ? fmtDuration(tot) : s.volume_value?.trim() || "",
                        s.title?.trim() || "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || disc.label}
                    </strong>
                  </div>
                  {s.notes ? <p className="wk-note">{s.notes}</p> : null}
                  {s.route ? (
                    <div className="route-box">
                      <RouteTrace points={s.route.points} />
                      <div className="route-info">
                        <div className="mono">{t("Percorso suggerito")}</div>
                        <strong>{s.route.name}</strong>
                        <div className="route-stats">
                          <span>{s.route.distance_km} km</span>
                          <span>D+{s.route.elevation_m}</span>
                          {s.route.typical_minutes ? <span>~{Math.round(s.route.typical_minutes)}&apos;</span> : null}
                          <span>{t("fatto {n}x", { n: s.route.times_done })}</span>
                        </div>
                        {s.route.note ? <p className="route-note">{s.route.note}</p> : null}
                      </div>
                    </div>
                  ) : null}
                  {steps.length > 0 ? (
                    <>
                      <WorkoutProfile steps={steps} />
                      <StepBlocks steps={steps} discipline={s.discipline as Discipline} fitness={fitness} />
                    </>
                  ) : !s.notes && s.raw_text ? (
                    <p className="wk-note">{s.raw_text}</p>
                  ) : null}
                  {readOnly && !isSkipped && notes[s.id] ? <NoteLine note={notes[s.id]!} /> : null}
                  {readOnly ? (
                    isDone ? (
                      <>
                        <div style={{ marginTop: 14 }}>
                          <span className="pill ok">{t("✓ Svolto")}</span>
                        </div>
                        {SHOW_RPE ? (
                          <RpeControl sessionId={s.id} initial={rpeById[s.id] ?? null} readOnly />
                        ) : null}
                      </>
                    ) : isSkipped ? (
                      <SkippedNote note={notes[s.id] ?? ""} />
                    ) : null
                  ) : (
                    <>
                      {isSkipped ? (
                        <>
                          <SkippedNote note={notes[s.id] ?? ""} />
                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <button type="button" className="btn btn-subtle btn-sm" disabled={pending} onClick={() => toggleDone(s.id)}>
                              {t("L'ho fatto: segna come svolto")}
                            </button>
                            <button type="button" className="btn btn-subtle btn-sm" disabled={pending} onClick={() => openNote(s.id)}>
                              {t("Modifica motivo")}
                            </button>
                            <button type="button" className="btn btn-subtle btn-sm" disabled={pending} onClick={() => undoSkipped(s.id)}>
                              {t("Annulla")}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => toggleDone(s.id)}
                            disabled={pending}
                            className={isDone ? "btn btn-primary" : "btn btn-subtle"}
                            aria-pressed={isDone}
                          >
                            {isDone ? t("✓ Svolto") : t("Segna come svolto")}
                          </button>
                          {isDone ? (
                            <span style={{ color: "var(--lime)", fontSize: ".88rem", fontWeight: 600 }}>
                              {t("completato")}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-subtle"
                              disabled={pending}
                              onClick={() => {
                                setAsking(asking === s.id ? null : s.id);
                                setDraft(notes[s.id] ?? "");
                              }}
                            >
                              {t("Non svolto")}
                            </button>
                          )}
                          <button type="button" className="btn btn-subtle" disabled={pending} onClick={() => openNote(s.id)}>
                            {notes[s.id] ? t("Modifica nota") : t("Nota")}
                          </button>
                        </div>
                      )}
                      {!isSkipped && editingNote !== s.id && notes[s.id] ? <NoteLine note={notes[s.id]!} /> : null}
                      {editingNote === s.id ? (
                        <div style={{ marginTop: 12 }}>
                          <label className="mono" style={{ fontSize: ".78rem", color: "var(--text-2)", display: "block", marginBottom: 6 }}>
                            {SHOW_RPE ? (isSkipped ? t("Il motivo. Lo legge il coach.") : t("Una nota per il coach su questa seduta.")) : isSkipped ? t("Il motivo. Lo legge Irene.") : t("Una nota per Irene su questa seduta.")}
                          </label>
                          <textarea
                            className="input"
                            rows={3}
                            maxLength={500}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder={t("Es. come ti sei sentito, un dolore, cosa hai cambiato…")}
                            style={{ width: "100%" }}
                          />
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => saveNote(s.id)}>
                              {t("Salva")}
                            </button>
                            <button type="button" className="btn btn-subtle btn-sm" onClick={() => { setEditingNote(null); setNoteDraft(""); }}>
                              {t("Annulla")}
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {asking === s.id && !isSkipped ? (
                        <div style={{ marginTop: 12 }}>
                          <label className="mono" style={{ fontSize: ".78rem", color: "var(--text-2)", display: "block", marginBottom: 6 }}>
                            {SHOW_RPE ? t("Perché non l'hai fatto? Lo legge il coach.") : t("Perché non l'hai fatto? Lo legge Irene.")}
                          </label>
                          <textarea
                            className="input"
                            rows={3}
                            maxLength={500}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder={t("Es. ero stanco, lavoro, mi fa male il ginocchio…")}
                            style={{ width: "100%" }}
                          />
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => saveSkipped(s.id)}>
                              {t("Salva")}
                            </button>
                            <button type="button" className="btn btn-subtle btn-sm" onClick={() => { setAsking(null); setDraft(""); }}>
                              {t("Annulla")}
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {isDone && SHOW_RPE ? (
                        <RpeControl sessionId={s.id} initial={rpeById[s.id] ?? null} readOnly={false} />
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
            {stravaItems.map((a) => (
              <StravaActivityCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
