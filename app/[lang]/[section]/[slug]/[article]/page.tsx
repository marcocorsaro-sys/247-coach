// Pagine sotto una gara: facet con URL parlanti tradotti (percorso nuoto/bici/corsa,
// giorno gara, viaggio e hotel) e, per gli articoli di altri temi, l'articolo.
// I vecchi URL degli articoli-guida (slug italiano) fanno redirect al facet.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { getRaceBundleBySeg, getRaceFacts, racePath, raceSeg, raceTitle, raceTitleSeo, type RaceBundle, type RaceArticle } from "@/lib/site/races";
import { isLang, LANGS, LOCALE, OG_LOCALE, RACES_SEG, racesPath, type Lang } from "@/lib/i18n/config";
import { getDict, tr, type DictKey } from "@/lib/i18n";
import { mdToHtml } from "@/lib/site/md";
import { availableLangs, seoFor } from "@/lib/site/seoLangs";
import { SiteFooter, SiteNav } from "@/components/site/SiteShell";
import { RaceRelated, ServiceBridge, type BridgeKind } from "@/components/site/RaceLinks";
import RaceHistory from "@/components/site/RaceHistory";
import { BikeProfile } from "@/components/site/BikeProfile";
import { PlacesSections } from "@/components/site/RaceContent";
import { DATA_FACET_I18N, FACET_I18N, FACET_UI, TOPIC_FACET, dataFacetBySlug, dataFacetBySlugAnyLang, dataFacetPath, dataFacetsFor, facetBySlug, facetBySlugAnyLang, facetPath, facetsFor, fillData, fillFacet, type DataFacet, type Facet } from "@/lib/site/facets";
import { DataFacetBody, type FactsRow } from "@/components/site/DataFacet";
import { DATA_UI } from "@/lib/site/dataUi";
import { SITE, articleLd, breadcrumbLd, climateDatasetLd, faqLd, offersLd, orgLd, placesLd, raceEventLd, resultsLd, segmentsLd, shopsLd, eventId } from "@/lib/site/jsonld";

export const revalidate = 3600;
type Props = { params: Promise<{ lang: string; section: string; slug: string; article: string }> };

const LEG_FACET: Record<string, "swim" | "bike" | "run"> = { swim: "swim", bike: "bike", run: "run" };
const FAQ_RX: Record<Facet, RegExp> = {
  swim: /nuot|swim|muta|wetsuit|acqua|water|mare|lago|neopren|natation|combinaison|natación|natação|zwem|svøm|sim|uinti|pływ/i,
  bike: /bici|bike|cicl|vento|wind|salit|climb|rad|vélo|velo|fiets|cykel|sykkel|pyörä|rower/i,
  run: /cors|run|marato|lauf|course à pied|carrera|corrida|loop|løb|löp|løp|juoks|bieg/i,
  raceday: /cut|tempo|time|orari|schedule|zeit|partenza|start|t1|t2|cambio|transition/i,
  travel: /hotel|dormire|aeroport|airport|arriv|parcheggi|parking|stay|unterkunft|flug|hébergement|alojamiento|alojamento|overnacht|boende|majoitus|nocleg/i,
};

function facetData(b: RaceBundle, lang: Lang, f: Facet) {
  const r = b.race;
  const art: RaceArticle | undefined = b.articles.find((a) => TOPIC_FACET[a.topic] === f);
  const loc = LOCALE[lang];
  const num = (n: number | null | undefined) => (n == null ? "" : Number(n).toLocaleString(loc, { maximumFractionDigits: 1 }));
  const km = f === "swim" ? num(r.swim_km) : f === "bike" ? num(r.bike_km) : f === "run" ? num(r.run_km) : "";
  const dplus = r.bike_dplus_m != null ? r.bike_dplus_m.toLocaleString(loc) : "";
  const race = raceTitleSeo(r);
  const txt = FACET_I18N[lang][f];
  const title = fillFacet(f === "bike" && !dplus ? txt.title.replace(/,? ?\{dplus\}[^,]*,/, ",") : txt.title, { race, km, dplus });
  const desc = fillFacet(txt.desc, { race, km, dplus });
  return { art, title, desc, km, dplus };
}

