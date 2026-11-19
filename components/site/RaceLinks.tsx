// Collegamenti interni attorno a una gara: il ponte verso il coach (titolo legato
// al dato della pagina), le gare simili e gli articoli del magazine su quella gara.
// Usati su scheda gara, pagine di percorso e pagine dati, articoli del magazine.
import Link from "next/link";
import type { Lang } from "@/lib/i18n/config";
import { LOCALE } from "@/lib/i18n/config";
import type { DictKey, T } from "@/lib/i18n";
import { listRaces, raceTitle, weeksUntil, type Race } from "@/lib/site/races";
import { createPublicClient } from "@/lib/supabase/public";
import { magPath, ml } from "@/lib/site/magazine-i18n";
import { coachLang, coachPath, type CoachPage } from "@/lib/site/coach";
import { isAlpha } from "./SiteShell";
import { RaceCard } from "./RaceCard";

export type BridgeKind = "race" | "bike" | "run" | "swim" | "raceday" | "weather" | "results" | "registration" | "cutoffs" | "qualification" | "generic";
type Facts = { climate?: { tmax_avg?: number | null } | null; water?: { avg_c?: number | null } | null; results?: { median?: { M?: string | null } | null } | null } | null;

const MORE: Record<BridgeKind | "past", CoachPage> = {
  race: "race", bike: "race", run: "week", swim: "how", raceday: "adapts", weather: "week", results: "race", registration: "how", cutoffs: "race", qualification: "adapts", generic: "hub", past: "hub",
};
const shortTitle = (r: Race) => raceTitle(r).replace(/(70\.3.*)\s70\.3$/, "$1");

