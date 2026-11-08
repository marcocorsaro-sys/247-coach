"use client";
// Funnel "collega quello che hai → forma e pronostico → anteprima settimana".
// Prima dell'account i numeri sono un ESEMPIO dichiarato, diversi per sorgente.
import { useState } from "react";
import Link from "next/link";
import { raceTitle, type Race } from "@/lib/site/races";
import { racesPath, type Lang } from "@/lib/i18n/config";
import { fmt, type Dict } from "@/lib/i18n/dict";

type Src = "garmin" | "strava" | "icu" | "none";
type K = keyof Dict;
const DEMO: Record<Src, { ctl: string; atl: string; tsb: string; ps: string; pb: string; pr: string; tot: string; gaps: [K, K][] }> = {
  garmin: { ctl: "62", atl: "71", tsb: "-9", ps: "1:14", pb: "6:35", pr: "4:10", tot: "12:10", gaps: [["gap.climbs", "gap.climbsFix"], ["gap.ows", "gap.owsFix"], ["gap.desc", "gap.descFix"], ["gap.heat", "gap.heatFix"]] },
  strava: { ctl: "58", atl: "66", tsb: "-8", ps: "1:16", pb: "6:45", pr: "4:15", tot: "12:30", gaps: [["gap.climbs", "gap.climbsFix"], ["gap.ows", "gap.owsFix"], ["gap.descNA", "gap.check"], ["gap.heat", "gap.heatFix"]] },
  icu: { ctl: "64", atl: "70", tsb: "-6", ps: "1:12", pb: "6:28", pr: "4:05", tot: "11:55", gaps: [["gap.climbs", "gap.climbsFix"], ["gap.ows", "gap.owsFix"], ["gap.desc", "gap.descFix"], ["gap.heat", "gap.heatFix"]] },
  none: { ctl: "~55", atl: "—", tsb: "—", ps: "1:15-1:25", pb: "6:40-7:20", pr: "4:10-4:50", tot: "12:20-13:40", gaps: [["gap.volume", "gap.volumeFix"], ["gap.noClimb", "gap.check"], ["gap.heatOws", "gap.heatOwsFix"]] },
};
const CONNECT: { k: Src; t: K; d: K; s: K }[] = [
  { k: "garmin", t: "fun.garmin", d: "fun.garminD", s: "fun.garminS" },
  { k: "strava", t: "fun.strava", d: "fun.stravaD", s: "fun.stravaS" },
  { k: "icu", t: "fun.icu", d: "fun.icuD", s: "fun.icuS" },
  { k: "none", t: "fun.none", d: "fun.noneD", s: "fun.noneS" },
];
const DAYS: K[] = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"];

