import { fmt, type Dict } from "@/lib/i18n/dict";
import { KONA_GEAR, wheelAdvice } from "@/lib/site/gear";
import type { Race } from "@/lib/site/races";

function Bars({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <div className="gear-bars"><h4>{title}</h4>
      {rows.map(([n, v]) => (
        <div className="gear-row" key={n}><span>{n}</span><i style={{ width: `${(v / max) * 100}%` }} /><b className="num">{v.toLocaleString("en", { maximumFractionDigits: 1 })}%</b></div>
      ))}
    </div>
  );
}

export default function GearSection({ race, t }: { race: Race; t: Dict }) {
  const w = wheelAdvice(race);
  return (
    <section id="attrezzatura" className="ld-sec"><div className="ld-wrap">
      <div className="ld-sechead"><div><p className="mono">{t["gear.kicker"]}</p><h2>{t["gear.h1a"]} <em>{t["gear.h1b"]}</em></h2></div></div>
      <div className="gear-grid">
        <div className="kit-block">
          <h3>{t["gear.konaH"]}</h3>
          <p>{fmt(t["gear.konaLead"], { year: String(KONA_GEAR.year), n: `≈${KONA_GEAR.n.toLocaleString("en")}` })}</p>
          <Bars title={t["gear.bikes"]} rows={KONA_GEAR.bikes} />
          <Bars title={t["gear.wheels"]} rows={KONA_GEAR.wheels} />
          <Bars title={t["gear.drive"]} rows={KONA_GEAR.drivetrain} />
          <p className="kit-note">{t["gear.konaNote"]} <a href={KONA_GEAR.url} target="_blank" rel="noopener">Slowtwitch</a></p>
        </div>
        {w ? (
          <div className="kit-block">
            <h3>{t["wheel.h"]}</h3>
            <p>{fmt(t["wheel.lead"], { dpk: String(w.dpk), wind: t[`wheel.wind.${w.wind}` as keyof Dict] })} ({t[`wheel.terrain.${w.terrain}` as keyof Dict]})</p>
            <p><b>{t["wheel.front"]}</b><br />{fmt(t["wheel.frontV"], { d: w.front })}</p>
            <p><b>{t["wheel.rear"]}</b><br />{t[`wheel.rear.${w.rear}` as keyof Dict]}</p>
            <p><b>{t["wheel.tyre"]}</b><br />{t["wheel.tyreV"]}</p>
            <p className="kit-note">{t["wheel.note"]}</p>
          </div>
        ) : null}
      </div>
    </div></section>
  );
}