/** Blocco "dal dato al coach". compact = versione su una riga, da ripetere a fondo pagina. */
export function ServiceBridge({ race: r, lang, t, kind, facts, compact }: { race: Race; lang: Lang; t: T; kind: BridgeKind; facts?: Facts; compact?: boolean }) {
  const weeks = weeksUntil(r.race_date);
  const today = new Date().toISOString().slice(0, 10);
  const past = Boolean(r.race_date && r.race_date < today);
  const n = (v: number | null | undefined, d = 0) => (v == null ? null : Number(v).toLocaleString(LOCALE[lang], { maximumFractionDigits: d }));
  const air = n(facts?.climate?.tmax_avg), water = n(facts?.water?.avg_c), median = facts?.results?.median?.M ?? null;
  const race = shortTitle(r);
  // senza il dato che regge il titolo si passa alla versione generica: mai un titolo con un buco
  let k: BridgeKind | "past" = kind;
  if (past) k = kind === "results" ? "results" : "past";
  else if ((k === "race" || k === "raceday" || k === "registration") && !weeks) k = "generic";
  else if (k === "bike" && (r.bike_km == null || r.bike_dplus_m == null)) k = "generic";
  else if (k === "run" && r.bike_km == null) k = "generic";
  else if (k === "weather" && (!air || !water)) k = "generic";
  const vars = { race, weeks: weeks ?? "", km: n(r.bike_km) ?? "", dplus: n(r.bike_dplus_m) ?? "", air: air ?? "", water: water ?? "", median: median ?? "" };
  const h = k === "results" && !median ? t("br.results.h0", vars) : t(`br.${k}.h` as DictKey, vars);
  const toCoach = k === "generic" || k === "past";
  const cl = coachLang(lang);
  const href = toCoach ? coachPath(lang) : `/registrati?race=${encodeURIComponent(r.slug)}&lang=${cl}&from=${kind}`;
  const cta = `${t(`br.${k}.cta` as DictKey, vars)}${!toCoach && isAlpha() ? ` · ${t("br.free")}` : ""}`;
  const more = MORE[k];
  return (
    <section className={`ld-sec ld-bridge${compact ? " compact" : ""}`}>
      <div className="ld-wrap">
        <div className="ld-bridge-in">
          <div>
            <p className="mono">24/7 Coach</p>
            <h2>{h}</h2>
            {compact ? null : <p>{t(`br.${k}.p` as DictKey, vars)}</p>}
          </div>
          <div className="ld-bridge-cta">
            <Link className="btn btn-primary btn-lg" href={href}>{cta}</Link>
            {toCoach ? null : <Link href={coachPath(lang, more)}>{t("br.more")} →</Link>}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Gare simili: prima lo stesso paese, poi stessa distanza con date vicine. Solo gare ancora da correre. */
export function similarRaces(r: Race, all: Race[], max = 6): Race[] {
  const today = new Date().toISOString().slice(0, 10);
  const pool = all.filter((x) => x.id !== r.id && x.race_date && x.race_date >= today);
  const ts = (d: string | null) => (d ? Date.parse(d) : 0);
  const base = r.race_date && r.race_date >= today ? ts(r.race_date) : Date.now();
  const byDate = (a: Race, b: Race) => Math.abs(ts(a.race_date) - base) - Math.abs(ts(b.race_date) - base);
  const same = pool.filter((x) => x.country && x.country === r.country).sort(byDate).slice(0, 3);
  const near = pool.filter((x) => x.distance === r.distance && !same.includes(x)).sort(byDate).slice(0, max - same.length);
  return [...same, ...near];
}

type MagRow = { id: string; slug: string; kind: string; title: string; dek: string | null; published_at: string | null };
async function magRows(lang: Lang, raceId: string | null, limit: number): Promise<MagRow[]> {
  try {
    const db = createPublicClient();
    let q = db.from("site_magazine_posts").select("id,slug,kind,title,dek,published_at").eq("published", true).order("published_at", { ascending: false }).limit(limit);
    if (raceId) q = q.eq("race_id", raceId);
    const { data } = await q;
    const rows = (data ?? []) as MagRow[];
    if (lang === "it" || !rows.length) return rows;
    const { data: tr } = await db.from("site_magazine_translations").select("post_id,title,dek").eq("lang", lang).in("post_id", rows.map((x) => x.id));
    const m = new Map(((tr ?? []) as { post_id: string; title: string; dek: string | null }[]).map((x) => [x.post_id, x]));
    return rows.map((x) => { const y = m.get(x.id); return y ? { ...x, title: y.title, dek: y.dek } : x; });
  } catch { return []; }
}

function MagCards({ rows, lang }: { rows: MagRow[]; lang: Lang }) {
  return (
    <div className="ld-arts" style={{ marginTop: 12 }}>
      {rows.map((p) => (
        <Link key={p.id} className="ld-card ld-art" href={magPath(lang, p.slug)}>
          <span className="lab">{ml(lang, p.kind as "preview")}</span>
          <h3>{p.title}</h3>
          {p.dek ? <p>{p.dek}</p> : null}
        </Link>
      ))}
    </div>
  );
}

/** Gare simili + articoli del magazine su questa gara. */
export async function RaceRelated({ race, lang, t }: { race: Race; lang: Lang; t: T }) {
  const [all, posts] = await Promise.all([listRaces(lang), magRows(lang, race.id, 4)]);
  const sim = similarRaces(race, all);
  if (!sim.length && !posts.length) return null;
  return (
    <section className="ld-sec" id="correlate">
      <div className="ld-wrap">
        {posts.length ? (
          <div style={{ marginBottom: sim.length ? 36 : 0 }}>
            <h2>{t("rel.magRace", { race: shortTitle(race) })}</h2>
            <MagCards rows={posts} lang={lang} />
          </div>
        ) : null}
        {sim.length ? (
          <>
            <h2>{t("rel.h")}</h2>
            <div className="ld-cal" style={{ marginTop: 16 }}>{sim.map((x) => <RaceCard key={x.id} r={x} lang={lang} t={t} />)}</div>
          </>
        ) : null}
      </div>
    </section>
  );
}

/** Ultimi articoli del magazine (home). */
export async function LatestMagazine({ lang, t, limit = 3 }: { lang: Lang; t: T; limit?: number }) {
  const posts = await magRows(lang, null, limit);
  if (!posts.length) return null;
  return (
    <section className="ld-sec">
      <div className="ld-wrap">
        <div className="ld-sechead"><h2>{t("rel.mag")}</h2><Link className="btn btn-ghost" href={magPath(lang)}>{t("rel.magAll")}</Link></div>
        <MagCards rows={posts} lang={lang} />
      </div>
    </section>
  );
}
