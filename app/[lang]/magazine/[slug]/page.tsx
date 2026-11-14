import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { isLang, LANGS, OG_LOCALE, SOURCE_LANG, racesPath, type Lang } from "@/lib/i18n/config";
import { getDict, tr } from "@/lib/i18n";
import { mdToHtml } from "@/lib/site/md";
import { availableLangs, seoFor } from "@/lib/site/seoLangs";
import { SiteFooter, SiteNav } from "@/components/site/SiteShell";
import { getPost } from "@/lib/site/magazine-read";
import { magPath, ml } from "@/lib/site/magazine-i18n";
import type { Finisher } from "@/lib/site/magazine";

export const revalidate = 1800;
type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const p = await getPost(slug, lang);
  if (!p) return {};
  return { title: `${p.title} · 24/7 Coach`, description: p.dek ?? undefined, ...seoFor(lang, await availableLangs("site_magazine_translations", (p as unknown as { id: string }).id), (x) => magPath(x, slug)), openGraph: { locale: OG_LOCALE[lang], type: "article" } };
}

function Table({ rows }: { rows: Finisher[] }) {
  return <div className="kona-tbl"><table><tbody>{rows.map((r, i) => <tr key={i}><td>{r.pos ?? r.div}</td><td>{r.name}{r.country ? ` (${r.country})` : ""}</td><td className="mono">{r.time}</td></tr>)}</tbody></table></div>;
}

export default async function PostPage({ params }: Props) {
  if (!isAiCoachMode()) notFound();
  const { lang: l, slug } = await params;
  if (!isLang(l)) notFound();
  const lang: Lang = l;
  const p = await getPost(slug, lang);
  if (!p) notFound();
  const t = tr(await getDict(lang));
  const alt = Object.fromEntries(LANGS.map((x) => [x, magPath(x, slug)]));
  const res = p.data.results;
  return (
    <div className="ld">
      <SiteNav lang={lang} t={t} active="magazine" altPaths={alt} />
      <main>
        <div className="ld-rhead"><div className="ld-wrap">
          <div className="ld-crumbs mono"><Link href={magPath(lang)}>{ml(lang, "title")}</Link><span>›</span><span>{ml(lang, p.kind)}</span></div>
          <p className="mono">{p.data.race_name ?? ""}{p.data.race_date ? ` · ${p.data.race_date}` : ""}{p.reading_min ? ` · ${p.reading_min} ${ml(lang, "min")}` : ""}</p>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2rem,5vw,3.6rem)" }}>{p.title}</h1>
          {p.dek ? <p className="ld-lead">{p.dek}</p> : null}
        </div></div>
        <section className="ld-sec"><div className="ld-wrap">
          {!p.translated && lang !== SOURCE_LANG ? <p className="note">{ml(lang, "orig")}</p> : null}
          <div className="ld-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(p.body_md) }} />
          {res ? (
            <div style={{ marginTop: 32 }}>
              <p className="lab">{ml(lang, "podium")} · {ml(lang, "stats", { s: res.starters, f: res.finishers, d: res.dnf })}</p>
              <div className="kona-grid">
                <div><h3>{ml(lang, "men")}</h3><Table rows={res.overall.M} /></div>
                <div><h3>{ml(lang, "women")}</h3><Table rows={res.overall.F} /></div>
              </div>
              <h3 style={{ marginTop: 20 }}>{ml(lang, "ag")}</h3>
              <Table rows={res.ag} />
              <p className="note"><a href={res.url} target="_blank" rel="noopener">{res.source}</a></p>
            </div>
          ) : null}
          {p.data.ig?.length ? (
            <div style={{ marginTop: 28 }}>
              <p className="lab">{ml(lang, "ig")}</p>
              <div className="ld-srcs" style={{ marginTop: 10 }}>{p.data.ig.map((m, i) => <a key={i} className="ld-src" href={m.url} target="_blank" rel="noopener"><span className="k">IG</span><span><span className="t">@{m.handle}</span></span></a>)}</div>
            </div>
          ) : null}
          <div className="ld-cta">
            {p.data.race_seg ? <Link className="btn btn-primary" href={`${racesPath(lang)}/${p.data.race_seg}`}>{ml(lang, "race")}</Link> : null}
            <Link className="btn btn-ghost" href={magPath(lang)}>{ml(lang, "back")}</Link>
          </div>
        </div></section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
