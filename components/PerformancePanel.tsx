// ============================================================================
// Analisi della performance storica (server component): obiettivo sulla gara A
// con proiezione del calcolatore, considerazioni e storico gare ricostruito
// dalle attività. Generico: funziona per qualunque atleta con lo storico.
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { athletePerformance, type PastRace } from "@/lib/server/raceHistory";
import { fmtHMS, fmtPace } from "@/lib/site/calc";
import type { TFn } from "@/lib/app-i18n";

const KIND: Record<PastRace["kind"], string> = { full: "Ironman", half: "70.3", olympic: "Olimpico", sprint: "Sprint", marathon: "Maratona", full_nosplit: "Ironman (file unico)" };
const LEVER: Record<string, string> = {
  watts: "+5 W in bici", mass: "−1 kg di peso", cda: "Posizione più aerodinamica (−0,01 CdA)", swim: "Nuoto 3 s/100 m più veloce",
  run: "Corsa 10 s/km più veloce", trans: "Transizioni 30 s più rapide", heat: "Acclimatamento al caldo", descent: "+5 km/h in discesa", wetsuit: "Nuotare con la muta",
};
const hm = (s: number | null | undefined) => (s ? fmtHMS(s) : "—");

export default async function PerformancePanel({ athleteId, t }: { athleteId: string; t: TFn }) {
  const perf = await athletePerformance(createAdminClient() as never, athleteId);
  const { races, ins, target, projection: p } = perf;
  const tri = races.filter((r) => r.kind !== "marathon");
  if (!races.length && !target) return null;

  const tips: string[] = [];
  const rp = ins.runPace, bk = ins.bikeKmh;
  if (rp.n >= 2 && rp.best && rp.recent && rp.recent > rp.best * 1.06)
    tips.push(t("Corsa in gara in calo: dalla migliore {b}/km ({d}) alla media recente di {r}/km. È la leva principale.", { b: fmtPace(rp.best), d: rp.bestDate ?? "", r: fmtPace(rp.recent) }));
  else if (rp.n >= 2 && rp.best && rp.recent)
    tips.push(t("Corsa in gara costante: media recente {r}/km, migliore {b}/km.", { r: fmtPace(rp.recent), b: fmtPace(rp.best) }));
  if (bk.n >= 2 && bk.best && bk.recent)
    tips.push(bk.recent >= bk.best * 0.95
      ? t("Bici solida: media recente {r} km/h, vicina alla migliore ({b} km/h).", { r: bk.recent.toFixed(1), b: bk.best.toFixed(1) })
      : t("Bici in calo: media recente {r} km/h contro la migliore di {b} km/h.", { r: bk.recent.toFixed(1), b: bk.best.toFixed(1) }));
  if (p?.need && p.targetS) {
    const n = p.need.res;
    if (!p.need.reachable) tips.push(t("Con i dati attuali l'obiettivo è fuori portata: serve rivedere il tempo o lavorare su più discipline insieme."));
    if (rp.best && n.runPaceEff < rp.best) tips.push(t("Il ritmo di corsa richiesto ({x}/km) è più veloce della tua miglior maratona in gara ({b}/km): obiettivo molto ambizioso.", { x: fmtPace(n.runPaceEff), b: fmtPace(rp.best) }));
    else if (rp.recent && n.runPaceEff < rp.recent) tips.push(t("Per l'obiettivo devi correre a {x}/km: più veloce delle ultime gare ({r}/km), ma già fatto in passato.", { x: fmtPace(n.runPaceEff), r: fmtPace(rp.recent) }));
    const ifb = p.input.ftp ? n.watts / p.input.ftp : null;
    if (ifb && target?.distance === "full" && ifb > 0.78) tips.push(t("La potenza richiesta in bici ({w} W, {i}% di FTP) è oltre il sostenibile su un full (70-75%).", { w: Math.round(n.watts), i: Math.round(ifb * 100) }));
  }

  const cell = { padding: "6px 8px", borderBottom: "1px solid var(--line)" } as const;
  return (
    <>
      {target && p ? (
        <>
          <h2 className="sec" id="obiettivo"><span className="l">{t("Obiettivo e proiezione")}</span><span className="mono">{target.name} · {target.race_date}</span></h2>
          <div className="bento-4">
            <div className="card kpi"><div className="v">{p.targetS ? fmtHMS(p.targetS) : "—"}</div><div className="l">{t("obiettivo")}</div></div>
            <div className="card kpi"><div className="v" style={{ color: p.targetS && p.proj.totalS > p.targetS ? "var(--amber, #f5b942)" : "var(--lime)" }}>{fmtHMS(p.proj.totalS)}</div><div className="l">{t("proiezione con i dati di oggi")}</div></div>
            <div className="card kpi"><div className="v">{p.targetS ? `${p.proj.totalS > p.targetS ? "+" : "−"}${fmtHMS(Math.abs(p.proj.totalS - p.targetS))}` : "—"}</div><div className="l">{t("distanza dall'obiettivo")}</div></div>
            <div className="card kpi"><div className="v">{Math.max(0, Math.round((new Date(target.race_date).getTime() - Date.now()) / (7 * 86400000)))}</div><div className="l">{t("settimane alla gara")}</div></div>
          </div>
          <div className="card" style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem", minWidth: 520 }}>
              <thead><tr style={{ color: "var(--text-2)", textAlign: "left" }}><th style={cell}></th><th style={cell}>{t("Nuoto")}</th><th style={cell}>{t("Bici")}</th><th style={cell}>{t("Corsa")}</th><th style={cell}>{t("Totale")}</th></tr></thead>
              <tbody>
                <tr><td style={cell}>{t("Proiezione")}</td><td style={cell}>{hm(p.proj.swimS)}<div className="dim">{fmtPace(p.proj.swimPaceOw100)}/100</div></td><td style={cell}>{hm(p.proj.bikeS)}<div className="dim">{Math.round(p.proj.watts)} W · {p.proj.bikeAvgKmh.toFixed(1)} km/h</div></td><td style={cell}>{hm(p.proj.runS)}<div className="dim">{fmtPace(p.proj.runPaceEff)}/km</div></td><td style={cell}><b>{hm(p.proj.totalS)}</b></td></tr>
                {p.need ? (
                  <tr><td style={cell}>{t("Per l'obiettivo")}</td><td style={cell}>{hm(p.need.res.swimS)}<div className="dim">{fmtPace(p.need.res.swimPaceOw100)}/100</div></td><td style={cell}>{hm(p.need.res.bikeS)}<div className="dim">{Math.round(p.need.res.watts)} W · {p.need.res.bikeAvgKmh.toFixed(1)} km/h</div></td><td style={cell}>{hm(p.need.res.runS)}<div className="dim">{fmtPace(p.need.res.runPaceEff)}/km</div></td><td style={cell}><b>{hm(p.need.res.totalS)}</b></td></tr>
                ) : null}
                {ins.dist === target.distance && (rp.best || bk.best) ? (
                  <tr><td style={cell}>{t("Tuo migliore in gara")}</td><td style={cell}>{ins.swimPace.best ? `${fmtPace(ins.swimPace.best)}/100` : "—"}</td><td style={cell}>{bk.best ? `${bk.best.toFixed(1)} km/h` : "—"}</td><td style={cell}>{rp.best ? `${fmtPace(rp.best)}/km` : "—"}</td><td style={cell}></td></tr>
                ) : null}
              </tbody>
            </table>
            <p className="mono" style={{ marginTop: 8, fontSize: ".72rem", color: "var(--text-3)" }}>
              {t("Modello del calcolatore 24/7 Coach sul percorso della gara (dislivello, caldo, vento, muta).")} {p.basis.map((b) => t(b)).join(" · ")}. {t("Stima ±3-5%.")}
              {target.slug ? <> · <a href={`/it/calc?race=${target.slug}`} style={{ textDecoration: "underline" }}>{t("Apri nel calcolatore")}</a></> : null}
            </p>
          </div>
          {p.levers.length ? (
            <div className="card" style={{ marginTop: 10 }}>
              <span className="mono">{t("Dove si guadagna di più")}</span>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {p.levers.map((l) => <li key={l.id}>{t(LEVER[l.id] ?? l.id)}: <b>−{fmtHMS(l.saveS, false)}</b></li>)}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {tips.length ? (
        <>
          <h2 className="sec"><span className="l">{t("Considerazioni sulla tua performance")}</span></h2>
          <div className="card"><ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>{tips.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </>
      ) : null}

      {races.length ? (
        <>
          <h2 className="sec"><span className="l">{t("Le tue gare")}</span><span className="mono">{t("{n} ricostruite dalle attività", { n: races.length })} · {ins.count.full} Ironman · {ins.count.half} 70.3 · {ins.count.olympic + ins.count.sprint} {t("corti")} · {ins.count.marathon} {t("maratone")}</span></h2>
          <div className="card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem", minWidth: 680 }}>
              <thead><tr style={{ color: "var(--text-2)", textAlign: "left" }}>{[t("Data"), t("Gara"), t("Nuoto"), t("Bici"), t("Corsa"), t("Totale")].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
              <tbody>
                {races.slice(0, 60).map((r) => (
                  <tr key={r.date + r.kind}>
                    <td style={cell}>{r.date}</td>
                    <td style={cell}><b>{t(KIND[r.kind])}</b>{r.name ? <div className="dim">{r.name}</div> : <div className="dim">{t("nome non registrato")}</div>}</td>
                    <td style={cell}>{r.swim ? <>{hm(r.swim.s)}<div className="dim">{r.swim.km.toFixed(1)} km</div></> : "—"}</td>
                    <td style={cell}>{r.bike ? <>{hm(r.bike.s)}<div className="dim">{r.bike.km.toFixed(0)} km{r.bike.w ? ` · ${Math.round(r.bike.w)} W` : ""}{r.bike.hr ? ` · FC ${Math.round(r.bike.hr)}` : ""}</div></> : "—"}</td>
                    <td style={cell}>{r.run ? <>{hm(r.run.s)}<div className="dim">{fmtPace(r.run.s / Math.max(0.1, r.run.km))}/km{r.run.hr ? ` · FC ${Math.round(r.run.hr)}` : ""}</div></> : "—"}</td>
                    <td style={cell}><b>{hm(r.totalS)}</b>{r.kind !== "marathon" && r.totalS && !r.swim ? <div className="dim">{t("senza nuoto")}</div> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mono" style={{ marginTop: 8, fontSize: ".72rem", color: "var(--text-3)" }}>
              {t("Gare riconosciute dai giorni con nuoto, bici e corsa compatibili con le distanze di gara. Tempi di movimento delle singole frazioni; il totale include le transizioni solo se registrate.")}
              {tri.length === 0 ? ` ${t("Nessun triathlon riconosciuto.")}` : ""}
            </p>
          </div>
        </>
      ) : null}
    </>
  );
}
