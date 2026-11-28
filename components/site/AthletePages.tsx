// Pagine atleta: elenco/ricerca, scheda atleta, confronto, rimozione.
// Usate da app/[lang]/athletes/... e app/[lang]/atleti/... (stesso codice, segmento per lingua).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { isLang, LANGS, LOCALE, OG_LOCALE, racesPath, type Lang } from "@/lib/i18n/config";
import { getDict, tr } from "@/lib/i18n";
import { breadcrumbLd, orgLd } from "@/lib/site/jsonld";
import { SiteFooter, SiteNav } from "@/components/site/SiteShell";
import AthleteSearch from "@/components/site/AthleteSearch";
import { coachPath } from "@/lib/site/coach";
import { claimAthlete, removeAthlete } from "@/lib/site/athleteActions";
import { athleteLd, CareerChart, careerSummary, FieldTable } from "@/components/site/AthleteCareer";
import RaceEquivalent, { type EqRace } from "@/components/site/RaceEquivalent";
import { CAR, CLAIM_SEG, EQUIV_SEG, RANK_COUNTRIES, RANK_SEG, careerRows, claimPath, edStats, equivPath, rankPath } from "@/lib/site/career";
import { allRaceStats } from "@/lib/site/raceStats";
import { SITE, ORG_ID } from "@/lib/site/jsonld";
import {
  ATH, COMPARE_SEG, EDITIONS, REMOVE_SEG, RESULTS_SEG, athLang, athletePath, athleteRedirect, athletesPath, comparePath, getRanking, delta, editionById, editionLabel, editionPath, fill, flag, getAthlete, getEditionResults, hms, raceLabel, removePath,
  type AthLang, type AthResult, type Athlete, type Edition, type RankMetric,
} from "@/lib/site/athletes";

const SEG: Record<AthLang, string> = { en: "athletes", it: "atleti" };
const LEGS = ["swim", "t1", "bike", "t2", "run", "finish"] as const;
type LegKey = (typeof LEGS)[number];

/** Lingua e segmento giusti, altrimenti redirect alla pagina equivalente. */
function gate(lang: string, seg: string, rest = ""): AthLang {
  if (!isAiCoachMode() || !isLang(lang)) notFound();
  const l = athLang(lang);
  if (lang !== l || seg !== SEG[l]) redirect(`${athletesPath(l)}${rest}`);
  return l;
}
const alt = (f: (l: Lang) => string) => Object.fromEntries(LANGS.map((x) => [x, f(x as Lang)]));
const legName = (x: Record<string, string>, k: LegKey) => (k === "t1" ? "T1" : k === "t2" ? "T2" : x[k]);
const statusTxt = (x: Record<string, string>, s: string | null) => (s === "DNF" ? x.dnf : s === "DNS" ? x.dns : s === "DQ" ? x.dq : "");
const fmtDate = (d: string | null, l: AthLang) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString(LOCALE[l], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "–");
const raceHref = (r: AthResult, l: AthLang) => (r.race_slug ? `${racesPath(l)}/${r.race_slug.replace(/-20\d\d$/, "")}` : null);

async function shell(l: AthLang) {
  const t = tr(await getDict(l));
  return { t, x: ATH[l] };
}

