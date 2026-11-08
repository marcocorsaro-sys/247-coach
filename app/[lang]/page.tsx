import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { isLang, LANGS, OG_LOCALE, sitePath } from "@/lib/i18n/config";
import { getDict, tr } from "@/lib/i18n";
import { listRaces } from "@/lib/site/races";
import Landing from "@/components/site/Landing";

export const revalidate = 3600;
type Props = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
  return isAiCoachMode() ? LANGS.map((lang) => ({ lang })) : [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = tr(await getDict(lang));
  const year = String(new Date().getFullYear() + 1);
  return {
    title: `24/7 Coach · ${t("hero.h1a")} ${t("hero.h1b")}`,
    description: t("hero.lead"),
    alternates: { canonical: sitePath(lang), languages: Object.fromEntries(LANGS.map((l) => [l, sitePath(l)])) },
    openGraph: { locale: OG_LOCALE[lang], title: `${t("hero.h1a")} ${t("hero.h1b")}`, description: t("hero.kicker", { year }) },
  };
}

export default async function LangHome({ params }: Props) {
  const { lang } = await params;
  if (!isAiCoachMode() || !isLang(lang)) notFound();
  // Il sito si vede sempre, anche da loggati (dall'app si torna qui col link "← Sito";
  // chi digita 247coachai.com da loggato entra invece direttamente nell'app).
  const races = await listRaces(lang);
  return <Landing races={races} lang={lang} />;
}