function dataTitle(b: RaceBundle, lang: Lang, f: DataFacet, facts: FactsRow | null) {
  const r = b.race;
  const wc = r.distance === "half" ? "IRONMAN 70.3 World Championship" : "IRONMAN World Championship";
  const v = { race: raceTitleSeo(r), year: facts?.results?.year ?? facts?.results_year ?? null, wc };
  const txt = DATA_FACET_I18N[lang][f];
  return { title: fillData(txt.title, v), desc: fillData(txt.desc, v) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, section, slug, article } = await params;
  if (!isLang(lang) || section !== RACES_SEG[lang]) return {};
  const b = await getRaceBundleBySeg(slug, lang);
  if (!b) return {};
  const f = facetBySlug(lang, article);
  if (f) {
    const { art, title, desc } = facetData(b, lang, f);
    const raceLangs = await availableLangs("event_race_translations", b.race.id);
    const artLangs = art ? await availableLangs("event_race_article_translations", art.id) : raceLangs;
    const avail = raceLangs.filter((l) => artLangs.includes(l));
    const path = (l: Lang) => facetPath(racePath(b.race, l), l, f);
    return { title: `${title} · 24/7 Coach`, description: desc, ...seoFor(lang, avail, path), openGraph: { title, description: desc, url: path(lang), locale: OG_LOCALE[lang], type: "article" } };
  }
  const df = dataFacetBySlug(lang, article);
  if (df) {
    const facts = await getRaceFacts(b.race.id);
    const { title, desc } = dataTitle(b, lang, df, facts);
    const avail = await availableLangs("event_race_translations", b.race.id);
    const path = (l: Lang) => dataFacetPath(racePath(b.race, l), l, df);
    return { title: `${title} · 24/7 Coach`, description: desc, ...seoFor(lang, avail, path), openGraph: { title, description: desc, url: path(lang), locale: OG_LOCALE[lang], type: "article" } };
  }
  const a = b.articles.find((x) => x.slug === article);
  if (!a) return {};
  const y = b.race.race_date?.slice(0, 4) ?? "";
  return {
    title: `${a.title} · ${raceTitle(b.race)} ${y} · 24/7 Coach`, description: a.dek ?? undefined,
    ...seoFor(lang, await availableLangs("event_race_article_translations", a.id), (l) => `${racePath(b.race, l)}/${a.slug}`),
    openGraph: { locale: OG_LOCALE[lang], type: "article" },
  };
}

export default async function SubPage({ params }: Props) {
  if (!isAiCoachMode()) notFound();
  const { lang: l, section, slug, article } = await params;
  if (!isLang(l)) notFound();
  const lang: Lang = l;
  const b = await getRaceBundleBySeg(slug, lang);
  if (!b) notFound();
  const facets = facetsFor(b);
  const facts = await getRaceFacts(b.race.id);
  const dfs = dataFacetsFor(facts as Record<string, unknown> | null, b.reviews.length);

  // 1) facet nella lingua giusta
  const f = facetBySlug(lang, article);
  if (f && facets.includes(f)) {
    if (section !== RACES_SEG[lang] || slug !== raceSeg(b.race)) permanentRedirect(facetPath(racePath(b.race, lang), lang, f));
    return <FacetPage b={b} lang={lang} f={f} facets={facets} dfs={dfs} facts={facts} />;
  }
  const df = dataFacetBySlug(lang, article);
  if (df && dfs.includes(df)) {
    if (section !== RACES_SEG[lang] || slug !== raceSeg(b.race)) permanentRedirect(dataFacetPath(racePath(b.race, lang), lang, df));
    return <DataPage b={b} lang={lang} f={df} facets={facets} dfs={dfs} facts={facts!} />;
  }
  // 2) slug di facet di un'altra lingua → facet nella lingua corrente
  const fx = facetBySlugAnyLang(article);
  if (fx && facets.includes(fx)) permanentRedirect(facetPath(racePath(b.race, lang), lang, fx));
  const dfx = dataFacetBySlugAnyLang(article);
  if (dfx && dfs.includes(dfx)) permanentRedirect(dataFacetPath(racePath(b.race, lang), lang, dfx));
  // 3) vecchio URL di un articolo-guida → il suo facet
  const a = b.articles.find((x) => x.slug === article);
  if (!a) notFound();
  const fa = TOPIC_FACET[a.topic];
  if (fa && facets.includes(fa)) permanentRedirect(facetPath(racePath(b.race, lang), lang, fa));
  if (section !== RACES_SEG[lang] || slug !== raceSeg(b.race)) permanentRedirect(`${racePath(b.race, lang)}/${a.slug}`);
  return <ArticleView b={b} lang={lang} a={a} />;
}

