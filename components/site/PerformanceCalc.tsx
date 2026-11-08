"use client";
// Calcolatore di performance: motore in lib/site/calc.ts. Qui solo interfaccia:
// unità per frazione (nuoto m/yd, bici km/mi, corsa km/mi), tutti i parametri,
// risultato, scala di livelli, obiettivo "al contrario" e leve di miglioramento.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BASE, DEFAULTS, UNIT, bikeWattsOf, compute, fmtHMS, fmtPace, levers, parseClock, solveTarget, type BikeMode, type CalcInput, type Water } from "@/lib/site/calc";
import { LOCALE, type Lang } from "@/lib/i18n/config";
import { fmt, type Dict } from "@/lib/i18n/dict";

export interface CalcRace {
  slug: string; label: string; distance: "full" | "half"; swim_km: number | null; bike_km: number | null; bike_dplus_m: number | null;
  run_km: number | null; run_flat: boolean | null; heat_idx: number; wind_idx: number; water_type: "mare" | "lago" | "fiume" | null;
}
interface Units { swim: "m" | "yd"; bike: "km" | "mi"; run: "km" | "mi"; body: "metric" | "imperial" }
const U0: Units = { swim: "m", bike: "km", run: "km", body: "metric" };

// ---- campi
function useSync(value: string, focused: boolean) {
  const [txt, setTxt] = useState(value);
  useEffect(() => { if (!focused) setTxt(value); }, [value, focused]);
  return [txt, setTxt] as const;
}
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="ld-field cx-f"><span className="lab">{label}</span>{children}{hint ? <span className="src">{hint}</span> : null}</label>;
}
function NumField({ label, value, onChange, to = (x) => x, from = (x) => x, digits = 0, suffix, hint }: {
  label: string; value: number; onChange: (v: number) => void; to?: (si: number) => number; from?: (d: number) => number; digits?: number; suffix?: string; hint?: string;
}) {
  const [focus, setFocus] = useState(false);
  const shown = String(+to(value).toFixed(digits));
  const [txt, setTxt] = useSync(shown, focus);
  return (
    <Field label={label} hint={hint}>
      <span className="cx-in">
        <input className="cx-inp num" inputMode="decimal" value={txt} onFocus={() => setFocus(true)} onBlur={() => { setFocus(false); setTxt(shown); }}
          onChange={(e) => { setTxt(e.target.value); const n = Number(e.target.value.replace(",", ".")); if (e.target.value.trim() !== "" && isFinite(n)) onChange(from(n)); }} />
        {suffix ? <i>{suffix}</i> : null}
      </span>
    </Field>
  );
}
function ClockField({ label, value, onChange, suffix, hint, hms }: { label: string; value: number; onChange: (s: number) => void; suffix?: string; hint?: string; hms?: boolean }) {
  const [focus, setFocus] = useState(false);
  const shown = hms ? fmtHMS(value, true) : fmtPace(value);
  const [txt, setTxt] = useSync(shown, focus);
  return (
    <Field label={label} hint={hint}>
      <span className="cx-in">
        <input className="cx-inp num" inputMode="numeric" value={txt} onFocus={() => setFocus(true)} onBlur={() => { setFocus(false); setTxt(shown); }}
          onChange={(e) => { setTxt(e.target.value); const s = parseClock(e.target.value); if (s !== null && s > 0) onChange(s); }} />
        {suffix ? <i>{suffix}</i> : null}
      </span>
    </Field>
  );
}
function Seg<T extends string | number>({ value, onChange, opts }: { value: T; onChange: (v: T) => void; opts: [T, string][] }) {
  return <span className="ld-seg">{opts.map(([v, l]) => <button key={String(v)} type="button" className={v === value ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}</span>;
}

const CDA: [number, string][] = [[0.24, "calc.cda1"], [0.29, "calc.cda2"], [0.33, "calc.cda3"], [0.38, "calc.cda4"]];
const CRR: [number, string][] = [[0.0035, "calc.crr1"], [0.0045, "calc.crr2"], [0.006, "calc.crr3"]];
const LADDER = { full: [9.5, 10.5, 11.5, 12.5, 13.5, 15], half: [4.5, 5, 5.5, 6, 6.5, 7.25] };

export default function PerformanceCalc({ races, lang, dict, alpha }: { races: CalcRace[]; lang: Lang; dict: Dict; alpha: boolean }) {
  const t = (k: keyof Dict, v?: Record<string, string | number>) => fmt(dict[k] ?? k, v);
  const loc = LOCALE[lang];
  const [inp, setInp] = useState<CalcInput>(BASE);
  const [u, setU] = useState<Units>(U0);
  const [slug, setSlug] = useState("");
  const [preset, setPreset] = useState<"full" | "half" | "olympic" | "sprint" | "custom">("half");
  const [target, setTarget] = useState("");
  const ready = useRef(false);
  const set = (p: Partial<CalcInput>) => { setInp((x) => ({ ...x, ...p })); setPreset((x) => (Object.keys(p).some((k) => ["swimM", "bikeKm", "bikeDplus", "runKm", "runDplus"].includes(k)) ? "custom" : x)); };

  // ripristino da questo dispositivo + ?race=
  useEffect(() => {
    try {
      const raw = localStorage.getItem("calc.v1");
      if (raw) { const d = JSON.parse(raw); if (d.inp) setInp({ ...BASE, ...d.inp }); if (d.u) setU({ ...U0, ...d.u }); if (d.slug) setSlug(d.slug); if (d.preset) setPreset(d.preset); if (d.target) setTarget(d.target); }
    } catch { /* storage non disponibile */ }
    const q = new URLSearchParams(window.location.search).get("race");
    if (q) { const r = races.find((x) => x.slug === q); if (r) loadRace(r); }
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready.current) return;
    try { localStorage.setItem("calc.v1", JSON.stringify({ inp, u, slug, preset, target })); } catch { /* ignora */ }
  }, [inp, u, slug, preset, target]);

  function applyPreset(p: "full" | "half" | "olympic" | "sprint") {
    setPreset(p); setSlug("");
    setInp((x) => ({ ...x, ...DEFAULTS[p] }));
  }
  function loadRace(r: CalcRace) {
    const d = DEFAULTS[r.distance];
    setSlug(r.slug); setPreset(r.distance);
    setInp((x) => ({
      ...x, ...d,
      swimM: r.swim_km ? Math.round(r.swim_km * 1000) : d.swimM, bikeKm: r.bike_km ?? d.bikeKm, bikeDplus: r.bike_dplus_m ?? d.bikeDplus,
      runKm: r.run_km ?? d.runKm, runDplus: r.run_flat ? Math.round(d.runDplus * 0.4) : d.runDplus * 2,
      water: (r.water_type ?? x.water) as Water, tempC: 16 + 4 * r.heat_idx, windKmh: 2 + 2 * r.wind_idx,
    }));
  }
  const reset = () => { setInp(BASE); setU(U0); setSlug(""); setPreset("half"); setTarget(""); };

  const res = useMemo(() => compute(inp), [inp]);
  const tgtS = useMemo(() => parseClock(target), [target]);
  const solved = useMemo(() => (tgtS && tgtS > 600 ? solveTarget(inp, tgtS) : null), [inp, tgtS]);
  const lev = useMemo(() => levers(inp).slice(0, 6), [inp]);

  // ---- conversioni di visualizzazione
  const sw = u.swim === "yd", bk = u.bike === "mi", rn = u.run === "mi", im = u.body === "imperial";
  const swPace = (s100: number) => (sw ? s100 * UNIT.YD : s100);           // s/100 m → s/100 yd
  const rnPace = (spk: number) => (rn ? spk * UNIT.MI : spk);               // s/km → s/mi
  const kmh = (v: number) => (bk ? v / UNIT.MI : v);
  const wUnit = bk ? "mph" : "km/h";
  const swU = sw ? "yd" : "m", bkU = bk ? "mi" : "km", rnU = rn ? "mi" : "km", elU = (b: boolean) => (b ? "ft" : "m");
  const nf = (n: number, d = 0) => n.toLocaleString(loc, { maximumFractionDigits: d, minimumFractionDigits: d });

  const total = res.totalS;
  const pct = (s: number) => `${(s / total) * 100}%`;
  const ladder = inp.runKm > 30 ? LADDER.full : inp.runKm > 15 ? LADDER.half : null;
  const place = (() => {
    if (!ladder) return null;
    const h = total / 3600;
    const i = ladder.findIndex((x) => h <= x);
    if (i === 0) return t("calc.below", { a: fmtHMS(ladder[0] * 3600) });
    if (i === -1) return t("calc.above", { a: fmtHMS(ladder[ladder.length - 1] * 3600) });
    return t("calc.between", { a: fmtHMS(ladder[i - 1] * 3600), b: fmtHMS(ladder[i] * 3600) });
  })();
  const dispTemp = (c: number) => (im ? c * 9 / 5 + 32 : c);

  const modeOpts: [BikeMode, string][] = [["speed", t("calc.mSpeed")], ["power", t("calc.mPower")], ["ftp", t("calc.mFtp")]];
  const wetsuitOn = inp.wetsuit;
  const ctaHref = slug ? `/registrati?race=${slug}` : "/registrati";

  return (
    <div className="cx">
      <div className="cx-left">
        {/* ------------------------------------------------ percorso + unità */}
        <section className="ld-card cx-sec">
          <h3>{t("calc.course")}</h3>
          <div className="cx-row">
            <Seg<string> value={preset} onChange={(v) => applyPreset(v as "full" | "half" | "olympic" | "sprint")}
              opts={[["full", t("calc.full")], ["half", t("calc.half")], ["olympic", t("calc.olympic")], ["sprint", t("calc.sprint")]]} />
          </div>
          <Field label={t("calc.race")}>
            <select className="cx-inp" value={slug} onChange={(e) => { const r = races.find((x) => x.slug === e.target.value); if (r) loadRace(r); else setSlug(""); }}>
              <option value="">{t("calc.raceNone")}</option>
              {races.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
            </select>
          </Field>
          <div className="cx-units">
            <div><span className="lab">{t("calc.uSwim")}</span><Seg value={u.swim} onChange={(v) => setU({ ...u, swim: v })} opts={[["m", "m"], ["yd", "yd"]]} /></div>
            <div><span className="lab">{t("calc.uBike")}</span><Seg value={u.bike} onChange={(v) => setU({ ...u, bike: v })} opts={[["km", "km"], ["mi", "mi"]]} /></div>
            <div><span className="lab">{t("calc.uRun")}</span><Seg value={u.run} onChange={(v) => setU({ ...u, run: v })} opts={[["km", "km"], ["mi", "mi"]]} /></div>
            <div><span className="lab">{t("calc.uBody")}</span><Seg value={u.body} onChange={(v) => setU({ ...u, body: v })} opts={[["metric", "kg · °C"], ["imperial", "lb · °F"]]} /></div>
          </div>
          <div className="cx-grid">
            <NumField label={t("calc.swimDist")} value={inp.swimM} onChange={(v) => set({ swimM: v })} to={(x) => (sw ? x / UNIT.YD : x)} from={(x) => (sw ? x * UNIT.YD : x)} suffix={swU} />
            <NumField label={t("calc.bikeDist")} value={inp.bikeKm} onChange={(v) => set({ bikeKm: v })} to={(x) => (bk ? x / UNIT.MI : x)} from={(x) => (bk ? x * UNIT.MI : x)} digits={1} suffix={bkU} />
            <NumField label={t("calc.bikeClimb")} value={inp.bikeDplus} onChange={(v) => set({ bikeDplus: v })} to={(x) => (bk ? x / UNIT.FT : x)} from={(x) => (bk ? x * UNIT.FT : x)} suffix={elU(bk)} />
            <NumField label={t("calc.runDist")} value={inp.runKm} onChange={(v) => set({ runKm: v })} to={(x) => (rn ? x / UNIT.MI : x)} from={(x) => (rn ? x * UNIT.MI : x)} digits={2} suffix={rnU} />
            <NumField label={t("calc.runClimb")} value={inp.runDplus} onChange={(v) => set({ runDplus: v })} to={(x) => (rn ? x / UNIT.FT : x)} from={(x) => (rn ? x * UNIT.FT : x)} suffix={elU(rn)} />
            <Field label={t("calc.water")}>
              <select className="cx-inp" value={inp.water} onChange={(e) => set({ water: e.target.value as Water })}>
                {(["mare", "lago", "fiume", "piscina"] as Water[]).map((w) => <option key={w} value={w}>{t(`water.${w}` as "water.mare")}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* ------------------------------------------------ nuoto */}
        <section className="ld-card cx-sec sw">
          <h3>{t("calc.swim")}</h3>
          <div className="cx-grid">
            <ClockField label={t("calc.swimPace")} value={swPace(inp.swimPace100)} onChange={(s) => set({ swimPace100: sw ? s / UNIT.YD : s })} suffix={`/100 ${swU}`} hint="m:ss" />
            <Field label={t("calc.wetsuit")}><Seg value={wetsuitOn ? 1 : 0} onChange={(v) => set({ wetsuit: v === 1 })} opts={[[1, t("calc.yes")], [0, t("calc.no")]]} /></Field>
            <Field label={t("calc.chop")}><Seg value={inp.chop} onChange={(v) => set({ chop: v })} opts={[[0, t("calc.chop0")], [1, t("calc.chop1")], [2, t("calc.chop2")], [3, t("calc.chop3")]]} /></Field>
            <Field label={t("calc.crowd")}><Seg value={inp.crowd} onChange={(v) => set({ crowd: v })} opts={[[0, t("calc.crowd0")], [1, t("calc.crowd1")], [2, t("calc.crowd2")]]} /></Field>
          </div>
        </section>

        {/* ------------------------------------------------ bici */}
        <section className="ld-card cx-sec bk">
          <h3>{t("calc.bike")}</h3>
          <Field label={t("calc.bikeMode")}><Seg value={inp.bikeMode} onChange={(v) => set({ bikeMode: v })} opts={modeOpts} /></Field>
          <div className="cx-grid">
            {inp.bikeMode === "speed" ? <NumField label={t("calc.flatSpeed")} value={inp.bikeSpeedFlat} onChange={(v) => set({ bikeSpeedFlat: v })} to={kmh} from={(x) => (bk ? x * UNIT.MI : x)} digits={1} suffix={wUnit} /> : null}
            {inp.bikeMode === "power" ? <NumField label={t("calc.watts")} value={inp.bikeWatts} onChange={(v) => set({ bikeWatts: v })} suffix="W" /> : null}
            {inp.bikeMode === "ftp" ? (
              <>
                <NumField label={t("calc.ftp")} value={inp.ftp} onChange={(v) => set({ ftp: v })} suffix="W" />
                <NumField label={t("calc.if")} value={inp.ifPct} onChange={(v) => set({ ifPct: v })} to={(x) => x * 100} from={(x) => x / 100} suffix="%" />
              </>
            ) : <NumField label={t("calc.ftp")} value={inp.ftp} onChange={(v) => set({ ftp: v })} suffix="W" />}
            <NumField label={t("calc.mass")} value={inp.massKg} onChange={(v) => set({ massKg: v })} to={(x) => (im ? x / UNIT.LB : x)} from={(x) => (im ? x * UNIT.LB : x)} digits={1} suffix={im ? "lb" : "kg"} />
            <NumField label={t("calc.bikeKg")} value={inp.bikeKg} onChange={(v) => set({ bikeKg: v })} to={(x) => (im ? x / UNIT.LB : x)} from={(x) => (im ? x * UNIT.LB : x)} digits={1} suffix={im ? "lb" : "kg"} />
            <Field label={t("calc.cda")}>
              <select className="cx-inp" value={CDA.reduce((b, c) => (Math.abs(c[0] - inp.cda) < Math.abs(b[0] - inp.cda) ? c : b))[0]} onChange={(e) => set({ cda: Number(e.target.value) })}>
                {CDA.map(([v, k]) => <option key={v} value={v}>{t(k as "calc.cda1")}</option>)}
              </select>
            </Field>
            <Field label={t("calc.crr")}>
              <select className="cx-inp" value={CRR.reduce((b, c) => (Math.abs(c[0] - inp.crr) < Math.abs(b[0] - inp.crr) ? c : b))[0]} onChange={(e) => set({ crr: Number(e.target.value) })}>
                {CRR.map(([v, k]) => <option key={v} value={v}>{t(k as "calc.crr1")}</option>)}
              </select>
            </Field>
            <NumField label={t("calc.desc")} value={inp.descMaxKmh} onChange={(v) => set({ descMaxKmh: v })} to={kmh} from={(x) => (bk ? x * UNIT.MI : x)} suffix={wUnit} />
            <NumField label={t("calc.wind")} value={inp.windKmh} onChange={(v) => set({ windKmh: v })} to={kmh} from={(x) => (bk ? x * UNIT.MI : x)} suffix={wUnit} />
          </div>
        </section>

        {/* ------------------------------------------------ corsa + condizioni */}
        <section className="ld-card cx-sec rn">
          <h3>{t("calc.run")}</h3>
          <div className="cx-grid">
            <ClockField label={t("calc.runPace")} value={rnPace(inp.runPaceKm)} onChange={(s) => set({ runPaceKm: rn ? s / UNIT.MI : s })} suffix={`/${rnU}`} hint="m:ss" />
            <Field label={t("calc.acclim")}><Seg value={inp.acclimated ? 1 : 0} onChange={(v) => set({ acclimated: v === 1 })} opts={[[1, t("calc.yes")], [0, t("calc.no")]]} /></Field>
          </div>
        </section>
        <section className="ld-card cx-sec">
          <h3>{t("calc.cond")}</h3>
          <div className="cx-grid">
            <NumField label={t("calc.temp")} value={inp.tempC} onChange={(v) => set({ tempC: v })} to={dispTemp} from={(x) => (im ? (x - 32) * 5 / 9 : x)} digits={0} suffix={im ? "°F" : "°C"} />
            <NumField label={t("calc.alt")} value={inp.altitudeM} onChange={(v) => set({ altitudeM: Math.max(0, v) })} to={(x) => (im ? x / UNIT.FT : x)} from={(x) => (im ? x * UNIT.FT : x)} suffix={im ? "ft" : "m"} />
            <ClockField label={t("calc.t1")} value={inp.t1} onChange={(s) => set({ t1: s })} suffix="m:ss" hms={false} />
            <ClockField label={t("calc.t2")} value={inp.t2} onChange={(s) => set({ t2: s })} suffix="m:ss" hms={false} />
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>{t("calc.reset")}</button>
        </section>
      </div>

      {/* ================================================== risultato */}
      <aside className="cx-right">
        <div className="ld-card cx-res">
          <p className="lab">{t("calc.total")}</p>
          <p className="cx-big num">{fmtHMS(total)}</p>
          {place ? <p className="src">{place}</p> : null}
          <div className="cx-bar" aria-hidden>
            <i className="sw" style={{ width: pct(res.swimS) }} /><i className="tr" style={{ width: pct(res.t1) }} />
            <i className="bk" style={{ width: pct(res.bikeS) }} /><i className="tr" style={{ width: pct(res.t2) }} /><i className="rn" style={{ width: pct(res.runS) }} />
          </div>
          <table className="cx-tab num">
            <tbody>
              <tr className="sw"><th>{t("calc.swim")}</th><td>{fmtHMS(res.swimS)}</td><td>{fmtPace(swPace(res.swimPaceOw100))} /100 {swU}</td></tr>
              <tr><th>{t("calc.transitions")}</th><td>{fmtHMS(res.t1 + res.t2)}</td><td>{fmtPace(res.t1)} + {fmtPace(res.t2)}</td></tr>
              <tr className="bk"><th>{t("calc.bike")}</th><td>{fmtHMS(res.bikeS)}</td><td>{nf(kmh(res.bikeAvgKmh), 1)} {wUnit}</td></tr>
              <tr className="rn"><th>{t("calc.run")}</th><td>{fmtHMS(res.runS)}</td><td>{fmtPace(rnPace(res.runPaceEff))} /{rnU}</td></tr>
            </tbody>
          </table>
          <dl className="cx-dl">
            <div><dt>{t("calc.ow")}</dt><dd className="num">{fmtPace(swPace(res.swimPaceOw100))} /100 {swU} · {fmtPace(res.swimPaceOw100 * (sw ? 1 : UNIT.YD))} /100 {sw ? "m" : "yd"}</dd></div>
            <div><dt>{t("calc.flatEq")}</dt><dd className="num">{nf(kmh(res.bikeFlatKmh), 1)} {wUnit} · {nf(bk ? res.bikeFlatKmh : res.bikeFlatKmh / UNIT.MI, 1)} {bk ? "km/h" : "mph"}</dd></div>
            <div><dt>{t("calc.power")}</dt><dd className="num">{nf(res.watts)} W · {nf(res.wkg, 2)} W/kg{res.ifBike ? ` · IF ${nf(res.ifBike, 2)}` : ""}</dd></div>
            <div><dt>{t("calc.energy")}</dt><dd className="num">{nf(res.kj)} kJ ≈ {nf(res.kcal)} kcal</dd></div>
            <div><dt>{t("calc.carbs")}</dt><dd className="num">{nf((total / 3600) * 80)} g <small>{t("calc.carbsNote")}</small></dd></div>
            <div><dt>{t("calc.runEff")}</dt><dd className="num">{fmtPace(rnPace(res.runPaceEff))} /{rnU} · {fmtPace(res.runPaceEff * (rn ? 1 / UNIT.MI : UNIT.MI))} /{rn ? "km" : "mi"}</dd></div>
            <div><dt>{t("calc.pen.fatigue")} · {t("calc.pen.heat")} · {t("calc.pen.alt")}</dt><dd className="num">+{nf(res.runPenalty.fatigue * 100, 1)} % · +{nf(res.runPenalty.heat * 100, 1)} % · +{nf(res.runPenalty.altitude * 100, 1)} %</dd></div>
            <div><dt>{t("calc.pen.elev")}</dt><dd className="num">+{fmtHMS(res.runPenalty.elevationS, false)}</dd></div>
          </dl>
          {ladder ? (
            <div className="cx-ladder">
              <p className="lab">{t("calc.ladder")}</p>
              <div>{ladder.map((h) => <span key={h} className={`num ${total / 3600 <= h && !ladder.some((x) => x < h && total / 3600 <= x) ? "on" : ""}`}>{fmtHMS(h * 3600, false).replace(/:00$/, "")}</span>)}</div>
            </div>
          ) : null}
        </div>

        <div className="ld-card cx-sec">
          <h3>{t("calc.target")}</h3>
          <p className="src">{t("calc.targetLead")}</p>
          <ClockField label={t("calc.total")} value={tgtS ?? 0} onChange={(s) => setTarget(fmtHMS(s))} hms />
          {solved ? (
            <div className="cx-solve">
              <p>{!solved.reachable ? t("calc.unreachable") : Math.abs(solved.k - 1) < 0.003 ? t("calc.needSame") : solved.k < 1 ? t("calc.need", { p: nf((solved.k - 1) * 100, 1) }) : t("calc.need", { p: nf((solved.k - 1) * 100, 1) })}{solved.reachable && solved.k > 1.1 ? ` ${t("calc.stretch")}` : ""}</p>
              <table className="cx-tab num">
                <thead><tr><th /><th>{t("calc.now")}</th><th>{t("calc.required")}</th></tr></thead>
                <tbody>
                  <tr className="sw"><th>{t("calc.swim")}</th><td>{fmtPace(swPace(inp.swimPace100))} /100 {swU}</td><td>{fmtPace(swPace(solved.input.swimPace100))} /100 {swU}</td></tr>
                  <tr className="bk"><th>{t("calc.bike")}</th><td>{nf(bikeWattsOf(inp))} W</td><td>{nf(solved.res.watts)} W · {nf(solved.res.wkg, 2)} W/kg</td></tr>
                  <tr className="rn"><th>{t("calc.run")}</th><td>{fmtPace(rnPace(inp.runPaceKm))} /{rnU}</td><td>{fmtPace(rnPace(solved.input.runPaceKm))} /{rnU}</td></tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="ld-card cx-sec">
          <h3>{t("calc.levers")}</h3>
          <p className="src">{t("calc.leversLead")}</p>
          <ul className="cx-lev">
            {lev.map((l) => (
              <li key={l.id}><span>{t(`lev.${l.id}` as "lev.watts")}</span><b className="num">−{fmtHMS(l.saveS, false)}</b><i style={{ width: `${Math.min(100, (l.saveS / lev[0].saveS) * 100)}%` }} /></li>
            ))}
          </ul>
        </div>

        <div className="ld-card cx-cta">
          <h3>{t("calc.cta")}</h3>
          <p className="src">{t("calc.ctaText")}</p>
          <Link className="btn btn-primary" href={ctaHref}>{t("calc.ctaBtn")}</Link>
          {alpha ? <p className="note">{t("alpha.note")}</p> : null}
        </div>
        <p className="note">{t("calc.note")}</p>
      </aside>
    </div>
  );
}
