import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { getRaceBundle, racePath, raceSeg, raceTitle, slugFromPath } from "@/lib/site/races";
import { isLang, LANGS, OG_LOCALE, RACES_SEG, racesPath, type Lang } from "@/lib/i18n/config";
import { getDict, tr, type DictKey } from "@/lib/i18n";
import { mdToHtml } from "@/lib/site/md";
import { availableLangs, seoFor } from "@/lib/site/seoLangs";
import { SiteFooter, SiteNav } from "@/components/site/SiteShell";

export const revalidate = 3600;
type Props = { params: Promise<{ lang: string; section: string; slug: string; article: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, section, slug, article } = await params;
  if (!isLang(lang) || section !== RACES_SEG[lang]) return {};
  const b = await getRaceBundle(slugFromPath(slug), lang);
  const a = b?.articles.find((x) => x.slug === article);
  if (!b || !a) return {};
  const y = b.race.race_date?.slice(0, 4) ?? "";
  return {
    title: `${a.title} · ${raceTitle(b.race)} ${y} · 24/7 Coach`, description: a.dek ?? undefined,
    ...seoFor(lang, await availableLangs("event_race_article_translations", (a as unknown as { id: string }).id), (l) => `${racePath(b.race, l)}/${a.slug}`),
    openGraph: { locale: OG_LOCALE[lang], type: "article" },
  };
}

export default async function ArticlePage({ params }: Props) {
  if (!isAiCoachMode()) notFound();
  const { lang: l, section, slug, article } = await params;
  if (!isLang(l)) notFound();
  const lang: Lang = l;
  const b = await getRaceBundle(slugFromPath(slug), lang);
  const a = b?.articles.find((x) => x.slug === article);
  if (!b || !a) notFound();
  if (section !== RACES_SEG[lang] || slug !== raceSeg(b.race)) permanentRedirect(`${racePath(b.race, lang)}/${a.slug}`);
  const t = tr(await getDict(lang));
  const cited = b.sources.filter((s) => (a as unknown as { source_ids?: string[] }).source_ids?.includes(s.id));
  const alt = Object.fromEntries(LANGS.map((x) => [x, `${racePath(b.race, x)}/${a.slug}`]));
  return (
    <div className="ld">
      <SiteNav lang={lang} t={t} active="gare" altPaths={alt} />
      <main>
        <div className="ld-rhead">
          <div className="ld-wrap">
            <div className="ld-crumbs mono"><Link href={racesPath(lang)}>{t("nav.races")}</Link><span>›</span><Link href={racePath(b.race, lang)}>{raceTitle(b.race)}</Link><span>›</span><span>{t(`topic.${a.topic}` as DictKey)}</span></div>
            <p className="mono">{a.author_type === "ai" ? t("art.aiLong") : a.author_type === "athlete" ? t("art.athlete") : t("art.editorial")}{a.reading_min ? ` · ${t("art.min", { n: a.reading_min })}` : ""}{a.edition_year ? ` · ${t("rev.edition", { y: a.edition_year })}` : ""}</p>
            <h1 style={{ marginTop: 8, fontSize: "clamp(2rem,5vw,3.6rem)" }}>{a.title}</h1>
            {a.dek ? <p className="ld-lead">{a.dek}</p> : null}
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(a.body_md) }} />
            {cited.length ? (
              <div style={{ marginTop: 28 }}>
                <p className="lab">{t("art.cited")}</p>
                <div className="ld-srcs" style={{ marginTop: 10 }}>
                  {cited.map((s) => <a key={s.id} className="ld-src" href={s.url} target="_blank" rel="noopener"><span className="k">{t(`kind.${s.kind}` as DictKey)}</span><span><span className="t">{s.title ?? s.url}</span><span className="a">{[s.author, s.platform, s.edition_year].filter(Boolean).join(" · ")}</span></span></a>)}
                </div>
              </div>
            ) : null}
            <div className="ld-cta"><Link className="btn btn-primary" href={`${racePath(b.race, lang)}#piano`}>{t("race.ctaPlan", { name: b.race.name })}</Link><Link className="btn btn-ghost" href={racePath(b.race, lang)}>{t("art.back")}</Link></div>
          </div>
        </section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
