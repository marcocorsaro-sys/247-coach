// Cornice del sito pubblico 24/7 Coach: nav con lingua e disclaimer, footer.
import Link from "next/link";
import "@/app/site.css";
import { LANGS, LANG_NAME, racesPath, sitePath, type Lang } from "@/lib/i18n/config";
import type { T } from "@/lib/i18n";
import { magPath, ml } from "@/lib/site/magazine-i18n";
import LangSwitch from "./LangSwitch";
import AppLink from "./AppLink";
import GeoLangHint from "./GeoLangHint";
import { COACH_PAGES, FOOT, PAGE_NAME, coachLang, coachPath } from "@/lib/site/coach";
import { ATH, athLang, athletesPath } from "@/lib/site/athletes";
import SiteSearch, { type SearchTxt } from "./SiteSearch";

export const ALPHA_UNTIL = "2026-12-31";
export function isAlpha(): boolean {
  return new Date() <= new Date(ALPHA_UNTIL + "T23:59:59+01:00");
}

/** Testi della ricerca unica (inglese e italiano; le altre lingue usano l'inglese). */
export function searchTxt(lang: Lang): SearchTxt {
  const x = ATH[athLang(lang)];
  return { open: x.sOpen, ph: x.sPh, races: x.sRaces, athletes: x.sAthletes, none: x.sNone, race1: x.race1, raceN: x.raceN, allAth: x.sAllAth };
}

export function SiteNav({ lang, t, active, altPaths }: { lang: Lang; t: T; active?: "gare" | "advisor" | "calc" | "magazine" | "coach" | "how"; altPaths?: Partial<Record<Lang, string>> }) {
  const alpha = isAlpha();
  const hrefs = Object.fromEntries(LANGS.map((l) => [l, altPaths?.[l] ?? sitePath(l)]));
  return (
    <>
    <GeoLangHint lang={lang} hrefs={hrefs} />
    <header className="ld-top">
      <div className="ld-wrap">
        <Link className="brand" href={sitePath(lang)}>
          <span className="dot">24</span>
          <span className="name">24/7 <em>Coach</em></span>
        </Link>
        <nav className="ld-tabs">
          <Link href={racesPath(lang)} className={active === "gare" ? "on" : ""}>{t("nav.races")}</Link>
          <Link href={coachPath(lang)} className={active === "coach" ? "on" : ""}>{t("nav.coach")}</Link>
          <Link href={coachPath(lang, "how")} className={active === "how" ? "on" : ""}>{t("nav.how")}</Link>
          <Link href={magPath(lang)} className={active === "magazine" ? "on" : ""}>{ml(lang, "title")}</Link>
          <SiteSearch lang={lang} txt={searchTxt(lang)} athletesHref={athletesPath(lang)} />
          <AppLink login={t("nav.login")} app={lang === "it" ? "La mia app" : "My app"} />
          <Link href="/registrati" className="btn btn-primary btn-sm">{alpha ? t("nav.startFree") : t("nav.start")}</Link>
          <LangSwitch lang={lang} langs={LANGS.map((l) => ({ code: l, name: LANG_NAME[l], href: altPaths?.[l] ?? sitePath(l) }))} />
        </nav>
        <p className="ld-disc">
          {alpha ? <span className="ld-alpha">{t("alpha.label")}</span> : null}
          {t("disc.header")}
        </p>
      </div>
    </header>
    </>
  );
}

export function SiteFooter({ t, lang = "en" }: { t: T; lang?: Lang }) {
  const l = coachLang(lang), f = FOOT[l];
  return (
    <footer className="ld-foot">
      <div className="ld-wrap ld-fcols">
        <div>
          <b>{f.races}</b>
          <Link href={racesPath(lang)}>{f.all}</Link>
          <Link href={`${sitePath(lang)}#advisor`}>{f.find}</Link>
          <Link href={athletesPath(lang)}>{ATH[l].nav}</Link>
          <Link href={magPath(lang)}>{f.mag}</Link>
        </div>
        <div>
          <b>{f.coach}</b>
          {COACH_PAGES.map((k) => <Link key={k} href={coachPath(lang, k)}>{PAGE_NAME[l][k]}</Link>)}
        </div>
        <div>
          <b>{f.tools}</b>
          <Link href={`/${lang}/calc`}>{f.calc}</Link>
        </div>
        <div>
          <b>{f.company}</b>
          <Link href="/diventa-coach">{f.forCoaches}</Link>
          <a href="https://www.instagram.com/247coachai/" target="_blank" rel="noopener">Instagram</a>
          <a href="https://www.linkedin.com/company/247coach/" target="_blank" rel="noopener">LinkedIn</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
      <div className="ld-wrap">
        <span>{t("footer.tag")} · {new Date().getFullYear()}</span>
        <span>{t("disc.footer")}</span>
        <span>{f.legal} <a href="https://77os.it/it" target="_blank" rel="noopener">77OS</a> · 77OS S.R.L. · {l === "it" ? "P.IVA" : "VAT"} 11689230966</span>
      </div>
    </footer>
  );
}

export const DEVICE_CHIPS: { n: string; on?: boolean }[] = [
  { n: "Garmin", on: true }, { n: "Suunto", on: true }, { n: "COROS", on: true }, { n: "Polar", on: true }, { n: "Wahoo", on: true }, { n: "Zwift", on: true },
  { n: "Strava", on: true }, { n: "Intervals.icu", on: true },
];
