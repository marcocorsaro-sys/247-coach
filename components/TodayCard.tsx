import { createAdminClient } from "@/lib/supabase/admin";
import type { TFn } from "@/lib/app-i18n";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { syncIcuActivities } from "@/lib/server/icuSync";
import { adaptFromToday } from "@/app/atleta/actions";

/**
 * "Oggi" in testa alla home: la seduta prevista e, se l'atleta si è già
 * allenato, quello che ha fatto davvero con il confronto. Se ha fatto
 * qualcosa di diverso lo dice chiaramente (il coach ne tiene conto: la
 * mattina dopo il controllo adattivo rivede la tabella, o subito col bottone).
 */
const ICON: Record<string, string> = { swim: "🏊", bike: "🚴", run: "🏃", athletics: "🏃", other: "💪" };
const NAME: Record<string, string> = { swim: "nuoto", bike: "bici", run: "corsa", athletics: "atletica", other: "forza/altro" };

type Sess = { id: string; discipline: string; title: string | null; volume_value: string | null; notes: string | null };
type Act = { discipline: string; name: string | null; start_date: string; distance_m: number | null; moving_time_s: number | null; average_heartrate: number | null; average_watts: number | null; average_speed: number | null };

function romeDay(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
}
/** "50'", "1h", "2h30'", "1h 15" → minuti; "2400m"/"3 km" → metri. */
function parseVolume(v: string | null): { min?: number; m?: number } {
  if (!v) return {};
  const s = v.toLowerCase().replace(",", ".");
  const km = s.match(/([\d.]+)\s*km/);
  if (km) return { m: parseFloat(km[1]) * 1000 };
  const m = s.match(/([\d.]+)\s*m(?!in)\b/);
  if (m && !/h/.test(s)) return { m: parseFloat(m[1]) };
  const h = s.match(/(\d+)\s*h\s*(\d+)?/);
  if (h) return { min: parseInt(h[1]) * 60 + (h[2] ? parseInt(h[2]) : 0) };
  const mi = s.match(/(\d+)\s*('|min)/);
  if (mi) return { min: parseInt(mi[1]) };
  return {};
}
const fmtMin = (s: number | null) => (s ? (s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.round((s % 3600) / 60)).padStart(2, "0")}` : `${Math.round(s / 60)}'`) : "");
function pace(a: Act) {
  if (!a.average_speed) return "";
  if (a.discipline === "run") { const s = 1000 / a.average_speed; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/km`; }
  if (a.discipline === "swim") { const s = 100 / a.average_speed; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/100m`; }
  return `${(a.average_speed * 3.6).toFixed(1)} km/h`;
}

export default async function TodayCard({ athleteId, t, coachName }: { athleteId: string; t: TFn; coachName?: string | null }) {
  const admin = createAdminClient();
  const today = romeDay();

  // Attività fresche: se l'ultima sincronizzazione ha più di 20 minuti, ricarica gli ultimi 2 giorni.
  const conn = await loadIntervalsConnection(admin as never, athleteId).catch(() => null);
  let syncedAt: string | null = conn?.last_ok_at ?? null;
  if (conn && (!conn.last_ok_at || Date.now() - new Date(conn.last_ok_at).getTime() > 20 * 60_000)) {
    const ok = await Promise.race([syncIcuActivities(admin as never, athleteId, conn, 2).then(() => true).catch(() => false), new Promise<boolean>((r) => setTimeout(() => r(false), 5000))]);
    if (ok) syncedAt = new Date().toISOString();
  }

  const monday = (() => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const [{ data: wk }, { data: acts }, { data: aip }] = await Promise.all([
    admin.from("training_weeks").select("id").eq("athlete_id", athleteId).eq("status", "published").eq("week_start", monday).maybeSingle(),
    admin
      .from("icu_activities")
      .select("discipline, name, start_date, distance_m, moving_time_s, average_heartrate, average_watts, average_speed").eq("is_duplicate" as never, false as never)
      .eq("athlete_id", athleteId)
      .gte("start_date", new Date(Date.now() - 36 * 3600_000).toISOString())
      .order("start_date"),
    admin.from("ai_athlete_profiles").select("shadow_plan").eq("athlete_id", athleteId).maybeSingle(),
  ]);
  const lastA = ((acts ?? []) as Act[]).filter((a) => (a.moving_time_s ?? 0) >= 180).slice(-1)[0];
  const lastAct = lastA ? `${lastA.name || NAME[lastA.discipline] || lastA.discipline} ${new Date(lastA.start_date).toLocaleString("it-IT", { timeZone: "UTC", weekday: "short", hour: "2-digit", minute: "2-digit" })}` : "";
  const shadow = !!(aip as { shadow_plan?: boolean } | null)?.shadow_plan;
  let planned: Sess[] = [];
  if (wk) {
    const { data } = await admin.from("sessions").select("id, discipline, title, volume_value, notes").eq("week_id", (wk as { id: string }).id).eq("day_of_week", dow).order("sort_order");
    planned = (data ?? []) as Sess[];
  }
  const seen = new Set<string>();
  const done = ((acts ?? []) as Act[])
    .filter((a) => a.start_date.slice(0, 10) === today && (a.distance_m || a.moving_time_s))
    .filter((a) => { const k = `${a.start_date.slice(0, 16)}|${a.discipline}`; if (seen.has(k)) return false; seen.add(k); return true; });

  if (!planned.length && !done.length) return null; // giorno di riposo e niente fatto: ci pensa la settimana

  // Confronto.
  const usedPlan = new Set<string>();
  const rows = done.map((a) => {
    const p = planned.find((s) => s.discipline === a.discipline && !usedPlan.has(s.id));
    if (!p) return { a, p: null as Sess | null, verdict: "diverso" as const, note: "" };
    usedPlan.add(p.id);
    const vol = parseVolume(p.volume_value);
    let ratio: number | null = null;
    if (vol.min && a.moving_time_s) ratio = a.moving_time_s / 60 / vol.min;
    else if (vol.m && a.distance_m) ratio = a.distance_m / vol.m;
    const verdict = ratio == null ? ("fatto" as const) : ratio < 0.75 ? ("più corto" as const) : ratio > 1.3 ? ("più lungo" as const) : ("come da tabella" as const);
    return { a, p, verdict, note: ratio != null ? `${Math.round(ratio * 100)}%` : "" };
  });
  const missed = planned.filter((s) => !usedPlan.has(s.id));
  const different = rows.some((r) => r.verdict === "diverso") || (done.length > 0 && missed.length > 0);
  const coach = coachName || t("il coach");

  const box = { border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "10px 12px" } as const;
  const vColor = { "come da tabella": "#4ade80", fatto: "#4ade80", "più corto": "#fbbf24", "più lungo": "#fbbf24", diverso: "#67e8f9" } as const;

  return (
    <section className="card" id="oggi" style={{ margin: "0 0 14px", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: "1.05rem" }}>{t("Oggi")}</b>
        <span style={{ color: "var(--text-3)", fontSize: ".82rem" }}>
          {new Date(`${today}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        {syncedAt ? (
          <span style={{ marginLeft: "auto", color: "var(--text-3)", fontSize: ".74rem" }} title={t("Ultimo aggiornamento degli allenamenti da Intervals.icu")}>
            ⟳ {t("allenamenti aggiornati")} {new Date(syncedAt).toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: romeDay(new Date(syncedAt)) === today ? undefined : "short", hour: "2-digit", minute: "2-digit" })}
            {lastAct ? ` · ${t("ultimo")}: ${lastAct}` : ""}
          </span>
        ) : null}
      </div>

      {done.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ ...box, borderColor: `${vColor[r.verdict]}55` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.2rem" }}>{ICON[r.a.discipline] ?? "•"}</span>
                <b>{t("Fatto")}: {r.a.name || t(NAME[r.a.discipline] ?? "allenamento")}</b>
                <span className="mono" style={{ fontSize: ".82rem", color: "var(--text-2)" }}>
                  {[fmtMin(r.a.moving_time_s), r.a.distance_m ? `${(r.a.distance_m / 1000).toFixed(r.a.discipline === "swim" ? 2 : 1)} km` : "", pace(r.a), r.a.average_heartrate ? `FC ${Math.round(r.a.average_heartrate)}` : "", r.a.average_watts ? `${Math.round(r.a.average_watts)} W` : ""].filter(Boolean).join(" · ")}
                </span>
                <span style={{ marginLeft: "auto", fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: vColor[r.verdict] }}>
                  {t(r.verdict)}{r.note && r.verdict !== "come da tabella" ? ` · ${r.note}` : ""}
                </span>
              </div>
              {!shadow ? (
                <div style={{ fontSize: ".8rem", color: "var(--text-3)", marginTop: 4 }}>
                  {r.p ? `${t("In tabella")}: ${r.p.title ?? ""} (${r.p.volume_value ?? "—"})` : t("Non era in tabella oggi.")}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {(done.length ? missed : planned).map((s) => (
        <div key={s.id} style={{ ...box, opacity: done.length ? 0.75 : 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.2rem" }}>{ICON[s.discipline] ?? "•"}</span>
            <b>{done.length ? `${t("Previsto, non fatto")}: ` : shadow ? `${t("Proposta 247")}: ` : ""}{s.title}</b>
            <span className="mono" style={{ fontSize: ".82rem", color: "var(--text-2)" }}>{s.volume_value}</span>
          </div>
          {!done.length && s.notes ? <div style={{ fontSize: ".82rem", color: "var(--text-2)", marginTop: 4, lineHeight: 1.45 }}>{s.notes.slice(0, 260)}{s.notes.length > 260 ? "…" : ""}</div> : null}
        </div>
      ))}

      {done.length && !shadow ? (
        different ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: ".86rem", color: "var(--text-2)" }}>
            <span style={{ flex: 1, minWidth: 220 }}>
              🔁 {t("Hai fatto qualcosa di diverso dal previsto:")} {coach} {t("ne tiene conto e domattina adatta i prossimi giorni. Vuoi che lo faccia subito?")}
            </span>
            <form action={adaptFromToday}>
              <input type="hidden" name="note" value={`Oggi ho fatto ${rows.map((r) => `${NAME[r.a.discipline] ?? r.a.discipline} ${fmtMin(r.a.moving_time_s)}`).join(" + ")} invece di ${planned.map((s) => `${s.title} (${s.volume_value ?? ""})`).join(" + ") || "riposo"}. Adatta i prossimi giorni.`} />
              <button className="btn btn-primary btn-sm" type="submit">{t("Adatta adesso")}</button>
            </form>
          </div>
        ) : (
          <div style={{ fontSize: ".86rem", color: "#4ade80" }}>✓ {t("Allenamento di oggi in linea con la tabella. Scrivi sotto com'è andata.")}</div>
        )
      ) : null}
    </section>
  );
}
