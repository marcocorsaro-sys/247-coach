import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { fmtDate, getRaceBundle, hasRichContent, listRaces, racePath, raceSeg, raceTitle, slugFromPath, weeksUntil } from "@/lib/site/races";
import { isLang, LANGS, LOCALE, OG_LOCALE, RACES_SEG, racesPath, type Lang } from "@/lib/i18n/config";
import { getDict, tr, type DictKey } from "@/lib/i18n";
import { isAlpha, SiteFooter, SiteNav } from "@/components/site/SiteShell";
import { BikeProfile } from "@/components/site/BikeProfile";
import RaceFunnel from "@/components/site/RaceFunnel";
import RaceToc, { type TocItem } from "@/components/site/RaceToc";
import KonaTable from "@/components/site/KonaTable";
import { KONA } from "@/lib/site/kona";
import GearSection from "@/components/site/GearSection";
import RaceTools from "@/components/site/RaceTools";
import { kitRace } from "@/lib/site/racekit";
import { ArticlesList, MediaFull, MediaHighlights, PlacesSections, pickMedia, SourcesList } from "@/components/site/RaceContent";

export const revalidate = 3600;
type Props = { params: Promise<{ lang: string; section: string; slug: string }> };

export async function generateStaticParams() {
  if (!isAiCoachMode()) return [];
  const races = await listRaces();
  return LANGS.flatMap((lang) => races.map((r) => ({ lang, section: RACES_SEG[lang], slug: raceSeg(r) })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, section, slug } = await params;
  if (!isLang(lang) || section !== RACES_SEG[lang]) return {};
  const b = await getRaceBundle(slugFromPath(slug), lang);
  if (!b) return {};
  const r = b.race;
  const y = r.race_date?.slice(0, 4) ?? "";
  const t = tr(await getDict(lang));
  return {
    title: `${raceTitle(r)} ${y} · ${t("race.courseKicker")}, ${t("rev.kicker").toLowerCase()}, ${t("tips.kicker").toLowerCase()} · 24/7 Coach`,
    description: r.intro ?? r.tagline ?? undefined,
    alternates: { canonical: racePath(r, lang), languages: Object.fromEntries(LANGS.map((l) => [l, racePath(r, l)])) },
    openGraph: { title: `${raceTitle(r)} ${y}`, description: r.tagline ?? undefined, url: racePath(r, lang), type: "article", locale: OG_LOCALE[lang] },
  };
}

const LEGS = ["swim", "bike", "run"] as const;
const SCORE: Record<string, DictKey> = { swim: "score.swim", bike: "score.bike", run: "score.run", org: "score.org", logistics: "score.logistics" };

export default async function RacePage({ params }: Props) {
  if (!isAiCoachMode()) notFound();
  const { lang: l, section, slug } = await params;
  if (!isLang(l)) notFound();
  const lang: Lang = l;
  const b = await getRaceBundle(slugFromPath(slug), lang);
  if (!b) notFound();
  const { race: r, segments, reviews, sources, articles, media, places } = b;
  if (section !== RACES_SEG[lang] || slug !== raceSeg(r)) permanentRedirect(racePath(r, lang));
  const dict = await getDict(lang);
  const t = tr(dict);
  const loc = LOCALE[lang];
  const rich = hasRichContent(r);
  const weeks = weeksUntil(r.race_date);
  const year = r.race_date?.slice(0, 4) ?? "";
  const title = raceTitle(r);
  const fmtKm = (n: number | null) => (n == null ? "" : n.toLocaleString(loc, { maximumFractionDigits: 1 }));
  const bikeSegs = segments.filter((s) => s.leg === "bike");
  const alt = Object.fromEntries(LANGS.map((x) => [x, racePath(r, x)]));
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://247coachai.com";
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "SportsEvent", name: `${title} ${year}`, sport: "Triathlon", startDate: r.race_date ?? undefined,
      eventStatus: r.date_confirmed ? "https://schema.org/EventScheduled" : undefined, inLanguage: lang,
      location: { "@type": "Place", name: [r.city, r.region, r.country].filter(Boolean).join(", "), address: { "@type": "PostalAddress", addressLocality: r.city ?? undefined, addressCountry: r.country ?? undefined } },
      description: r.intro ?? r.tagline ?? undefined, url: `${base}${racePath(r, lang)}` },
    r.faq?.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: r.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null,
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: t("nav.races"), item: `${base}${racesPath(lang)}` },
      { "@type": "ListItem", position: 2, name: `${title} ${year}`, item: `${base}${racePath(r, lang)}` } ] },
  ].filter(Boolean);

  const pm = pickMedia(media);
  const hasPlace = (kinds: string[]) => places.some((p) => kinds.includes(p.kind));
  const toc: TocItem[] = ([
    rich ? { id: "percorso", label: t("toc.course") } : null,
    media.length ? { id: "racconti", label: t("toc.best"), n: pm.hlVideos.length + pm.hlPhotos.length } : null,
    KONA[r.slug] ? { id: "kona", label: t("toc.kona") } : null,
    { id: "recensioni", label: t("toc.reviews") },
    hasPlace(["arrival", "hotel", "spectator"]) ? { id: "viaggio", label: t("toc.travel") } : null,
    hasPlace(["training", "segment"]) ? { id: "allenarsi", label: t("toc.train") } : null,
    r.tips?.length || r.logistics?.length ? { id: "consigli", label: t("toc.tips") } : null,
    articles.length ? { id: "articoli", label: t("toc.articles"), n: articles.length } : null,
    { id: "attrezzatura", label: t("toc.gear") },
    { id: "kit", label: t("toc.kit") },
    pm.restVideos.length + pm.restPhotos.length + pm.voices.length ? { id: "galleria", label: t("toc.gallery"), n: pm.restVideos.length + pm.restPhotos.length } : null,
    sources.length ? { id: "fonti", label: t("toc.sources") } : null,
  ] as (TocItem | null)[]).filter((x): x is TocItem => x !== null);

  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav lang={lang} t={t} active="gare" altPaths={alt} />
      <main>
        <div className="ld-rhead">
          <div className="ld-wrap">
            <div className="ld-crumbs mono"><Link href={racesPath(lang)}>{t("nav.races")}</Link><span>›</span><span>{r.country}</span><span>›</span><span>{title}</span></div>
            <p className="mono">{r.distance === "full" ? t("race.full") : t("race.half")} · {fmtDate(r.race_date, { day: "numeric", month: "long", year: "numeric" }, loc)}{r.date_confirmed ? "" : ` ${t("race.tbc")}`} · {[r.city, r.region].filter(Boolean).join(", ")}</p>
            <h1 style={{ marginTop: 8 }}>{title} <em>{year}</em></h1>
            <p className="ld-lead" style={{ maxWidth: "62ch" }}>{r.intro ?? r.tagline}</p>
            {r.kpis?.length ? (
              <div className="ld-kpis">{r.kpis.map((k) => <div className="ld-kpi" key={k.v + k.l}><b className="num">{k.v}</b><span>{k.l}</span></div>)}</div>
            ) : (
              <div className="ld-kpis">
                <div className="ld-kpi"><b className="num">{fmtKm(r.swim_km)} km</b><span>{t("leg.swim")} · {r.water_type ? t(`water.${r.water_type}` as DictKey) : "—"}</span></div>
                <div className="ld-kpi"><b className="num">{fmtKm(r.bike_km)} km</b><span>{t("leg.bike")} · {r.bike_dplus_m == null ? "—" : r.bike_dplus_m.toLocaleString(loc)} m D+</span></div>
                <div className="ld-kpi"><b className="num">{fmtKm(r.run_km)} km</b><span>{t("leg.run")} · {r.run_flat == null ? "—" : r.run_flat ? t("card.flatRun") : t("card.hillyRun")}</span></div>
                {weeks !== null ? <div className="ld-kpi"><b className="num">{weeks}</b><span>{t("race.weeks")}</span></div> : null}
              </div>
            )}
            <div className="ld-cta">
              <a className="btn btn-primary btn-lg" href={`/registrati?race=${encodeURIComponent(r.slug)}&lang=${lang}`}>{t("race.ctaPlan", { name: r.name })}</a>
              <a className="btn btn-ghost btn-lg" href="#recensioni">{t("race.ctaReviews")}</a>
            </div>
          </div>
        </div>

        <RaceToc title={t("toc.h")} items={toc} />

        {rich ? (
          <section id="percorso" className="ld-sec">
            <div className="ld-wrap">
              <div className="ld-sechead">
                <div><p className="mono">{t("race.courseKicker")}</p><h2>{t("race.courseH2a")} <em>{t("race.courseH2b")}</em></h2></div>
                <p>{r.course_version ? `${t("race.courseVersion", { v: r.course_version })} ` : ""}{t("race.courseNote")}</p>
              </div>
              <div className="ld-legs">
                {LEGS.map((leg) => {
                  const bullets = r.legs?.[leg]?.bullets ?? [];
                  const meta = leg === "swim" ? `${fmtKm(r.swim_km)} km` : leg === "bike" ? `${fmtKm(r.bike_km)} km · ${r.bike_dplus_m == null ? "—" : r.bike_dplus_m.toLocaleString(loc)} m D+` : `${fmtKm(r.run_km)} km`;
                  return (
                    <div className={`ld-leg ${leg[0]}`} key={leg}>
                      <h3><span>{t(`leg.${leg}` as DictKey)}</span><span className="mono">{meta}</span></h3>
                      {leg === "bike" && r.profile ? <BikeProfile profile={r.profile} bikeKm={r.bike_km ?? 180} /> : null}
                      <ul>{bullets.map((x) => <li key={x}>{x}</li>)}</ul>
                    </div>
                  );
                })}
              </div>
              {bikeSegs.length ? (
                <div className="ld-card" style={{ marginTop: 20 }}>
                  <p className="lab">{t("race.segments")}</p>
                  <div className="ld-segs" style={{ marginTop: 12 }}>
                    {bikeSegs.map((s) => (
                      <div className={`ld-segrow ${s.kind ?? ""}`} key={s.id}>
                        <span className="km">km {s.km_from}-{s.km_to}</span>
                        <span className="t">{s.title}{s.note ? <small>{s.note}</small> : null}</span>
                        <span className="g">{s.grade_pct != null && s.grade_pct !== 0 ? `${s.grade_pct > 0 ? "+" : ""}${s.grade_pct} %` : t("race.flat")}{s.dplus_m ? ` · ${s.dplus_m} m D+` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="ld-grid ld-g2" style={{ marginTop: 20 }}>
                {r.splits?.length ? (
                  <div className="ld-card">
                    <p className="lab">{t("race.athlete")}</p>
                    <div className="ld-tw" style={{ marginTop: 10 }}>
                      <table>
                        <thead><tr><th>{t("race.goal")}</th><th>{t("leg.swim")}</th><th>{t("leg.bike")}</th><th>{t("leg.run")}</th><th>{t("race.total")}</th></tr></thead>
                        <tbody>{r.splits.map((s) => <tr key={s.goal}><td>{s.goal}</td><td className="n">{s.swim}</td><td className="n">{s.bike}</td><td className="n">{s.run}</td><td className="n"><b>{s.total}</b></td></tr>)}</tbody>
                      </table>
                    </div>
                    <p className="note">{t("race.splitsNote")}</p>
                  </div>
                ) : null}
                {r.demands?.length ? (
                  <div className="ld-card">
                    <p className="lab">{t("race.demands")}</p>
                    <div className="ld-gap">{r.demands.map((d) => <div key={d.t}><span>{d.t}</span><b>{d.b}</b></div>)}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className="ld-sec">
            <div className="ld-wrap">
              <div className="ld-empty">
                <b>{t("race.prepB")}</b>
                {t("race.prepText", { name: r.name, swim: fmtKm(r.swim_km), water: t(r.water_type ? (`water.${r.water_type}` as DictKey) : "water.none"), bike: fmtKm(r.bike_km), dplus: r.bike_dplus_m == null ? "—" : r.bike_dplus_m.toLocaleString(loc), run: r.run_flat == null ? "—" : r.run_flat ? t("card.flatRun") : t("card.hillyRun") })}
              </div>
            </div>
          </section>
        )}

        <MediaHighlights race={r} media={media} t={t} />

        {KONA[r.slug] ? <KonaTable data={KONA[r.slug]} t={dict} /> : null}

        <section id="recensioni" className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-sechead">
              <div><p className="mono">{t("rev.kicker")}</p><h2>{t("rev.h2a")} <em>{t("rev.h2b")}</em></h2></div>
              <p>{t("rev.intro")}</p>
            </div>
            <div className="ld-rev">
              {reviews.map((rv) => (
                <div className="ld-card ld-rv" key={rv.id}>
                  <div className="who"><b>{rv.title ?? (rv.source === "verified" ? t("rev.verified") : t("rev.review"))}</b><span className="src">{rv.source === "synthesis" ? rv.sources_note : rv.edition_year ? t("rev.edition", { y: rv.edition_year }) : ""}</span></div>
                  {rv.scores ? <div className="ld-score">{Object.entries(rv.scores).slice(0, 4).map(([k, v]) => <div key={k}><span>{SCORE[k] ? t(SCORE[k]) : k}</span><b>{String(v).replace(".", lang === "en" ? "." : ",")}</b></div>)}</div> : null}
                  {rv.body ? <p>{rv.body}</p> : null}
                  {rv.times ? <p className="src">{t("rev.times")}: {Object.entries(rv.times).map(([k, v]) => `${k} ${v}`).join(" · ")}{rv.wetsuit != null ? ` · ${t("rev.wetsuit")} ${rv.wetsuit ? t("rev.yes") : t("rev.no")}` : ""}{rv.gear ? ` · ${rv.gear}` : ""}</p> : null}
                </div>
              ))}
              <div className="ld-card ld-rv">
                <div className="who"><b>{t("rev.yours")}</b><span className="src">{t("rev.afterRace")}</span></div>
                <p>{t("rev.yoursText")}</p>
                <p className="src">{t("rev.yoursNote")}</p>
              </div>
              {r.faq?.length ? (
                <div className="ld-card ld-rv">
                  <div className="who"><b>{t("rev.faq")}</b><span className="src">{t("rev.faqSrc")}</span></div>
                  <p>{r.faq.map((f) => <span key={f.q}><b>{f.q}</b> {f.a}{" "}</span>)}</p>
                  <p className="src">{t("rev.faqNote")}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <PlacesSections places={places} t={t} />

        {r.tips?.length || r.logistics?.length ? (
          <section id="consigli" className="ld-sec">
            <div className="ld-wrap">
              <div className="ld-sechead"><div><p className="mono">{t("tips.kicker")}</p><h2>{t("tips.h2a")} <em>{t("tips.h2b")}</em></h2></div></div>
              {r.tips?.length ? <div className="ld-tips">{r.tips.map((x) => <div className="ld-tip" key={x.t}><span className="lab">{x.t}</span><p>{x.p}</p></div>)}</div> : null}
              {r.logistics?.length ? <div className="ld-grid ld-g3" style={{ marginTop: 22 }}>{r.logistics.map((x) => <div className="ld-card" key={x.t}><p className="lab">{x.t}</p><p style={{ color: "var(--text-2)", marginTop: 8 }}>{x.p}</p></div>)}</div> : null}
            </div>
          </section>
        ) : null}

        <ArticlesList race={r} articles={articles} lang={lang} t={t} />

        <GearSection race={r} t={dict} />

        <section id="kit" className="ld-sec"><div className="ld-wrap">
          <div className="ld-sechead"><div><p className="mono">{t("kit.kicker")}</p><h2>{t("kit.h1a")} <em>{t("kit.h1b")}</em></h2><p style={{ color: "var(--text-2)", marginTop: 8, maxWidth: "62ch" }}>{t("kit.lead")}</p></div></div>
          <RaceTools race={kitRace(r)} t={dict} />
        </div></section>

        <MediaFull media={media} t={t} />

        <SourcesList race={r} sources={sources} t={t} />
        <section className="ld-sec"><div className="ld-wrap ld-calcteaser">
          <div><h2>{t("calc.calcH")}</h2><p>{t("calc.calcT")}</p></div>
          <Link className="btn btn-ghost btn-lg" href={`/${lang}/calc?race=${r.slug}`}>{t("calc.openCalc")}</Link>
        </div></section>
        <RaceFunnel race={r} weeks={weeks} lang={lang} dict={dict} alpha={isAlpha()} />
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
