// ============================================================================
// Analisi (24/7 Coach): storico con tutti i KPI — forma (PMC), volumi per
// settimana e mese per sport, percorsi abituali con tracce e statistiche,
// tabella attività con i numeri di Intervals (FC, passo, load, EF, decoupling).
// ============================================================================
import SiteLink from "@/components/SiteLink";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Breadcrumbs from "@/components/Breadcrumbs";
import FormCard from "@/components/FormCard";
import RouteTrace from "@/components/RouteTrace";
import { computeForm } from "@/lib/ai/fitness";
import { listRoutes } from "@/lib/server/routes";
import { resolveViewAs } from "@/lib/server/viewAs";
import { BRAND_DOT, BRAND_NAME } from "@/lib/branding";
import { refreshMyRoutes } from "../actions";
import { getT } from "@/lib/app-i18n/server";
import PerformancePanel from "@/components/PerformancePanel";

type Act = {
  id: string; name: string | null; sport_type: string | null; start_date: string | null;
  distance_m: number | null; moving_time_s: number | null; total_elevation_gain: number | null;
  average_heartrate: number | null; max_heartrate: number | null; average_speed: number | null;
  average_watts: number | null; training_load: number | null; raw: Record<string, unknown> | null;
};

function bucket(t: string | null): "run" | "bike" | "strength" | "other" {
  const s = (t ?? "").toLowerCase();
  if (s.includes("weight") || s.includes("strength")) return "strength";
  if (s.includes("run") || s.includes("hike")) return "run";
  if (s.includes("ride") || s.includes("cycl")) return "bike";
  return "other";
}
const BUCKET_LABEL = { run: "Corsa", bike: "Bici", strength: "Forza", other: "Altro" } as const;
const BUCKET_COLOR = { run: "var(--lime)", bike: "var(--ice, var(--cyan))", strength: "#efeae0", other: "var(--text-3)" } as const;

function h(s: number) { return (s / 3600).toFixed(1); }
function hm(s: number | null) { if (!s) return "—"; const H = Math.floor(s / 3600), M = Math.round((s % 3600) / 60); return H ? `${H}h${String(M).padStart(2, "0")}` : `${M}'`; }
function pace(a: Act) {
  if (!a.average_speed) return "—";
  const b = bucket(a.sport_type);
  if (b === "bike") return `${(a.average_speed * 3.6).toFixed(1)} km/h`;
  const spk = 1000 / a.average_speed; return `${Math.floor(spk / 60)}:${String(Math.round(spk % 60)).padStart(2, "0")}/km`;
}
function num(v: unknown, d = 0): string { return typeof v === "number" && isFinite(v) ? v.toFixed(d) : "—"; }
function mondayISO(iso: string): string { const d = new Date(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); }

