// Carriera dell'atleta: frase riassuntiva, andamento negli anni (SVG, senza script),
// posizione rispetto al gruppo e dati strutturati della persona.
import Link from "next/link";
import { LOCALE } from "@/lib/i18n/config";
import { SITE, ORG_ID } from "@/lib/site/jsonld";
import { athletePath, editionById, editionPath, fill, hms, raceLabel, type AthLang, type Athlete, type AthResult } from "@/lib/site/athletes";
import { CAR, CLEGS, type CareerRow } from "@/lib/site/career";

type X = Record<string, string>;
const best = (rows: CareerRow[], cat: "full" | "half", key: (c: CareerRow) => number | null) =>
  rows.filter((c) => c.r.cat === cat && key(c) != null).sort((p, q) => (key(p) as number) - (key(q) as number))[0] ?? null;

/** Frasi che riassumono la carriera: testo vero, leggibile da persone e da motori. */
export function careerSummary(a: Athlete, results: AthResult[], rows: CareerRow[], l: AthLang): string[] {
  const c = CAR[l], out: string[] = [];
  if (a.races <= 1 && results[0]) out.push(fill(c.sum1one, { name: a.name, race: raceLabel(results[0]) }));
  else out.push(fill(c.sum1, { name: a.name, races: a.races, racesW: a.races === 1 ? c.race1 : c.raceN, y1: a.first_year ?? "", y2: a.last_year ?? "", fin: a.finishes }));
  const bf = best(rows, "full", (x) => x.r.finish), bh = best(rows, "half", (x) => x.r.finish);
  if (bf) out.push(fill(c.sumBestFull, { t: hms(bf.r.finish), race: raceLabel(bf.r) }));
  if (bh) out.push(fill(c.sumBestHalf, { t: hms(bh.r.finish), race: raceLabel(bh.r) }));
  const main: "full" | "half" = bf ? "full" : "half";
  const ba = best(rows, main, (x) => x.adj);
  if (ba && rows.filter((x) => x.r.cat === main && x.adj != null).length >= 2) out.push(fill(c.sumAdj, { race: raceLabel(ba.r), t: hms(ba.adj) }));
  const bp = rows.filter((x) => x.pct.finish != null).sort((p, q) => (q.pct.finish as number) - (p.pct.finish as number))[0];
  if (bp) out.push(fill(c.sumPct, { race: raceLabel(bp.r), name: a.name, p: bp.pct.finish as number }));
  return out;
}

