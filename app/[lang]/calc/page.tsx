import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { isLang, LANGS, OG_LOCALE, type Lang } from "@/lib/i18n/config";
import { getDict, tr } from "@/lib/i18n";
import { listRaces, raceTitle } from "@/lib/site/races";
import { isAlpha, SiteFooter, SiteNav } from "@/components/site/SiteShell";
import PerformanceCalc, { type CalcRace } from "@/components/site/PerformanceCalc";

export const revalidate = 3600;
type Props = { params: Promise<{ lang: string }> };

const calcPath = (l: Lang) => `/${l}/calc`;
export function generateStaticParams() { return isAiCoachMode() ? LANGS.map((lang) => ({ lang })) : []; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: l } = await params;
  if (!isLang(l)) return {};
  const t = tr(await getDict(l));
  return {
    title: `${t("calc.kicker")} · ${t("calc.h1a")} ${t("calc.h1b")} · 24/7 Coach`,
    description: t("calc.lead"),
    alternates: { canonical: calcPath(l), languages: Object.fromEntries(LANGS.map((x) => [x, calcPath(x)])) },
    openGraph: { locale: OG_LOCALE[l] },
  };
}

export default async function CalcPage({ params }: Props) {
  if (!isAiCoachMode()) notFound();
  const { lang: l } = await params;
  if (!isLang(l)) notFound();
  const lang = l;
  const dict = await getDict(lang);
  const t = tr(dict);
  const races: CalcRace[] = (await listRaces(lang)).map((r) => ({
    slug: r.slug, label: `${raceTitle(r)} · ${r.race_date?.slice(0, 4) ?? ""}`, distance: r.distance, swim_km: r.swim_km, bike_km: r.bike_km, bike_dplus_m: r.bike_dplus_m,
    run_km: r.run_km, run_flat: r.run_flat, heat_idx: r.heat_idx, wind_idx: r.wind_idx, water_type: r.water_type,
  }));
  const alt = Object.fromEntries(LANGS.map((x) => [x, calcPath(x)]));
  return (
    <div className="ld">
      <SiteNav lang={lang} t={t} active="calc" altPaths={alt} />
      <main>
        <div className="ld-rhead">
          <div className="ld-wrap">
            <p className="mono">{t("calc.kicker")}</p>
            <h1 style={{ marginTop: 8 }}>{t("calc.h1a")} <em>{t("calc.h1b")}</em></h1>
            <p className="ld-lead">{t("calc.lead")}</p>
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap"><PerformanceCalc races={races} lang={lang} dict={dict} alpha={isAlpha()} /></div>
        </section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
