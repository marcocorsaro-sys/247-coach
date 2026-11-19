// Home pubblica di 24/7 Coach per lingua: la gara in alto, il coach subito sotto,
// poi i tre tempi (scegli, capisci, allenati), l'advisor e il calendario.
import Link from "next/link";
import { DEVICE_CHIPS, isAlpha, SiteFooter, SiteNav } from "./SiteShell";
import RaceAdvisor from "./RaceAdvisor";
import { RaceCard } from "./RaceCard";
import { Thread } from "./CoachBits";
import { hasRichContent, racePath, type Race } from "@/lib/site/races";
import { LANGS, racesPath, type Lang } from "@/lib/i18n/config";
import { getDict, tr } from "@/lib/i18n";
import { PERSONA, PRICE_EUR, WEEK, coachLang, coachPath } from "@/lib/site/coach";

export default async function Landing({ races, lang }: { races: Race[]; lang: Lang }) {
  const dict = await getDict(lang);
  const t = tr(dict);
  const today = new Date().toISOString().slice(0, 10);
  // In home solo le gare ancora da correre: una gara già corsa non è una scelta.
  const upcoming = races.filter((r) => !r.race_date || r.race_date >= today);
  const full = upcoming.filter((r) => r.distance === "full");
  const half = upcoming.filter((r) => r.distance === "half");
  const sample = upcoming.find(hasRichContent);
  const year = upcoming.find((r) => r.race_date && r.race_date.slice(0, 4) > today.slice(0, 4))?.race_date?.slice(0, 4) ?? String(new Date().getFullYear() + 1);
  const alpha = isAlpha();
  const cl = coachLang(lang), p = PERSONA[cl];
  return (
    <div className="ld">
      <SiteNav lang={lang} t={t} />
      <main>
        <div className="ld-hero">
          <div className="ld-wrap">
            <div>
              <p className="mono">{t("hero.kicker", { year })}</p>
              <h1>{t("hero.h1a")}<br /><em>{t("hero.h1b")}</em></h1>
              <p className="ld-lead">{t("hero.lead")}</p>
              <div className="ld-cta">
                <a className="btn btn-primary btn-lg" href="#advisor">{t("hero.ctaFind")}</a>
                <Link className="btn btn-ghost btn-lg" href={coachPath(lang)}>{t("hero.ctaSee")}</Link>
              </div>
            </div>
            <div className="ld-stats">
              <div className="ld-stat"><b className="num">{full.length}</b><span>{t("stat.full", { year })}</span></div>
              <div className="ld-stat"><b className="num">{half.length}</b><span>{t("stat.half", { year })}</span></div>
              <div className="ld-stat"><b className="num">3</b><span>{t("stat.legs")}</span></div>
              <div className="ld-stat"><b className="num">{LANGS.length}</b><span>{t("stat.langs")}</span></div>
            </div>
          </div>
        </div>

        <section className="ld-sec ld-band">
          <div className="ld-wrap ld-csplit">
            <div>
              <p className="mono">{alpha ? t("home.bandK") : t("nav.coach")}</p>
              <h2>{t("home.bandH1")} <em>{t("home.bandH2")}</em></h2>
              <p className="ld-lead">{t("home.bandP")}</p>
              <div className="ld-cwho">
                <p><b>{t("home.row1t")}</b> {t("home.row1p")}</p>
                <p><b>{t("home.row2t")}</b> {t("home.row2p")}</p>
                <p><b>{t("home.row3t")}</b> {t("home.row3p")}</p>
              </div>
              <div className="ld-cta">
                <Link className="btn btn-primary btn-lg" href={coachPath(lang, "week")}>{t("home.bandCta")}</Link>
                <Link className="btn btn-ghost btn-lg" href={`/registrati?lang=${cl}&from=home-band`}>{alpha ? t("nav.startFree") : t("nav.start")}</Link>
              </div>
              <div className="ld-devices">{DEVICE_CHIPS.map((c) => <span key={c.n} className={`ld-chip ${c.on ? "on" : ""}`}>{c.n}</span>)}</div>
            </div>
            <div>
              <Thread msgs={WEEK[cl].talks[0].msgs} me={p.a} coach={p.c} channel={WEEK[cl].talks[0].ch} />
              <p className="note">{t("home.example")}</p>
            </div>
          </div>
        </section>

        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{t("home.stepsH1")} <em>{t("home.stepsH2")}</em></h2>
            <div className="ld-grid ld-g3 ld-c3steps">
              <a className="ld-card ld-clink" href="#advisor"><span className="lab num">01</span><b>{t("home.step1t")}</b><span>{t("home.step1p")}</span></a>
              <Link className="ld-card ld-clink" href={sample ? racePath(sample, lang) : racesPath(lang)}><span className="lab num">02</span><b>{t("home.step2t")}</b><span>{t("home.step2p")}</span></Link>
              <Link className="ld-card ld-clink" href={coachPath(lang)}><span className="lab num">03</span><b>{t("home.step3t")}</b><span>{t("home.step3p")}</span></Link>
            </div>
          </div>
        </section>

        <section id="advisor" className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-sechead">
              <div><p className="mono">{t("adv.kicker")}</p><h2>{t("adv.h2a")} <em>{t("adv.h2b")}</em></h2></div>
              <p>{t("adv.intro")}</p>
            </div>
            <RaceAdvisor races={upcoming} lang={lang} dict={dict} />
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
            <div className="ld-cal">{upcoming.slice(0, 12).map((r) => <RaceCard key={r.id} r={r} lang={lang} t={t} />)}</div>
            <p className="note">{t("cal.note")}</p>
          </div>
        </section>
        <section className="ld-sec ld-cclose">
          <div className="ld-wrap">
            <h2>{alpha ? t("home.closeH") : t("home.closeHpaid")}</h2>
            <p className="ld-lead">{alpha ? t("home.closeP", { price: PRICE_EUR }) : t("home.closePpaid", { price: PRICE_EUR })}</p>
            <div className="ld-cta">
              <Link className="btn btn-primary btn-lg" href={`/registrati?lang=${cl}&from=home-close`}>{alpha ? t("nav.startFree") : t("nav.start")}</Link>
              <Link className="btn btn-ghost btn-lg" href={coachPath(lang, "pricing")}>{lang === "it" ? "Prezzi e domande" : "Pricing & FAQ"}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={lang} />
    </div>
  );
}
