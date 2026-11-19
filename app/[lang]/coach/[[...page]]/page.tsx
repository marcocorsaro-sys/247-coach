// Pagine del servizio: /{lang}/coach e le cinque pagine d'esempio.
// Testi in lib/site/coach.ts (inglese e italiano); le altre lingue vanno all'inglese.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAiCoachMode } from "@/lib/ai/mode";
import { isLang, LANGS, LOCALE, OG_LOCALE, racesPath, type Lang } from "@/lib/i18n/config";
import { fmt, getDict, tr } from "@/lib/i18n";
import { breadcrumbLd, faqLd, orgLd } from "@/lib/site/jsonld";
import { fmtDate, getRaceFacts, listRaces, racePath, raceTitle, type Race } from "@/lib/site/races";
import { SiteFooter, SiteNav } from "@/components/site/SiteShell";
import { CoachCta, SesBox, Thread, WeekGrid } from "@/components/site/CoachBits";
import {
  ADAPTS, COACH_PAGES, COACH_SLUG, EXAMPLE_RACE, HOW, HUB, META, PAGE_BLURB, PAGE_NAME, PERSONA, PRICE_EUR, PRICING, RACEPLAN, UI, WEEK,
  coachPageFromSlug, coachPath, type CoachLang, type CoachPage,
} from "@/lib/site/coach";

export const revalidate = 3600;
type Props = { params: Promise<{ lang: string; page?: string[] }> };
const CL: CoachLang[] = ["en", "it"];

export function generateStaticParams() {
  if (!isAiCoachMode()) return [];
  return CL.flatMap((lang) => [{ lang, page: [] as string[] }, ...Object.values(COACH_SLUG[lang]).map((s) => ({ lang, page: [s] }))]);
}

function resolve(lang: string, page: string[] | undefined): { l: CoachLang; key: CoachPage } | { to: string } | null {
  if (!isLang(lang) || (page && page.length > 1)) return null;
  const slug = page?.[0];
  if (lang !== "en" && lang !== "it") {
    // lingue senza app: stessa pagina in inglese (lo slug può essere quello inglese)
    const key = coachPageFromSlug("en", slug);
    return { to: coachPath("en", key ?? "hub") };
  }
  const key = coachPageFromSlug(lang, slug);
  if (key) return { l: lang, key };
  // slug dell'altra lingua (link copiato cambiando solo /en/ in /it/): porta alla pagina giusta
  const other = coachPageFromSlug(lang === "en" ? "it" : "en", slug);
  return other ? { to: coachPath(lang, other) } : null;
}

const title1 = (r: Race) => raceTitle(r).replace(/(70\.3.*)\s70\.3$/, "$1");
const weeksTo = (d: string | null | undefined) => (d ? Math.max(1, Math.round((new Date(d + "T12:00:00Z").getTime() - Date.now()) / (7 * 86400_000))) : null);
const signup = (l: CoachLang, from: string, race?: string) => `/registrati?lang=${l}&from=${from}${race ? `&race=${encodeURIComponent(race)}` : ""}`;

async function exampleRace(l: CoachLang): Promise<Race | null> {
  const races = await listRaces(l);
  return races.find((r) => r.slug === EXAMPLE_RACE[l]) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, page } = await params;
  const r = resolve(lang, page);
  if (!r || "to" in r) return {};
  const m = META[r.l][r.key];
  const race = r.key === "week" ? await exampleRace(r.l) : null;
  const lead = fmt(m.lead, { weeks: weeksTo(race?.race_date) ?? "" });
  const title = `${m.h1a} ${m.h1b}`.replace(/\s+/g, " ");
  return {
    title: `${title} · 24/7 Coach`,
    description: lead,
    alternates: { canonical: coachPath(r.l, r.key), languages: { en: coachPath("en", r.key), it: coachPath("it", r.key), "x-default": coachPath("en", r.key) } },
    openGraph: { locale: OG_LOCALE[r.l], title, description: lead },
  };
}

