"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { weekLabel, fmtRange } from "@/lib/training/weeks";
import { useAppLang } from "@/components/AppLang";
import { LOCALE } from "@/lib/app-i18n";

/** Intervallo lun–dom nella lingua dell'app (IT: formato storico di fmtRange). */
function rangeLabel(weekStart: string, lang: "it" | "en"): string {
  if (lang === "it") return fmtRange(weekStart);
  const [y, m, d] = weekStart.slice(0, 10).split("-").map(Number);
  const mon = new Date(y, (m ?? 1) - 1, d ?? 1);
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const f = (x: Date) => x.toLocaleDateString(LOCALE[lang], { day: "numeric", month: "short" });
  return `${f(mon)} – ${f(sun)} ${sun.getFullYear()}`;
}

export interface NavWeek {
  id: string;
  week_start: string;
}

export default function AthleteWeekNav({
  weeks,
  selectedId,
}: {
  weeks: NavWeek[];
  selectedId: string | null;
}) {
  const lang = useAppLang();
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const w of weeks) set.add(new Date(w.week_start).getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [weeks]);

  const selectedYear = selectedId
    ? new Date(
        weeks.find((w) => w.id === selectedId)?.week_start ?? Date.now(),
      ).getFullYear()
    : (years[0] ?? new Date().getFullYear());
  const [year, setYear] = useState<number>(selectedYear);

  if (weeks.length <= 1) return null;

  // Ordine cronologico sinistra → destra: le settimane passate a sinistra,
  // la corrente (e le future) verso destra — come su un calendario.
  const isAi = process.env.NEXT_PUBLIC_APP_MODE === "ai_coach";
  const todayISO = new Date().toISOString().slice(0, 10);
  const mondayISO = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
  const shown = weeks
    .filter((w) => new Date(w.week_start).getFullYear() === year)
    .slice()
    .sort((a, b) => {
      if (!isAi) return a.week_start.localeCompare(b.week_start);
      // 24/7: prima la settimana corrente/in arrivo e le future in ordine
      // cronologico, poi le passate dalla più recente.
      const fa = a.week_start >= mondayISO, fb = b.week_start >= mondayISO;
      if (fa !== fb) return fa ? -1 : 1;
      return fa ? a.week_start.localeCompare(b.week_start) : b.week_start.localeCompare(a.week_start);
    });
  void todayISO;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {years.length > 1 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {shown.map((w) => (
          <Link
            key={w.id}
            href={`/atleta?w=${w.id}`}
            className={`btn btn-sm ${w.id === selectedId ? "btn-primary" : "btn-subtle"}`}
            title={rangeLabel(w.week_start, lang)}
          >
            {weekLabel(w.week_start)}
          </Link>
        ))}
      </div>
    </div>
  );
}
