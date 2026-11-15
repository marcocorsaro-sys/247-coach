// Sezioni delle pagine "dati" di una gara: risultati e vincitori di categoria,
// iscrizione e prezzi, meteo e acqua, negozi/meccanici bici, recensioni, slot
// mondiali, tempi massimi. Dati da event_race_facts (vedi lib/site/facts.ts).
import Script from "next/script";
import type { Lang } from "@/lib/i18n/config";
import { LOCALE } from "@/lib/i18n/config";
import type { DataFacet as DF } from "@/lib/site/facets";
import { DATA_UI, fillUi } from "@/lib/site/dataUi";
import { isoCurrency } from "@/lib/site/jsonld";
import type { BikeShop, Climate, Finisher, Official, Results, Water } from "@/lib/site/facts";
import type { RaceBundle, RaceMedia } from "@/lib/site/races";

export interface FactsRow {
  lat: number | null; lon: number | null; geo_label: string | null;
  climate: Climate | null; water: Water | null; bike_shops: BikeShop[] | null;
  official: Official | null; official_url: string | null; official_at: string | null;
  results: Results | null; results_year: number | null; results_at: string | null; climate_at: string | null; shops_at: string | null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
/** Post Instagram il cui autore corrisponde al nome del vincitore (nome e cognome entrambi presenti). */
export function winnerPosts(media: RaceMedia[], winners: Finisher[]) {
  const ig = media.filter((m) => m.platform === "instagram" && (m.author || m.author_handle));
  const out: { w: Finisher; m: RaceMedia }[] = [];
  for (const w of winners) {
    const parts = w.name.split(/[\s,]+/).map(norm).filter((x) => x.length >= 3);
    if (parts.length < 2) continue;
    const m = ig.find((x) => { const a = norm(`${x.author ?? ""}${x.author_handle ?? ""}`); return parts.every((p) => a.includes(p)); });
    if (m && !out.some((o) => o.m.id === m.id)) out.push({ w, m });
  }
  return out;
}

const day = (iso: string | null | undefined, lang: Lang) => (iso ? new Date(iso).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric" }) : "");
const money = (p: number, cur: string | null, lang: Lang) => { const c = isoCurrency(cur); try { return c ? new Intl.NumberFormat(LOCALE[lang], { style: "currency", currency: c, maximumFractionDigits: 0 }).format(p) : `${Math.round(p)} ${cur ?? ""}`.trim(); } catch { return `${Math.round(p)} ${cur ?? ""}`.trim(); } };
const n1 = (x: number | null | undefined, lang: Lang) => (x == null || Number.isNaN(x) ? "–" : x.toLocaleString(LOCALE[lang], { maximumFractionDigits: 1 }));

function Kpis({ items }: { items: { v: string; l: string }[] }) {
  return <div className="ld-kpis">{items.filter((k) => k.v && k.v !== "–").map((k) => <div className="ld-kpi" key={k.l}><b className="num">{k.v}</b><span>{k.l}</span></div>)}</div>;
}
const Sec = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <section className="ld-sec"><div className="ld-wrap">{title ? <h2>{title}</h2> : null}{children}</div></section>
);
const SrcLine = ({ label, href, text }: { label: string; href?: string | null; text: string }) => (
  <p className="note" style={{ marginTop: 12 }}>{label}: {href ? <a href={href} target="_blank" rel="noopener nofollow">{text}</a> : text}</p>
);

export function DataFacetBody({ f, facts, b, lang }: { f: DF; facts: FactsRow; b: RaceBundle; lang: Lang }) {
  const u = DATA_UI[lang];
  const o = facts.official;
  const res = facts.results;

  if (f === "results" && res) {
    const winners = [...res.overall.M.slice(0, 1), ...res.overall.F.slice(0, 1), ...res.ag];
    const posts = winnerPosts(b.media, winners).slice(0, 12);
    const table = (rows: Finisher[], withDiv: boolean) => (
      <div className="ld-tw" style={{ marginTop: 10 }}>
        <table>
          <thead><tr>{withDiv ? <th>{u.cat}</th> : <th>#</th>}<th>{u.athlete}</th><th>{u.country}</th><th>{u.time}</th></tr></thead>
          <tbody>{rows.map((x, i) => <tr key={x.div + x.name}>{withDiv ? <td>{x.div}</td> : <td className="n">{x.pos ?? i + 1}</td>}<td><b>{x.name}</b></td><td>{x.country ?? ""}</td><td className="n">{x.time}</td></tr>)}</tbody>
        </table>
      </div>
    );
    return (
      <>
        <Sec>
          <Kpis items={[{ v: String(res.starters || ""), l: u.starters }, { v: String(res.finishers || ""), l: u.finishers }, { v: String(res.dnf || ""), l: u.dnf }, { v: res.median.M ?? "", l: `${u.median} · ${u.men}` }, { v: res.median.F ?? "", l: `${u.median} · ${u.women}` }]} />
          <p className="note" style={{ marginTop: 10 }}>{fillUi(u.resultsNote, { year: res.year })}</p>
        </Sec>
        <Sec title={u.overall}>
          <div className="ld-grid ld-g2">
            <div><h3 className="lab">{u.men}</h3>{table(res.overall.M, false)}</div>
            <div><h3 className="lab">{u.women}</h3>{table(res.overall.F, false)}</div>
          </div>
        </Sec>
        <Sec title={u.agWinners}>
          {table(res.ag, true)}
          <SrcLine label={u.source} href={res.url} text={res.source} />
        </Sec>
        {posts.length ? (
          <Sec title={u.winnerPosts}>
            <div className="ld-grid ld-g3">
              {posts.map(({ w, m }) => (
                <figure key={m.id} style={{ margin: 0 }}>
                  <blockquote className="instagram-media" data-instgrm-permalink={m.url} data-instgrm-version="14" style={{ margin: 0, minWidth: 0, width: "100%" }}>
                    <a href={m.url} target="_blank" rel="noopener">{m.author_handle ? `@${m.author_handle}` : m.author}</a>
                  </blockquote>
                  <figcaption className="note">{w.div} · {w.name} · {w.time}</figcaption>
                </figure>
              ))}
            </div>
            <Script src="https://www.instagram.com/embed.js" strategy="lazyOnload" />
          </Sec>
        ) : null}
      </>
    );
  }

  if (f === "registration" && o) {
    const tiers = (o.price_tiers ?? []).filter((t) => t.price != null);
    return (
      <>
        <Sec>
          <Kpis items={[{ v: o.status ?? "", l: u.status }, { v: o.opens_at ?? "", l: u.opens }, { v: tiers.length ? money(Math.min(...tiers.map((t) => t.price!)), tiers[0].currency, lang) : "", l: u.prices }]} />
          {o.register_url ? <div className="ld-cta"><a className="btn btn-primary" href={o.register_url} target="_blank" rel="noopener nofollow">{u.register} ↗</a>{o.athlete_guide_url ? <a className="btn btn-ghost" href={o.athlete_guide_url} target="_blank" rel="noopener nofollow">{u.guide} ↗</a> : null}</div> : null}
        </Sec>
        {tiers.length ? (
          <Sec title={u.prices}>
            <div className="ld-tw"><table><tbody>{tiers.map((t) => <tr key={t.name}><td><b>{t.name}</b>{t.notes ? <><br /><small>{t.notes}</small></> : null}</td><td className="n">{money(t.price!, t.currency, lang)}</td></tr>)}</tbody></table></div>
          </Sec>
        ) : null}
        {o.options?.length ? (
          <Sec title={u.options}>
            <div className="ld-grid ld-g2">{o.options.map((x) => <div className="ld-card" key={x.name}><h3>{x.name}</h3>{x.description ? <p>{x.description}</p> : null}{x.url ? <p><a href={x.url} target="_blank" rel="noopener nofollow">{x.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)} ↗</a></p> : null}</div>)}</div>
          </Sec>
        ) : null}
        {o.transfer_policy ? <Sec title={u.transfer}><p className="ld-prose">{o.transfer_policy}</p></Sec> : null}
        <Sec><SrcLine label={u.source} href={facts.official_url} text={`${(facts.official_url ?? "").replace(/^https?:\/\/(www\.)?/, "")} · ${fillUi(u.checked, { d: day(facts.official_at, lang) })}`} /><p className="note">{u.regNote}</p></Sec>
      </>
    );
  }

  if (f === "weather" && facts.climate) {
    const c = facts.climate;
    const w = facts.water;
    const ot = o?.temps;
    return (
      <>
        <Sec>
          <Kpis items={[
            { v: `${n1(c.tmax_avg, lang)} °C`, l: u.airMax }, { v: `${n1(c.tmin_avg, lang)} °C`, l: u.airMin },
            { v: `${c.rain_days_pct}%`, l: u.rainDays }, { v: `${c.wind_avg_kmh} km/h`, l: u.wind }, { v: `${c.gust_avg_kmh} km/h`, l: u.gusts },
            { v: c.humidity_avg != null ? `${c.humidity_avg}%` : "", l: u.humidity },
            { v: w ? `${n1(w.avg_c, lang)} °C` : ot?.water_c != null ? `${n1(ot.water_c, lang)} °C` : "", l: u.water },
          ]} />
          <p className="note" style={{ marginTop: 10 }}>{fillUi(u.climateNote, { w: c.window_days, n: c.years })}{w ? ` ${fillUi(u.waterNote, { years: w.years.join(", ") })} (${n1(w.min_c, lang)}–${n1(w.max_c, lang)} °C)` : ""}</p>
          {ot && (ot.air_high_c != null || ot.water_c != null) ? <p className="note">{u.officialTemps}: {[ot.air_high_c != null ? `${n1(ot.air_low_c, lang)}–${n1(ot.air_high_c, lang)} °C` : "", ot.water_c != null ? `${u.water} ${n1(ot.water_c, lang)} °C` : "", o?.wetsuit_note ?? ""].filter(Boolean).join(" · ")}</p> : null}
        </Sec>
        {c.by_year?.length ? (
          <Sec title={u.byYear}>
            <div className="ld-tw"><table>
              <thead><tr><th>{u.year}</th><th>{u.airMax}</th><th>{u.airMin}</th><th>{u.rain}</th><th>{u.wind}</th><th>{u.gusts}</th></tr></thead>
              <tbody>{c.by_year.map((y) => <tr key={y.year}><td>{y.year}</td><td className="n">{n1(y.tmax, lang)} °C</td><td className="n">{n1(y.tmin, lang)} °C</td><td className="n">{n1(y.precip, lang)} mm</td><td className="n">{y.wind} km/h</td><td className="n">{y.gust} km/h</td></tr>)}</tbody>
            </table></div>
            <SrcLine label={u.source} href="https://open-meteo.com/" text={`${c.source}${w ? ` · ${w.source}` : ""} (CC BY 4.0)`} />
          </Sec>
        ) : null}
      </>
    );
  }

  if (f === "bikeshops" && facts.bike_shops?.length) {
    return (
      <Sec>
        <p className="ld-lead" style={{ fontSize: "1rem" }}>{u.shopsNote}</p>
        <div className="ld-grid ld-g2" style={{ marginTop: 14 }}>
          {facts.bike_shops.map((s) => (
            <div className="ld-card" key={s.name + s.lat}>
              <h3>{s.name}</h3>
              <p className="mono">{n1(s.km, lang)} km{s.rating ? ` · ★ ${n1(s.rating, lang)}${s.reviews ? ` (${s.reviews})` : ""}` : ""}{s.repair ? ` · ${u.repair}` : ""}{s.rental ? ` · ${u.rental}` : ""}</p>
              {s.address ? <p>{s.address}</p> : null}
              {s.hours ? <p><small>{u.hours}: {s.hours}</small></p> : null}
              <p>{s.phone ? <a href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a> : null}{s.phone && s.website ? " · " : ""}{s.website ? <a href={s.website} target="_blank" rel="noopener nofollow">{u.site} ↗</a> : null}{" · "}<a href={s.url ?? `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=17/${s.lat}/${s.lon}`} target="_blank" rel="noopener nofollow">{u.map} ↗</a></p>
            </div>
          ))}
        </div>
        {facts.bike_shops.some((x) => x.source === "google") ? <SrcLine label={u.source} href="https://www.google.com/maps" text="Google Maps" /> : <SrcLine label={u.source} href="https://www.openstreetmap.org/copyright" text="© OpenStreetMap contributors (ODbL)" />}
      </Sec>
    );
  }

  if (f === "qualification") {
    const sl = o?.slots;
    return (
      <Sec>
        <Kpis items={[{ v: sl?.total ? String(sl.total) : "", l: [u.slots, sl?.championship, sl?.year].filter(Boolean).join(" · ") }]} />
        {sl?.notes ? <p className="ld-prose">{sl.notes}</p> : null}
        {res?.slots_note ? <p className="ld-prose">{res.slots_note}</p> : null}
        <p className="ld-prose">{u.slotsHow}</p>
        {facts.official_url ? <SrcLine label={u.source} href={facts.official_url} text={fillUi(u.checked, { d: day(facts.official_at, lang) })} /> : null}
      </Sec>
    );
  }

  if (f === "cutoffs" && o) {
    return (
      <>
        <Sec title={u.cutoffs}>
          <div className="ld-tw"><table><tbody>{o.cutoffs.map((c) => <tr key={c.name}><td><b>{c.name}</b>{c.notes ? <><br /><small>{c.notes}</small></> : null}</td><td className="n">{c.time}</td></tr>)}</tbody></table></div>
        </Sec>
        {o.start_times?.length ? <Sec title={u.starts}><div className="ld-tw"><table><tbody>{o.start_times.map((s) => <tr key={s.label}><td>{s.label}</td><td className="n">{s.time}</td></tr>)}</tbody></table></div></Sec> : null}
        <Sec><SrcLine label={u.source} href={facts.official_url} text={fillUi(u.checked, { d: day(facts.official_at, lang) })} /></Sec>
      </>
    );
  }
  return null;
}