async function FacetPage({ b, lang, f, facets, dfs, facts }: { b: RaceBundle; lang: Lang; f: Facet; facets: Facet[]; dfs: DataFacet[]; facts: FactsRow | null }) {
  const t = tr(await getDict(lang));
  const ui = FACET_UI[lang];
  const r = b.race;
  const loc = LOCALE[lang];
  const { art, title, desc, km, dplus } = facetData(b, lang, f);
  const rp = racePath(r, lang);
  const url = facetPath(rp, lang, f);
  const year = r.race_date?.slice(0, 4) ?? "";
  const leg = LEG_FACET[f];
  const bullets = leg ? r.legs?.[leg]?.bullets ?? [] : [];
  const segs = leg ? b.segments.filter((s) => s.leg === leg) : [];
  const faq = (r.faq ?? []).filter((x) => FAQ_RX[f].test(`${x.q} ${x.a}`)).slice(0, 6);
  const places = f === "travel" ? b.places : [];
  const wetsuitVotes = f === "swim" ? b.reviews.filter((x) => x.wetsuit != null) : [];
  const wetsuitYes = wetsuitVotes.filter((x) => x.wetsuit).length;
  const alt = Object.fromEntries(LANGS.map((x) => [x, facetPath(racePath(r, x), x, f)]));
  const words = (art?.body_md ?? "").split(/\s+/).length + bullets.join(" ").split(/\s+/).length;

  const kpis: { v: string; l: string }[] = [];
  if (f === "swim") {
    if (km) kpis.push({ v: `${km} km`, l: [t("leg.swim"), r.water_type ? t(`water.${r.water_type}` as DictKey) : ""].filter(Boolean).join(" · ") });
    if (wetsuitVotes.length) kpis.push({ v: `${Math.round((wetsuitYes / wetsuitVotes.length) * 100)}%`, l: ui.wetsuit });
  } else if (f === "bike") {
    if (km) kpis.push({ v: `${km} km`, l: t("leg.bike") });
    if (dplus) kpis.push({ v: `${dplus} m`, l: "D+" });
    if (segs.length) kpis.push({ v: String(segs.length), l: ui.segments });
  } else if (f === "run") {
    if (km) kpis.push({ v: `${km} km`, l: t("leg.run") });
    if (r.run_flat != null) kpis.push({ v: r.run_flat ? t("card.flatRun") : t("card.hillyRun"), l: t("leg.run") });
  } else if (f === "raceday") {
    if (r.race_date) kpis.push({ v: new Date(`${r.race_date}T12:00:00Z`).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }), l: raceTitle(r) });
    if (r.splits?.length) kpis.push({ v: r.splits[r.splits.length - 1].total, l: `${ui.goal} · ${r.splits[r.splits.length - 1].goal}` });
  } else {
    kpis.push({ v: [r.city, r.country].filter(Boolean).join(", "), l: raceTitle(r) });
    if (places.length) kpis.push({ v: String(places.length), l: ui.places });
  }

  const jsonLd = [
    orgLd(),
    raceEventLd(r, lang, { offers: offersLd(facts?.official, `${SITE}${rp}`, facts?.official_at), geo: facts?.lat != null ? { lat: facts.lat, lon: facts.lon! } : null }),
    breadcrumbLd([
      { name: t("nav.races"), url: racesPath(lang) },
      { name: `${raceTitle(r)} ${year}`.trim(), url: rp },
      { name: FACET_I18N[lang][f].label, url },
    ]),
    articleLd({ url, headline: title, description: desc, lang, modified: art?.updated_at ?? null, about: eventId(r, lang), section: FACET_I18N[lang][f].label, words }),
    segmentsLd(url, `${raceTitle(r)} – ${FACET_I18N[lang][f].label}`, segs),
    placesLd(url, `${raceTitle(r)} – ${FACET_I18N[lang][f].label}`, places),
    faqLd(faq),
  ].filter(Boolean);

  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav lang={lang} t={t} active="gare" altPaths={alt} />
      <main>
        <div className="ld-rhead">
          <div className="ld-wrap">
            <nav className="ld-crumbs mono" aria-label="breadcrumb"><Link href={racesPath(lang)}>{t("nav.races")}</Link><span>›</span><Link href={rp}>{raceTitle(r)}</Link><span>›</span><span>{FACET_I18N[lang][f].label}</span></nav>
            <h1 style={{ marginTop: 8, fontSize: "clamp(2rem,5vw,3.4rem)" }}>{title}</h1>
            <p className="ld-lead" style={{ maxWidth: "64ch" }}>{art?.dek ?? desc}</p>
            {kpis.length ? <div className="ld-kpis">{kpis.map((k) => <div className="ld-kpi" key={k.v + k.l}><b className="num">{k.v}</b><span>{k.l}</span></div>)}</div> : null}
            <nav className="ld-cta" aria-label={ui.other} style={{ flexWrap: "wrap" }}>
              {facets.filter((x) => x !== f).map((x) => <Link key={x} className="btn btn-ghost btn-sm" href={facetPath(rp, lang, x)}>{FACET_I18N[lang][x].label}</Link>)}
              {dfs.map((x) => <Link key={x} className="btn btn-ghost btn-sm" href={dataFacetPath(rp, lang, x)}>{DATA_FACET_I18N[lang][x].label}</Link>)}
              <Link className="btn btn-ghost btn-sm" href={rp}>{ui.back}</Link>
            </nav>
          </div>
        </div>

        {bullets.length || segs.length || (f === "bike" && r.profile) ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <h2>{ui.facts}</h2>
              {f === "bike" && r.profile ? <BikeProfile profile={r.profile} bikeKm={r.bike_km ?? 180} /> : null}
              {bullets.length ? <ul className="ld-prose">{bullets.map((x) => <li key={x}>{x}</li>)}</ul> : null}
              {segs.length ? (
                <div className="ld-card" style={{ marginTop: 20 }}>
                  <h3 className="lab">{ui.segments}</h3>
                  <div className="ld-segs" style={{ marginTop: 12 }}>
                    {segs.map((s) => (
                      <div className={`ld-segrow ${s.kind ?? ""}`} key={s.id}>
                        <span className="km">{s.km_from != null ? `km ${s.km_from}-${s.km_to}` : ""}</span>
                        <span className="t">{s.title}{s.note ? <small>{s.note}</small> : null}</span>
                        <span className="g">{s.grade_pct != null && s.grade_pct !== 0 ? `${s.grade_pct > 0 ? "+" : ""}${s.grade_pct} %` : t("race.flat")}{s.dplus_m ? ` · ${s.dplus_m} m D+` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {f === "raceday" && r.splits?.length ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <h2>{ui.splits}</h2>
              <div className="ld-tw" style={{ marginTop: 10 }}>
                <table>
                  <thead><tr><th>{ui.goal}</th><th>{t("leg.swim")}</th><th>{t("leg.bike")}</th><th>{t("leg.run")}</th><th>{ui.total}</th></tr></thead>
                  <tbody>{r.splits.map((s) => <tr key={s.goal}><td>{s.goal}</td><td className="n">{s.swim}</td><td className="n">{s.bike}</td><td className="n">{s.run}</td><td className="n"><b>{s.total}</b></td></tr>)}</tbody>
                </table>
              </div>
              <p className="note">{t("race.splitsNote")}</p>
              {r.demands?.length ? <div className="ld-grid ld-g2" style={{ marginTop: 16 }}>{r.demands.map((d) => <div className="ld-card" key={d.t}><h3>{d.t}</h3><p>{d.b}</p></div>)}</div> : null}
            </div>
          </section>
        ) : null}

        {f === "travel" && r.logistics?.length ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <h2>{ui.facts}</h2>
              <div className="ld-grid ld-g2" style={{ marginTop: 12 }}>{r.logistics.map((d) => <div className="ld-card" key={d.t}><h3>{d.t}</h3><p>{d.p}</p></div>)}</div>
            </div>
          </section>
        ) : null}
        {f === "travel" && places.length ? <PlacesSections places={places} t={t} /> : null}

        {art ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <h2>{art.title}</h2>
              <div className="ld-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(art.body_md) }} />
            </div>
          </section>
        ) : null}

        {faq.length ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <h2>{ui.faq}</h2>
              {faq.map((x) => <details key={x.q} open className="ld-card" style={{ marginTop: 10 }}><summary><b>{x.q}</b></summary><p>{x.a}</p></details>)}
            </div>
          </section>
        ) : null}

        <ServiceBridge race={r} lang={lang} t={t} kind={({ swim: "swim", bike: "bike", run: "run", raceday: "raceday", travel: "generic" } as Record<string, BridgeKind>)[f] ?? "generic"} facts={facts} />
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{ui.other}</h2>
            <div className="ld-arts" style={{ marginTop: 12 }}>
              {facets.filter((x) => x !== f).map((x) => (
                <Link key={x} className="ld-card ld-art" href={facetPath(rp, lang, x)}>
                  <span className="lab">{FACET_I18N[lang][x].label}</span>
                  <h3>{fillFacet(FACET_I18N[lang][x].title, { race: raceTitle(r), km: x === "swim" ? String(r.swim_km ?? "") : x === "bike" ? String(r.bike_km ?? "") : x === "run" ? String(r.run_km ?? "") : "", dplus: r.bike_dplus_m != null ? String(r.bike_dplus_m) : "" })}</h3>
                </Link>
              ))}
            </div>
            <div className="ld-cta"><a className="btn btn-primary" href={`/registrati?race=${encodeURIComponent(r.slug)}&lang=${lang}`}>{t("race.ctaPlan", { name: r.name })}</a><Link className="btn btn-ghost" href={rp}>{ui.back}</Link></div>
          </div>
        </section>
        <RaceRelated race={r} lang={lang} t={t} />
      </main>
      <SiteFooter t={t} lang={lang} />
    </div>
  );
}

async function ArticleView({ b, lang, a }: { b: RaceBundle; lang: Lang; a: RaceArticle }) {
  const t = tr(await getDict(lang));
  const cited = b.sources.filter((s) => (a as unknown as { source_ids?: string[] }).source_ids?.includes(s.id));
  const alt = Object.fromEntries(LANGS.map((x) => [x, `${racePath(b.race, x)}/${a.slug}`]));
  const url = `${racePath(b.race, lang)}/${a.slug}`;
  const jsonLd = [
    orgLd(),
    raceEventLd(b.race, lang),
    breadcrumbLd([{ name: t("nav.races"), url: racesPath(lang) }, { name: raceTitle(b.race), url: racePath(b.race, lang) }, { name: a.title, url }]),
    articleLd({ url, headline: a.title, description: a.dek, lang, modified: a.updated_at, about: eventId(b.race, lang), words: a.body_md.split(/\s+/).length }),
  ];
  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
            <div className="ld-cta"><Link className="btn btn-primary" href={`/registrati?race=${encodeURIComponent(b.race.slug)}&lang=${lang}&from=article`}>{t("race.ctaPlan", { name: b.race.name })}</Link><Link className="btn btn-ghost" href={racePath(b.race, lang)}>{t("art.back")}</Link></div>
          </div>
        </section>
        <ServiceBridge race={b.race} lang={lang} t={t} kind="generic" compact />
        <RaceRelated race={b.race} lang={lang} t={t} />
      </main>
      <SiteFooter t={t} lang={lang} />
    </div>
  );
}


