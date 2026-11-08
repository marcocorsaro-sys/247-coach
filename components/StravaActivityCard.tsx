"use client";

import { useState, type CSSProperties } from "react";
import { type StravaActivityFull, buildActivityView } from "@/lib/strava/format";
import { useT } from "@/components/AppLang";

/** Card di dettaglio di una singola attività Strava svolta in un dato giorno. */
export default function StravaActivityCard({ a }: { a: StravaActivityFull }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const v = buildActivityView(a);

  return (
    <div className="sv-card" style={{ "--acc": v.accent } as CSSProperties}>
      <div className="sv-head">
        <span className="sv-ico">{v.icon}</span>
        <div className="sv-hmain">
          <div className="sv-title">{v.title}</div>
          <div className="sv-sub">
            <span className="sv-disc">
              {t(v.label)}
              {v.indoor ? " · indoor" : ""}
            </span>
            <span className="sv-badge">{t("Svolto")}</span>
          </div>
        </div>
        {v.clock ? <span className="sv-when">h {v.clock}</span> : null}
      </div>

      {v.primary.length > 0 ? (
        <div className="sv-primary">
          {v.primary.map((m) => (
            <div className="m" key={m.label}>
              <div className="mv">{m.value}</div>
              <div className="ml">{t(m.label)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {v.secondary.length > 0 ? (
        <div className="sv-sec">
          {v.secondary.map((m) => (
            <span className="sv-chip" key={m.label}>
              <b>{m.value}</b>
              <span>{t(m.label)}</span>
            </span>
          ))}
        </div>
      ) : null}

      {v.detail.length > 0 ? (
        <div className="sv-more">
          <button
            type="button"
            className="btn btn-subtle btn-sm"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? t("Nascondi dettagli") : t("Tutti i dati")}
          </button>
          {open ? (
            <div className="sv-detail">
              {v.detail.map((m) => (
                <div className="m" key={m.label}>
                  <div className="mv">{m.value}</div>
                  <div className="ml">{t(m.label)}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