export default async function Analisi() {
  const supabase = await createClient();
  const { t } = await getT();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const va = await resolveViewAs(supabase, user.id);
  if (va.role === "coach" && !va.impersonating) redirect("/coach");
  const athleteId = va.athleteId!;

  const from = new Date(); from.setDate(from.getDate() - 365);
  const [{ data: actData }, form, routes] = await Promise.all([
    supabase.from("icu_activities").select("id, name, sport_type, start_date, distance_m, moving_time_s, total_elevation_gain, average_heartrate, max_heartrate, average_speed, average_watts, training_load, raw").eq("is_duplicate" as never, false as never).eq("athlete_id", athleteId).gte("start_date", from.toISOString()).order("start_date", { ascending: false }),
    computeForm(supabase as never, athleteId),
    listRoutes(supabase as never, athleteId, true),
  ]);
  const acts = (actData ?? []) as unknown as Act[];

  // ---- aggregati ----
  const totals = { n: acts.length, sec: 0, km: 0, dplus: 0, load: 0 };
  const byMonth = new Map<string, Record<string, { n: number; sec: number; km: number; dplus: number }>>();
  const byWeek = new Map<string, Record<string, number>>();
  for (const a of acts) {
    if (!a.start_date) continue;
    const b = bucket(a.sport_type);
    totals.sec += a.moving_time_s ?? 0; totals.km += (a.distance_m ?? 0) / 1000; totals.dplus += a.total_elevation_gain ?? 0; totals.load += a.training_load ?? 0;
    const m = a.start_date.slice(0, 7);
    const mm = byMonth.get(m) ?? {}; const c = mm[b] ?? { n: 0, sec: 0, km: 0, dplus: 0 };
    c.n++; c.sec += a.moving_time_s ?? 0; c.km += (a.distance_m ?? 0) / 1000; c.dplus += a.total_elevation_gain ?? 0; mm[b] = c; byMonth.set(m, mm);
    const w = mondayISO(a.start_date); const ww = byWeek.get(w) ?? {}; ww[b] = (ww[b] ?? 0) + (a.moving_time_s ?? 0); byWeek.set(w, ww);
  }
  const months = [...byMonth.entries()].sort((x, y) => y[0].localeCompare(x[0]));
  // ultime 26 settimane complete
  const weeks: { w: string; v: Record<string, number> }[] = [];
  const cur = new Date(); cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
  for (let i = 25; i >= 0; i--) { const d = new Date(cur); d.setDate(cur.getDate() - i * 7); const k = d.toISOString().slice(0, 10); weeks.push({ w: k, v: byWeek.get(k) ?? {} }); }
  const maxWeek = Math.max(3600, ...weeks.map((x) => Object.values(x.v).reduce((s, v) => s + v, 0)));
  const longest = [...acts].sort((x, y) => (y.moving_time_s ?? 0) - (x.moving_time_s ?? 0)).slice(0, 5);

  // Tempo in zona FC (ultimi 90 giorni) da icu_hr_zone_times (secondi per zona).
  const zoneSec = [0, 0, 0, 0, 0];
  const d90 = new Date(); d90.setDate(d90.getDate() - 90);
  for (const a of acts) {
    if (!a.start_date || new Date(a.start_date) < d90) continue;
    const z = (a.raw?.icu_hr_zone_times as number[] | undefined) ?? [];
    for (let i = 0; i < Math.min(5, z.length); i++) zoneSec[i] += z[i] ?? 0;
    for (let i = 5; i < z.length; i++) zoneSec[4] += z[i] ?? 0;
  }
  const zoneTot = zoneSec.reduce((a, b) => a + b, 0);
  const ZN = ["Z1 recupero", "Z2 fondo", "Z3 medio", "Z4 soglia", "Z5 VO2max"];
  const ZC = ["#4f9be8", "#3ec46d", "#f2c200", "#ff8a1f", "#ff3b3b"];

  // Record personali (12 mesi).
  // Una "corsa" più veloce di 2:35/km è quasi sempre una bici registrata come
  // corsa (o un doppione): la contiamo come bici, non nei record di corsa.
  const fakeRun = (a: (typeof acts)[number]) => bucket(a.sport_type) === "run" && (a.average_speed ?? 0) > 6.45;
  const runs = acts.filter((a) => bucket(a.sport_type) === "run" && !fakeRun(a));
  const rides = acts.filter((a) => bucket(a.sport_type) === "bike" || fakeRun(a));
  const top = <T,>(xs: T[], f: (x: T) => number) => xs.reduce<T | null>((b, x) => (b == null || f(x) > f(b) ? x : b), null);
  const recs: { label: string; v: string; sub: string }[] = [];
  const lr = top(runs, (a) => a.distance_m ?? 0); if (lr) recs.push({ label: t("Corsa più lunga"), v: `${((lr.distance_m ?? 0) / 1000).toFixed(0)} km`, sub: `${lr.start_date?.slice(0, 10)} · ${hm(lr.moving_time_s)} · D+${Math.round(lr.total_elevation_gain ?? 0)}` });
  const ld = top(runs, (a) => a.total_elevation_gain ?? 0); if (ld) recs.push({ label: t("Più dislivello"), v: `${Math.round(ld.total_elevation_gain ?? 0)} m`, sub: `${ld.start_date?.slice(0, 10)} · ${((ld.distance_m ?? 0) / 1000).toFixed(0)} km` });
  const lb = top(rides, (a) => a.distance_m ?? 0); if (lb) recs.push({ label: t("Bici più lunga"), v: `${((lb.distance_m ?? 0) / 1000).toFixed(0)} km`, sub: `${lb.start_date?.slice(0, 10)} · ${hm(lb.moving_time_s)} · ${lb.average_speed ? (lb.average_speed * 3.6).toFixed(1) + " km/h" : ""}` });
  const fastRun = top(runs.filter((a) => (a.distance_m ?? 0) >= 8000 && (a.total_elevation_gain ?? 0) < 150), (a) => a.average_speed ?? 0); if (fastRun) recs.push({ label: t("Corsa più veloce (≥8 km piana)"), v: pace(fastRun), sub: `${fastRun.start_date?.slice(0, 10)} · ${((fastRun.distance_m ?? 0) / 1000).toFixed(1)} km · ${t("FC {v}", { v: num(fastRun.average_heartrate) })}` });
  const bigLoad = top(acts, (a) => a.training_load ?? 0); if (bigLoad) recs.push({ label: t("Carico più alto"), v: `${Math.round(bigLoad.training_load ?? 0)}`, sub: `${bigLoad.start_date?.slice(0, 10)} · ${bigLoad.name ?? ""}` });
  const maxHr = top(acts, (a) => a.max_heartrate ?? 0); if (maxHr) recs.push({ label: t("FC massima vista"), v: `${num(maxHr.max_heartrate)} bpm`, sub: `${maxHr.start_date?.slice(0, 10)}` });
  const monthsAsc = [...months].reverse();
  const maxDplus = Math.max(1000, ...monthsAsc.map(([, v]) => Object.values(v).reduce((a, c) => a + c.dplus, 0)));
  const W = 780, H = 160, gap = 4, bw = (W - gap * 25) / 26;

  return (
    <div className="wrap-tight">
      <nav className="topnav">
        <div className="brand">
          <Link href="/atleta" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
            <span className="dot">{BRAND_DOT}</span>
            <span className="name">{BRAND_NAME}<em>.</em></span>
          </Link>
          <span className="mono" style={{ marginLeft: 14 }}>{t("// ANALISI")}</span>
        </div>
        <div className="nav-right">
          <Link className="btn btn-subtle btn-sm" href="/atleta">{t("← Torna")}</Link>
          <SiteLink />
          <form action="/auth/signout" method="post"><button className="btn btn-subtle btn-sm" type="submit">{t("Esci")}</button></form>
        </div>
      </nav>
      <Breadcrumbs items={[{ href: "/atleta", label: t("I miei allenamenti") }, { label: t("Analisi") }]} />

      <div className="hero">
        <div>
          <span className="mono">{t("// ultimi 12 mesi · da Intervals")}</span>
          <h1>{t("I tuoi")} <em>{t("numeri")}</em>.</h1>
          <p>{t("Forma, volumi, percorsi e ogni allenamento con i suoi KPI. Quello che il coach legge prima di scrivere il piano.")}</p>
        </div>
      </div>

      <div className="bento-4">
        <div className="card kpi"><div className="v">{totals.n}</div><div className="l">{t("attività")}</div></div>
        <div className="card kpi"><div className="v">{h(totals.sec)}<small style={{ fontSize: ".5em" }}>h</small></div><div className="l">{t("ore")}</div></div>
        <div className="card kpi"><div className="v">{Math.round(totals.km)}</div><div className="l">km</div></div>
        <div className="card kpi"><div className="v">{Math.round(totals.dplus / 1000)}<small style={{ fontSize: ".5em" }}>k</small></div><div className="l">{t("m D+")}</div></div>
      </div>

      <h2 className="sec"><span className="l">{t("Forma")}</span></h2>
      <FormCard form={form} />

      <PerformancePanel athleteId={athleteId} t={t} />

      <h2 className="sec"><span className="l">{t("Ore a settimana")}</span><span className="mono">{t("26 settimane · per sport")}</span></h2>
      <div className="card">
        <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: "100%", display: "block" }} preserveAspectRatio="none" aria-label={t("Ore per settimana")}>
          {weeks.map((wk, i) => {
            let y = H; const x = i * (bw + gap);
            return (
              <g key={wk.w}>
                {(["run", "bike", "strength", "other"] as const).map((b) => {
                  const v = wk.v[b] ?? 0; if (!v) return null; const hh = (v / maxWeek) * H; y -= hh;
                  return <rect key={b} x={x} y={y} width={bw} height={hh} fill={BUCKET_COLOR[b]} />;
                })}
                {i % 4 === 0 ? <text x={x} y={H + 14} fontSize="9" fill="var(--text-3)" fontFamily="var(--fd, inherit)">{wk.w.slice(5)}</text> : null}
              </g>
            );
          })}
        </svg>
        <div className="form-legend" style={{ marginTop: 8 }}>
          {(["run", "bike", "strength"] as const).map((b) => <span key={b}><i style={{ background: BUCKET_COLOR[b] }} /> {t(BUCKET_LABEL[b])}</span>)}
          <span className="dim">max {h(maxWeek)} h</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="an-h3">{t("Tempo in zona FC")} <span className="mono">{t("90 giorni")}</span></h3>
          {zoneTot > 0 ? (
            <>
              <div className="zone-bar">
                {zoneSec.map((v, i) => (v > 0 ? <i key={i} style={{ width: `${(v / zoneTot) * 100}%`, background: ZC[i] }} /> : null))}
              </div>
              <div className="zone-rows">
                {zoneSec.map((v, i) => (
                  <div key={i}><i style={{ background: ZC[i] }} /><span>{t(ZN[i] ?? "")}</span><b>{Math.round((v / zoneTot) * 100)}%</b><span className="dim">{h(v)} h</span></div>
                ))}
              </div>
              <p className="dim" style={{ fontSize: ".8rem", marginTop: 8 }}>{t("Polarizzazione: {easy}% facile · {hard}% duro", { easy: Math.round(((zoneSec[0] + zoneSec[1]) / zoneTot) * 100), hard: Math.round(((zoneSec[3] + zoneSec[4]) / zoneTot) * 100) })}</p>
            </>
          ) : <p className="dim">{t("Nessun dato di zona da Intervals.")}</p>}
        </div>
        <div className="card">
          <h3 className="an-h3">{t("Dislivello al mese")} <span className="mono">{t("m D+")}</span></h3>
          <svg viewBox="0 0 400 150" style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
            {monthsAsc.map(([m, v], i) => {
              const n = monthsAsc.length; const bw = 400 / n - 4; const x = i * (400 / n) + 2;
              const dp = Object.values(v).reduce((a, c) => a + c.dplus, 0); const hh = (dp / maxDplus) * 120;
              return (<g key={m}><rect x={x} y={130 - hh} width={bw} height={hh} fill="var(--lime)" opacity={0.55 + 0.45 * (dp / maxDplus)} /><text x={x + bw / 2} y={145} fontSize="9" textAnchor="middle" fill="var(--text-3)" fontFamily="var(--fd, inherit)">{m.slice(5)}</text><text x={x + bw / 2} y={125 - hh} fontSize="9" textAnchor="middle" fill="var(--text-2)">{dp >= 1000 ? `${(dp / 1000).toFixed(1)}k` : Math.round(dp)}</text></g>);
            })}
          </svg>
        </div>
      </div>

      <h2 className="sec"><span className="l">{t("Record degli ultimi 12 mesi")}</span></h2>
      <div className="rec-grid">
        {recs.map((r) => (<div className="card rec" key={r.label}><span className="mono">{r.label}</span><b>{r.v}</b><span className="dim">{r.sub}</span></div>))}
      </div>

      <h2 className="sec"><span className="l">{t("Mese per mese")}</span></h2>
      <div className="card" style={{ overflowX: "auto", padding: 0 }}>
        <table className="an-table">
          <thead><tr><th>{t("Mese")}</th><th>{t("Corsa")}</th><th>km · D+</th><th>{t("Bici")}</th><th>km · D+</th><th>{t("Forza")}</th><th>{t("Totale")}</th></tr></thead>
          <tbody>
            {months.map(([m, v]) => {
              const r = v.run ?? { n: 0, sec: 0, km: 0, dplus: 0 }, b = v.bike ?? { n: 0, sec: 0, km: 0, dplus: 0 }, s = v.strength ?? { n: 0, sec: 0, km: 0, dplus: 0 };
              const tot = Object.values(v).reduce((a, c) => a + c.sec, 0);
              return (
                <tr key={m}>
                  <td><b>{m}</b></td>
                  <td>{r.n}× · {h(r.sec)} h</td><td>{Math.round(r.km)} km · {Math.round(r.dplus)} m</td>
                  <td>{b.n}× · {h(b.sec)} h</td><td>{Math.round(b.km)} km · {Math.round(b.dplus)} m</td>
                  <td>{s.n}×</td>
                  <td><b>{h(tot)} h</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="sec">
        <span className="l">{t("I tuoi percorsi")}</span>
        <form action={refreshMyRoutes}><button className="btn btn-subtle btn-sm" type="submit">{t("Aggiorna dalle tracce GPS")}</button></form>
      </h2>
      {routes.length === 0 ? (
        <div className="card" style={{ color: "var(--text-2)" }}>{t("Nessun percorso ancora: premi “Aggiorna dalle tracce GPS” (scarica le mappe delle attività da Intervals, a lotti).")}</div>
      ) : (
        <div className="routes-grid">
          {routes.map((r) => (
            <div className="card route-card" key={r.id}>
              <RouteTrace points={r.points ?? []} width={220} height={120} stroke={r.sport === "bike" ? "var(--ice, var(--cyan))" : "var(--lime)"} />
              <div className="route-info">
                <span className={`disc ${r.sport === "bike" ? "disc-bike" : "disc-run"}`}>{r.sport === "bike" ? t("Bici") : t("Corsa")}</span>
                <strong>{r.name}</strong>
                <div className="route-stats">
                  <span>{r.distance_km} km</span><span>D+{r.elevation_m}</span>
                  {r.typical_minutes ? <span>~{hm(r.typical_minutes * 60)}</span> : null}
                  <span>{r.terrain ? t(r.terrain) : null}</span>
                </div>
                <div className="mono">{t("fatto {n}×", { n: r.times_done })}{r.last_done ? ` · ${t("ultimo {d}", { d: r.last_done })}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="sec"><span className="l">{t("Gli sforzi più lunghi")}</span></h2>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="an-table">
          <thead><tr><th>{t("Data")}</th><th>{t("Attività")}</th><th>{t("Tempo")}</th><th>km</th><th>D+</th><th>{t("FC")}</th><th>Load</th></tr></thead>
          <tbody>{longest.map((a) => (
            <tr key={a.id}><td>{a.start_date?.slice(0, 10)}</td><td><b>{a.name}</b> <span className="dim">{a.sport_type}</span></td><td>{hm(a.moving_time_s)}</td><td>{a.distance_m ? (a.distance_m / 1000).toFixed(0) : "—"}</td><td>{Math.round(a.total_elevation_gain ?? 0)}</td><td>{num(a.average_heartrate)}{a.max_heartrate ? `/${num(a.max_heartrate)}` : ""}</td><td>{num(a.training_load)}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <h2 className="sec"><span className="l">{t("Tutte le attività")}</span><span className="mono">{t("{n} · KPI da Intervals", { n: acts.length })}</span></h2>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="an-table an-dense">
          <thead><tr><th>{t("Data")}</th><th>Sport</th><th>{t("Attività")}</th><th>{t("Tempo")}</th><th>km</th><th>{t("Passo/vel")}</th><th>D+</th><th>{t("FC med/max")}</th><th>Load</th><th>Int.</th><th>EF</th><th>Decoup.</th><th>W</th></tr></thead>
          <tbody>{acts.map((a) => {
            const b = bucket(a.sport_type); const raw = a.raw ?? {};
            return (
              <tr key={a.id}>
                <td>{a.start_date?.slice(0, 10)}</td>
                <td><span className={`disc ${b === "bike" ? "disc-bike" : b === "run" ? "disc-run" : "disc-rest"}`}>{t(BUCKET_LABEL[b])}</span></td>
                <td className="an-name">{a.name}</td>
                <td>{hm(a.moving_time_s)}</td>
                <td>{a.distance_m ? (a.distance_m / 1000).toFixed(1) : "—"}</td>
                <td>{pace(a)}</td>
                <td>{a.total_elevation_gain ? Math.round(a.total_elevation_gain) : "—"}</td>
                <td>{num(a.average_heartrate)}{a.max_heartrate ? `/${num(a.max_heartrate)}` : ""}</td>
                <td>{num(a.training_load)}</td>
                <td>{num(raw.icu_intensity)}</td>
                <td>{num(raw.icu_efficiency_factor, 2)}</td>
                <td>{typeof raw.decoupling === "number" ? `${raw.decoupling.toFixed(1)}%` : "—"}</td>
                <td>{num(a.average_watts)}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <p className="mono" style={{ marginTop: 10 }}>{t("Int. = intensità (Intervals) · EF = efficiency factor · Decoup. = deriva cardiaca · forma: CTL 42 gg, ATL 7 gg, TSB = CTL−ATL")}</p>
    </div>
  );
}