export default async function CoachPages({ params }: Props) {
  if (!isAiCoachMode()) notFound();
  const { lang, page } = await params;
  const r = resolve(lang, page);
  if (!r) notFound();
  if ("to" in r) redirect(r.to);
  const { l, key } = r;
  const t = tr(await getDict(l));
  const ui = UI[l], m = META[l][key], p = PERSONA[l];
  const alt = Object.fromEntries(LANGS.map((x) => [x, coachPath(x as Lang, key)]));
  const race = key === "week" || key === "race" ? await exampleRace(l) : null;
  const weeks = weeksTo(race?.race_date);
  const lead = fmt(m.lead, { weeks: weeks ?? "" });
  const crumbs = [{ name: "24/7 Coach", url: `/${l}` }, { name: PAGE_NAME[l].hub, url: coachPath(l) }, ...(key === "hub" ? [] : [{ name: PAGE_NAME[l][key], url: coachPath(l, key) }])];
  const ld: unknown[] = [orgLd(), breadcrumbLd(crumbs)];
  if (key === "pricing") ld.push(faqLd(PRICING[l].faq));
  const others = COACH_PAGES.filter((k) => k !== "hub" && k !== key) as Exclude<CoachPage, "hub">[];

  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld.filter(Boolean)) }} />
      <SiteNav lang={l} t={t} active={key === "how" ? "how" : "coach"} altPaths={alt} />
      <main>
        <div className="ld-rhead ld-chead">
          <div className="ld-wrap">
            <p className="mono">{key === "hub" ? "24/7 Coach" : <><Link href={coachPath(l)}>{ui.crumb}</Link> · {PAGE_NAME[l][key]}</>}</p>
            <h1 style={{ marginTop: 8 }}>{m.h1a} <em>{m.h1b}</em></h1>
            <p className="ld-lead">{lead}</p>
            {key === "hub" ? (
              <div className="ld-cta">
                <Link className="btn btn-primary btn-lg" href={signup(l, "coach")}>{ui.start}</Link>
                <Link className="btn btn-ghost btn-lg" href={coachPath(l, "how")}>{PAGE_NAME[l].how}</Link>
              </div>
            ) : null}
          </div>
        </div>

        {key === "hub" ? <Hub l={l} /> : null}
        {key === "how" ? <How l={l} /> : null}
        {key === "week" ? <Week l={l} /> : null}
        {key === "adapts" ? <Adapts l={l} /> : null}
        {key === "race" ? <RacePlan l={l} race={race} weeks={weeks} /> : null}
        {key === "pricing" ? <Pricing l={l} /> : null}

        {key === "hub" ? null : (
          <section className="ld-sec">
            <div className="ld-wrap">
              <p className="mono">{HUB[l].pagesH}</p>
              <div className="ld-grid ld-g2 ld-cnext">
                {others.map((k) => (
                  <Link key={k} className="ld-card ld-clink" href={coachPath(l, k)}>
                    <b>{PAGE_NAME[l][k]} →</b><span>{PAGE_BLURB[l][k]}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
        <CoachCta
          title={key === "how" ? HOW[l].cta : key === "week" ? WEEK[l].cta : key === "adapts" ? ADAPTS[l].cta : key === "race" && race ? fmt(RACEPLAN[l].cta, { race: title1(race) }) : ui.start}
          primary={ui.start}
          href={signup(l, `coach-${key}`, key === "race" && race ? race.slug : undefined)}
          secondary={key === "week" ? { label: WEEK[l].cta2, href: coachPath(l, "adapts") } : key === "adapts" ? { label: ADAPTS[l].cta2, href: coachPath(l, "pricing") } : key === "race" ? { label: RACEPLAN[l].ctaPick, href: racesPath(l) } : key === "pricing" ? undefined : { label: PAGE_NAME[l].week, href: coachPath(l, "week") }}
          note={`${ui.startNote} ${l === "it" ? `Da gennaio ${PRICE_EUR} € al mese.` : `From January, €${PRICE_EUR} a month.`}`}
        />
      </main>
      <SiteFooter t={t} lang={l} />
    </div>
  );

  // ------------------------------------------------------------------ sezioni
  function Hub({ l }: { l: CoachLang }) {
    const h = HUB[l];
    return (
      <>
        <section className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-grid ld-c4">
              {h.does.map((d, i) => (
                <div key={d.t} className="ld-card ld-cdo"><span className="lab num">0{i + 1}</span><h3>{d.t}</h3><p>{d.p}</p></div>
              ))}
            </div>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap ld-csplit">
            <div>
              <h2>{h.whoH}</h2>
              <div className="ld-cwho">
                {h.who.map((w, i) => <p key={w.t} className={i === 0 ? "first" : ""}><b>{w.t}</b> {w.p}</p>)}
              </div>
            </div>
            <Thread msgs={WEEK[l].talks[0].msgs} me={p.a} coach={p.c} channel={WEEK[l].talks[0].ch} />
          </div>
          <div className="ld-wrap"><p className="note">{ui.example}</p></div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{h.wontH}</h2>
            <ul className="ld-cwont">{h.wont.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{h.pagesH}</h2>
            <div className="ld-grid ld-g2 ld-cnext" style={{ marginTop: 22 }}>
              {(COACH_PAGES.filter((k) => k !== "hub") as Exclude<CoachPage, "hub">[]).map((k) => (
                <Link key={k} className="ld-card ld-clink" href={coachPath(l, k)}>
                  <b>{PAGE_NAME[l][k]} →</b><span>{PAGE_BLURB[l][k]}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  function How({ l }: { l: CoachLang }) {
    const h = HOW[l];
    return (
      <>
        <section className="ld-sec">
          <div className="ld-wrap">
            <ol className="ld-chow">
              {h.steps.map((s, i) => (
                <li key={s.t}>
                  <span className="n num">{i + 1}</span>
                  <div>
                    <span className="lab">{s.time}</span>
                    <h3>{s.t}</h3>
                    <p>{s.p}</p>
                    {i === 1 ? (
                      <div className="ld-cans"><span className="lab">{h.answersH}</span>{h.answers.map((a) => <span key={a} className="ld-chip on">{a}</span>)}</div>
                    ) : null}
                    {i === 2 ? (
                      <div className="ld-cbridge">{h.bridge.map((b, j) => <span key={b} className="ld-cnode">{j ? <i>→</i> : null}<b>{b}</b></span>)}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            <p className="note">{ui.example}</p>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{h.thenH}</h2>
            <div className="ld-grid ld-g3" style={{ marginTop: 22 }}>
              {h.then.map((x) => <div key={x.t} className="ld-card ld-cdo"><h3>{x.t}</h3><p>{x.p}</p></div>)}
            </div>
            <p className="ld-chonest">{h.honest}</p>
          </div>
        </section>
      </>
    );
  }

  function Week({ l }: { l: CoachLang }) {
    const w = WEEK[l];
    return (
      <>
        <section className="ld-sec">
          <div className="ld-wrap">
            <dl className="ld-cfacts">{w.card.map((c) => <div key={c.l}><dt>{c.l}</dt><dd>{c.v}</dd></div>)}</dl>
            <p className="note">{ui.example}</p>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-sechead"><h2>{w.weekH}</h2><p>{w.total}</p></div>
            <WeekGrid days={w.days} />
            <ul className="ld-cnotes">{w.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{w.talkH}</h2>
            <div className="ld-ctalks">
              {w.talks.map((tk) => (
                <div key={tk.h}>
                  <p className="mono">{tk.h}</p>
                  <Thread msgs={tk.msgs} me={p.a} coach={p.c} channel={tk.ch} />
                </div>
              ))}
            </div>
            <p className="ld-chonest">{w.honesty}</p>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{w.sawH}</h2>
            <div className="ld-grid ld-g3" style={{ marginTop: 22 }}>
              {w.saw.map((s) => <div key={s.v} className="ld-card ld-cdo"><h3>{s.v}</h3><span className="lab">{s.l}</span><p>{s.p}</p></div>)}
            </div>
          </div>
        </section>
      </>
    );
  }

  function Adapts({ l }: { l: CoachLang }) {
    const a = ADAPTS[l];
    return (
      <>
        {a.cases.map((c, i) => (
          <section key={c.h} className="ld-sec">
            <div className="ld-wrap ld-csplit">
              <div>
                <p className="mono num">0{i + 1}</p>
                <h2>{c.h}</h2>
                <p className="lab" style={{ marginTop: 18 }}>{ui.happened}</p>
                <p className="ld-cfact">{c.fact}</p>
                {c.before && c.after ? (
                  <div className="ld-cba">
                    <div><span className="lab">{ui.before}</span>{c.before.map((s) => <SesBox key={s.t} s={s} />)}</div>
                    <div><span className="lab">{ui.after}</span>{c.after.map((s) => <SesBox key={s.t} s={s} />)}</div>
                  </div>
                ) : null}
                {c.variant ? <p className="note">{c.variant}</p> : null}
                <p className="ld-crule"><span className="lab">{ui.rule}</span>{c.rule}</p>
              </div>
              <Thread msgs={c.msgs} me={p.a} coach={p.c} channel={c.ch} />
            </div>
          </section>
        ))}
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{a.whenH}</h2>
            <div className="ld-grid ld-c4" style={{ marginTop: 22 }}>
              {a.when.map((x) => <div key={x.t} className="ld-card ld-cdo"><h3>{x.t}</h3><p>{x.p}</p></div>)}
            </div>
            <p className="ld-chonest">{a.limits}</p>
            <p className="note">{ui.example}</p>
          </div>
        </section>
      </>
    );
  }

  async function RacePlan({ l, race, weeks }: { l: CoachLang; race: Race | null; weeks: number | null }) {
    const x = RACEPLAN[l];
    const facts = race ? await getRaceFacts(race.id) : null;
    const f = (facts ?? {}) as { climate?: { tmax_avg?: number; wind_avg_kmh?: number } | null; water?: { avg_c?: number } | null };
    const n = (v: number | null | undefined, d = 0) => (v == null ? null : Number(v).toLocaleString(LOCALE[l], { maximumFractionDigits: d }));
    const name = race ? title1(race) : "";
    const tiles: { v: string; l: string }[] = race ? [
      { v: `${n(race.swim_km, 1)} km`, l: x.tiles.swim },
      { v: `${n(race.bike_km)} km`, l: race.bike_dplus_m != null ? fmt(x.tiles.bike, { dplus: n(race.bike_dplus_m) }) : x.tiles.bike.split(",")[0] },
      { v: `${n(race.run_km, 1)} km`, l: x.tiles.run },
      ...(f.climate?.tmax_avg != null ? [{ v: `${n(f.climate.tmax_avg, 1)} °C`, l: x.tiles.air }] : []),
      ...(f.water?.avg_c != null ? [{ v: `${n(f.water.avg_c, 1)} °C`, l: x.tiles.water }] : []),
      ...(f.climate?.wind_avg_kmh != null ? [{ v: `${n(f.climate.wind_avg_kmh)} km/h`, l: x.tiles.wind }] : []),
    ] : [];
    return (
      <>
        {race ? (
          <section className="ld-sec">
            <div className="ld-wrap">
              <div className="ld-sechead">
                <h2>{fmt(x.asksH, { race: name })}</h2>
                <p>{fmtDate(race.race_date, { day: "numeric", month: "long", year: "numeric" }, LOCALE[l])} · {[race.city, race.country].filter(Boolean).join(", ")}</p>
              </div>
              <div className="ld-ctiles">{tiles.map((tl) => <div key={tl.l} className="ld-stat"><b className="num">{tl.v}</b><span>{tl.l}</span></div>)}</div>
              <div className="ld-cta"><Link className="btn btn-ghost" href={racePath(race, l)}>{x.seePage} →</Link></div>
            </div>
          </section>
        ) : null}
        <section className="ld-sec">
          <div className="ld-wrap ld-grid ld-g2">
            <div className="ld-card ld-cdo"><h3>{x.standH}</h3><p>{x.stand}</p><p style={{ marginTop: 12 }}><Link href={`/${l}/calc`}>{x.calc} →</Link></p></div>
            <div className="ld-card ld-cdo"><h3>{x.leverH}</h3><p>{x.lever}</p></div>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <div className="ld-sechead"><h2>{weeks ? fmt(x.weeksH, { weeks }) : x.weeksH.replace("{weeks} ", "")}</h2><p>{x.weeks}</p></div>
            <div className="ld-cblocks">
              {x.blocks.map((b, i) => <div key={b.t} className={`b${i}`}><span className="lab num">0{i + 1}</span><h3>{b.t}</h3><p>{b.p}</p></div>)}
            </div>
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap ld-csplit">
            <div><h2>{x.tellH}</h2><p className="ld-lead">{x.tell}</p><p className="note">{ui.example}</p></div>
            <Thread msgs={x.msgs} me={p.a} coach={p.c} channel={ui.telegram} />
          </div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap ld-calcteaser">
            <div><h2>{x.pickH}</h2><p>{x.pick}</p></div>
            <Link className="btn btn-primary btn-lg" href={racesPath(l)}>{x.ctaPick}</Link>
          </div>
        </section>
      </>
    );
  }

  function Pricing({ l }: { l: CoachLang }) {
    const x = PRICING[l];
    return (
      <>
        <section className="ld-sec">
          <div className="ld-wrap ld-grid ld-g2">
            <div className="ld-card ld-cprice on">
              <span className="lab">{x.nowT}</span>
              <b className="num">0 €</b>
              <p>{x.nowP}</p>
            </div>
            <div className="ld-card ld-cprice">
              <span className="lab">{x.thenT}</span>
              <b className="num">{PRICE_EUR} € <i>{x.per}</i></b>
              <p>{x.thenP}</p>
            </div>
          </div>
          <div className="ld-wrap"><ul className="ld-cincl">{x.incl.map((i) => <li key={i}>{i}</li>)}</ul></div>
        </section>
        <section className="ld-sec">
          <div className="ld-wrap">
            <h2>{x.faqH}</h2>
            <div className="ld-cfaq">
              {x.faq.map((q) => <details key={q.q}><summary>{q.q}</summary><p>{q.a}</p></details>)}
            </div>
          </div>
        </section>
      </>
    );
  }
}
