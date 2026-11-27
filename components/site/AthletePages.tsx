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
import { removeAthlete } from "@/lib/site/athleteActions";
import {
  ATH, COMPARE_SEG, EDITIONS, REMOVE_SEG, RESULTS_SEG, athLang, athletePath, athletesPath, comparePath, delta, editionById, editionLabel, editionPath, fill, flag, getAthlete, getEditionResults, hms, raceLabel, removePath,
  type AthLang, type AthResult, type Athlete, type Edition,
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
            <p className="mono">{x.nav} · 2022–2026</p>
            <h1 style={{ marginTop: 8 }}>{x.hubH1a} <em>{x.hubH1b}</em></h1>
            <p className="ld-lead">{x.hubLead}</p>
            {raceKey ? <p className="note">{x.inRace}: {raceKey}</p> : null}
            <AthleteSearch base={athletesPath(l)} race={raceKey} txt={{ ph: x.searchPh, none: x.none, typeMore: x.typeMore, race1: x.race1, raceN: x.raceN }} autoFocus />
          </div>
        </div>
        <section className="ld-sec">
          <div className="ld-wrap ld-grid ld-g2">
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
type SP = { a?: string; race?: string; slug?: string; done?: string; err?: string };

export async function slugMetadata(lang: string, slug: string): Promise<Metadata> {
  const l = athLang(lang), x = ATH[l];
  if (slug === COMPARE_SEG[l]) return { title: `${x.cmpTitle} · 24/7 Coach`, description: x.cmpLead, robots: { index: false, follow: true } };
  if (slug === REMOVE_SEG[l]) return { title: `${x.rmTitle} · 24/7 Coach`, robots: { index: false, follow: false } };
  const d = await getAthlete(slug);
  if (!d) return { robots: { index: false } };
  const a = d.athlete;
  const v = { name: a.name, country: a.country ? ` (${a.country})` : "", races: a.races, y1: a.first_year ?? "", y2: a.last_year ?? "" };
  const title = fill(x.athTitle, v), desc = fill(x.athDesc, v);
  return { title: `${title} · 24/7 Coach`, description: desc, alternates: { canonical: athletePath(l, slug), languages: { en: athletePath("en", slug), it: athletePath("it", slug), "x-default": athletePath("en", slug) } }, openGraph: { locale: OG_LOCALE[l], title, description: desc } };
}

export async function SlugPage({ lang, seg, slug, sp }: { lang: string; seg: string; slug: string; sp: SP }) {
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  if (isLang(lang)) {
    // segmenti speciali nell'altra lingua → quelli giusti
    const l0 = athLang(lang);
    const other: AthLang = l0 === "en" ? "it" : "en";
    if (slug === COMPARE_SEG[other]) redirect(`${athletesPath(l0)}/${COMPARE_SEG[l0]}${qs ? `?${qs}` : ""}`);
    if (slug === REMOVE_SEG[other]) redirect(`${athletesPath(l0)}/${REMOVE_SEG[l0]}${qs ? `?${qs}` : ""}`);
  }
  const l = gate(lang, seg, `/${slug}${qs ? `?${qs}` : ""}`);
  if (slug === RESULTS_SEG.en || slug === RESULTS_SEG.it) redirect(athletesPath(l));
  if (slug === COMPARE_SEG[l]) return <ComparePage l={l} sp={sp} />;
  if (slug === REMOVE_SEG[l]) return <RemovePage l={l} sp={sp} />;
  const d = await getAthlete(slug);
  if (!d) notFound();
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
  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([orgLd(), breadcrumbLd([{ name: "24/7 Coach", url: `/${l}` }, { name: x.nav, url: athletesPath(l) }, { name: a.name, url: athletePath(l, a.slug) }])]) }} />
      <SiteNav lang={l} t={t} altPaths={alt((k) => athletePath(k, a.slug))} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono"><Link href={athletesPath(l)}>{x.nav}</Link> · {x.athKicker}</p>
            <h1 style={{ marginTop: 8 }}>{flag(a.country)} {a.name} <em>{x.athH1b}</em></h1>
            <div className="ld-ctiles" style={{ marginTop: 22 }}>
              <div className="ld-stat"><b className="num">{a.races}</b><span>{x.tRaces}{a.first_year ? ` · ${a.first_year === a.last_year ? a.first_year : `${a.first_year}–${a.last_year}`}` : ""}</span></div>
              <div className="ld-stat"><b className="num">{a.finishes}</b><span>{x.tFin}</span></div>
              {a.best_full ? <div className="ld-stat"><b className="num">{hms(a.best_full)}</b><span>{x.tBestFull}</span></div> : null}
              {a.best_half ? <div className="ld-stat"><b className="num">{hms(a.best_half)}</b><span>{x.tBestHalf}</span></div> : null}
            </div>
          </div>
        </div>

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([orgLd(), breadcrumbLd([{ name: "24/7 Coach", url: `/${l}` }, { name: x.nav, url: athletesPath(l) }, { name: editionLabel(e), url: here }])]) }} />
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