export default function RaceFunnel({ race, weeks, lang, dict, alpha }: { race: Race; weeks: number | null; lang: Lang; dict: Dict; alpha: boolean }) {
  const t = (k: K, v?: Record<string, string | number | null>) => fmt(dict[k] ?? k, v);
  const [src, setSrc] = useState<Src | null>(null);
  const d = src ? DEMO[src] : null;
  const signup = `/registrati?race=${encodeURIComponent(race.slug)}${src ? `&connect=${src}` : ""}&lang=${lang}`;
  const name = race.name;
  return (
    <section id="piano" className="ld-sec ld-fun">
      <div className="ld-wrap">
        <div className="ld-sechead">
          <div><p className="mono">{t("fun.kicker", { name: raceTitle(race) })}</p><h2>{t("fun.h2a")} <em>{t("fun.h2b")}</em></h2></div>
          <p>{t("fun.intro", { name })}{alpha ? ` ${t("fun.alpha")}` : ""}</p>
        </div>
        <div className="ld-steps">
          <div className="ld-step on"><span className="lab">1</span><b>{t("fun.s1")}</b><span className="src">{name}{weeks !== null ? ` · ${t("fun.s1b", { n: weeks })}` : ""}</span></div>
          <div className={`ld-step ${src ? "on" : ""}`}><span className="lab">2</span><b>{t("fun.s2")}</b><span className="src">{t("fun.s2b")}</span></div>
          <div className={`ld-step ${src ? "on" : ""}`}><span className="lab">3</span><b>{t("fun.s3")}</b><span className="src">{t("fun.s3b")}</span></div>
          <div className={`ld-step ${src ? "on" : ""}`}><span className="lab">4</span><b>{t("fun.s4")}</b><span className="src">{t("fun.s4b")}</span></div>
        </div>
        <div className="ld-conn">
          {CONNECT.map((c) => (
            <button key={c.k} type="button" className={`ld-cbtn ${src === c.k ? "on" : ""}`} onClick={() => setSrc(c.k)} aria-pressed={src === c.k}>
              <b>{t(c.t)}</b><span>{t(c.d)}</span><small>{t(c.s)}</small>
            </button>
          ))}
        </div>
        {d && src ? (
          <div>
            <div className="ld-fore">
              <div className="ld-card">
                <p className="lab">{t("fun.form")}</p>
                <p className="src">{t(`demo.${src}.basis` as K)}</p>
                <div className="ld-split">
                  <div><span>{t("fun.ctl")}</span><b className="num">{d.ctl}</b></div>
                  <div><span>{t("fun.atl")}</span><b className="num">{d.atl}</b></div>
                  <div><span>{t("fun.tsb")}</span><b className="num">{d.tsb}</b></div>
                </div>
                <p className="lab" style={{ marginTop: 14 }}>{t("fun.missing", { name })}</p>
                <div className="ld-gap">{d.gaps.map((g) => <div key={g[0]}><span>{t(g[0])}</span><b>{t(g[1])}</b></div>)}</div>
              </div>
              <div className="ld-card">
                <p className="lab">{t("fun.forecast", { name })}</p>
                <p className="src">{t(`demo.${src}.range` as K)}{race.distance === "half" ? ` · ${t("fun.calib")}` : ""}</p>
                <div className="ld-split legs">
                  <div><span>{t("leg.swim")}</span><b className="num">{d.ps}</b></div>
                  <div><span>{t("leg.bike")}</span><b className="num">{d.pb}</b></div>
                  <div><span>{t("leg.run")}</span><b className="num">{d.pr}</b></div>
                </div>
                <p style={{ marginTop: 14, color: "var(--text-2)" }}>
                  <b style={{ fontFamily: "var(--fd)", fontSize: "1.3rem", color: "var(--text)" }}>{t("fun.total")} {d.tot}</b><br />{t(`demo.${src}.verdict` as K)}
                </p>
              </div>
            </div>
            <div style={{ marginTop: 28 }}>
              <div className="ld-sechead" style={{ marginBottom: 6 }}>
                <div><p className="mono">{t("fun.previewKicker", { of: weeks ? t("fun.of", { n: weeks }) : "" })}</p><h3>{t("fun.previewH3", { name })}</h3></div>
                <span className="src">{t("fun.previewNote")}</span>
              </div>
              <div className="ld-week">
                <div className="ld-day"><span className="dn">{t(DAYS[0])}</span><div className="ld-ses"><b>{t("ses.rest")}</b>{t("ses.restD")}</div></div>
                <div className="ld-day"><span className="dn">{t(DAYS[1])}</span><div className="ld-ses s"><b>{t("ses.swim1")}</b>{t("ses.swim1D")}</div><div className="ld-ses r"><b>{t("ses.run1")}</b>{t("ses.run1D")}<i className="watch">{t("fun.onWatch")}</i></div></div>
                <div className="ld-day"><span className="dn">{t(DAYS[2])}</span><div className="ld-ses b"><b>{t("ses.bike1")}</b>{t("ses.bike1D")}<i>Superga da Sassi · 5 km 7 %</i></div></div>
                <div className="ld-day"><span className="dn">{t(DAYS[3])}</span><div className="ld-ses r"><b>{t("ses.run2")}</b>{t("ses.run2D")}</div><div className="ld-ses"><b>{t("ses.strength")}</b>{t("ses.strengthD")}</div></div>
                <div className="ld-day"><span className="dn">{t(DAYS[4])}</span><div className="ld-ses s"><b>{t("ses.swim2")}</b>{t("ses.swim2D")}</div></div>
                <div className="ld-day"><span className="dn">{t(DAYS[5])}</span><div className="ld-ses b"><b>{t("ses.bike2")}</b>{t("ses.bike2D")}<i>{t("ses.bike2R")}</i></div></div>
                <div className="ld-day"><span className="dn">{t(DAYS[6])}</span><div className="ld-ses r"><b>{t("ses.long")}</b>{t("ses.longD")}<i>{t("ses.longR")}</i></div><div className="ld-ses"><b>{t("ses.rev")}</b>{t("ses.revD")}</div></div>
              </div>
              <div className="ld-toast">{t("fun.toast")}</div>
              <div className="ld-cta">
                <Link className="btn btn-primary btn-lg" href={signup}>{alpha ? t("fun.ctaAccountFree") : t("fun.ctaAccount")}</Link>
                <Link className="btn btn-ghost" href={racesPath(lang)}>{t("fun.ctaCompare")}</Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
