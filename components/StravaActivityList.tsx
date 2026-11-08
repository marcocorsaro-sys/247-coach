"use client";

import type { CSSProperties } from "react";
import {
  type StravaActivityLite,
  buildActivityView,
  groupByDay,
} from "@/lib/strava/format";
import { useAppLang, useT } from "@/components/AppLang";
import { LOCALE } from "@/lib/app-i18n";

/** Lista (sola lettura) di attività importate da Strava, raggruppate per giorno. */
export default function StravaActivityList({
  activities,
}: {
  activities: StravaActivityLite[];
}) {
  const t = useT();
  const lang = useAppLang();
  // In italiano resta l'etichetta di groupByDay; altrimenti la data nella lingua dell'app.
  const dayLabel = (label: string, iso: string | null | undefined) => {
    if (lang === "it" || !iso || label === "Oggi" || label === "Ieri") return t(label);
    return new Date(iso).toLocaleDateString(LOCALE[lang], { weekday: "short", day: "numeric", month: "short" });
  };
  if (activities.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
        {t("Nessuna attività importata.")}
      </div>
    );
  }

  const groups = groupByDay(activities);

  return (
    <div>
      {groups.map((g) => (
        <div key={g.key}>
          <div className="sv-group">{dayLabel(g.label, g.items[0]?.start_date)}</div>
          <div className="sv-list">
            {g.items.map((a) => {
              const v = buildActivityView(a);
              const meta = [
                t(v.label),
                v.clock,
                a.average_heartrate ? `${Math.round(a.average_heartrate)} bpm` : null,
                a.average_watts ? `${Math.round(a.average_watts)} W` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <div className="sv-row" key={a.id} style={{ "--acc": v.accent } as CSSProperties}>
                  <span className="sv-ico">{v.icon}</span>
                  <div className="sv-row-main">
                    <strong>{v.title}</strong>
                    <div className="sv-row-meta">{meta}</div>
                  </div>
                  {v.primary.length > 0 ? (
                    <div className="sv-row-metrics">
                      {v.primary.map((m) => (
                        <div className="m" key={m.label}>
                          <div className="mv">{m.value}</div>
                          <div className="ml">{t(m.label)}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