async function DataPage({ b, lang, f, facets, dfs, facts }: { b: RaceBundle; lang: Lang; f: DataFacet; facets: Facet[]; dfs: DataFacet[]; facts: FactsRow }) {
  const t = tr(await getDict(lang));
  const ui = FACET_UI[lang];
  const du = DATA_UI[lang];
  const r = b.race;
  const rp = racePath(r, lang);
  const url = dataFacetPath(rp, lang, f);
  const year = r.race_date?.slice(0, 4) ?? "";
  const { title, desc } = dataTitle(b, lang, f, facts);
  const label = DATA_FACET_I18N[lang][f].label;
  const alt = Object.fromEntries(LANGS.map((x) => [x, dataFacetPath(racePath(r, x), x, f)]));
  const ev = eventId(r, lang);
  const res = facts.results;
  const faq = (r.faq ?? []).filter((x) => DATA_FAQ_RX[f].test(`${x.q} ${x.a}`)).slice(0, 6);

  const jsonLd = [
    orgLd(),
    raceEventLd(r, lang, { offers: offersLd(facts.official, `${SITE}${rp}`, facts.official_at), geo: facts.lat != null ? { lat: facts.lat, lon: facts.lon! } : null }),
    breadcrumbLd([{ name: t("nav.races"), url: racesPath(lang) }, { name: `${raceTitle(r)} ${year}`.trim(), url: rp }, { name: label, url }]),
    articleLd({ url, headline: title, description: desc, lang, modified: (f === "results" ? facts.results_at : f === "weather" ? facts.climate_at : f === "bikeshops" ? facts.shops_at : facts.official_at) ?? null, about: ev, section: label }),
    f === "results" && res ? resultsLd(url, `${raceTitle(r)} ${res.year} – ${du.agWinners}`, [...res.overall.M, ...res.overall.F, ...res.ag], ev) : null,
    f === "bikeshops" ? shopsLd(url, `${raceTitle(r)} – ${label}`, facts.bike_shops ?? []) : null,
    f === "weather" && facts.climate && facts.lat != null ? climateDatasetLd({ url, name: title, description: desc, lat: facts.lat, lon: facts.lon!, place: facts.geo_label ?? [r.city, r.country].filter(Boolean).join(", "), firstYear: Math.min(...facts.climate.by_year.map((y) => y.year)), lastYear: Math.max(...facts.climate.by_year.map((y) => y.year)), lang }) : null,
    faqLd(faq),
  ].filter(Boolean);

  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav lang={lang} t={t} active="gare" altPaths={alt} />
      <main>
        <div className="ld-rhead">
          <div className="ld-wrap">
            <nav className="ld-crumbs mono" aria-label="breadcrumb"><Link href={racesPath(lang)}>{t("nav.races")}</Link><span>›</span><Link href={rp}>{raceTitle(r)}</Link><span>›</span><span>{label}</span></nav>
            <h1 style={{ marginTop: 8, fontSize: "clamp(2rem,5vw,3.4rem)" }}>{title}</h1>
            <p className="ld-lead" style={{ maxWidth: "64ch" }}>{desc}</p>
            <nav className="ld-cta" aria-label={ui.other} style={{ flexWrap: "wrap" }}>
              {dfs.filter((x) => x !== f).map((x) => <Link key={x} className="btn btn-ghost btn-sm" href={dataFacetPath(rp, lang, x)}>{DATA_FACET_I18N[lang][x].label}</Link>)}
              {facets.map((x) => <Link key={x} className="btn btn-ghost btn-sm" href={facetPath(rp, lang, x)}>{FACET_I18N[lang][x].label}</Link>)}
              <Link className="btn btn-ghost btn-sm" href={rp}>{ui.back}</Link>
            </nav>
          </div>
        </div>

        {f === "reviews" ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <p className="note">{t("rev.intro")}</p>
              <div className="ld-rev" style={{ marginTop: 14 }}>
                {b.reviews.map((rv) => (
                  <div className="ld-card ld-rv" key={rv.id}>
                    <div className="who"><b>{rv.title ?? (rv.source === "verified" ? t("rev.verified") : t("rev.review"))}</b><span className="src">{rv.source === "synthesis" ? rv.sources_note : rv.edition_year ? t("rev.edition", { y: rv.edition_year }) : ""}</span></div>
                    {rv.scores ? <div className="ld-score">{Object.entries(rv.scores).slice(0, 6).map(([k, v]) => <div key={k}><span>{k}</span><b>{String(v)}</b></div>)}</div> : null}
                    {rv.body ? <p>{rv.body}</p> : null}
                    {rv.would_repeat != null ? <p className="src">{du.repeat}: {rv.would_repeat ? t("rev.yes") : t("rev.no")}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <DataFacetBody f={f} facts={facts} b={b} lang={lang} />
        )}
        {f === "results" ? <RaceHistory slug={r.slug} lang={lang} t={t} /> : null}

        {faq.length ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <h2>{ui.faq}</h2>
              {faq.map((x) => <details key={x.q} open className="ld-card" style={{ marginTop: 10 }}><summary><b>{x.q}</b></summary><p>{x.a}</p></details>)}
            </div>
          </section>
        ) : null}

        <ServiceBridge race={r} lang={lang} t={t} kind={({ results: "results", registration: "registration", weather: "weather", bikeshops: "generic", reviews: "generic", qualification: "qualification", cutoffs: "cutoffs" } as Record<string, BridgeKind>)[f] ?? "generic"} facts={facts} />
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{ui.other}</h2>
            <div className="ld-arts" style={{ marginTop: 12 }}>
              {dfs.filter((x) => x !== f).map((x) => (
                <Link key={x} className="ld-card ld-art" href={dataFacetPath(rp, lang, x)}>
                  <span className="lab">{DATA_FACET_I18N[lang][x].label}</span>
                  <h3>{dataTitle(b, lang, x, facts).title}</h3>
                </Link>
              ))}
              {facets.map((x) => (
                <Link key={x} className="ld-card ld-art" href={facetPath(rp, lang, x)}>
                  <span className="lab">{FACET_I18N[lang][x].label}</span>
                  <h3>{facetData(b, lang, x).title}</h3>
                </Link>
              ))}
            </div>
            <div className="ld-cta"><a className="btn btn-primary" href={`/registrati?race=${encodeURIComponent(r.slug)}&lang=${lang}`}>{t("race.ctaPlan", { name: r.name })}</a><Link className="btn btn-ghost" href={rp}>{ui.back}</Link></div>
          </div>
        </section>
        <RaceRelated race={r} lang={lang} t={t} />
      </main>
      <SiteFooter t={t} lang={lang} />
    </div>
  );
}

const DATA_FAQ_RX: Record<DataFacet, RegExp> = {
  results: /risultat|result|vincit|winner|record|classific|ergebnis|résultat|resultado|uitslag|tulok|wynik/i,
  registration: /iscri|regist|prezz|price|cost|anmeld|inscri|inschrij|tilmeld|anmäl|påmeld|ilmoit|zapis|quota|fee/i,
  weather: /meteo|weather|caldo|heat|vento|wind|temperat|pioggia|rain|wetter|météo|clima|weer|vejr|väder|vær|sää|pogod|muta|wetsuit/i,
  bikeshops: /meccanic|mechanic|negozi|shop|ricambi|spare|noleggi|rental|bike check|officin/i,
  reviews: /recension|review|opinion|esperien|experience|erfahr|avis|ervaring|anmeld|omdöm|arvost|opini/i,
  qualification: /slot|kona|nizza|nice|mondial|world champ|qualific|roll.?down|wm|mundial|vm|mm-|mś/i,
  cutoffs: /cut.?off|cancell|tempo massim|time limit|zeitlimit|barrière|corte|tijdslimiet|tidsgræns|tidsgräns|tidsgrens|aikaraj|limit/i,
};
