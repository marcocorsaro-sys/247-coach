"use client";

import { useState } from "react";
import { discMeta } from "@/lib/training/vacation";
import { fmtDuration } from "@/lib/training/workouts";
import { useT, useAppLang } from "@/components/AppLang";

export interface MonthItem {
  date: string; // yyyy-mm-dd
  kind: "session" | "vacation";
  discipline: string;
  title: string;
  detail: string | null;
  /** Durata stimata dagli step (secondi), se disponibile. */
  durationSec: number | null;
  done: boolean;
}

/** Durata leggibile da mostrare: volume scritto a mano oppure durata stimata. */
function itemDuration(it: MonthItem): string {
  if (it.detail?.trim()) return it.detail.trim();
  const d = fmtDuration(it.durationSec);
  return d ? `~${d}` : "";
}

const GIORNI_MINI = ["L", "M", "M", "G", "V", "S", "D"];
const GIORNI_MINI_EN = ["M", "T", "W", "T", "F", "S", "S"];
const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function isoOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function MonthCalendar({
  year,
  month,
  itemsByDate,
  todayISO,
  selected,
  onSelect,
}: {
  year: number;
  month: number; // 0-based
  itemsByDate: Record<string, MonthItem[]>;
  todayISO: string;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  const t = useT();
  const lang = useAppLang();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = lunedì
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="mono" style={{ color: "var(--text-2)", marginBottom: 10 }}>
        {t(MESI[month] ?? "")} {year}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {(lang === "en" ? GIORNI_MINI_EN : GIORNI_MINI).map((g, i) => (
          <div key={i} className="mono" style={{ textAlign: "center", fontSize: ".68rem", color: "var(--text-2)", paddingBottom: 4 }}>
            {g}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />;
          const iso = isoOf(year, month, d);
          const items = itemsByDate[iso] ?? [];
          const isToday = iso === todayISO;
          const isSel = iso === selected;
          const allDone = items.length > 0 && items.every((it) => it.done);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(iso)}
              className="card"
              style={{
                padding: "5px 4px",
                minHeight: 64,
                cursor: "pointer",
                textAlign: "left",
                border: isSel ? "1px solid var(--lime)" : "1px solid var(--line)",
                background: isSel ? "rgba(163,230,53,.10)" : items.length ? "rgba(255,255,255,.02)" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: ".82rem", fontWeight: 700, color: isToday ? "var(--lime)" : undefined }}>
                  {d}
                </span>
                {allDone ? <span style={{ fontSize: ".6rem", color: "var(--lime)" }}>✓</span> : null}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 3 }}>
                {items.slice(0, 2).map((it, j) => {
                  const m = discMeta(it.discipline);
                  const dur = itemDuration(it);
                  return (
                    <div
                      key={j}
                      title={`${it.title}${dur ? ` · ${dur}` : ""}`}
                      style={{
                        display: "flex",
                        gap: 2,
                        alignItems: "baseline",
                        fontSize: ".56rem",
                        lineHeight: 1.15,
                        color: it.done ? "var(--lime)" : "var(--text-2)",
                      }}
                    >
                      <span>{m.sym}</span>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {it.title}
                      </span>
                      {dur ? <span style={{ flexShrink: 0 }}>{dur}</span> : null}
                    </div>
                  );
                })}
                {items.length > 2 ? (
                  <span style={{ fontSize: ".55rem", color: "var(--text-2)" }}>
                    +{items.length - 2}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MonthGrid({
  itemsByDate,
  todayISO,
  prev,
  current,
  next,
  athleteId,
  addWorkout,
}: {
  itemsByDate: Record<string, MonthItem[]>;
  todayISO: string;
  prev: { year: number; month: number };
  current: { year: number; month: number };
  /** Mese successivo: le tabelle pubblicate in anticipo cadono spesso lì. */
  next?: { year: number; month: number };
  /** Solo lato coach: abilita l'inserimento allenamenti dal giorno selezionato. */
  athleteId?: string;
  addWorkout?: (formData: FormData) => void | Promise<void>;
}) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(todayISO);
  const selItems = selected ? itemsByDate[selected] ?? [] : [];
  const canAdd = Boolean(athleteId && addWorkout);

  const fmtSel = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${t(MESI[(m ?? 1) - 1] ?? "")} ${y}`;
  };

  return (
    <div>
      <MonthCalendar
        year={current.year}
        month={current.month}
        itemsByDate={itemsByDate}
        todayISO={todayISO}
        selected={selected}
        onSelect={setSelected}
      />
      {next ? (
        <MonthCalendar
          year={next.year}
          month={next.month}
          itemsByDate={itemsByDate}
          todayISO={todayISO}
          selected={selected}
          onSelect={setSelected}
        />
      ) : null}
      <MonthCalendar
        year={prev.year}
        month={prev.month}
        itemsByDate={itemsByDate}
        todayISO={todayISO}
        selected={selected}
        onSelect={setSelected}
      />

      {selected ? (
        <div className="card" style={{ borderTop: "3px solid var(--lime)" }}>
          <strong>{fmtSel(selected)}</strong>
          {selItems.length === 0 ? (
            <p style={{ color: "var(--text-2)", marginTop: 8 }}>{t("Riposo — nessun allenamento.")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {selItems.map((it, j) => {
                const m = discMeta(it.discipline);
                return (
                  <div key={j} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className={`disc ${m.cls}`}>{m.sym} {t(m.label)}</span>
                      <strong>{it.title}</strong>
                      {it.kind === "vacation" ? (
                        <span className="pill" style={{ background: "rgba(167,139,250,.15)" }}>{t("ferie")}</span>
                      ) : null}
                      {it.done ? <span className="pill ok" style={{ marginLeft: "auto" }}>{t("✓ svolto")}</span> : null}
                    </div>
                    {(() => {
                      const dur = fmtDuration(it.durationSec);
                      const meta = [it.detail?.trim(), dur ? `~${dur}` : ""].filter(Boolean).join(" · ");
                      return meta ? (
                        <span className="mono" style={{ color: "var(--text-2)", fontSize: ".82rem" }}>{meta}</span>
                      ) : null;
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {canAdd && selected ? (
            <form action={addWorkout} style={{ marginTop: 14 }}>
              <input type="hidden" name="athlete_id" value={athleteId} />
              <input type="hidden" name="date" value={selected} />
              <button className="btn btn-primary btn-sm" type="submit">
                {t("+ Aggiungi allenamento")}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
