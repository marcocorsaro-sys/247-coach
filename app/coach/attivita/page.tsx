import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessCoachArea } from "@/lib/server/viewAs";
import CoachNav from "@/components/CoachNav";

const MESI_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

interface ActivityRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  last_sign_in_at: string | null;
  account_created: string | null;
  weeks_total: number;
  weeks_published: number;
  sessions_total: number;
  logs_count: number;
  last_log_at: string | null;
  comments_count: number;
  last_comment_at: string | null;
}

function initials(name: string | null, email: string | null): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "") || base.slice(0, 2)).toUpperCase();
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "mai";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MESI_SHORT[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

function fmtAgo(iso: string | null): string {
  if (!iso) return "—";
  const now = Date.now();
  const t = new Date(iso).getTime();
  const days = Math.floor((now - t) / 86_400_000);
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 30) return `${days} giorni fa`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 mese fa" : `${months} mesi fa`;
}

const AV = ["av-lime", "av-violet", "av-amber", "av-cyan", "av-orange", "av-rose"];

export default async function CoachActivity() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await canAccessCoachArea(supabase, user.id))) redirect("/atleta");

  // .bind preserva il `this` del client (richiesto da supabase-js a runtime).
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data } = await rpc("coach_activity");
  const rows = (data ?? []) as ActivityRow[];

  const coach = rows.find((r) => r.role === "coach");
  const athletes = rows.filter((r) => r.role !== "coach");

  const Card = ({ r, i }: { r: ActivityRow; i: number }) => (
    <div className="card" key={r.id}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div className={`avatar ${AV[i % AV.length]}`}>{initials(r.full_name, r.email)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{r.full_name ?? r.email}</strong>
          <div className="mono" style={{ color: "var(--text-2)", fontSize: ".78rem" }}>
            {r.email}
          </div>
        </div>
        <span className={`pill ${r.role === "coach" ? "violet pill-plain" : r.last_sign_in_at ? "ok" : "warn"}`}>
          {r.role === "coach" ? "Coach" : r.last_sign_in_at ? `Accesso ${fmtAgo(r.last_sign_in_at)}` : "Mai entrato"}
        </span>
      </div>

      <div className="stats" style={{ marginTop: 14 }}>
        <div>
          <div className="v lime">{r.weeks_published}/{r.weeks_total}</div>
          <div className="l">Tabelle pubbl.</div>
        </div>
        <div>
          <div className="v">{r.sessions_total}</div>
          <div className="l">Sessioni</div>
        </div>
        <div>
          <div className="v">{r.logs_count}</div>
          <div className="l">Completati</div>
        </div>
        <div>
          <div className="v rose">{r.comments_count}</div>
          <div className="l">Feedback</div>
        </div>
      </div>

      <div className="mono" style={{ color: "var(--text-2)", fontSize: ".76rem", marginTop: 12, lineHeight: 1.7 }}>
        Ultimo accesso: <strong style={{ color: "var(--text)" }}>{fmtWhen(r.last_sign_in_at)}</strong>
        <br />
        Account dal {fmtWhen(r.account_created)}
        {r.last_log_at ? ` · ultimo allenamento svolto ${fmtAgo(r.last_log_at)}` : ""}
        {r.last_comment_at ? ` · ultimo feedback ${fmtAgo(r.last_comment_at)}` : ""}
      </div>
    </div>
  );

  return (
    <div className="wrap-tight">
      <CoachNav label="ATTIVITÀ" />

      <div className="hero">
        <div>
          <span className="mono">// LOG &amp; ATTIVITÀ</span>
          <h1>
            Accessi e <em>attività</em>.
          </h1>
          <p>Ultimo accesso e attività tua e di ogni atleta collegato.</p>
        </div>
      </div>

      {coach ? (
        <>
          <h2 className="sec">
            <span className="l">Tu</span>
          </h2>
          <Card r={coach} i={0} />
        </>
      ) : null}

      <h2 className="sec">
        <span className="l">Atleti ({athletes.length})</span>
      </h2>
      {athletes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessun atleta collegato.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {athletes.map((r, i) => (
            <Card r={r} i={i + 1} key={r.id} />
          ))}
        </div>
      )}
    </div>
  );
}
