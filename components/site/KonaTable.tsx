import { fmt, type Dict } from "@/lib/i18n/dict";
import type { KonaData } from "@/lib/site/kona";

export default function KonaTable({ data, t }: { data: KonaData; t: Dict }) {
  const date = data.date.length > 4 ? `${data.date.slice(8, 10)}/${data.date.slice(5, 7)}/${data.date.slice(0, 4)}` : data.date;
  const grp = (g: "M" | "F") => data.rows.filter((r) => r.gender === g);
  return (
    <section id="kona" className="ld-sec"><div className="ld-wrap">
      <div className="ld-sechead"><div><p className="mono">{t["kona.kicker"]}</p><h2>{t["kona.h1a"]} <em>{t["kona.h1b"]}</em></h2>
        <p style={{ color: "var(--text-2)", marginTop: 8, maxWidth: "70ch" }}>{fmt(t["kona.lead"], { date, slots: String(data.slots), next: String(data.edition + 1), pool: String(data.pool) })}</p></div></div>
      <div className="kona-grid">
        {(["M", "F"] as const).map((g) => (
          <div className="kona-tbl" key={g}>
            <table>
              <thead><tr><th>{t["kona.col.div"]}</th><th>{t["kona.col.fin"]}</th><th>{t["kona.col.win"]}</th><th>{t["kona.col.pool"]}</th><th>{t["kona.col.n"]}</th></tr></thead>
              <tbody>{grp(g).map((r) => (
                <tr key={r.division}><td><b>{r.division}</b></td><td className="num">{r.finishers}</td><td className="num">{r.winner}</td><td className="num">{r.poolCutoff}</td><td className="num">{r.poolCount}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="kit-hint">{t["kona.how"]}</p>
      <p className="kit-note">{t["kona.note"]}</p>
      <p className="kit-note">{t["kona.src"]}</p>
    </div></section>
  );
}
