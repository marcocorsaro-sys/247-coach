// Statistiche storiche della gara (2024-2026): indice di difficoltà, andamento
// delle edizioni, mediane per categoria e distribuzione dei tempi dell'ultima.
import type { Lang } from "@/lib/i18n/config";
import { LOCALE } from "@/lib/i18n/config";
import type { DictKey, T } from "@/lib/i18n";
import Link from "next/link";
import { hm, hms, raceStatsFor, type Leg } from "@/lib/site/raceStats";
import { ATH, athLang, athletesPath } from "@/lib/site/athletes";

const LEGS: Leg[] = ["finish", "swim", "bike", "run"];
const sign = (v: number, lang: Lang) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString(LOCALE[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Riquadri "più lenta / più veloce della media". compact = solo i riquadri (scheda gara). */
export function RaceDifficulty({ slug, lang, t }: { slug: string; lang: Lang; t: T }) {
  const s = raceStatsFor(slug);
  if (!s || s.diff.finish == null) return null;
  const n = (v: number) => v.toLocaleString(LOCALE[lang]);
  return (
    <div className="ld-rs-diff">
      <div className="ld-ctiles">
        {LEGS.map((l) => (s.diff[l] == null ? null : (
          <div key={l} className={`ld-stat ${(s.diff[l] as number) > 0.5 ? "slow" : (s.diff[l] as number) < -0.5 ? "fast" : ""}`}>
            <b className="num">{sign(s.diff[l] as number, lang)}</b>
            <span>{t(`rs.leg.${l}` as DictKey)} · {t((s.diff[l] as number) > 0.5 ? "rs.slower" : (s.diff[l] as number) < -0.5 ? "rs.faster" : "rs.average")}</span>
          </div>
        )))}
      </div>
      <p className="note">{t("rs.diffNote", { n: n(s.n_cross), dist: t(s.cat === "full" ? "rs.full" : "rs.half") })}</p>
    </div>
  );
}

export default function RaceHistory({ slug, lang, t }: { slug: string; lang: Lang; t: T }) {
  const s = raceStatsFor(slug);
  if (!s || !s.editions.length) return null;
  const n = (v: number) => v.toLocaleString(LOCALE[lang]);
  const last = s.editions[0];
  const ags = Object.entries(last.ag);
  const hist = last.hist;
  const max = hist ? Math.max(...hist.counts) : 0;
  const flagged = s.editions.filter((e) => e.flags.length);
  return (
    <section className="ld-sec" id="storico">
      <div className="ld-wrap">
        <div className="ld-sechead"><h2>{t("rs.h")}</h2><p>{t("rs.lead")}</p></div>

        {s.diff.finish != null ? (
          <>
            <h3>{t("rs.diffH")}</h3>
            <RaceDifficulty slug={slug} lang={lang} t={t} />
          </>
        ) : null}

        <h3 style={{ marginTop: 28 }}>{t("rs.edH")}</h3>
        <div className="ld-scroll">
          <table>
            <thead><tr><th>{t("rs.year")}</th><th>{t("rs.starters")}</th><th>{t("rs.finishers")}</th><th>{t("rs.dnf")}</th><th>{t("rs.medFinish")}</th><th>{t("rs.leg.swim")}</th><th>{t("rs.leg.bike")}</th><th>{t("rs.leg.run")}</th><th>{t("rs.winM")}</th><th>{t("rs.winF")}</th></tr></thead>
            <tbody>
              {s.editions.map((e) => (
                <tr key={e.y}>
                  <td className="num">{e.y}{e.flags.length ? " *" : ""}</td>
                  <td className="num">{n(e.st)}</td>
                  <td className="num">{n(e.fin)}</td>
                  <td className="num">{e.st ? `${Math.round((100 * e.dnf) / e.st)}%` : "–"}</td>
                  <td className="num"><b>{hms(e.med.finish)}</b></td>
                  <td className="num">{hms(e.med.swim)}</td>
                  <td className="num">{hms(e.med.bike)}</td>
                  <td className="num">{hms(e.med.run)}</td>
                  <td className="num">{hms(e.win.M)}</td>
                  <td className="num">{hms(e.win.F)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {flagged.length ? <p className="note">* {t("rs.flagNote", { years: flagged.map((e) => e.y).join(", ") })}</p> : null}

        {hist && max ? (
          <>
            <h3 style={{ marginTop: 28 }}>{t("rs.histH", { year: last.y })}</h3>
            <div className="ld-rs-hist" role="img" aria-label={t("rs.histH", { year: last.y })}>
              {hist.counts.map((c, i) => (
                <div key={i} className="col" title={`${hm(hist.from + i * hist.step)} · ${n(c)}`}>
                  <div className="bar" style={{ height: `${Math.max(1, Math.round((100 * c) / max))}%` }} />
                  {i % (s.cat === "full" ? 2 : 4) === 0 ? <span className="num">{hm(hist.from + i * hist.step)}</span> : <span />}
                </div>
              ))}
            </div>
            <p className="note">{t("rs.histNote", { p25: hms(last.pct["25"]), p50: hms(last.pct["50"]), p75: hms(last.pct["75"]) })}</p>
          </>
        ) : null}

        {ags.length ? (
          <>
            <h3 style={{ marginTop: 28 }}>{t("rs.agH", { year: last.y })}</h3>
            <div className="ld-scroll">
              <table>
                <thead><tr><th>{t("rs.ag")}</th><th>{t("rs.finishers")}</th><th>{t("rs.medFinish")}</th><th>{t("rs.best")}</th></tr></thead>
                <tbody>
                  {ags.map(([a, [cnt, med, best]]) => (
                    <tr key={a}><td>{a}</td><td className="num">{n(cnt)}</td><td className="num"><b>{hms(med)}</b></td><td className="num">{hms(best)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        <p style={{ marginTop: 22 }}><Link className="btn btn-ghost" href={athletesPath(lang)}>{ATH[athLang(lang)].hubH1a} →</Link></p>
        <p className="note" style={{ marginTop: 18 }}>{t("rs.source")}</p>
      </div>
    </section>
  );
}
