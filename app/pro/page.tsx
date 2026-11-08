import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAiCoachMode } from "@/lib/ai/mode";
import { coachAthleteIds, getHumanCoach } from "@/lib/server/humanCoach";
import { loadReadiness } from "@/lib/server/readiness";
import { activateCoach } from "@/app/pro/actions";
import CopyField from "@/components/CopyField";

export const dynamic = "force-dynamic";

const ago = (iso: string) => {
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  return h < 1 ? "ora" : h < 24 ? `${Math.round(h)} h fa` : `${Math.round(h / 24)} g fa`;
};
const LV: Record<string, string> = { pronto: "#4ade80", moderato: "#c8e64a", basso: "#fbbf24", recupera: "#fb7185" };
const wrap = { maxWidth: 1180, margin: "0 auto", padding: "28px 16px 80px" } as const;

export default async function ProPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  if (!isAiCoachMode()) redirect("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { err } = await searchParams;
  const coach = await getHumanCoach(user.id);

  if (!coach) {
    return (
      <div style={wrap}>
        <span className="mono" style={{ color: "var(--lime, #c6f432)" }}>// 24/7 COACH PRO</span>
        <h1 style={{ margin: "6px 0 10px" }}>Area allenatori</h1>
        <p style={{ color: "var(--text-2)", maxWidth: 640, lineHeight: 1.6 }}>
          Segui i tuoi atleti con 24/7 Coach: l'AI costruisce e adatta le loro tabelle ogni giorno, tu vedi forma, prontezza, allenamenti svolti e piano, e dai le tue indicazioni al coach AI. Vedi solo gli atleti che accettano il tuo invito.
        </p>
        {err ? <p style={{ color: "#fb7185" }}>⚠️ {err === "name" ? "Inserisci il tuo nome." : err === "self" ? "Non puoi invitare te stesso." : err}</p> : null}
        <form action={activateCoach} className="card" style={{ display: "grid", gap: 10, maxWidth: 460, marginTop: 16 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: ".85rem", color: "var(--text-2)" }}>Nome che vedranno i tuoi atleti</span>
            <input className="input" name="display_name" required placeholder="es. Elisabetta Villa" />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: ".85rem", color: "var(--text-2)" }}>Squadra o società (facoltativo)</span>
            <input className="input" name="club" placeholder="es. Jesolo Triathlon" />
          </label>
          <button className="btn btn-primary" type="submit">Attiva l'area coach</button>
        </form>
      </div>
    );
  }

  const admin = createAdminClient();
  const ids = await coachAthleteIds(coach.user_id);
  const invite = `https://247coachai.com/invito/${coach.invite_code}`;
  const today = new Date().toISOString().slice(0, 10);
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: profs }, { data: races }, { data: acts }, { data: ais }] = ids.length
    ? await Promise.all([
        admin.from("profiles").select("id, full_name, email").in("id", ids),
        admin.from("races").select("athlete_id, name, race_date, priority, target_time").in("athlete_id", ids).gte("race_date", today).order("race_date"),
        admin.from("icu_activities").select("athlete_id, start_date, discipline, name, moving_time_s, training_load").eq("is_duplicate" as never, false as never).in("athlete_id", ids).gte("start_date", since7).order("start_date", { ascending: false }),
        admin.from("ai_athlete_profiles").select("athlete_id, coach_directives, ai_last_error, plan_generated_at").in("athlete_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const readiness = new Map(await Promise.all(ids.map(async (id) => [id, await loadReadiness(admin as never, id).catch(() => null)] as const)));
  const raceBy = new Map<string, { name: string; race_date: string; target_time: string | null }>();
  for (const r of (races ?? []) as { athlete_id: string; name: string; race_date: string; priority: string | null; target_time: string | null }[]) {
    const cur = raceBy.get(r.athlete_id);
    if (!cur || r.priority === "A") raceBy.set(r.athlete_id, r);
  }
  const actsBy = new Map<string, { start_date: string; discipline: string; name: string | null; moving_time_s: number | null; training_load: number | null }[]>();
  for (const a of (acts ?? []) as { athlete_id: string; start_date: string; discipline: string; name: string | null; moving_time_s: number | null; training_load: number | null }[]) {
    actsBy.set(a.athlete_id, [...(actsBy.get(a.athlete_id) ?? []), a]);
  }
  const aiBy = new Map(((ais ?? []) as { athlete_id: string; coach_directives: string | null; ai_last_error: string | null }[]).map((a) => [a.athlete_id, a]));
  const P = ((profs ?? []) as { id: string; full_name: string | null; email: string | null }[]).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));

  return (
    <div style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="mono" style={{ color: "var(--lime, #c6f432)" }}>// 24/7 COACH PRO{coach.club ? ` · ${coach.club.toUpperCase()}` : ""}</span>
          <h1 style={{ margin: "6px 0 0" }}>I tuoi atleti · {coach.display_name}</h1>
        </div>
        <div className="mono" style={{ fontSize: ".78rem", display: "flex", gap: 14 }}>
          <Link href="/atleta">La mia app atleta</Link>
          <a href="/it">Sito</a>
        </div>
      </div>

      <div className="card" style={{ margin: "18px 0", display: "grid", gap: 8 }}>
        <b>Invita un atleta</b>
        <span style={{ fontSize: ".85rem", color: "var(--text-2)" }}>
          Manda questo link: l'atleta si registra (o accede) e accetta di farsi seguire da te. Vedi solo chi accetta, e l'atleta può togliere l'accesso quando vuole.
        </span>
        <CopyField value={invite} />
      </div>

      {!P.length ? (
        <p style={{ color: "var(--text-2)" }}>Ancora nessun atleta: manda il link di invito qui sopra.</p>
      ) : (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {P.map((p) => {
            const r = readiness.get(p.id);
            const race = raceBy.get(p.id);
            const a7 = actsBy.get(p.id) ?? [];
            const h7 = a7.reduce((s, a) => s + (a.moving_time_s ?? 0), 0) / 3600;
            const last = a7[0];
            const ai = aiBy.get(p.id);
            const weeks = race ? Math.max(0, Math.round((new Date(race.race_date).getTime() - Date.now()) / (7 * 864e5))) : null;
            return (
              <Link key={p.id} href={`/pro/atleta/${p.id}`} className="card" style={{ color: "inherit", textDecoration: "none", display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <b style={{ fontSize: "1.02rem" }}>{p.full_name ?? p.email}</b>
                    <div style={{ fontSize: ".78rem", color: "var(--text-3)" }}>{race ? `${race.name} · ${race.race_date}${weeks != null ? ` · ${weeks} sett.` : ""}` : "nessuna gara"}</div>
                  </div>
                  {r ? (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: LV[r.level], lineHeight: 1 }}>{r.score}</div>
                      <div style={{ fontSize: ".64rem", color: LV[r.level], textTransform: "uppercase" }}>{r.level}</div>
                    </div>
                  ) : <span style={{ fontSize: ".72rem", color: "var(--text-3)" }}>prontezza n.d.</span>}
                </div>
                <div className="mono" style={{ fontSize: ".78rem", color: "var(--text-2)" }}>
                  7 gg: {h7.toFixed(1)} h · {a7.length} allenamenti
                </div>
                <div style={{ fontSize: ".78rem", color: "var(--text-3)" }}>
                  {last ? `Ultimo: ${last.discipline} · ${(last.name ?? "").slice(0, 30)} · ${ago(last.start_date)}` : "Nessun allenamento negli ultimi 7 giorni"}
                </div>
                {ai?.coach_directives ? <div style={{ fontSize: ".76rem", color: "#67e8f9" }}>📝 {ai.coach_directives.slice(0, 80)}{ai.coach_directives.length > 80 ? "…" : ""}</div> : null}
                {ai?.ai_last_error ? <div style={{ fontSize: ".76rem", color: "#fb7185" }}>⚠️ ultima generazione non riuscita</div> : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
