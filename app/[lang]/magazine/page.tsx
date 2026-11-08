import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { isLang, LANGS, OG_LOCALE, type Lang } from "@/lib/i18n/config";
import { getDict, tr } from "@/lib/i18n";
import { SiteFooter, SiteNav } from "@/components/site/SiteShell";
import { listPosts } from "@/lib/site/magazine-read";
import { magPath, ml } from "@/lib/site/magazine-i18n";

export const revalidate = 1800;
type Props = { params: Promise<{ lang: string }> };

export function generateStaticParams() { return isAiCoachMode() ? LANGS.map((lang) => ({ lang })) : []; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: `${ml(lang, "title")} · 24/7 Coach`, description: ml(lang, "lead"), alternates: { canonical: magPath(lang), languages: Object.fromEntries(LANGS.map((l) => [l, magPath(l)])) }, openGraph: { locale: OG_LOCALE[lang] } };
}

export default async function MagazinePage({ params }: Props) {
  if (!isAiCoachMode()) notFound();
  const { lang: l } = await params;
  if (!isLang(l)) notFound();
  const lang: Lang = l;
  const t = tr(await getDict(lang));
  const posts = await listPosts(lang);
  const alt = Object.fromEntries(LANGS.map((x) => [x, magPath(x)]));
  return (
    <div className="ld">
      <SiteNav lang={lang} t={t} active="magazine" altPaths={alt} />
      <main>
        <div className="ld-rhead"><div className="ld-wrap">
          <p className="mono">24/7 COACH</p>
          <h1 style={{ marginTop: 8 }}>{ml(lang, "title")}</h1>
          <p className="ld-lead">{ml(lang, "lead")}</p>
        </div></div>
        <section className="ld-sec"><div className="ld-wrap">
          {posts.length ? (
            <div className="ld-arts">
              {posts.map((p) => (
                <Link key={p.id} href={magPath(lang, p.slug)} className="ld-card ld-art">
                  <span className="mono">{ml(lang, p.kind)}{p.data.race_date ? ` · ${p.data.race_date}` : ""}{p.reading_min ? ` · ${p.reading_min} ${ml(lang, "min")}` : ""}</span>
                  <h3>{p.title}</h3>{p.dek ? <p>{p.dek}</p> : null}
                </Link>
              ))}
            </div>
          ) : <div className="ld-empty"><b>{ml(lang, "title")}</b>{ml(lang, "empty")}</div>}
        </div></section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
