"use client";
// "Quanto farei in un'altra gara?": porta un tempo da un percorso all'altro con l'indice
// di velocità dei percorsi. Tutto nel browser: i dati arrivano già pronti dal server.
import { useMemo, useState } from "react";
import Link from "next/link";

export type EqRace = { slug: string; name: string; cat: "full" | "half"; d: number; href: string | null; q: number[] | null };
type Txt = Record<string, string>;
const hms = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.round(s % 60); return `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`; };
const parse = (v: string): number | null => {
  const m = v.trim().match(/^(\d{1,2})[:.h ](\d{1,2})(?:[:.m ](\d{1,2}))?$/);
  if (!m) return null;
  const s = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
  return s >= 3 * 3600 && s <= 18 * 3600 && Number(m[2]) < 60 && Number(m[3] ?? 0) < 60 ? s : null;
};
const better = (q: number[] | null, s: number): number | null => {
  if (!q) return null;
  if (s <= q[0]) return 100; if (s >= q[q.length - 1]) return 0;
  let i = 1; while (i < q.length && q[i] < s) i++;
  return Math.round(100 - ((i - 1) + (s - q[i - 1]) / (q[i] - q[i - 1] || 1)) * 5);
};

export default function RaceEquivalent({ races, txt, initial }: { races: EqRace[]; txt: Txt; initial?: { slug?: string; time?: string } }) {
  const first = races.find((r) => r.slug === initial?.slug) ?? races.find((r) => r.cat === "full") ?? races[0];
  const [from, setFrom] = useState(first.slug);
  const [time, setTime] = useState(initial?.time ?? "");
  const src = races.find((r) => r.slug === from) ?? first;
  const secs = parse(time);
  const list = useMemo(() => races.filter((r) => r.cat === src.cat).map((r) => ({ r, eq: secs == null ? null : Math.round((secs * (1 + r.d / 100)) / (1 + src.d / 100)) })).sort((p, q) => p.r.d - q.r.d), [races, src, secs]);
  return (
    <div className="ld-eq">
      <div className="ld-eq-form">
        <label>{txt.eqFrom}
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {(["full", "half"] as const).map((c) => <optgroup key={c} label={c === "full" ? txt.full : txt.half}>{races.filter((r) => r.cat === c).sort((p, q) => p.name.localeCompare(q.name)).map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</optgroup>)}
          </select>
        </label>
        <label>{txt.eqTime}
          <input value={time} onChange={(e) => setTime(e.target.value)} inputMode="numeric" placeholder={src.cat === "full" ? "12:30:00" : "5:45:00"} aria-invalid={time !== "" && secs == null} />
        </label>
      </div>
      {time !== "" && secs == null ? <p className="ld-chonest">{txt.eqBad}</p> : null}
      <div className="ld-scroll" style={{ marginTop: 18 }}>
        <table className="ld-eq-table">
          <thead><tr><th>{txt.eqRace}</th><th>{txt.eqIdx}</th><th>{txt.eqResult}</th><th /></tr></thead>
          <tbody>
            {list.map(({ r, eq }) => {
              const p = eq == null ? null : better(r.q, eq);
              return (
                <tr key={r.slug} className={r.slug === src.slug ? "me" : ""}>
                  <td>{r.href ? <Link href={r.href}>{r.name}</Link> : r.name}{r.slug === src.slug ? <span className="lab"> · {txt.eqSame}</span> : null}</td>
                  <td className="num">{r.d > 0 ? "+" : r.d < 0 ? "−" : ""}{Math.abs(r.d).toFixed(1)}%</td>
                  <td className="num"><b>{eq == null ? "–" : hms(eq)}</b></td>
                  <td className="note">{p == null ? "" : txt.eqPct.replace("{p}", String(p))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
