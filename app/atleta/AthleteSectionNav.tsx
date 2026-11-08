"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/components/AppLang";

const SECTIONS: [string, string][] = [
  ["settimana", "Allenamenti"],
  ["scheda", "Scheda"],
  ["test", "Test"],
  ["gare", "Gare"],
  ["dispositivi", "Dispositivi"],
];

/** Tab nav della vista atleta con evidenziazione live della sezione visibile. */
const PAGES: [string, string][] = [
  ["/atleta", "Tabella"],
  ["/atleta/analisi", "Analisi"],
  ["/atleta/profilo", "Profilo"],
  ["/atleta/dispositivi", "Dispositivi"],
  ["/benvenuto", "Guida"],
];

export default function AthleteSectionNav({ view, children }: { view?: "home" | "profilo" | "dispositivi" | "analisi"; children?: ReactNode }) {
  const t = useT();
  const [active, setActive] = useState<string>("settimana");
  const isAi = process.env.NEXT_PUBLIC_APP_MODE === "ai_coach";
  if (isAi) {
    const current = view === "profilo" ? "/atleta/profilo" : view === "dispositivi" ? "/atleta/dispositivi" : view === "analisi" ? "/atleta/analisi" : "/atleta";
    return (
      <div className="nav-tabs">
        {PAGES.map(([href, label]) => (
          <a key={href} href={href} className={current === href ? "active" : undefined}>{t(label)}</a>
        ))}
        {children ? <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 6 }}>{children}</span> : null}
      </div>
    );
  }

  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(
      (e): e is HTMLElement => !!e,
    );
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (inView[0]) setActive(inView[0].target.id);
      },
      { rootMargin: "-25% 0% -55% 0%", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="nav-tabs">
      {SECTIONS.map(([id, label]) => (
        <a key={id} href={`#${id}`} className={active === id ? "active" : undefined}>
          {t(label)}
        </a>
      ))}
    </div>
  );
}
