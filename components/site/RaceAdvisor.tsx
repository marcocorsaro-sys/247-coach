"use client";
// Race Advisor: sei risposte, nessun account. Punteggio calcolato lato client
// sugli attributi dichiarati del percorso (lib/site/races.ts → scoreRace).
import { useMemo, useState } from "react";
import Link from "next/link";
import { DEFAULT_PREFS, fmtDate, hasRichContent, racePath, raceTitle, scoreRace, type AdvisorPrefs, type Race } from "@/lib/site/races";
import { LOCALE, type Lang } from "@/lib/i18n/config";
import { fmt, type Dict } from "@/lib/i18n/dict";

type K = keyof AdvisorPrefs;
const FIELDS: { k: K; label: keyof Dict; opts: [string, keyof Dict][] }[] = [
  { k: "dist", label: "adv.distance", opts: [["full", "adv.full"], ["half", "adv.half"], ["any", "adv.both"]] },
  { k: "per", label: "adv.period", opts: [["prim", "adv.spring"], ["est", "adv.summer"], ["aut", "adv.autumn"], ["any", "adv.any"]] },
  { k: "water", label: "adv.swim", opts: [["mare", "adv.sea"], ["lago", "adv.lake"], ["any", "adv.any"]] },
  { k: "bike", label: "adv.bike", opts: [["flat", "adv.flat"], ["roll", "adv.rolling"], ["mtn", "adv.mountain"]] },
  { k: "heat", label: "adv.heat", opts: [["ok", "adv.heatOk"], ["no", "adv.heatNo"]] },
  { k: "goal", label: "adv.goal", opts: [["fin", "adv.finisher"], ["pb", "adv.pb"], ["slot", "adv.slot"]] },
];
const WHY: Record<string, keyof Dict> = {
  "periodo giusto": "why.period", "nuoto in mare": "why.sea", "acqua dolce": "why.fresh", "bici piatta": "why.flat", "bici mossa": "why.rolling",
  "bici di montagna": "why.mtn", "clima fresco": "why.cool", "percorso veloce": "why.fast", "corsa piatta": "why.flatRun", "campo meno profondo": "why.field",
};

export default function RaceAdvisor({ races, lang, dict }: { races: Race[]; lang: Lang; dict: Dict }) {
  const t = (k: keyof Dict, v?: Record<string, string | number>) => fmt(dict[k] ?? k, v);
  const [p, setP] = useState<AdvisorPrefs>(DEFAULT_PREFS);
  const rows = useMemo(
    () => races.map((r) => ({ r, sc: scoreRace(r, p) })).filter((x): x is { r: Race; sc: { s: number; why: string[] } } => x.sc !== null).sort((a, b) => b.sc.s - a.sc.s).slice(0, 5),
    [races, p],
  );
  return (
    <div className="ld-adv">
      <div className="ld-card">
        {FIELDS.map((f) => (
          <div className="ld-field" key={f.k}>
            <span className="lab">{t(f.label)}</span>
            <div className="ld-seg" role="group" aria-label={t(f.label)}>
              {f.opts.map(([v, l]) => (
                <button key={v} type="button" className={p[f.k] === v ? "on" : ""} onClick={() => setP({ ...p, [f.k]: v })} aria-pressed={p[f.k] === v}>{t(l)}</button>
              ))}
            </div>
          </div>
        ))}
        <p className="note">{t("adv.note")}</p>
      </div>
      <div className="ld-rank">
        {rows.length === 0 ? <p className="note">{t("adv.empty")}</p> : rows.map(({ r, sc }) => (
          <Link className="ld-rrow" href={racePath(r, lang)} key={r.id}>
            <span className="sc num">{sc.s}</span>
            <span>
              <span className="nm">{raceTitle(r)}</span>{" "}
              <span className="src">· {[r.city, r.country].filter(Boolean).join(" · ")} · {fmtDate(r.race_date, { day: "2-digit", month: "short" }, LOCALE[lang])} {r.race_date?.slice(0, 4)}</span>
              <div className="why">{r.tagline}</div>
              <div className="meta">{sc.why.map((w) => <span className="ld-tag" key={w}>{WHY[w] ? t(WHY[w]) : w}</span>)}</div>
            </span>
            <span className="btn btn-ghost btn-sm">{hasRichContent(r) ? t("adv.sheet") : t("adv.preview")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
