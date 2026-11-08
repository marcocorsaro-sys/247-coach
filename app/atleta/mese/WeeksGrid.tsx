"use client";

import { useState } from "react";
import { discMeta } from "@/lib/training/vacation";
import { fmtDuration } from "@/lib/training/workouts";
import { useT, useAppLang } from "@/components/AppLang";
import type { MonthItem } from "./MonthGrid";

// Vista "rolling" di N settimane per la pianificazione del coach: ogni riga è
// una settimana (lun→dom), ogni cella un giorno con gli allenamenti in sintesi.

const GIORNI_MINI = ["L", "M", "M", "G", "V", "S", "D"];
const GIORNI_MINI_EN = ["M", "T", "W", "T", "F", "S", "S"];
const MESI_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MESI_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function itemDuration(it: MonthItem): string {
  if (it.detail?.trim()) return it.detail.trim();
  const d = fmtDuration(it.durationSec);
  return d ? `~${d}` : "";
}

/** Somma i giorni ISO di una settimana a partire dal lunedì. */
function daysOfWeek(mondayISO: string): { iso: string; date: number; month: number }[] {
  const [y, m, d] = mondayISO.split("-").map(Number);
  const out: { iso: string; date: number; month: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) + i);
    out.push({
      iso: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`,
      date: dt.getDate(),
      month: dt.getMonth(),
    });
  }
  return out;
}

/** Etichetta settimana: "7–13 lug" (o "28 giu – 4 lug" a cavallo di mese). */
function weekLabel(days: { date: number; month: number }[], short: string[] = MESI_SHORT): string {
  const a = days[0];
  const b = days[6];
  if (!a || !b) return "";
  const left = a.month === b.month ? `${a.date}` : `${a.date} ${short[a.month]}`;
  return `${left}–${b.date} ${short[b.month]}`;
}

export default function WeeksGrid({
  itemsByDate,
  todayISO,
  weekStarts,
}: {
  itemsByDate: Record<string, MonthItem[]>;
  todayISO: string;
  weekStarts: string[];
}) {
  const t = useT();
  const lang = useAppLang();
  const [selected, setSelected] = useState<string | null>(todayISO);
  const selItems = selected ? itemsByDate[selected] ?? [] : [];

  const fmtSel = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${t(MESI[(m ?? 1) - 1] ?? "")} ${y}`;
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {(lang === "en" ? GIORNI_MINI_EN : GIORNI_MINI).map((g, i) => (
          <div key={i} className="mono" style={{ textAlign: "center", fontSize: ".68rem", color: "var(--text-2)" }}>
            {g}
          </div>
        ))}
      </div>

      {weekStarts.map((ws, wi) => {
        const days = daysOfWeek(ws);
        const load = days.reduce((n, d) => n + (itemsByDate[d.iso]?.length ?? 0), 0);
        return (
          <div key={ws} className="card" style={{ marginBottom: 10, padding: 10 }}>
            <div
              className="mono"
              style={{ display: "flex", justifyContent: "space-between", color: "var(--text-2)", fontSize: ".72rem", marginBottom: 8 }}
            >
              <span>{t("Settimana {n}", { n: wi + 1 })} · {weekLabel(days, lang === "en" ? MESI_SHORT_EN : MESI_SHORT)}</span>
              <span>{load > 0 ? t("{n} all.", { n: load }) : "—"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {days.map((d) => {
                const items = itemsByDate[d.iso] ?? [];
                const isToday = d.iso === todayISO;
                const isSel = d.iso === selected;
                const allDone = items.length > 0 && items.every((it) => it.done);
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setSelected(d.iso)}
                    className="card"
                    style={{
                      padding: "5px 4px",
                      minHeight: 62,
                      cursor: "pointer",
                      textAlign: "left",
                      border: isSel ? "1px solid var(--lime)" : "1px solid var(--line)",
                      background: isSel ? "rgba(163,230,53,.10)" : items.length ? "rgba(255,255,255,.02)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: ".82rem", fontWeight: 700, color: isToday ? "var(--lime)" : undefined }}>
                        {d.date}
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
                            <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {it.title}
                            </span>
                            {dur ? <span style={{ flexShrink: 0 }}>{dur}</span> : null}
                          </div>
                        );
                      })}
                      {items.length > 2 ? (
                        <span style={{ fontSize: ".55rem", color: "var(--text-2)" }}>+{items.length - 2}</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {selected ? (
        <div className="card" style={{ borderTop: "3px solid var(--lime)" }}>
          <strong>{fmtSel(selected)}</strong>
          {selItems.length === 0 ? (
            <p style={{ color: "var(--text-2)", marginTop: 8 }}>{t("Riposo — nessun allenamento.")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {selItems.map((it, j) => {
                const m = discMeta(it.discipline);
                const dur = fmtDuration(it.durationSec);
                const meta = [it.detail?.trim(), dur ? `~${dur}` : ""].filter(Boolean).join(" · ");
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
                    {meta ? (
                      <span className="mono" style={{ color: "var(--text-2)", fontSize: ".82rem" }}>{meta}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
