// Home pubblica di 24/7 Coach per lingua: hero, Race Advisor, calendario.
import Link from "next/link";
import { DEVICE_CHIPS, isAlpha, SiteFooter, SiteNav } from "./SiteShell";
import RaceAdvisor from "./RaceAdvisor";
import { RaceCard } from "./RaceCard";
import { hasRichContent, racePath, type Race } from "@/lib/site/races";
import { racesPath, type Lang } from "@/lib/i18n/config";
import { getDict, tr } from "@/lib/i18n";

export default async function Landing({ races, lang }: { races: Race[]; lang: Lang }) {
  const dict = await getDict(lang);
  const t = tr(dict);
  const full = races.filter((r) => r.distance === "full");
  const half = races.filter((r) => r.distance === "half");
  const rich = races.filter(hasRichContent);
  const year = races[0]?.race_date?.slice(0, 4) ?? String(new Date().getFullYear() + 1);
  return (
    <div className="ld">
      <SiteNav lang={lang} t={t} />
      <main>
        <div className="ld-hero">
          <div className="ld-wrap">
            <div>
              <p className="mono">{t("hero.kicker", { year })}{isAlpha() ? <> · <span className="ld-alpha">{t("alpha.label")}</span></> : null}</p>
              <h1>{t("hero.h1a")}<br /><em>{t("hero.h1b")}</em></h1>
              <p className="ld-lead">{t("hero.lead")}</p>
              <div className="ld-cta">
                <a className="btn btn-primary btn-lg" href="#advisor">{t("hero.ctaFind")}</a>
                <Link className="btn btn-ghost btn-lg" href={rich[0] ? racePath(rich[0], lang) : racesPath(lang)}>{t("hero.ctaSee")}</Link>
              </div>
              {isAlpha() ? <p className="note">{t("alpha.note")}</p> : null}
              <div className="ld-devices">{DEVICE_CHIPS.map((c) => <span key={c.n} className={`ld-chip ${c.on ? "on" : ""}`}>{c.n}</span>)}</div>
            </div>
            <div className="ld-stats">
              <div className="ld-stat"><b className="num">{full.length}</b><span>{t("stat.full", { year })}</span></div>
              <div className="ld-stat"><b className="num">{half.length}</b><span>{t("stat.half", { year })}</span></div>
              <div className="ld-stat"><b className="num">3</b><span>{t("stat.legs")}</span></div>
              <div className="ld-stat"><b className="num">7 d</b><span>{t("stat.review")}</span></div>
            </div>
          </div>
        </div>
        <section id="advisor" className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-sechead">
              <div><p className="mono">{t("adv.kicker")}</p><h2>{t("adv.h2a")} <em>{t("adv.h2b")}</em></h2></div>
              <p>{t("adv.intro")}</p>
            </div>
            <RaceAdvisor races={races} lang={lang} dict={dict} />
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap ld-calcteaser">
            <div><h2>{t("calc.calcH")}</h2><p>{t("calc.calcT")}</p></div>
            <Link className="btn btn-primary btn-lg" href={`/${lang}/calc`}>{t("calc.openCalc")}</Link>
          </div>
        </section>
        <section id="calendario" className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-sechead">
              <div><p className="mono">{t("cal.kicker", { year })}</p><h2>{t("cal.h2a")} <em>{t("cal.h2b")}</em></h2></div>
              <Link className="btn btn-ghost" href={racesPath(lang)}>{t("cal.all")}</Link>
            </div>
            <div className="ld-cal">{races.slice(0, 12).map((r) => <RaceCard key={r.id} r={r} lang={lang} t={t} />)}</div>
            <p className="note">{t("cal.note")}</p>
          </div>
        </section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
