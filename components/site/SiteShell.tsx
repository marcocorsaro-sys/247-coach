// Cornice del sito pubblico 24/7 Coach: nav con lingua e disclaimer, footer.
import Link from "next/link";
import "@/app/site.css";
import { LANGS, LANG_NAME, racesPath, sitePath, type Lang } from "@/lib/i18n/config";
import type { T } from "@/lib/i18n";
import { magPath, ml } from "@/lib/site/magazine-i18n";
import LangSwitch from "./LangSwitch";
import AppLink from "./AppLink";

export const ALPHA_UNTIL = "2026-12-31";
export function isAlpha(): boolean {
  return new Date() <= new Date(ALPHA_UNTIL + "T23:59:59+01:00");
}

export function SiteNav({ lang, t, active, altPaths }: { lang: Lang; t: T; active?: "gare" | "advisor" | "calc" | "magazine"; altPaths?: Partial<Record<Lang, string>> }) {
  const alpha = isAlpha();
  return (
    <header className="ld-top">
      <div className="ld-wrap">
        <Link className="brand" href={sitePath(lang)}>
          <span className="dot">24</span>
          <span className="name">24/7 <em>Coach</em></span>
        </Link>
        <nav className="ld-tabs">
          <Link href={racesPath(lang)} className={active === "gare" ? "on" : ""}>{t("nav.races")}</Link>
          <Link href={magPath(lang)} className={active === "magazine" ? "on" : ""}>{ml(lang, "title")}</Link>
          <Link href={`/${lang}/calc`} className={active === "calc" ? "on" : ""}>{t("nav.calc")}</Link>
          <Link href={`${sitePath(lang)}#advisor`} className={active === "advisor" ? "on" : ""}>{t("nav.advisor")}</Link>
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
  );
}

export function SiteFooter({ t }: { t: T }) {
  return (
    <footer className="ld-foot">
      <div className="ld-wrap">
        <span>{t("footer.tag")} · {new Date().getFullYear()}</span>
        <span>{t("disc.footer")}</span>
        <span>24/7 Coach è una soluzione di <a href="https://77os.it/it" target="_blank" rel="noopener">77OS</a> · 77OS S.R.L. · P.IVA 11689230966 · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
      </div>
    </footer>
  );
}

export const DEVICE_CHIPS: { n: string; on?: boolean }[] = [
  { n: "Garmin", on: true }, { n: "Suunto" }, { n: "COROS" }, { n: "Polar" }, { n: "Wahoo" }, { n: "Zwift" },
  { n: "Strava", on: true }, { n: "Intervals.icu", on: true }, { n: "FIT / GPX" },
];
