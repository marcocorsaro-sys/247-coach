"use client";

import { useMemo, useState } from "react";
import { useAppLang, useT } from "@/components/AppLang";

export interface CatalogRace {
  id: string;
  name: string;
  race_date: string;
  race_type: string | null;
  location: string | null;
  url: string | null;
}

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function typeColor(t: string | null): string {
  const v = (t ?? "").toLowerCase();
  if (v.includes("70.3")) return "var(--cyan)";
  if (v.includes("ironman")) return "var(--amber)";
  if (v.includes("5150") || v.includes("short")) return "var(--lime)";
  if (v.includes("championship")) return "var(--violet)";
  return "var(--text-3)";
}

/** Chiave canonica per riconoscere se una gara del catalogo è già in elenco. */
const raceKey = (name: string, date: string) =>
  `${name.trim().toLowerCase()}|${date.slice(0, 10)}`;

export default function RaceCalendar({
  races,
  addAction,
  mode,
  athletes = [],
  addedKeys,
  addedByAthlete,
}: {
  races: CatalogRace[];
  addAction: (formData: FormData) => void | Promise<void>;
  mode: "athlete" | "coach";
  athletes?: { id: string; name: string }[];
  /** Atleta: chiavi delle gare già nelle sue gare obiettivo. */
  addedKeys?: string[];
  /** Coach: chiavi delle gare già obiettivo, per athleteId. */
  addedByAthlete?: Record<string, string[]>;
}) {
  const t = useT();
  const lang = useAppLang();
  const months = lang === "it" ? MESI : MONTHS_EN;
  const types = useMemo(
    () => Array.from(new Set(races.map((r) => r.race_type).filter(Boolean) as string[])).sort(),
    [races],
  );
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [athlete, setAthlete] = useState(athletes[0]?.id ?? "");

  const filtered = races.filter((r) => {
    if (type && r.race_type !== type) return false;
    if (q) {
      const hay = `${r.name} ${r.location ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  // Raggruppa per anno-mese mantenendo l'ordine cronologico.
  const groups: { key: string; label: string; items: CatalogRace[] }[] = [];
  const byKey = new Map<string, CatalogRace[]>();
  for (const r of filtered) {
    const d = new Date(r.race_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byKey.has(key)) {
      byKey.set(key, []);
      groups.push({ key, label: `${months[d.getMonth()]} ${d.getFullYear()}`, items: byKey.get(key)! });
    }
    byKey.get(key)!.push(r);
  }

  return (
    <div>
      {/* filtri */}
      <div className="card" style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "coach" ? (
          <div className="field">
            <label className="label">{t("Aggiungi alla scheda di…")}</label>
            <select className="input" value={athlete} onChange={(e) => setAthlete(e.target.value)}>
              {athletes.length === 0 ? <option value="">{t("Nessun atleta")}</option> : null}
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="label">{t("Cerca")}</label>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Nome o luogo (es. Switzerland, Cervia…)")}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn btn-sm ${type === "" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setType("")}
          >
            {t("Tutti")}
          </button>
          {types.map((ty) => (
            <button
              key={ty}
              type="button"
              className={`btn btn-sm ${type === ty ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setType(ty)}
            >
              {ty}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          {t("Nessuna gara trovata.")}
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <h2 className="sec">
              <span className="l">{g.label}</span>
              <span className="mono">{t("{n} gare", { n: g.items.length })}</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.items.map((r) => {
                const d = new Date(r.race_date);
                const key = raceKey(r.name, r.race_date);
                const isAdded =
                  mode === "athlete"
                    ? (addedKeys ?? []).includes(key)
                    : athlete
                      ? (addedByAthlete?.[athlete] ?? []).includes(key)
                      : false;
                return (
                  <div
                    className="card"
                    key={r.id}
                    style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: 16 }}
                  >
                    <div style={{ textAlign: "center", minWidth: 42 }}>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</div>
                      <div className="mono" style={{ fontSize: ".68rem", color: "var(--text-2)" }}>
                        {months[d.getMonth()].slice(0, 3)}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <strong>{r.name}</strong>
                      <div className="mono" style={{ color: "var(--text-2)", fontSize: ".8rem", marginTop: 2 }}>
                        {r.location ?? ""}
                      </div>
                    </div>
                    {r.race_type ? (
                      <span
                        className="pill pill-plain"
                        style={{ color: typeColor(r.race_type), borderColor: "var(--line)" }}
                      >
                        {r.race_type}
                      </span>
                    ) : null}
                    {isAdded ? (
                      <span className="pill ok" title={t("Già nelle gare obiettivo")}>
                        ✓ {t("Già aggiunta")}
                      </span>
                    ) : (
                      <form action={addAction}>
                        <input type="hidden" name="catalog_id" value={r.id} />
                        {mode === "coach" ? (
                          <input type="hidden" name="athlete_id" value={athlete} />
                        ) : null}
                        <button
                          className="btn btn-subtle btn-sm"
                          type="submit"
                          disabled={mode === "coach" && !athlete}
                          style={{ color: "var(--lime)" }}
                        >
                          + {t("Aggiungi")}
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