// ------------------------------------------------------------------ elenco e ricerca
export async function hubMetadata(lang: string): Promise<Metadata> {
  const l = athLang(lang), x = ATH[l];
  return { title: `${x.hubTitle} · 24/7 Coach`, description: x.hubLead, alternates: { canonical: athletesPath(l), languages: { en: athletesPath("en"), it: athletesPath("it"), "x-default": athletesPath("en") } }, openGraph: { locale: OG_LOCALE[l], title: x.hubTitle, description: x.hubLead } };
}
export async function HubPage({ lang, seg, race }: { lang: string; seg: string; race?: string }) {
  const l = gate(lang, seg);
  const { t, x } = await shell(l);
  const raceKey = race && /^[a-z0-9]{2,40}$/.test(race) ? race : null;
  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([orgLd(), breadcrumbLd([{ name: "24/7 Coach", url: `/${l}` }, { name: x.nav, url: athletesPath(l) }])]) }} />
      <SiteNav lang={l} t={t} altPaths={alt((k) => athletesPath(k))} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono">{x.nav} · 2017–2026</p>
            <h1 style={{ marginTop: 8 }}>{x.hubH1a} <em>{x.hubH1b}</em></h1>
            <p className="ld-lead">{x.hubLead}</p>
            {raceKey ? <p className="note">{x.inRace}: {raceKey}</p> : null}
            <AthleteSearch base={athletesPath(l)} race={raceKey} txt={{ ph: x.searchPh, none: x.none, typeMore: x.typeMore, race1: x.race1, raceN: x.raceN }} autoFocus />
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap ld-grid ld-g2">
            <Link className="ld-card ld-clink" href={equivPath(l)}><b>{CAR[l].eqH1a} {CAR[l].eqH1b} →</b><span>{CAR[l].eqTableLead}</span></Link>
            <Link className="ld-card ld-clink" href={rankPath(l)}><b>{CAR[l].rkLink} →</b><span>{CAR[l].rkLead}</span></Link>
            <Link className="ld-card ld-clink" href={comparePath(l, [])}><b>{x.cmpH1} →</b><span>{x.cmpLead}</span></Link>
            <Link className="ld-card ld-clink" href={racesPath(l)}><b>{t("nav.races")} →</b><span>{t("rs.lead")}</span></Link>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{x.edLatest}</h2>
            <div className="ld-grid ld-g3" style={{ marginTop: 18 }}>
              {EDITIONS.slice(0, 24).map((e) => (
                <Link key={e.id} className="ld-card ld-clink" href={editionPath(l, e.id)}>
                  <b>{editionLabel(e)} →</b><span>{fmtDate(e.date, l)} · {fill(x.edFound, { n: e.fin.toLocaleString(LOCALE[l]) })}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{x.privH}</h2>
            <p className="ld-lead">{x.privP}</p>
            <p style={{ marginTop: 12 }}><Link href={removePath(l)}>{x.privLink} →</Link></p>
            <p className="note" style={{ marginTop: 14 }}>{x.srcNote}</p>
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={l} />
    </div>
  );
}

// ------------------------------------------------------------------ scheda atleta, confronto, rimozione
type SP = { a?: string; race?: string; slug?: string; done?: string; err?: string; from?: string; t?: string; c?: string; sex?: string; m?: string };
const rankArgs = (sp: SP) => ({ c: sp.c && /^[A-Z]{2}$/.test(sp.c) ? sp.c : null, sex: sp.sex === "M" || sp.sex === "F" ? (sp.sex as "M" | "F") : null, m: (sp.m === "half" || sp.m === "finishes" ? sp.m : "full") as RankMetric });
const countryName = (cc: string, l: AthLang) => { try { return new Intl.DisplayNames([LOCALE[l]], { type: "region" }).of(cc) ?? cc; } catch { return cc; } };
const rankPlace = (c: string | null, l: AthLang) => (c ? fill(CAR[l].rkIn, { country: countryName(c, l) }) : CAR[l].rkWorld);

export async function slugMetadata(lang: string, slug: string, sp: SP = {}): Promise<Metadata> {
  const l = athLang(lang), x = ATH[l];
  if (slug === COMPARE_SEG[l]) return { title: `${x.cmpTitle} · 24/7 Coach`, description: x.cmpLead, robots: { index: false, follow: true } };
  if (slug === REMOVE_SEG[l]) return { title: `${x.rmTitle} · 24/7 Coach`, robots: { index: false, follow: false } };
  if (slug === RANK_SEG[l]) { const c = CAR[l], r = rankArgs(sp); const title = fill(c.rkTitle, { place: r.c ? ` ${rankPlace(r.c, l)}` : "" }); const can = (k: string) => rankPath(k, { c: r.c, m: r.m }); return { title: `${title} · 24/7 Coach`, description: c.rkLead, robots: r.sex ? { index: false, follow: true } : undefined, alternates: { canonical: can(l), languages: { en: can("en"), it: can("it"), "x-default": can("en") } }, openGraph: { locale: OG_LOCALE[l], title, description: c.rkLead } }; }
  if (slug === CLAIM_SEG[l]) return { title: `${CAR[l].clTitle} · 24/7 Coach`, robots: { index: false, follow: false } };
  if (slug === EQUIV_SEG[l]) { const c = CAR[l]; const d0 = fill(c.eqLead, { n: eqCount().toLocaleString(LOCALE[l]) }); return { title: `${c.eqTitle} · 24/7 Coach`, description: d0, alternates: { canonical: equivPath(l), languages: { en: equivPath("en"), it: equivPath("it"), "x-default": equivPath("en") } }, openGraph: { locale: OG_LOCALE[l], title: c.eqTitle, description: d0 } }; }
  const d = await getAthlete(slug);
  if (!d) return { robots: { index: false } };
  const a = d.athlete;
  const v = { name: a.name, country: a.country ? ` (${a.country})` : "", races: a.races, y1: a.first_year ?? "", y2: a.last_year ?? "" };
  const title = fill(x.athTitle, v);
  const desc = careerSummary(a, d.results, careerRows(d.results), l).slice(0, 3).join(" ").slice(0, 300) || fill(x.athDesc, v);
  const img = { url: `/api/site/athlete-card?slug=${slug}&lang=${l}`, width: 1200, height: 630, alt: a.name };
  return { title: `${title} · 24/7 Coach`, description: desc, alternates: { canonical: athletePath(l, slug), languages: { en: athletePath("en", slug), it: athletePath("it", slug), "x-default": athletePath("en", slug) } }, openGraph: { type: "profile", locale: OG_LOCALE[l], title, description: desc, images: [img] }, twitter: { card: "summary_large_image", title, description: desc, images: [img.url] } };
}

export async function SlugPage({ lang, seg, slug, sp }: { lang: string; seg: string; slug: string; sp: SP }) {
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  if (isLang(lang)) {
    // segmenti speciali nell'altra lingua → quelli giusti
    const l0 = athLang(lang);
    const other: AthLang = l0 === "en" ? "it" : "en";
    if (slug === COMPARE_SEG[other]) redirect(`${athletesPath(l0)}/${COMPARE_SEG[l0]}${qs ? `?${qs}` : ""}`);
    if (slug === REMOVE_SEG[other]) redirect(`${athletesPath(l0)}/${REMOVE_SEG[l0]}${qs ? `?${qs}` : ""}`);
    if (slug === CLAIM_SEG[other]) redirect(`${claimPath(l0)}${qs ? `?${qs}` : ""}`);
    if (slug === EQUIV_SEG[other]) redirect(`${equivPath(l0)}${qs ? `?${qs}` : ""}`);
    if (slug === RANK_SEG[other]) redirect(`${athletesPath(l0)}/${RANK_SEG[l0]}${qs ? `?${qs}` : ""}`);
  }
  const l = gate(lang, seg, `/${slug}${qs ? `?${qs}` : ""}`);
  if (slug === RESULTS_SEG.en || slug === RESULTS_SEG.it) redirect(athletesPath(l));
  if (slug === COMPARE_SEG[l]) return <ComparePage l={l} sp={sp} />;
  if (slug === REMOVE_SEG[l]) return <RemovePage l={l} sp={sp} />;
  if (slug === CLAIM_SEG[l]) return <ClaimPage l={l} sp={sp} />;
  if (slug === EQUIV_SEG[l]) return <EquivPage l={l} sp={sp} />;
  if (slug === RANK_SEG[l]) return <RankPage l={l} sp={sp} />;
  const d = await getAthlete(slug);
  if (!d) { const to = await athleteRedirect(slug); if (to) redirect(athletePath(l, to)); notFound(); }
  return <AthletePage l={l} a={d.athlete} results={d.results} />;
}

function ResultsTable({ rows, l, x }: { rows: AthResult[]; l: AthLang; x: Record<string, string> }) {
  return (
    <div className="ld-scroll">
      <table>
        <thead><tr><th>{x.date}</th><th>{x.race}</th><th>{x.ag}</th><th>{x.swim}</th><th>T1</th><th>{x.bike}</th><th>T2</th><th>{x.run}</th><th>{x.finish}</th><th>{x.overall}</th><th>{x.agRank}</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const href = editionById(r.edition_id) ? editionPath(l, r.edition_id) : raceHref(r, l);
            return (
              <tr key={r.edition_id}>
                <td className="num">{fmtDate(r.race_date, l)}</td>
                <td>{href ? <Link href={href}>{raceLabel(r)}</Link> : raceLabel(r)}</td>
                <td>{r.age_group ?? "–"}</td>
                <td className="num">{hms(r.swim)}</td><td className="num">{hms(r.t1)}</td><td className="num">{hms(r.bike)}</td><td className="num">{hms(r.t2)}</td><td className="num">{hms(r.run)}</td>
                <td className="num"><b>{r.status === "FIN" ? hms(r.finish) : statusTxt(x, r.status) || "–"}</b></td>
                <td className="num">{r.status === "FIN" ? r.rank_overall ?? "–" : "–"}</td><td className="num">{r.status === "FIN" ? r.rank_ag ?? "–" : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function AthletePage({ l, a, results }: { l: AthLang; a: Athlete; results: AthResult[] }) {
  const { t, x } = await shell(l);
  const byRace = new Map<string, AthResult[]>();
  for (const r of results) byRace.set(r.race_key, [...(byRace.get(r.race_key) ?? []), r]);
  const repeats = [...byRace.values()].filter((g) => g.filter((r) => r.status === "FIN").length >= 2).map((g) => g.filter((r) => r.status === "FIN").sort((p, q) => p.year - q.year));
  const lastRace = results[0]?.race_key;
  const c = CAR[l], car = careerRows(results), summary = careerSummary(a, results, car, l);
  const bestRow = car.filter((r) => r.r.cat === (a.best_full ? "full" : "half")).sort((p, q) => (p.r.finish as number) - (q.r.finish as number))[0];
  const eqHref = bestRow?.r.race_slug ? `${equivPath(l)}?from=${bestRow.r.race_slug.replace(/-20\d\d$/, "")}&t=${hms(bestRow.r.finish)}` : equivPath(l);
  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([orgLd(), breadcrumbLd([{ name: "24/7 Coach", url: `/${l}` }, { name: x.nav, url: athletesPath(l) }, { name: a.name, url: athletePath(l, a.slug) }]), athleteLd(a, results, l, summary.join(" "))]) }} />
      <SiteNav lang={l} t={t} altPaths={alt((k) => athletePath(k, a.slug))} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono"><Link href={athletesPath(l)}>{x.nav}</Link> · {x.athKicker}</p>
            <h1 style={{ marginTop: 8 }}>{flag(a.country)} {a.name} <em>{x.athH1b}</em></h1>
            <p className="ld-lead ld-car-sum">{summary.join(" ")}</p>
            <div className="ld-ctiles" style={{ marginTop: 22 }}>
              <div className="ld-stat"><b className="num">{a.races}</b><span>{x.tRaces}{a.first_year ? ` · ${a.first_year === a.last_year ? a.first_year : `${a.first_year}–${a.last_year}`}` : ""}</span></div>
              <div className="ld-stat"><b className="num">{a.finishes}</b><span>{x.tFin}</span></div>
              {a.best_full ? <div className="ld-stat"><b className="num">{hms(a.best_full)}</b><span>{x.tBestFull}</span></div> : null}
              {a.best_half ? <div className="ld-stat"><b className="num">{hms(a.best_half)}</b><span>{x.tBestHalf}</span></div> : null}
            </div>
          </div>
        </div>

        {car.filter((r) => r.r.cat === "full").length >= 2 || car.filter((r) => r.r.cat === "half").length >= 2 ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <div className="ld-sechead"><h2>{c.trendH}</h2><p>{c.trendLead}</p></div>
              <CareerChart rows={car.filter((r) => r.r.cat === "full")} l={l} title={c.full} />
              <CareerChart rows={car.filter((r) => r.r.cat === "half")} l={l} title={c.half} />
            </div>
          </section>
        ) : null}

        {car.some((r) => r.pct.finish != null) ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <div className="ld-sechead"><h2>{c.fieldH}</h2><p>{c.fieldLead}</p></div>
              <FieldTable rows={car} l={l} x={x} />
              <p style={{ marginTop: 14 }}><Link href={eqHref}>{c.eqLink} →</Link></p>
            </div>
          </section>
        ) : null}

        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{x.allRaces}</h2>
            <div style={{ marginTop: 16 }}><ResultsTable rows={results} l={l} x={x} /></div>
          </div>
        </section>

        {repeats.length ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <div className="ld-sechead"><h2>{x.sameRace}</h2><p>{fill(x.sameLead, { name: a.name })}</p></div>
              {repeats.map((g) => (
                <div key={g[0].race_key} style={{ marginTop: 18 }}>
                  <h3>{g[0].race_name}</h3>
                  <div className="ld-scroll">
                    <table>
                      <thead><tr><th />{g.map((r) => <th key={r.year}>{r.year}</th>)}</tr></thead>
                      <tbody>
                        {LEGS.map((k) => (
                          <tr key={k}>
                            <td>{legName(x, k)}</td>
                            {g.map((r, i) => (
                              <td key={r.year} className="num">{k === "finish" ? <b>{hms(r[k])}</b> : hms(r[k])}{i ? <span className={`ld-delta ${(r[k] ?? 0) < (g[i - 1][k] ?? 0) ? "up" : "down"}`}> {delta(r[k], g[i - 1][k])}</span> : null}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-sechead"><h2>{x.vs}</h2><p>{x.vsLead}</p></div>
            <AthleteSearch base={athletesPath(l)} race={lastRace} hrefFor={comparePath(l, [a.slug, "{slug}"]).replace("%7Bslug%7D", "{slug}")} txt={{ ph: x.searchPh, none: x.none, typeMore: x.typeMore, race1: x.race1, raceN: x.raceN }} />
          </div>
        </section>

        <section className="ld-sec ld-bridge compact">
          <div className="ld-wrap">
            <div className="ld-bridge-in">
              <div><p className="mono">24/7 Coach</p><h2>{x.coachH}</h2><p>{x.coachP}</p></div>
              <div className="ld-bridge-cta"><Link className="btn btn-primary btn-lg" href={coachPath(l)}>{x.coachCta}</Link></div>
            </div>
          </div>
        </section>

        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{c.dlH}</h2>
            <div className="ld-cta">
              <a className="btn btn-ghost" href={`/api/site/athlete-csv?slug=${a.slug}`} rel="nofollow">{c.dlCsv}</a>
              <a className="btn btn-ghost" href={`/api/site/athlete-card?slug=${a.slug}&lang=${l}&dl=1`} rel="nofollow">{c.dlCard}</a>
            </div>
            <p className="note" style={{ marginTop: 10 }}>{c.dlNote}</p>
            <p style={{ marginTop: 18 }}><Link href={claimPath(l, a.slug)} rel="nofollow">{c.claimLink} →</Link></p>
          </div>
        </section>

        <section className="ld-sec">
          <div className="ld-wrap">
            <p className="note">{x.srcNote}</p>
            <p className="note" style={{ marginTop: 8 }}>{x.privNote} <Link href={removePath(l, a.slug)}>{x.privLink}</Link></p>
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={l} />
    </div>
  );
}

async function ComparePage({ l, sp }: { l: AthLang; sp: SP }) {
  const { t, x } = await shell(l);
  const slugs = [...new Set((sp.a ?? "").split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]{3,90}$/.test(s)))].slice(0, 4);
  const race = sp.race && /^[a-z0-9]{2,40}$/.test(sp.race) ? sp.race : null;
  const list = (await Promise.all(slugs.map((s) => getAthlete(s)))).filter((d): d is NonNullable<typeof d> => Boolean(d));
  const editions = new Map<string, { r: AthResult; i: number }[]>();
  list.forEach((d, i) => d.results.forEach((r) => { if (!race || r.race_key === race) editions.set(r.edition_id, [...(editions.get(r.edition_id) ?? []), { r, i }]); }));
  const common = [...editions.values()].filter((g) => g.length >= 2).sort((p, q) => (q[0].r.race_date ?? "").localeCompare(p[0].r.race_date ?? ""));
  const cur = list.map((d) => d.athlete.slug);
  const addHref = comparePath(l, [...cur, "{slug}"], race).replace("%7Bslug%7D", "{slug}");
  return (
    <div className="ld">
      <SiteNav lang={l} t={t} altPaths={alt((k) => comparePath(k, cur, race))} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono"><Link href={athletesPath(l)}>{x.nav}</Link> · {x.cmpH1}</p>
            <h1 style={{ marginTop: 8 }}>{x.cmpH1}</h1>
            <p className="ld-lead">{x.cmpLead}</p>
            {list.length ? (
              <div className="ld-ath-chips">
                {list.map((d) => (
                  <span key={d.athlete.slug} className="ld-chip on">
                    <Link href={athletePath(l, d.athlete.slug)}>{flag(d.athlete.country)} {d.athlete.name}</Link>
                    <Link className="x" href={comparePath(l, cur.filter((s) => s !== d.athlete.slug), race)} aria-label={`${x.remove} ${d.athlete.name}`}>×</Link>
                  </span>
                ))}
              </div>
            ) : null}
            {list.length < 4 ? (
              <div style={{ marginTop: 18 }}>
                <p className="lab">{x.cmpAdd}</p>
                <AthleteSearch base={athletesPath(l)} race={list.length ? race ?? undefined : undefined} hrefFor={addHref} txt={{ ph: x.searchPh, none: x.none, typeMore: x.typeMore, race1: x.race1, raceN: x.raceN }} autoFocus={!list.length} />
              </div>
            ) : null}
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap">
            {list.length < 2 ? <p className="ld-lead">{x.cmpNone}</p> : !common.length ? <p className="ld-lead">{x.cmpNoCommon}</p> : (
              <>
                <h2>{x.cmpCommon}</h2>
                {common.map((g) => {
                  const cols = g.sort((p, q) => p.i - q.i);
                  const base = cols[0].r;
                  return (
                    <div key={base.edition_id} style={{ marginTop: 22 }}>
                      <h3>{raceLabel(base)} · {fmtDate(base.race_date, l)}</h3>
                      <div className="ld-scroll">
                        <table>
                          <thead><tr><th />{cols.map((c) => <th key={c.i}>{list[c.i].athlete.name}<br /><span className="lab">{c.r.age_group ?? ""}{c.r.status === "FIN" && c.r.rank_overall ? ` · #${c.r.rank_overall}` : ""}</span></th>)}</tr></thead>
                          <tbody>
                            {LEGS.map((k) => (
                              <tr key={k}>
                                <td>{legName(x, k)}</td>
                                {cols.map((c, j) => (
                                  <td key={c.i} className="num">
                                    {k === "finish" ? <b>{c.r.status === "FIN" ? hms(c.r.finish) : statusTxt(x, c.r.status) || "–"}</b> : hms(c.r[k])}
                                    {j && c.r[k] != null && base[k] != null && (k !== "finish" || (c.r.status === "FIN" && base.status === "FIN")) ? <span className={`ld-delta ${(c.r[k] as number) < (base[k] as number) ? "up" : "down"}`}> {delta(c.r[k], base[k])}</span> : null}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            <p className="note" style={{ marginTop: 22 }}>{x.srcNote}</p>
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={l} />
    </div>
  );
}

async function RemovePage({ l, sp }: { l: AthLang; sp: SP }) {
  const { t, x } = await shell(l);
  return (
    <div className="ld">
      <SiteNav lang={l} t={t} altPaths={alt((k) => removePath(k))} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono"><Link href={athletesPath(l)}>{x.nav}</Link></p>
            <h1 style={{ marginTop: 8 }}>{x.rmH1}</h1>
            <p className="ld-lead">{x.rmLead}</p>
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap">
            {sp.done ? <p className="ld-chonest">{x.rmDone}</p> : (
              <form action={removeAthlete} className="ld-ath-form">
                <input type="hidden" name="lang" value={l} />
                {sp.err ? <p className="ld-chonest">{x.rmNotFound}</p> : null}
                <label>{x.rmSlug}<input name="slug" required defaultValue={sp.slug ? `https://247coachai.com${athletePath(l, sp.slug)}` : ""} /></label>
                <label>{x.rmEmail}<input name="email" type="email" autoComplete="email" /></label>
                <label>{x.rmNote}<textarea name="note" rows={3} /></label>
                <button className="btn btn-primary btn-lg" type="submit">{x.rmBtn}</button>
              </form>
            )}
            <h2 style={{ marginTop: 34 }}>{x.privH}</h2>
            <p className="ld-lead">{x.privP}</p>
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={l} />
    </div>
  );
}

// ------------------------------------------------------------------ convertitore di tempi e richiesta di correzione
const eqCount = () => allRaceStats().reduce((s2, [, r]) => s2 + (r.n_cross || 0), 0);
function eqRaces(l: AthLang): EqRace[] {
  const out: EqRace[] = [];
  for (const [slug, r] of allRaceStats()) {
    if (r.diff.finish == null) continue;
    const ed = EDITIONS.filter((e) => e.slug === slug);
    if (!ed.length) continue;
    out.push({ slug, name: ed[0].name, cat: r.cat, d: r.diff.finish, href: `${racesPath(l)}/${slug}`, q: ed.map((e) => edStats(e.id)?.finish).find(Boolean) ?? null });
  }
  return out;
}
const pc = (v: number | undefined, l: AthLang) => (v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString(LOCALE[l], { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`);

async function EquivPage({ l, sp }: { l: AthLang; sp: SP }) {
  const { t, x } = await shell(l);
  const c = CAR[l], races = eqRaces(l);
  const stats = new Map(allRaceStats());
  const lead = fill(c.eqLead, { n: eqCount().toLocaleString(LOCALE[l]) });
  const ld = { "@context": "https://schema.org", "@type": "WebApplication", "@id": `${SITE}${equivPath(l)}#app`, name: c.eqTitle, url: `${SITE}${equivPath(l)}`, description: lead, applicationCategory: "SportsApplication", operatingSystem: "Any", inLanguage: l, offers: { "@type": "Offer", price: 0, priceCurrency: "EUR" }, publisher: { "@id": ORG_ID } };
  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([orgLd(), breadcrumbLd([{ name: "24/7 Coach", url: `/${l}` }, { name: x.nav, url: athletesPath(l) }, { name: `${c.eqH1a} ${c.eqH1b}`, url: equivPath(l) }]), ld]) }} />
      <SiteNav lang={l} t={t} altPaths={alt((k) => equivPath(k))} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono"><Link href={athletesPath(l)}>{x.nav}</Link></p>
            <h1 style={{ marginTop: 8 }}>{c.eqH1a} <em>{c.eqH1b}</em></h1>
            <p className="ld-lead">{lead}</p>
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap">
            <RaceEquivalent races={races} txt={c} initial={{ slug: sp.from && /^[a-z0-9-]{2,60}$/.test(sp.from) ? sp.from : undefined, time: sp.t && /^[0-9:]{4,8}$/.test(sp.t) ? sp.t : undefined }} />
            <p className="note" style={{ marginTop: 16 }}>{c.eqNote}</p>
          </div>
        </section>
        {(["full", "half"] as const).map((cat) => (
          <section className="ld-sec" key={cat}>
            <div className="ld-wrap">
              <div className="ld-sechead"><h2>{c.eqTableH} · {cat === "full" ? c.full : c.half}</h2><p>{c.eqTableLead}</p></div>
              <div className="ld-scroll">
                <table>
                  <thead><tr><th>{c.eqRace}</th><th>{c.eqIdx}</th><th>{x.swim}</th><th>{x.bike}</th><th>{x.run}</th></tr></thead>
                  <tbody>
                    {races.filter((r) => r.cat === cat).sort((p, q) => p.d - q.d).map((r) => { const d = stats.get(r.slug)?.diff ?? {}; return (
                      <tr key={r.slug}><td><Link href={r.href as string}>{r.name}</Link></td><td className="num"><b>{pc(d.finish, l)}</b></td><td className="num">{pc(d.swim, l)}</td><td className="num">{pc(d.bike, l)}</td><td className="num">{pc(d.run, l)}</td></tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}
        <section className="ld-sec ld-bridge compact">
          <div className="ld-wrap">
            <div className="ld-bridge-in">
              <div><p className="mono">24/7 Coach</p><h2>{x.coachH}</h2><p>{x.coachP}</p></div>
              <div className="ld-bridge-cta"><Link className="btn btn-primary btn-lg" href={coachPath(l)}>{x.coachCta}</Link></div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={l} />
    </div>
  );
}

async function RankPage({ l, sp }: { l: AthLang; sp: SP }) {
  const { t, x } = await shell(l);
  const c = CAR[l], r = rankArgs(sp);
  const rows = await getRanking({ metric: r.m, country: r.c, sex: r.sex, limit: 100 });
  const place = rankPlace(r.c, l);
  const here = rankPath(l, { c: r.c, m: r.m });
  const ld = { "@context": "https://schema.org", "@type": "ItemList", "@id": `${SITE}${here}#ranking`, name: `${c.rkH1a} ${place}`, numberOfItems: rows.length, itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: rows.slice(0, 50).map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${athletePath(l, a.slug)}`, name: a.name })) };
  const tab = (m: RankMetric, label: string) => <Link className={r.m === m ? "on" : ""} href={rankPath(l, { c: r.c, sex: r.sex, m })}>{label}</Link>;
  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([orgLd(), breadcrumbLd([{ name: "24/7 Coach", url: `/${l}` }, { name: x.nav, url: athletesPath(l) }, { name: c.rkLink, url: rankPath(l) }]), ld]) }} />
      <SiteNav lang={l} t={t} altPaths={alt((k) => rankPath(k, { c: r.c, sex: r.sex, m: r.m }))} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono"><Link href={athletesPath(l)}>{x.nav}</Link> · {c.rkLink}</p>
            <h1 style={{ marginTop: 8 }}>{c.rkH1a} <em>{place}</em></h1>
            <p className="ld-lead">{c.rkLead}</p>
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-ed-filters">{tab("full", c.rkFull)}{tab("half", c.rkHalf)}{tab("finishes", c.rkFin)}</div>
            <div className="ld-ed-filters">
              <Link className={!r.sex ? "on" : ""} href={rankPath(l, { c: r.c, m: r.m })}>{c.rkAll}</Link>
              <Link className={r.sex === "M" ? "on" : ""} href={rankPath(l, { c: r.c, m: r.m, sex: "M" })} rel="nofollow">{c.rkMen}</Link>
              <Link className={r.sex === "F" ? "on" : ""} href={rankPath(l, { c: r.c, m: r.m, sex: "F" })} rel="nofollow">{c.rkWomen}</Link>
            </div>
            <div className="ld-scroll" style={{ marginTop: 16 }}>
              <table className="ld-edrank">
                <thead><tr><th>#</th><th>{x.edName}</th><th>{c.rkCountry}</th><th>{r.m === "finishes" ? c.rkCount : c.rkBest}</th></tr></thead>
                <tbody>
                  {rows.map((a, i) => (
                    <tr key={a.slug}>
                      <td className="num">{i + 1}</td>
                      <td><Link href={athletePath(l, a.slug)}>{flag(a.country)} {a.name}</Link></td>
                      <td>{a.country ? <Link href={rankPath(l, { c: a.country, m: r.m })}>{countryName(a.country, l)}</Link> : "–"}</td>
                      <td className="num"><b>{r.m === "finishes" ? a.finishes : hms(r.m === "full" ? a.rank_full : a.rank_half)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length ? null : <p className="ld-lead">{c.rkNone}</p>}
            <p className="note" style={{ marginTop: 16 }}>{c.rkNote}</p>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{c.rkLink}</h2>
            <div className="ld-ed-filters">
              <Link className={!r.c ? "on" : ""} href={rankPath(l, { m: r.m })}>{c.rkAllC}</Link>
              {RANK_COUNTRIES.map((cc) => <Link key={cc} className={r.c === cc ? "on" : ""} href={rankPath(l, { c: cc, m: r.m })}>{flag(cc)} {countryName(cc, l)}</Link>)}
            </div>
            <p className="note" style={{ marginTop: 22 }}>{x.srcNote}</p>
            <p className="note" style={{ marginTop: 8 }}>{x.privNote} <Link href={removePath(l)}>{x.privLink}</Link></p>
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={l} />
    </div>
  );
}

async function ClaimPage({ l, sp }: { l: AthLang; sp: SP }) {
  const { t, x } = await shell(l);
  const c = CAR[l];
  return (
    <div className="ld">
      <SiteNav lang={l} t={t} altPaths={alt((k) => claimPath(k))} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono"><Link href={athletesPath(l)}>{x.nav}</Link></p>
            <h1 style={{ marginTop: 8 }}>{c.clH1}</h1>
            <p className="ld-lead">{c.clLead}</p>
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap">
            {sp.done ? <p className="ld-chonest">{c.clDone}</p> : (
              <form action={claimAthlete} className="ld-ath-form">
                <input type="hidden" name="lang" value={l} />
                <input name="website" tabIndex={-1} autoComplete="off" hidden />
                {sp.err ? <p className="ld-chonest">{c.clErr}</p> : null}
                <label>{c.clSlug}<input name="slug" required defaultValue={sp.slug ? `https://247coachai.com${athletePath(l, sp.slug)}` : ""} /></label>
                <label>{c.clOther}<textarea name="other" rows={3} /></label>
                <label>{c.clEmail}<input name="email" type="email" autoComplete="email" required /></label>
                <label>{c.clNote}<textarea name="note" rows={3} /></label>
                <button className="btn btn-primary btn-lg" type="submit">{c.clBtn}</button>
                <p className="note">{c.clPriv}</p>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={l} />
    </div>
  );
}

/** Edizione come evento sportivo e come insieme di dati (senza file scaricabile). */
function editionLd(e: Edition, l: AthLang, description: string) {
  const url = `${SITE}${editionPath(l, e.id)}`;
  return [
    { "@context": "https://schema.org", "@type": "SportsEvent", "@id": `${url}#event`, name: editionLabel(e), sport: "Triathlon", startDate: e.date, endDate: e.date, eventStatus: "https://schema.org/EventScheduled", url, description },
    { "@context": "https://schema.org", "@type": "Dataset", "@id": `${url}#results`, name: `${editionLabel(e)}: ${ATH[l].edKicker}`, description, url, inLanguage: l, creator: { "@id": ORG_ID }, temporalCoverage: e.date, about: { "@id": `${url}#event` }, isAccessibleForFree: true,
      variableMeasured: ["swim time", "bike time", "run time", "finish time", "overall rank", "age group"], measurementTechnique: "Official race timing" },
  ];
}

// ------------------------------------------------------------------ classifica di un'edizione
type EdSP = { sex?: string; ag?: string; p?: string };
const AG_ORDER = ["PRO", "18-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-74", "75-79", "80-84"];

export async function editionMetadata(lang: string, seg0: string, id: string, sp: EdSP): Promise<Metadata> {
  const l = athLang(lang), x = ATH[l], e = editionById(id);
  if (!e || (seg0 !== RESULTS_SEG.en && seg0 !== RESULTS_SEG.it)) return { robots: { index: false } };
  const v = { race: editionLabel(e), fin: e.fin.toLocaleString(LOCALE[l]) };
  const title = fill(x.edTitle, v), desc = fill(x.edDesc, v);
  const filtered = Boolean(sp.sex || sp.ag || (sp.p && sp.p !== "1"));
  return { title: `${title} · 24/7 Coach`, description: desc, robots: filtered ? { index: false, follow: true } : undefined, alternates: { canonical: editionPath(l, id), languages: { en: editionPath("en", id), it: editionPath("it", id), "x-default": editionPath("en", id) } }, openGraph: { locale: OG_LOCALE[l], title, description: desc } };
}

export async function EditionPage({ lang, seg, seg0, id, sp }: { lang: string; seg: string; seg0: string; id: string; sp: EdSP }) {
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  if (isLang(lang) && (seg0 === RESULTS_SEG.en || seg0 === RESULTS_SEG.it) && seg0 !== RESULTS_SEG[athLang(lang)]) redirect(`${editionPath(athLang(lang), id)}${qs ? `?${qs}` : ""}`);
  const l = gate(lang, seg, `/${seg0}/${id}${qs ? `?${qs}` : ""}`);
  const e = seg0 === RESULTS_SEG[l] ? editionById(id) : null;
  if (!e) notFound();
  const { t, x } = await shell(l);
  const sex = sp.sex === "M" || sp.sex === "F" ? sp.sex : null;
  const ag = sp.ag && /^[MF](PRO|\d\d-\d\d)$/.test(sp.ag) ? sp.ag : null;
  const page = Math.max(1, Math.min(500, Number(sp.p) || 1));
  const SIZE = 100;
  const { rows, total } = await getEditionResults(e.id, { sex, ag, page: page - 1, size: SIZE });
  const pages = Math.max(1, Math.ceil(total / SIZE));
  const here = editionPath(l, e.id);
  const link = (o: { sex?: string | null; ag?: string | null; p?: number }) => {
    const q = new URLSearchParams();
    if (o.ag) q.set("ag", o.ag); else if (o.sex) q.set("sex", o.sex);
    if (o.p && o.p > 1) q.set("p", String(o.p));
    const s2 = q.toString();
    return `${here}${s2 ? `?${s2}` : ""}`;
  };
  const others = EDITIONS.filter((o) => o.key === e.key && o.id !== e.id);
  const raceUrl = e.slug ? `${racesPath(l)}/${e.slug}` : null;
  const n = (v: number) => v.toLocaleString(LOCALE[l]);
  const agSex = ag ? ag[0] : sex;
  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([orgLd(), breadcrumbLd([{ name: "24/7 Coach", url: `/${l}` }, { name: x.nav, url: athletesPath(l) }, { name: editionLabel(e), url: here }]), editionLd(e, l, fill(x.edDesc, { race: editionLabel(e), fin: n(e.fin) }))]) }} />
      <SiteNav lang={l} t={t} altPaths={alt((k) => editionPath(k, e.id))} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono"><Link href={athletesPath(l)}>{x.nav}</Link> · {x.edKicker}</p>
            <h1 style={{ marginTop: 8 }}>{e.name} <em>{e.y}</em></h1>
            <p className="ld-lead">{fmtDate(e.date, l)} · {fill(x.edFound, { n: n(e.fin) })}</p>
            <div className="ld-cta">
              {raceUrl ? <Link className="btn btn-ghost" href={raceUrl}>{x.edRace} →</Link> : null}
              {others.map((o) => <Link key={o.id} className="btn btn-ghost" href={editionPath(l, o.id)}>{editionLabel(o).replace(o.name, "").trim()}</Link>)}
            </div>
            <p className="lab" style={{ marginTop: 22 }}>{x.edSearch}</p>
            <AthleteSearch base={athletesPath(l)} race={e.key} txt={{ ph: x.searchPh, none: x.none, typeMore: x.typeMore, race1: x.race1, raceN: x.raceN }} />
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-ed-filters">
              <Link className={!sex && !ag ? "on" : ""} href={link({})}>{x.edAll}</Link>
              <Link className={agSex === "M" && !ag ? "on" : ""} href={link({ sex: "M" })}>{x.edMen}</Link>
              <Link className={agSex === "F" && !ag ? "on" : ""} href={link({ sex: "F" })}>{x.edWomen}</Link>
            </div>
            {agSex ? (
              <div className="ld-ed-filters" aria-label={x.edAg}>
                {AG_ORDER.map((a) => <Link key={a} className={ag === `${agSex}${a}` ? "on" : ""} href={link({ ag: `${agSex}${a}` })} rel="nofollow">{agSex}{a}</Link>)}
              </div>
            ) : null}
            <p className="note" style={{ marginTop: 14 }}>{fill(x.edFound, { n: n(total) })}{pages > 1 ? ` · ${fill(x.edPage, { p: page, n: pages })}` : ""}</p>
            <div className="ld-scroll" style={{ marginTop: 8 }}>
              <table className="ld-edrank">
                <thead><tr><th>{x.edPos}</th><th>{x.edName}</th><th>{x.ag}</th><th>{x.swim}</th><th>T1</th><th>{x.bike}</th><th>T2</th><th>{x.run}</th><th>{x.finish}</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.edition_id}-${r.bib}-${i}`}>
                      <td className="num">{sex || ag ? (page - 1) * SIZE + i + 1 : r.rank_overall ?? (page - 1) * SIZE + i + 1}</td>
                      <td>{r.slug ? <Link href={athletePath(l, r.slug)}>{flag(r.country)} {r.name}</Link> : <span className="note">{x.edAnon}</span>}</td>
                      <td>{r.age_group ?? "–"}</td>
                      <td className="num">{hms(r.swim)}</td><td className="num">{hms(r.t1)}</td><td className="num">{hms(r.bike)}</td><td className="num">{hms(r.t2)}</td><td className="num">{hms(r.run)}</td>
                      <td className="num"><b>{hms(r.finish)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 ? (
              <div className="ld-ed-pager">
                {page > 1 ? <Link className="btn btn-ghost" href={link({ sex, ag, p: page - 1 })}>{x.edPrev}</Link> : <span />}
                <span className="note">{fill(x.edPage, { p: page, n: pages })}</span>
                {page < pages ? <Link className="btn btn-ghost" href={link({ sex, ag, p: page + 1 })}>{x.edNext}</Link> : <span />}
              </div>
            ) : null}
            <p className="note" style={{ marginTop: 22 }}>{x.srcNote}</p>
            <p className="note" style={{ marginTop: 8 }}>{x.privNote} <Link href={removePath(l)}>{x.privLink}</Link></p>
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={l} />
    </div>
  );
}
export type { Edition };
