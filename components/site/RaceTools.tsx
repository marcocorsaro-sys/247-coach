"use client";
// Kit di gara: piano nutrizione (borracce, gel, barrette) e checklist valigia con spunte salvate nel browser.
import { useEffect, useMemo, useState } from "react";
import { CK_GROUPS, checklistFor, computeNutrition, fmtHM, parseHM, type BikeMix, type KitRace } from "@/lib/site/racekit";
import { fmt, type Dict } from "@/lib/i18n/dict";

const N = (x: number) => String(x);
const L = (ml: number) => (ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} ml`);

function Num({ label, value, set, suffix }: { label: string; value: string; set: (v: string) => void; suffix?: string }) {
  return (
    <label className="ld-field cx-f"><span className="lab">{label}</span>
      <span className="cx-in"><input className="cx-inp num" inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} />{suffix ? <i>{suffix}</i> : null}</span>
    </label>
  );
}
function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return <div className="kit-stat"><span className="lab">{k}</span><b className="num">{v}</b>{sub ? <small>{sub}</small> : null}</div>;
}

export default function RaceTools({ race, t }: { race: KitRace; t: Dict }) {
  const [tab, setTab] = useState<"nut" | "ck">("nut");
  const sp = race.splits[Math.min(1, race.splits.length - 1)];
  const [w, setW] = useState("70");
  const [bike, setBike] = useState(sp ? sp.bike : race.distance === "full" ? "5:30" : "2:50");
  const [run, setRun] = useState(sp ? sp.run : race.distance === "full" ? "4:00" : "1:45");
  const [bc, setBc] = useState(race.distance === "full" ? "80" : "70");
  const [rc, setRc] = useState(race.distance === "full" ? "60" : "50");
  const [mix, setMix] = useState<BikeMix>("balanced");

  const bm = parseHM(bike) ?? 0, rm = parseHM(run) ?? 0;
  const res = useMemo(() => computeNutrition({ weight: Number(w.replace(",", ".")) || 70, bikeMin: bm, runMin: rm, bikeCarb: Number(bc) || 60, runCarb: Number(rc) || 40, heat: race.heat, mix, distance: race.distance }), [w, bm, rm, bc, rc, mix, race]);

  // checklist
  const items = useMemo(() => checklistFor(race), [race]);
  const key = `kit-ck-${race.slug}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s) setDone(JSON.parse(s)); } catch {} }, [key]);
  const toggle = (k: string) => setDone((d) => { const n = { ...d, [k]: !d[k] }; try { localStorage.setItem(key, JSON.stringify(n)); } catch {} return n; });
  const reset = () => { setDone({}); try { localStorage.removeItem(key); } catch {} };
  const nDone = items.filter((i) => done[i.k]).length;
  const copy = async () => {
    const txt = CK_GROUPS.map((g) => `${t[`ck.g.${g}` as keyof Dict]}\n` + items.filter((i) => i.g === g).map((i) => `${done[i.k] ? "[x]" : "[ ]"} ${t[i.k as keyof Dict]}`).join("\n")).join("\n\n");
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };

  return (
    <div className="kit">
      <div className="kit-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "nut"} className={tab === "nut" ? "on" : ""} onClick={() => setTab("nut")}>{t["kit.tabNut"]}</button>
        <button role="tab" aria-selected={tab === "ck"} className={tab === "ck" ? "on" : ""} onClick={() => setTab("ck")}>{t["kit.tabCk"]}</button>
      </div>

      {tab === "nut" ? (
        <div className="kit-nut">
          <div className="kit-form">
            <Num label={t["nut.weight"]} value={w} set={setW} suffix="kg" />
            <Num label={t["nut.bikeMin"]} value={bike} set={setBike} />
            <Num label={t["nut.runMin"]} value={run} set={setRun} />
            <Num label={t["nut.bikeCarb"]} value={bc} set={setBc} suffix="g/h" />
            <Num label={t["nut.runCarb"]} value={rc} set={setRc} suffix="g/h" />
            <label className="ld-field cx-f"><span className="lab">{t["nut.mix"]}</span>
              <select className="cx-inp" value={mix} onChange={(e) => setMix(e.target.value as BikeMix)}>
                <option value="drink">{t["nut.mix.drink"]}</option><option value="balanced">{t["nut.mix.balanced"]}</option><option value="gel">{t["nut.mix.gel"]}</option>
              </select>
            </label>
          </div>
          <p className="kit-hint">{t["nut.hint"]}</p>
          {res.warn.map((x) => <p key={x} className="kit-warn">{t[`nut.w.${x}` as keyof Dict]}</p>)}

          <div className="kit-blocks">
            <div className="kit-block"><h3>{t["nut.pre"]}</h3>
              <p><b>{t["nut.preLoad"]}</b><br />{fmt(t["nut.preLoadV"], { a: N(res.pre.loadLow), b: N(res.pre.loadHigh), d: N(res.pre.loadDays) })}</p>
              <p><b>{t["nut.preBf"]}</b><br />{fmt(t["nut.preBfV"], { a: N(res.pre.breakfastLow), b: N(res.pre.breakfastHigh) })}</p>
            </div>
            <div className="kit-block"><h3>{t["nut.bike"]} <small>{fmtHM(bm)}</small></h3>
              <div className="kit-stats">
                <Stat k={t["nut.carbs"]} v={`${res.bike.carbs} g`} /><Stat k={t["nut.fluid"]} v={L(res.bike.fluidMl)} /><Stat k={t["nut.sodium"]} v={`${res.bike.sodiumMg} mg`} />
                <Stat k={t["nut.bottles"]} v={N(res.bike.bottles)} /><Stat k={t["nut.gels"]} v={N(res.bike.gels)} /><Stat k={t["nut.bars"]} v={N(res.bike.bars)} />
              </div>
              <p className="kit-per"><b>{t["nut.per20"]}</b> · {fmt(t["nut.per20V"], { c: N(res.bike.per20.carbs), f: N(res.bike.per20.fluidMl) })}</p>
            </div>
            <div className="kit-block"><h3>{t["nut.run"]} <small>{fmtHM(rm)}</small></h3>
              <div className="kit-stats">
                <Stat k={t["nut.carbs"]} v={`${res.run.carbs} g`} /><Stat k={t["nut.fluid"]} v={L(res.run.fluidMl)} /><Stat k={t["nut.sodium"]} v={`${res.run.sodiumMg} mg`} />
                <Stat k={t["nut.gels"]} v={N(res.run.gels)} /><Stat k={t["nut.drinkRun"]} v={L(res.run.drinkMl)} />
              </div>
              <p className="kit-per"><b>{t["nut.per20"]}</b> · {fmt(t["nut.per20V"], { c: N(res.run.per20.carbs), f: N(Math.round(res.run.fluidMl / Math.max(res.run.hours * 3, 1))) })}</p>
            </div>
            <div className="kit-block kit-total"><h3>{t["nut.total"]}</h3>
              <div className="kit-stats">
                <Stat k={t["nut.carbs"]} v={`${res.total.carbs} g`} /><Stat k={t["nut.fluid"]} v={L(res.total.fluidMl)} /><Stat k={t["nut.sodium"]} v={`${res.total.sodiumMg} mg`} />
                <Stat k={t["nut.bottles"]} v={N(res.total.bottles)} /><Stat k={t["nut.gels"]} v={N(res.total.gels)} /><Stat k={t["nut.bars"]} v={N(res.total.bars)} /><Stat k={t["nut.caps"]} v={N(res.total.caps)} />
              </div>
            </div>
            <div className="kit-block"><h3>{t["nut.recovery"]}</h3>
              <p>{fmt(t["nut.recV"], { a: N(res.recovery.carbsLow), b: N(res.recovery.carbsHigh), p: N(res.recovery.protein) })}</p>
            </div>
          </div>
          <p className="kit-note">{t["nut.note"]}</p>
        </div>
      ) : (
        <div className="kit-ck">
          <div className="kit-bar">
            <div className="kit-prog"><i style={{ width: `${(nDone / items.length) * 100}%` }} /></div>
            <span className="mono">{fmt(t["ck.progress"], { a: N(nDone), b: N(items.length) })}</span>
            <span className="kit-actions">
              <button className="btn btn-ghost" onClick={copy}>{copied ? t["ck.copied"] : t["ck.copy"]}</button>
              <button className="btn btn-ghost" onClick={() => window.print()}>{t["ck.print"]}</button>
              <button className="btn btn-ghost" onClick={reset}>{t["ck.reset"]}</button>
            </span>
          </div>
          <div className="kit-groups">
            {CK_GROUPS.map((g) => (
              <div className="kit-group" key={g}><h3>{t[`ck.g.${g}` as keyof Dict]}</h3>
                {items.filter((i) => i.g === g).map((i) => (
                  <label key={i.k} className={`kit-item${done[i.k] ? " on" : ""}`}><input type="checkbox" checked={!!done[i.k]} onChange={() => toggle(i.k)} /><span>{t[i.k as keyof Dict]}</span></label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