/** Andamento di una distanza: tempo reale e tempo su percorso medio. I tempi più bassi stanno in alto. */
export function CareerChart({ rows, l, title }: { rows: CareerRow[]; l: AthLang; title: string }) {
  const c = CAR[l];
  const pts = rows.filter((x) => x.r.race_date && x.r.finish).sort((p, q) => (p.r.race_date as string).localeCompare(q.r.race_date as string));
  if (pts.length < 2) return null;
  const W = 760, H = 300, L = 62, R = 18, T = 26, B = 46;
  const ts = pts.map((p) => Date.parse(`${p.r.race_date}T12:00:00Z`));
  const t0 = Math.min(...ts), t1 = Math.max(...ts), span = t1 - t0 || 1;
  const all = pts.flatMap((p) => [p.r.finish as number, ...(p.adj != null ? [p.adj] : [])]);
  const step = 1800, lo = Math.floor((Math.min(...all) - 600) / step) * step, hi = Math.ceil((Math.max(...all) + 600) / step) * step;
  const X = (t: number) => L + ((t - t0) / span) * (W - L - R);
  const Y = (s: number) => T + ((s - lo) / (hi - lo || 1)) * (H - T - B);
  const ticks: number[] = []; const every = Math.max(1, Math.ceil((hi - lo) / step / 5));
  for (let v = lo; v <= hi; v += step * every) ticks.push(v);
  const path = (get: (p: CareerRow) => number | null) => pts.map((p, i) => ({ v: get(p), x: X(ts[i]) })).filter((o) => o.v != null).map((o, i) => `${i ? "L" : "M"}${o.x.toFixed(1)},${Y(o.v as number).toFixed(1)}`).join(" ");
  const hasAdj = pts.filter((p) => p.adj != null).length >= 2;
  const years = [...new Set(pts.map((p) => p.r.year))];
  return (
    <figure className="ld-car-fig">
      <figcaption><b>{title}</b>
        <span className="ld-car-leg"><i className="real" />{c.real}</span>
        {hasAdj ? <span className="ld-car-leg"><i className="adj" />{c.adj}</span> : null}
      </figcaption>
      <div className="ld-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${pts.map((p) => `${raceLabel(p.r)} ${hms(p.r.finish)}`).join(", ")}`} className="ld-car-svg">
          {ticks.map((v) => (<g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="grid" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{hms(v).slice(0, -3)}</text></g>))}
          {years.map((y) => { const xs = pts.map((p, i) => (p.r.year === y ? X(ts[i]) : null)).filter((v): v is number => v != null); return <text key={y} x={xs.reduce((p, q) => p + q, 0) / xs.length} y={H - 14} textAnchor="middle" className="ax">{y}</text>; })}
          <text x={L} y={14} className="ax">{c.faster}</text>
          {hasAdj ? <path d={path((p) => p.adj)} className="adj" /> : null}
          <path d={path((p) => p.r.finish)} className="real" />
          {pts.map((p, i) => (
            <g key={p.r.edition_id}>
              {p.adj != null && hasAdj ? <circle cx={X(ts[i])} cy={Y(p.adj)} r={3.5} className="adjdot" /> : null}
              <circle cx={X(ts[i])} cy={Y(p.r.finish as number)} r={5} className="dot"><title>{`${raceLabel(p.r)} · ${hms(p.r.finish)}${p.adj != null ? ` · ${c.adj}: ${hms(p.adj)}` : ""}`}</title></circle>
            </g>
          ))}
          {pts.length <= 8 ? pts.map((p, i) => {
            // due gare vicine nel tempo: la seconda etichetta va sotto il punto, per non sovrapporsi
            const near = i > 0 && X(ts[i]) - X(ts[i - 1]) < 70;
            return <text key={p.r.edition_id} x={near ? X(ts[i]) + 10 : Math.min(W - R - 30, Math.max(L + 30, X(ts[i])))} y={Y(p.r.finish as number) + (near ? 4 : -11)} textAnchor={near ? "start" : "middle"} className="val">{hms(p.r.finish)}</text>;
          }) : null}
        </svg>
      </div>
    </figure>
  );
}

/** Per ogni gara finita: di quanti arrivati è stato più veloce, frazione per frazione. */
export function FieldTable({ rows, l, x }: { rows: CareerRow[]; l: AthLang; x: X }) {
  const c = CAR[l];
  const list = rows.filter((r) => CLEGS.some((k) => r.pct[k] != null));
  if (!list.length) return null;
  return (
    <div className="ld-scroll">
      <table className="ld-car-field">
        <thead><tr><th>{x.race}</th>{CLEGS.map((k) => <th key={k}>{x[k]}</th>)}<th>{c.adjCol}</th></tr></thead>
        <tbody>
          {list.map(({ r, pct, adj }) => (
            <tr key={r.edition_id}>
              <td>{editionById(r.edition_id) ? <Link href={editionPath(l, r.edition_id)}>{raceLabel(r)}</Link> : raceLabel(r)}</td>
              {CLEGS.map((k) => (
                <td key={k}>{pct[k] == null ? <span className="note">–</span> : (
                  <span className={`ld-car-bar ${k}`}><i style={{ width: `${pct[k]}%` }} /><b className="num">{(pct[k] as number).toLocaleString(LOCALE[l])}%</b></span>
                )}</td>
              ))}
              <td className="num">{adj != null ? hms(adj) : c.noAdj}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** ProfilePage + Person: chi è l'atleta e a quali gare ha partecipato. */
export function athleteLd(a: Athlete, results: AthResult[], l: AthLang, summary: string) {
  const url = `${SITE}${athletePath(l, a.slug)}`;
  return {
    "@context": "https://schema.org", "@type": "ProfilePage", "@id": `${url}#page`, url, inLanguage: l, name: a.name, description: summary, publisher: { "@id": ORG_ID },
    mainEntity: {
      "@type": "Person", "@id": `${url}#athlete`, name: a.name, url, description: summary,
      ...(a.country ? { nationality: { "@type": "Country", identifier: a.country } } : {}),
      ...(a.sex === "M" || a.sex === "F" ? { gender: a.sex === "M" ? "Male" : "Female" } : {}),
      performerIn: results.slice(0, 30).map((r) => ({
        "@type": "SportsEvent", name: raceLabel(r), sport: "Triathlon", ...(r.race_date ? { startDate: r.race_date } : {}),
        ...(editionById(r.edition_id) ? { url: `${SITE}${editionPath(l, r.edition_id)}` } : {}),
      })),
    },
  };
}
