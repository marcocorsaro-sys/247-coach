import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TFn } from "@/lib/app-i18n";
import type { FormSummary } from "@/lib/ai/fitness";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { freshReadiness, type Readiness } from "@/lib/server/readiness";

/**
 * Home: 3 riquadri infografici (stile Welltory) su stato di salute e forma.
 *  1. Prontezza oggi (HRV, FC riposo, sonno, carico) 0-100
 *  2. Recupero notturno: sonno + FC a riposo + HRV
 *  3. Carico & forma: fitness/fatica/freschezza (PMC)
 * Dati Garmin via Intervals.icu, aggiornati al volo se vecchi di oltre 1 h.
 */
const LV = { pronto: ["#4ade80", "#c8e64a"], moderato: ["#c8e64a", "#fbbf24"], basso: ["#fbbf24", "#fb923c"], recupera: ["#fb7185", "#f43f5e"] } as const;
const FORM: Record<FormSummary["state"], [string, string]> = {
  fresco: ["#67e8f9", "#a78bfa"], "in forma": ["#4ade80", "#67e8f9"], neutro: ["#94a3b8", "#cbd5e1"], affaticato: ["#fbbf24", "#fb923c"], sovraccarico: ["#fb7185", "#f43f5e"],
};

function Ring({ value, max = 100, colors, id, children, size = 112 }: { value: number; max?: number; colors: readonly [string, string] | [string, string]; id: string; children: React.ReactNode; size?: number }) {
  const r = 44, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(c * p).toFixed(1)} ${c.toFixed(1)}`} style={{ filter: `drop-shadow(0 0 6px ${colors[0]}66)` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", lineHeight: 1.05 }}>{children}</div>
    </div>
  );
}

function Spark({ data, color }: { data: (number | null)[]; color: string }) {
  const W = 120, H = 26;
  const pts = data.map((v, i) => (v == null ? null : [(i * W) / Math.max(1, data.length - 1), H - (v / 100) * H] as const)).filter(Boolean) as (readonly [number, number])[];
  if (pts.length < 2) return null;
  return (
    <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} width="100%" height={26} preserveAspectRatio="none">
      <path d={pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const tile = { background: "linear-gradient(160deg, rgba(255,255,255,.045), rgba(255,255,255,.015))", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 } as const;
const cap = { fontSize: ".68rem", letterSpacing: ".1em", color: "var(--text-3)", textTransform: "uppercase" } as const;

/** Grafico carico & forma (PMC) ultimi 42 giorni: fitness, fatica, freschezza. */
function FormChart({ form, t }: { form: FormSummary; t: TFn }) {
  const S = form.series.slice(-42);
  if (S.length < 7) return null;
  const W = 720, H = 150, padL = 26, padB = 18, top = 8;
  const maxV = Math.max(10, ...S.map((p) => Math.max(p.ctl, p.atl)));
  const tsbMax = Math.max(10, ...S.map((p) => Math.abs(p.tsb)));
  const x = (i: number) => padL + (i * (W - padL - 6)) / (S.length - 1);
  const y = (v: number) => top + (1 - v / maxV) * (H - top - padB - 34);
  const mid = H - padB - 17; // asse freschezza
  const yb = (v: number) => (v / tsbMax) * 16;
  const line = (k: "ctl" | "atl") => S.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const bw = Math.max(2, (W - padL) / S.length - 2);
  const ticks = S.map((p, i) => ({ p, i })).filter(({ p }) => new Date(`${p.date}T12:00:00Z`).getUTCDay() === 1);
  return (
    <div style={{ ...tile, marginTop: 10, gap: 6 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
        <div style={cap}>{t("Carico & forma · 6 settimane")}</div>
        <span style={{ fontSize: ".72rem", color: "#4ade80" }}>━ {t("Fitness")} {Math.round(form.today.ctl)}</span>
        <span style={{ fontSize: ".72rem", color: "#fb7185" }}>━ {t("Fatica")} {Math.round(form.today.atl)}</span>
        <span style={{ fontSize: ".72rem", color: "#67e8f9" }}>▮ {t("freschezza")} {form.today.tsb > 0 ? "+" : ""}{Math.round(form.today.tsb)}</span>
        <span style={{ fontSize: ".72rem", color: "var(--text-3)" }}>{t("rampa 7 gg")} {form.rampRate > 0 ? "+" : ""}{form.rampRate.toFixed(1)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label={t("Carico & forma · 6 settimane")}>
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - 6} y1={y(maxV * f)} y2={y(maxV * f)} stroke="rgba(255,255,255,.06)" />
            <text x={padL - 4} y={y(maxV * f) + 3} fontSize="9" fill="rgba(255,255,255,.35)" textAnchor="end">{Math.round(maxV * f)}</text>
          </g>
        ))}
        <line x1={padL} x2={W - 6} y1={mid} y2={mid} stroke="rgba(255,255,255,.12)" />
        {S.map((p, i) => {
          const h = yb(p.tsb);
          return <rect key={p.date} x={x(i) - bw / 2} y={h >= 0 ? mid - h : mid} width={bw} height={Math.max(1, Math.abs(h))} rx={1} fill={p.tsb >= 5 ? "#67e8f9" : p.tsb >= -10 ? "#94a3b8" : p.tsb >= -30 ? "#fbbf24" : "#fb7185"} opacity={0.85} />;
        })}
        <path d={line("ctl")} fill="none" stroke="#4ade80" strokeWidth={2.4} strokeLinejoin="round" />
        <path d={line("atl")} fill="none" stroke="#fb7185" strokeWidth={1.8} strokeLinejoin="round" strokeDasharray="0" opacity={0.9} />
        {ticks.map(({ p, i }) => (
          <text key={p.date} x={x(i)} y={H - 3} fontSize="9" fill="rgba(255,255,255,.35)" textAnchor="middle">{p.date.slice(8, 10)}/{p.date.slice(5, 7)}</text>
        ))}
      </svg>
      <div style={{ fontSize: ".8rem", color: "var(--text-2)", lineHeight: 1.45 }}>{t(form.advice)}</div>
    </div>
  );
}

export default async function ReadinessCard({ athleteId, t, form }: { athleteId: string; t: TFn; form: FormSummary | null }) {
  const admin = createAdminClient();
  const conn = await loadIntervalsConnection(admin as never, athleteId).catch(() => null);
  const r: Readiness | null = await freshReadiness(admin as never, athleteId, conn).catch(() => null);
  if (!r && !form) return null;
  const f = (k: string) => r?.factors.find((x) => x.key === k);
  const sleep = f("sleep"), rhr = f("rhr"), hrv = f("hrv");
  const recovery = [sleep, rhr, hrv].filter(Boolean) as NonNullable<typeof sleep>[];
  const recScore = recovery.length ? Math.round(recovery.reduce((s, x) => s + x.score, 0) / recovery.length) : null;
  const tsb = form ? Math.round(form.today.tsb) : null;
  const freshPct = tsb == null ? 0 : Math.max(0, Math.min(100, 60 + tsb * 1.4));
  const isToday = r?.day === new Date().toISOString().slice(0, 10);

  return (
    <section id="prontezza" style={{ margin: "0 0 16px" }}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {r ? (
          <div style={tile}>
            <div style={cap}>{t(isToday ? "Prontezza oggi" : "Prontezza")}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Ring value={r.score} colors={LV[r.level]} id="g-ready">
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800 }}>{r.score}</div>
                  <div style={{ fontSize: ".7rem", fontWeight: 700, color: LV[r.level][0], textTransform: "uppercase", letterSpacing: ".06em" }}>{t(r.level)}</div>
                </div>
              </Ring>
              <div style={{ fontSize: ".82rem", lineHeight: 1.45, color: "var(--text-2)" }}>{t(r.advice)}</div>
            </div>
            <div>
              <Spark data={r.series.map((s) => s.score)} color={LV[r.level][0]} />
              <div style={{ ...cap, fontSize: ".62rem" }}>{t("ultimi 14 giorni")}</div>
            </div>
          </div>
        ) : (
          <div style={tile}>
            <div style={cap}>{t("Prontezza oggi")}</div>
            <div style={{ fontSize: ".86rem", lineHeight: 1.5, color: "var(--text-2)" }}>
              {t("Per calcolarla servono i dati notturni dell'orologio (HRV, battito a riposo, sonno), che oggi non arrivano.")}
            </div>
            <ol style={{ margin: "0 0 0 18px", padding: 0, fontSize: ".8rem", color: "var(--text-2)", lineHeight: 1.5 }}>
              <li>{t("Apri intervals.icu → Settings → Garmin (o Polar, Coros, Suunto, Oura, Whoop).")}</li>
              <li>{t("Attiva il download dei dati di benessere (wellness): HRV, sonno, FC a riposo.")}</li>
              <li>{t("Dormi con l'orologio al polso: dalla prima notte trovi qui la prontezza.")}</li>
            </ol>
          </div>
        )}

        {recovery.length ? (
          <div style={tile}>
            <div style={cap}>{t("Recupero notturno")}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Ring value={recScore ?? 0} colors={["#67e8f9", "#a78bfa"]} id="g-rec">
                <div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>{sleep ? sleep.value.split("·").pop()!.trim() || sleep.value : `${recScore}`}</div>
                  <div style={{ fontSize: ".66rem", color: "var(--text-3)" }}>{t("sonno")}</div>
                </div>
              </Ring>
              <div style={{ display: "grid", gap: 6, fontSize: ".8rem" }}>
                {[sleep, rhr, hrv].map((x) =>
                  x ? (
                    <div key={x.key}>
                      <div style={{ color: "var(--text-3)", fontSize: ".7rem" }}>{t(x.label)}</div>
                      <b className="mono" style={{ color: x.score >= 70 ? "#4ade80" : x.score >= 45 ? "#fbbf24" : "#fb7185" }}>{x.key === "sleep" ? x.value.split("·")[0].trim() : x.value}</b>{" "}
                      <span style={{ color: "var(--text-3)" }}>{t(x.note)}</span>
                    </div>
                  ) : null,
                )}
                {!hrv ? <div style={{ color: "var(--text-3)", fontSize: ".72rem" }}>{t("HRV: in arrivo dopo qualche notte di dati")}</div> : null}
              </div>
            </div>
          </div>
        ) : null}

        {form ? (
          <Link href="/atleta/analisi" style={{ ...tile, color: "inherit", textDecoration: "none" }}>
            <div style={cap}>{t("Carico & forma")}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Ring value={freshPct} colors={FORM[form.state]} id="g-form">
                <div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{tsb! > 0 ? "+" : ""}{tsb}</div>
                  <div style={{ fontSize: ".66rem", color: "var(--text-3)" }}>{t("freschezza")}</div>
                </div>
              </Ring>
              <div style={{ display: "grid", gap: 6, fontSize: ".8rem", minWidth: 0 }}>
                <b style={{ color: FORM[form.state][0], textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".78rem" }}>{t(form.state)}</b>
                {[["Fitness", form.today.ctl, "#4ade80"], ["Fatica", form.today.atl, "#fb7185"]].map(([l, v, c]) => (
                  <div key={l as string}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-3)", fontSize: ".7rem" }}><span>{t(l as string)}</span><b className="mono" style={{ color: "var(--text)" }}>{Math.round(v as number)}</b></div>
                    <div style={{ height: 5, borderRadius: 5, background: "rgba(255,255,255,.07)" }}>
                      <div style={{ height: 5, borderRadius: 5, width: `${Math.min(100, ((v as number) / Math.max(form.today.ctl, form.today.atl, 1)) * 100)}%`, background: c as string }} />
                    </div>
                  </div>
                ))}
                <span style={{ color: "var(--text-3)", fontSize: ".7rem" }}>{t("analisi →")}</span>
              </div>
            </div>
          </Link>
        ) : null}
      </div>
      {form ? <FormChart form={form} t={t} /> : null}
      {r ? (
        <div style={{ fontSize: ".7rem", color: "var(--text-3)", marginTop: 6 }}>
          {t("Dati")} {r.source}{isToday ? "" : ` · ${t("ultimo dato")} ${r.day}`} · {t("confronto con la tua media di 4 settimane")}
        </div>
      ) : null}
    </section>
  );
}
