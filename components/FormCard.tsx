"use client";
// Forma dell'atleta (modello PMC): fitness/fatica/freschezza + 90 giorni.
import type { FormSummary } from "@/lib/ai/fitness";
import { useT } from "@/components/AppLang";

const STATE_COLOR: Record<FormSummary["state"], string> = {
  fresco: "var(--ice)",
  "in forma": "var(--emerald)",
  neutro: "var(--text-2)",
  affaticato: "var(--amber)",
  sovraccarico: "var(--lime)",
};

export default function FormCard({ form }: { form: FormSummary | null }) {
  const tr = useT();
  if (!form) return null;
  const W = 560, H = 110, pad = 4;
  const s = form.series;
  const maxV = Math.max(10, ...s.map((p) => Math.max(p.ctl, p.atl)));
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, s.length - 1);
  const y = (v: number) => H - pad - (v / maxV) * (H - pad * 2);
  const line = (key: "ctl" | "atl") => s.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const zero = y(0);
  const t = form.today;
  return (
    <div className="card form-card" id="forma">
      <div className="form-head">
        <div>
          <div className="mono">{tr("Forma oggi")}</div>
          <div className="form-state" style={{ color: STATE_COLOR[form.state] }}>{tr(form.state)}</div>
        </div>
        <p className="form-advice">{tr(form.advice)}</p>
      </div>
      <div className="form-kpis">
        <div><b>{Math.round(t.ctl)}</b><span>{tr("Fitness · CTL")}</span></div>
        <div><b>{Math.round(t.atl)}</b><span>{tr("Fatica · ATL")}</span></div>
        <div><b style={{ color: t.tsb >= 0 ? "var(--ice)" : t.tsb < -25 ? "var(--lime)" : undefined }}>{t.tsb > 0 ? "+" : ""}{Math.round(t.tsb)}</b><span>{tr("Freschezza · TSB")}</span></div>
        <div><b>{form.rampRate > 0 ? "+" : ""}{form.rampRate}</b><span>{tr("Ramp 7 gg")}</span></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="form-chart" preserveAspectRatio="none" aria-label={tr("Fitness e fatica, 90 giorni")}>
        <line x1={pad} x2={W - pad} y1={zero} y2={zero} stroke="var(--line-2)" strokeWidth="1" />
        {s.map((p, i) => (
          <rect key={p.date} x={x(i) - 1.2} y={y(Math.min(p.load, maxV))} width="2.4" height={Math.max(0, zero - y(Math.min(p.load, maxV)))} fill="var(--text-3)" opacity=".45" />
        ))}
        <path d={line("atl")} fill="none" stroke="var(--amber)" strokeWidth="1.6" opacity=".9" />
        <path d={line("ctl")} fill="none" stroke="var(--text)" strokeWidth="2.2" />
      </svg>
      <div className="form-legend">
        <span><i style={{ background: "var(--text)" }} /> {tr("fitness")}</span>
        <span><i style={{ background: "var(--amber)" }} /> {tr("fatica")}</span>
        <span><i style={{ background: "var(--text-3)" }} /> {tr("carico giornaliero")}</span>
        <span className="dim">{tr("90 giorni · da Intervals")}</span>
      </div>
    </div>
  );
}
