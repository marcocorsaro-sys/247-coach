import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAiCoachMode } from "@/lib/ai/mode";
import { getHumanCoach, isCoachOf } from "@/lib/server/humanCoach";
import { computeForm } from "@/lib/ai/fitness";
import { getT } from "@/lib/app-i18n/server";
import ReadinessCard from "@/components/ReadinessCard";
import PerformancePanel from "@/components/PerformancePanel";
import { describeSteps, type StepLite } from "@/lib/training/describe";
import type { Discipline, Fitness } from "@/lib/training/zones";
import { removeAthlete, saveDirectives } from "@/app/pro/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const ICON: Record<string, string> = { swim: "🏊", bike: "🚴", run: "🏃", athletics: "🏃", other: "💪" };
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const monday = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const dur = (s: number | null) => (s ? (s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.round((s % 3600) / 60)).padStart(2, "0")}` : `${Math.round(s / 60)}'`) : "");
const fmtP = (s: number | null | undefined, u: string) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}${u}` : "—");

export default async function ProAthletePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  if (!isAiCoachMode()) redirect("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { saved } = await searchParams;
  const coach = await getHumanCoach(user.id);
  // Sicurezza: solo atleti che hanno accettato QUESTO coach.
  if (!coach || !(await isCoachOf(coach.user_id, id))) redirect("/pro");

  const admin = createAdminClient();
  const { t } = await getT();
  const mon = monday();
  const [{ data: p }, { data: ai }, { data: fit }, { data: races }, { data: wks }, { data: acts }, { data: fb }] = await Promise.all([
    admin.from("profiles").select("full_name, email").eq("id", id).maybeSingle(),
    admin.from("ai_athlete_profiles").select("*").eq("athlete_id", id).maybeSingle(),
    admin.from("athlete_fitness").select("*").eq("athlete_id", id).maybeSingle(),
    admin.from("races").select("name, race_date, priority, distance_label, target_time").eq("athlete_id", id).gte("race_date", new Date().toISOString().slice(0, 10)).order("race_date"),
    admin.from("training_weeks").select("id, week_start, coach_comment").eq("athlete_id", id).eq("status", "published").gte("week_start", mon).lte("week_start", addDays(mon, 7)).order("week_start"),
    admin.from("icu_activities").select("start_date, discipline, name, distance_m, moving_time_s, average_heartrate, average_watts, training_load").eq("is_duplicate" as never, false as never).eq("athlete_id", id).gte("start_date", new Date(Date.now() - 14 * 864e5).toISOString()).order("start_date", { ascending: false }).limit(60),
    admin.from("ai_feedback").select("created_at, message, coach_reply, decision").eq("athlete_id", id).order("created_at", { ascending: false }).limit(8),
  ]);
  const prof = (p ?? {}) as { full_name?: string | null; email?: string | null };
  const a = (ai ?? {}) as Record<string, unknown>;
  const f = (fit ?? {}) as Fitness & Record<string, unknown>;
  const weeks = (wks ?? []) as { id: string; week_start: string; coach_comment: string | null }[];
  const { data: ss } = weeks.length
    ? await admin.from("sessions").select("id, week_id, day_of_week, discipline, title, volume_value, notes, sort_order").in("week_id", weeks.map((w) => w.id)).order("day_of_week")
    : { data: [] };
  const sess = (ss ?? []) as { id: string; week_id: string; day_of_week: number; discipline: string; title: string | null; volume_value: string | null; notes: string | null; sort_order: number | null }[];
  const { data: st } = sess.length ? await admin.from("session_steps").select("*").in("session_id", sess.map((s) => s.id)) : { data: [] };
  const steps = new Map<string, StepLite[]>();
  for (const x of (st ?? []) as (StepLite & { session_id: string })[]) steps.set(x.session_id, [...(steps.get(x.session_id) ?? []), x]);
  const form = await computeForm(admin as never, id).catch(() => null);
  const seen = new Set<string>();
  const A = ((acts ?? []) as { start_date: string; discipline: string; name: string | null; distance_m: number | null; moving_time_s: number | null; average_heartrate: number | null; average_watts: number | null; training_load: number | null }[])
    .filter((x) => { const k = `${x.start_date.slice(0, 16)}|${x.discipline}`; if (seen.has(k) || (!x.distance_m && !x.moving_time_s)) return false; seen.add(k); return true; });

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 16px 80px" }}>
      <Link href="/pro" className="mono" style={{ fontSize: ".8rem" }}>← I tuoi atleti</Link>
      <h1 style={{ margin: "8px 0 4px" }}>{prof.full_name ?? prof.email}</h1>
      <div style={{ color: "var(--text-2)", fontSize: ".88rem", marginBottom: 14 }}>
        {((races ?? []) as { name: string; race_date: string; priority: string | null; target_time: string | null }[]).map((r) => `${r.priority ? `[${r.priority}] ` : ""}${r.name} ${r.race_date}${r.target_time ? ` · obiettivo ${r.target_time}` : ""}`).join(" · ") || "Nessuna gara in calendario"}
        <div className="mono" style={{ fontSize: ".76rem", color: "var(--text-3)", marginTop: 4 }}>
          FTP {f.ftp_watts ?? "—"} W · FC soglia {f.lthr ?? "—"} · FC max {f.max_hr ?? "—"} · soglia corsa {fmtP(f.threshold_pace_run_s_per_km as number | null, "/km")} · CSS {fmtP(f.css_swim_s_per_100m as number | null, "/100m")} · {String(a.availability_hours ?? "?")} h/sett.
          {a.shadow_plan ? " · TABELLA OMBRA" : ""}
        </div>
      </div>

      <ReadinessCard athleteId={id} t={t} form={form} />

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", alignItems: "start" }}>
        <div className="card" id="indicazioni">
          <b>📝 Le tue indicazioni a {(a.coach_name as string | null)?.trim() || "coach AI"} <span style={{ fontWeight: 400, color: "var(--text-3)", fontSize: ".8rem" }}>(il coach AI di {prof.full_name?.split(" ")[0] ?? "questo atleta"})</span></b>
          <p style={{ fontSize: ".82rem", color: "var(--text-2)", margin: "6px 0 8px", lineHeight: 1.5 }}>
            Il coach AI le segue con priorità a ogni revisione (settimanale, adattamento quotidiano, richieste dell'atleta). Es.: "niente ripetute in salita fino a fine mese", "lunghi bici il sabato", "massimo 9 h/settimana", "test FTP la settimana prossima".
          </p>
          {saved ? <div style={{ color: "#4ade80", fontSize: ".85rem", marginBottom: 6 }}>✓ Salvato{saved ? "" : ""}</div> : null}
          <form action={saveDirectives} style={{ display: "grid", gap: 8 }}>
            <input type="hidden" name="athlete_id" value={id} />
            <textarea className="input" name="directives" rows={6} defaultValue={(a.coach_directives as string | null) ?? ""} placeholder="Scrivi qui le tue indicazioni…" />
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".85rem" }}>
              <input type="checkbox" name="regen" defaultChecked /> Rivedi subito la tabella con queste indicazioni (2-4 minuti)
            </label>
            <div><button className="btn btn-primary btn-sm" type="submit">Salva</button></div>
          </form>
          {a.coach_directives_at ? <div style={{ fontSize: ".72rem", color: "var(--text-3)", marginTop: 6 }}>Ultimo aggiornamento {String(a.coach_directives_at).slice(0, 16).replace("T", " ")}</div> : null}
        </div>

        <div className="card">
          <b>🏃 Allenamenti svolti · 14 giorni</b>
          <div style={{ display: "grid", gap: 4, marginTop: 8, fontSize: ".82rem" }}>
            {A.length ? A.map((x, i) => (
              <div key={i} style={{ display: "flex", gap: 8, borderBottom: "1px solid rgba(255,255,255,.05)", padding: "3px 0" }}>
                <span className="mono" style={{ color: "var(--text-3)", minWidth: 78 }}>{x.start_date.slice(5, 10)} {x.start_date.slice(11, 16)}</span>
                <span>{ICON[x.discipline] ?? "•"}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
                <span className="mono" style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>
                  {[dur(x.moving_time_s), x.distance_m ? `${(x.distance_m / 1000).toFixed(1)}km` : "", x.average_heartrate ? `♥${Math.round(x.average_heartrate)}` : "", x.average_watts ? `${Math.round(x.average_watts)}W` : ""].filter(Boolean).join(" · ")}
                </span>
              </div>
            )) : <span style={{ color: "var(--text-3)" }}>Nessun allenamento (Intervals collegato?)</span>}
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 22 }}>Tabella · questa settimana e la prossima</h2>
      {weeks.length ? weeks.map((w) => (
        <div key={w.id} className="card" style={{ marginBottom: 10 }}>
          <b>Settimana del {w.week_start}</b>
          {w.coach_comment ? <div style={{ fontSize: ".82rem", color: "var(--text-2)", margin: "4px 0 8px" }}>{w.coach_comment}</div> : null}
          <div style={{ display: "grid", gap: 6 }}>
            {sess.filter((s) => s.week_id === w.id).map((s) => (
              <details key={s.id} style={{ fontSize: ".86rem" }}>
                <summary style={{ cursor: "pointer" }}>
                  <span className="mono" style={{ color: "var(--text-3)" }}>{GIORNI[s.day_of_week]} {addDays(w.week_start, s.day_of_week).slice(5)}</span> {ICON[s.discipline] ?? "•"} <b>{s.title}</b> <span className="mono" style={{ color: "var(--text-2)" }}>{s.volume_value}</span>
                </summary>
                <div style={{ padding: "6px 0 6px 18px", color: "var(--text-2)", fontSize: ".82rem", lineHeight: 1.5 }}>
                  {describeSteps(steps.get(s.id) ?? [], (s.discipline as Discipline) ?? "other", f).map((b, i) => (
                    <div key={i}>• {b.label}{b.detail ? `: ${b.detail}` : ""}{(b.children ?? []).map((c, j) => <div key={j} style={{ paddingLeft: 14 }}>– {c.label}{c.detail ? `: ${c.detail}` : ""}</div>)}</div>
                  ))}
                  {s.notes ? <div style={{ marginTop: 4, fontStyle: "italic" }}>{s.notes}</div> : null}
                </div>
              </details>
            ))}
          </div>
        </div>
      )) : <p style={{ color: "var(--text-2)" }}>Nessuna tabella pubblicata per queste settimane.</p>}

      <h2 style={{ marginTop: 22 }}>Conversazione con {(a.coach_name as string | null)?.trim() || "il coach AI"}</h2>
      <div className="card" style={{ display: "grid", gap: 8, fontSize: ".84rem" }}>
        {((fb ?? []) as { created_at: string; message: string; coach_reply: string | null; decision: string | null }[]).map((m, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.05)", paddingBottom: 6 }}>
            <div className="mono" style={{ fontSize: ".72rem", color: "var(--text-3)" }}>{m.created_at.slice(0, 16).replace("T", " ")}{m.decision ? ` · ${m.decision}` : ""}</div>
            <div><b>Atleta:</b> {m.message}</div>
            {m.coach_reply ? <div style={{ color: "var(--text-2)" }}><b>{(a.coach_name as string | null)?.trim() || "AI"}:</b> {m.coach_reply}</div> : null}
          </div>
        ))}
        {!(fb ?? []).length ? <span style={{ color: "var(--text-3)" }}>Nessun messaggio.</span> : null}
      </div>

      <h2 style={{ marginTop: 22 }}>Storico gare e proiezione</h2>
      <PerformancePanel athleteId={id} t={t} />

      <form action={removeAthlete} style={{ marginTop: 28 }}>
        <input type="hidden" name="athlete_id" value={id} />
        <button className="btn btn-subtle btn-sm" type="submit">Smetti di seguire questo atleta</button>
      </form>
    </div>
  );
}
