// ============================================================================
// Pannello di controllo 24/7 Coach (solo super admin): tutti gli atleti
// registrati, a che punto sono, carico e aderenza al piano. "Apri tabella"
// entra nell'area atleta come lui (switch vista già esistente).
// ============================================================================
import Link from "next/link";
import { announceToAthletes, sendCoachTelegram } from "@/app/admin/actions";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_COACH_ID } from "@/lib/ai/mode";
import { toggleWatch } from "./actions";

export const dynamic = "force-dynamic";

type P = { id: string; full_name: string | null; email: string | null; lang: string | null; created_at: string };
type Ai = { athlete_id: string; onboarding_completed_at: string | null; plan_generated_at: string | null; ai_last_error: string | null; goal_notes: string | null; experience_level: string | null };

function ago(iso: string | null) {
  if (!iso) return "—";
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h < 1) return "ora";
  if (h < 24) return `${Math.round(h)}h fa`;
  return `${Math.round(h / 24)}g fa`;
}
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" }) : "—");

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tg?: string; ann?: string }> }) {
  const { tg: tgParam, ann: annParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) redirect("/");

  const admin = createAdminClient();
  const { data: rel } = await admin.from("coaching_relationships").select("athlete_id").eq("coach_id", AI_COACH_ID);
  const ids = ((rel ?? []) as { athlete_id: string }[]).map((r) => r.athlete_id);
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const monday = (() => { const d = new Date(); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10); })();

  const [{ data: profs }, { data: ais }, { data: icu }, { data: races }, { data: acts7 }, { data: lastActs }, { data: weeks }, { data: watch }, { data: provs }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, lang, created_at").in("id", ids),
    admin.from("ai_athlete_profiles").select("athlete_id, onboarding_completed_at, plan_generated_at, ai_last_error, goal_notes, experience_level").in("athlete_id", ids),
    admin.from("intervals_connections").select("athlete_id, intervals_athlete_id, last_ok_at").in("athlete_id", ids),
    admin.from("races").select("athlete_id, name, race_date, priority").in("athlete_id", ids).gte("race_date", new Date().toISOString().slice(0, 10)).order("race_date"),
    admin.from("icu_activities").select("athlete_id, moving_time_s, training_load").eq("is_duplicate" as never, false as never).in("athlete_id", ids).gte("start_date", since7),
    admin.from("icu_activities").select("athlete_id, start_date, discipline, name").eq("is_duplicate" as never, false as never).in("athlete_id", ids).order("start_date", { ascending: false }).limit(500),
    admin.from("training_weeks").select("id, athlete_id, week_start, status").in("athlete_id", ids).eq("status", "published").gte("week_start", monday),
    admin.from("athlete_watch" as never).select("athlete_id, note"),
    admin.rpc("admin_auth_providers" as never, { ids } as never),
  ]);

  const P_ = ((profs ?? []) as P[]).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const aiBy = new Map(((ais ?? []) as Ai[]).map((a) => [a.athlete_id, a]));
  const icuBy = new Map(((icu ?? []) as { athlete_id: string; intervals_athlete_id: string | null; last_ok_at: string | null }[]).map((c) => [c.athlete_id, c]));
  const raceBy = new Map<string, { name: string; race_date: string }>();
  for (const r of (races ?? []) as { athlete_id: string; name: string; race_date: string }[]) if (!raceBy.has(r.athlete_id)) raceBy.set(r.athlete_id, r);
  const h7 = new Map<string, number>(); const l7 = new Map<string, number>();
  for (const a of (acts7 ?? []) as { athlete_id: string; moving_time_s: number | null; training_load: number | null }[]) {
    h7.set(a.athlete_id, (h7.get(a.athlete_id) ?? 0) + (a.moving_time_s ?? 0) / 3600);
    l7.set(a.athlete_id, (l7.get(a.athlete_id) ?? 0) + (a.training_load ?? 0));
  }
  const lastBy = new Map<string, { start_date: string; discipline: string; name: string | null }>();
  for (const a of (lastActs ?? []) as { athlete_id: string; start_date: string; discipline: string; name: string | null }[]) if (!lastBy.has(a.athlete_id)) lastBy.set(a.athlete_id, a);
  const weeksBy = new Map<string, number>();
  for (const w of (weeks ?? []) as { athlete_id: string }[]) weeksBy.set(w.athlete_id, (weeksBy.get(w.athlete_id) ?? 0) + 1);
  const watchBy = new Map(((watch ?? []) as { athlete_id: string; note: string | null }[]).map((w) => [w.athlete_id, w.note]));
  const provBy = new Map(((provs ?? []) as { id: string; provider: string }[]).map((p) => [p.id, p.provider]));

  // Totale attività importate per atleta (storico).
  const totBy = new Map<string, number>();
  await Promise.all(ids.map(async (id) => {
    const { count } = await admin.from("icu_activities").select("id", { count: "exact", head: true }).eq("is_duplicate" as never, false as never).eq("athlete_id", id);
    totBy.set(id, count ?? 0);
  }));

  const [{ data: cRows }, { data: caRows }] = await Promise.all([
    admin.from("ai_coaches").select("user_id, display_name, club, invite_code"),
    admin.from("ai_coach_athletes").select("coach_id").eq("status", "active"),
  ]);
  const caN = new Map<string, number>();
  for (const r of (caRows ?? []) as { coach_id: string }[]) caN.set(r.coach_id, (caN.get(r.coach_id) ?? 0) + 1);
  const { data: frRows } = await createAdminClient().from("feature_requests" as never).select("id, athlete_id, request, status, created_at").order("created_at", { ascending: false }).limit(15);
  const featureReqs = (frRows ?? []) as { id: string; athlete_id: string; request: string; status: string; created_at: string }[];
  const coachesList = ((cRows ?? []) as { user_id: string; display_name: string; club: string | null; invite_code: string }[]).map((c) => ({ ...c, n: caN.get(c.user_id) ?? 0 }));
  const n = P_.length;
  const withIcu = P_.filter((p) => icuBy.has(p.id)).length;
  const active7 = P_.filter((p) => (h7.get(p.id) ?? 0) > 0).length;
  const new7 = P_.filter((p) => p.created_at >= since7).length;

  const ok = (b: boolean) => <span style={{ color: b ? "var(--lime, #c6f432)" : "var(--text-3, #6b737a)" }}>{b ? "●" : "○"}</span>;

  return (
    <div className="wrap" style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 16px 80px", fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="mono" style={{ color: "var(--lime, #c6f432)" }}>// PANNELLO DI CONTROLLO</span>
          <h1 style={{ margin: "6px 0 0" }}>24/7 Coach · atleti</h1>
        </div>
        <div className="mono" style={{ fontSize: ".78rem", display: "flex", gap: 14 }}>
          <Link href="/coach/view-as?clear=1">← La mia app</Link>
          <a href="/" >Sito</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, margin: "22px 0" }}>
        {[["Atleti", n], ["Nuovi 7gg", new7], ["Con Intervals", `${withIcu}/${n}`], ["Attivi 7gg", `${active7}/${n}`]].map(([l, v]) => (
          <div key={String(l)} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--lime, #c6f432)" }}>{v}</div>
            <div className="mono" style={{ fontSize: ".72rem", color: "var(--text-2)" }}>{l}</div>
          </div>
        ))}
      </div>

      {coachesList.length ? (
        <div className="card" style={{ marginBottom: 16, fontSize: ".8rem" }}>
          <b>Allenatori 247</b>
          {coachesList.map((c) => (
            <div key={c.user_id} style={{ marginTop: 4 }}>
              🧑‍🏫 {c.display_name}{c.club ? ` · ${c.club}` : ""} · {c.n} atleti · <span style={{ color: "var(--text-3)" }}>/invito/{c.invite_code}</span>
            </div>
          ))}
        </div>
      ) : null}
      <form action={announceToAthletes} className="card" style={{ marginBottom: 16, display: "grid", gap: 8 }}>
        <b>📣 Novità a tutti gli atleti 247 (ognuno dal suo coach, Telegram)</b>
        <span style={{ fontSize: ".78rem", color: "var(--text-3)" }}>Parte al giro orario successivo. La firma col nome del coach si aggiunge da sola; {"{coach}"} nel testo = nome del coach. Gli atleti di Irene non lo ricevono.</span>
        {annParam ? <span style={{ fontSize: ".82rem", color: annParam === "err" ? "#fb7185" : "#4ade80" }}>{annParam === "err" ? "Testo mancante" : `✓ In coda per ${annParam} atleti`}</span> : null}
        <textarea className="input" name="text" rows={5} placeholder="Novità: …" />
        <div><button className="btn btn-primary btn-sm" type="submit">Metti in coda</button></div>
      </form>

      {featureReqs.length ? (
        <div className="card" style={{ marginBottom: 16, fontSize: ".8rem" }}>
          <b>💡 Richieste e idee degli atleti</b>
          {featureReqs.map((f) => (
            <div key={f.id} style={{ marginTop: 4 }}>
              <span className="mono" style={{ color: "var(--text-3)" }}>{f.created_at.slice(0, 10)}</span> · {P_.find((p) => p.id === f.athlete_id)?.full_name ?? "atleta"} · {f.request} <span style={{ color: f.status === "nuova" ? "#fbbf24" : "#4ade80" }}>({f.status})</span>
            </div>
          ))}
        </div>
      ) : null}

      <form action={sendCoachTelegram} className="card" style={{ marginBottom: 16, display: "grid", gap: 8 }}>
        <b>✉️ Messaggio Telegram all'atleta (a nome del suo coach)</b>
        {tgParam ? <span style={{ fontSize: ".82rem", color: tgParam === "ok" ? "#4ade80" : "#fb7185" }}>{tgParam === "ok" ? "✓ Inviato" : tgParam === "nochat" ? "L'atleta non ha collegato Telegram" : "Invio non riuscito"}</span> : null}
        <select className="input" name="athlete_id" defaultValue="197d3996-58a8-4fe4-bc1f-564cf4ec1ce4">
          {P_.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
        </select>
        <textarea className="input" name="text" rows={6} defaultValue={"Buongiorno Luca! Ho fatto pulizia: su Intervals e sull'orologio adesso trovi solo il piano attuale, oggi c'è solo la mezza. Le attività doppie Garmin+Strava non contano più nei calcoli, quindi forma e fatica ora sono realistiche.\n\nOggi pensa solo a correre: partenza controllata, poi gestisci con la testa. Un grande in bocca al lupo per Portogruaro! 🏃💪"} />
        <div><button className="btn btn-primary btn-sm" type="submit">Invia</button></div>
      </form>

      <div className="mono" style={{ fontSize: ".76rem", color: "var(--text-3)", marginBottom: 12 }}>
        Link per un nuovo allenatore: https://247coachai.com/diventa-coach
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".8rem", minWidth: 1100 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-2)" }}>
              {["Atleta", "Iscritto", "Gara obiettivo", "Onb.", "Piano", "Intervals", "Storico", "Ultima attività", "7gg", "Settimane", "Note", ""].map((h) => (
                <th key={h} style={{ padding: "8px 6px", borderBottom: "1px solid var(--line, #22272c)", fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {P_.map((p) => {
              const a = aiBy.get(p.id); const c = icuBy.get(p.id); const r = raceBy.get(p.id); const la = lastBy.get(p.id);
              const watched = watchBy.has(p.id);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--line, #22272c)", verticalAlign: "top" }}>
                  <td style={{ padding: "8px 6px" }}>
                    <b>{p.full_name ?? "—"}</b> {watched ? <span title={watchBy.get(p.id) ?? ""}>👁</span> : null}
                    <div style={{ color: "var(--text-2)" }}>{p.email}</div>
                    <div style={{ color: "var(--text-3)" }}>{(p.lang ?? "it").toUpperCase()} · {provBy.get(p.id) ?? "email"}{a?.experience_level ? ` · ${a.experience_level}` : ""}</div>
                  </td>
                  <td style={{ padding: "8px 6px" }}>{fmt(p.created_at)}<div style={{ color: "var(--text-3)" }}>{ago(p.created_at)}</div></td>
                  <td style={{ padding: "8px 6px" }}>{r ? <>{r.name}<div style={{ color: "var(--text-3)" }}>{r.race_date}</div></> : "—"}{a?.goal_notes ? <div style={{ color: "var(--text-2)" }}>{a.goal_notes.slice(0, 60)}</div> : null}</td>
                  <td style={{ padding: "8px 6px" }}>{ok(Boolean(a?.onboarding_completed_at))}</td>
                  <td style={{ padding: "8px 6px" }}>{ok(Boolean(a?.plan_generated_at))}{a?.ai_last_error ? <div style={{ color: "#ff5d5d" }} title={a.ai_last_error}>errore AI</div> : null}</td>
                  <td style={{ padding: "8px 6px" }}>{ok(Boolean(c))}<div style={{ color: "var(--text-3)" }}>{c?.intervals_athlete_id ?? ""}</div></td>
                  <td style={{ padding: "8px 6px" }}>{totBy.get(p.id) ?? 0} att.</td>
                  <td style={{ padding: "8px 6px" }}>{la ? <>{la.discipline} · {ago(la.start_date)}<div style={{ color: "var(--text-3)" }}>{(la.name ?? "").slice(0, 28)}</div></> : "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{(h7.get(p.id) ?? 0).toFixed(1)} h<div style={{ color: "var(--text-3)" }}>load {Math.round(l7.get(p.id) ?? 0)}</div></td>
                  <td style={{ padding: "8px 6px" }}>{weeksBy.get(p.id) ?? 0}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <form action={toggleWatch}>
                      <input type="hidden" name="athlete_id" value={p.id} />
                      <button className="btn btn-ghost btn-sm" type="submit" title="Avviso Telegram dopo ogni allenamento">{watched ? "👁 Osservato" : "Osserva"}</button>
                    </form>
                  </td>
                  <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                    <a className="btn btn-primary btn-sm" href={`/coach/view-as?athlete=${p.id}`}>Apri tabella →</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mono" style={{ marginTop: 18, color: "var(--text-3)", fontSize: ".72rem" }}>
        &quot;Apri tabella&quot; ti fa entrare nell&apos;area dell&apos;atleta esattamente come la vede lui (settimana, mese, analisi, chat). Per tornare usa il menu in alto o &quot;La mia app&quot;. 👁 = avviso su Telegram dopo ogni allenamento.
      </p>
    </div>
  );
}
