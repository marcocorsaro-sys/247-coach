import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { isLang, LANGS, OG_LOCALE, RACES_SEG, racesPath, type Lang } from "@/lib/i18n/config";
import { getDict, tr } from "@/lib/i18n";
import { listRaces } from "@/lib/site/races";
import { SiteFooter, SiteNav } from "@/components/site/SiteShell";
import RaceBrowser from "@/components/site/RaceBrowser";

export const revalidate = 3600;
type Props = { params: Promise<{ lang: string; section: string }> };

export function generateStaticParams() {
  return isAiCoachMode() ? LANGS.map((lang) => ({ lang, section: RACES_SEG[lang] })) : [];
}

function check(lang: string, section: string): Lang {
  if (!isLang(lang)) notFound();
  if (section !== RACES_SEG[lang]) permanentRedirect(racesPath(lang));
  return lang;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: l, section } = await params;
  if (!isLang(l) || section !== RACES_SEG[l]) return {};
  const t = tr(await getDict(l));
  const year = String(new Date().getFullYear() + 1);
  return {
    title: `${t("races.h1a")} ${t("races.h1b")} · ${t("races.kicker", { year })} · 24/7 Coach`,
    description: t("races.lead"),
    alternates: { canonical: racesPath(l), languages: Object.fromEntries(LANGS.map((x) => [x, racesPath(x)])) },
    openGraph: { locale: OG_LOCALE[l] },
  };
}

export default async function RacesPage({ params }: Props) {
  if (!isAiCoachMode()) notFound();
  const { lang: l, section } = await params;
  const lang = check(l, section);
  const dict = await getDict(lang);
  const t = tr(dict);
  const races = await listRaces(lang);
  const year = races[0]?.race_date?.slice(0, 4) ?? "";
  const alt = Object.fromEntries(LANGS.map((x) => [x, racesPath(x)]));
  return (
    <div className="ld">
      <SiteNav lang={lang} t={t} active="gare" altPaths={alt} />
      <main>
        <div className="ld-rhead">
          <div className="ld-wrap">
            <p className="mono">{t("races.kicker", { year })}</p>
            <h1 style={{ marginTop: 8 }}>{t("races.h1a")} <em>{t("races.h1b")}</em></h1>
            <p className="ld-lead">{t("races.lead")}</p>
          </div>
        </div>
        <section className="ld-sec" id="gare">
          <div className="ld-wrap">
            {races.length ? <RaceBrowser races={races} lang={lang} dict={dict} /> : <div className="ld-empty"><b>{t("races.loading")}</b>{t("races.loadingText")}</div>}
            <p className="note">{t("cal.note")}</p>
          </div>
        </section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
