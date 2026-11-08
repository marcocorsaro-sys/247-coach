"use client";

import { useState } from "react";

export interface TabDef {
  key: string;
  label: string;
  content: React.ReactNode;
}

/**
 * Tab della scheda atleta (client, senza roundtrip). Generico: la pagina
 * server passa l'elenco dei tab; qui solo lo switch. Spezzare la scheda in
 * tab tematici è ciò che la rende leggibile: una cosa alla volta.
 */
export default function AthleteTabs({
  contextBar,
  tabs,
  initialTab,
}: {
  contextBar: React.ReactNode;
  tabs: TabDef[];
  /** Tab da aprire al load (es. dopo un'azione che fa redirect con ?tab=...). */
  initialTab?: string;
}) {
  const [tab, setTab] = useState<string>(
    initialTab && tabs.some((t) => t.key === initialTab)
      ? initialTab
      : tabs[0]?.key ?? "",
  );

  return (
    <>
      {contextBar ? <div className="ctx-bar">{contextBar}</div> : null}

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <a
            key={t.key}
            role="tab"
            className={tab === t.key ? "active" : ""}
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </a>
        ))}
      </div>

      {tabs.map((t) => (
        <div key={t.key} className={`tab-content ${tab === t.key ? "active" : ""}`}>
          {t.content}
        </div>
      ))}
    </>
  );
}
