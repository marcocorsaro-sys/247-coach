import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCoachAccess } from "@/lib/server/viewAs";
import type { Tables } from "@/supabase/database.types";
import CoachNav from "@/components/CoachNav";

const AV = ["av-violet", "av-amber", "av-cyan", "av-orange", "av-rose", "av-lime"];
const GIORNI = [
  "DOMENICA",
  "LUNEDÌ",
  "MARTEDÌ",
  "MERCOLEDÌ",
  "GIOVEDÌ",
  "VENERDÌ",
  "SABATO",
];
const MESI = [
  "GENNAIO",
  "FEBBRAIO",
  "MARZO",
  "APRILE",
  "MAGGIO",
  "GIUGNO",
  "LUGLIO",
  "AGOSTO",
  "SETTEMBRE",
  "OTTOBRE",
  "NOVEMBRE",
  "DICEMBRE",
];
const MESI_SHORT = [
  "gen",
  "feb",
  "mar",
  "apr",
  "mag",
  "giu",
  "lug",
  "ago",
  "set",
  "ott",
  "nov",
  "dic",
];

function initials(name: string | null, email: string): string {
  const base = (name || email).trim();
  const parts = base.split(/\s+/);
  const ini = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (ini || base.slice(0, 2)).toUpperCase();
}

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(d).getTime() - t.getTime()) / 86_400_000);
}

function fmtDay(d: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getDate()} ${MESI_SHORT[dt.getMonth()]}`;
}

export default async function CoachDashboard({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const { imported } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Nome del coach e controllo d'accesso: due letture indipendenti, insieme.
  const [{ data: profileData }, coachAccess] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
    resolveCoachAccess(supabase, user.id),
  ]);
  const profile = profileData as unknown as Pick<
    Tables<"profiles">,
    "full_name" | "role"
  > | null;
  if (!coachAccess.allowed) redirect("/atleta");
  const coachId = coachAccess.coachId!;

  const { data: relData } = await supabase
    .from("coaching_relationships")
    .select("athlete_id")
    .eq("coach_id", coachId)
    .eq("active", true);
  const ids = ((relData ?? []) as unknown as { athlete_id: string }[]).map(
    (r) => r.athlete_id,
  );

  type P = Pick<Tables<"profiles">, "id" | "full_name" | "email" | "level">;
  type R = Pick<Tables<"races">, "athlete_id" | "name" | "race_date" | "location">;
  type W = Pick<Tables<"training_weeks">, "id" | "athlete_id" | "status" | "week_start">;
  type C = { id: string; author_id: string; body: string; created_at: string };

  let athletes: P[] = [];
  let races: R[] = [];
  let weeks: W[] = [];
  let comments: C[] = [];
  let sessionCount = 0;

  if (ids.length > 0) {
    const [a, r, w, c] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, level").in("id", ids),
      supabase
        .from("races")
        .select("athlete_id, name, race_date, location")
        .in("athlete_id", ids),
      supabase
        .from("training_weeks")
        .select("id, athlete_id, status, week_start")
        .in("athlete_id", ids),
      supabase
        .from("comments")
        .select("id, author_id, body, created_at")
        .in("author_id", ids)
        .order("created_at", { ascending: false }),
    ]);
    athletes = (a.data ?? []) as unknown as P[];
    races = (r.data ?? []) as unknown as R[];
    weeks = (w.data ?? []) as unknown as W[];
    comments = (c.data ?? []) as unknown as C[];

    const weekIds = weeks.map((x) => x.id);
    if (weekIds.length > 0) {
      const { count } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .in("week_id", weekIds);
      sessionCount = count ?? 0;
    }
  }

  const publishedWeeks = weeks.filter((w) => w.status === "published").length;
  const feedbackTotal = comments.length;
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "coach";
  const now = new Date();
  const nameById = new Map(athletes.map((a) => [a.id, a.full_name ?? a.email]));

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const coversToday = (ws: string) => {
    const s = new Date(ws);
    s.setHours(0, 0, 0, 0);
    const diff = Math.round((today0.getTime() - s.getTime()) / 86_400_000);
    return diff >= 0 && diff <= 6;
  };

  const nextRace = (aid: string) =>
    races
      .filter((x) => x.athlete_id === aid)
      .sort((a, b) => (a.race_date ?? "").localeCompare(b.race_date ?? ""))[0];
  const weekCount = (aid: string) => weeks.filter((w) => w.athlete_id === aid).length;
  const publishedCount = (aid: string) =>
    weeks.filter((w) => w.athlete_id === aid && w.status === "published").length;
  const draftCount = (aid: string) =>
    weeks.filter((w) => w.athlete_id === aid && w.status === "draft").length;
  const hasThisWeek = (aid: string) =>
    weeks.some(
      (w) => w.athlete_id === aid && w.status === "published" && coversToday(w.week_start),
    );
  const fbCount = (aid: string) => comments.filter((c) => c.author_id === aid).length;

  return (
    <div className="wrap">
      <CoachNav label="DASHBOARD" />

      {imported ? (
        <div className="pill ok" style={{ marginBottom: 20 }}>
          ✓ Importate {imported}
        </div>
      ) : null}

      <div className="hero">
        <div>
          <span className="mono">
            // {GIORNI[now.getDay()]} {now.getDate()} {MESI[now.getMonth()]}{" "}
            {now.getFullYear()} · BUONGIORNO
          </span>
          <h1>
            Buongiorno <em>{firstName}</em>.
          </h1>
          <p>
            Hai {athletes.length}{" "}
            {athletes.length === 1 ? "atleta attivo" : "atleti attivi"},{" "}
            {publishedWeeks}{" "}
            {publishedWeeks === 1 ? "tabella pubblicata" : "tabelle pubblicate"} e{" "}
            {feedbackTotal} {feedbackTotal === 1 ? "feedback" : "feedback"} da
            leggere.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="btn btn-ghost" href="/coach/importa">
            ↑ Importa Excel
          </Link>
          <Link className="btn btn-primary" href="/coach/atleti">
            + Nuovo atleta
          </Link>
        </div>
      </div>

      <div className="bento-4">
        <div className="card kpi">
          <div className="v lime">{athletes.length}</div>
          <div className="l">
            Atleti
            <br />
            attivi
          </div>
        </div>
        <div className="card kpi">
          <div className="v">{sessionCount}</div>
          <div className="l">
            Sessioni
            <br />
            pianificate
          </div>
        </div>
        <div className="card kpi">
          <div className="v">{publishedWeeks}</div>
          <div className="l">
            Tabelle
            <br />
            pubblicate
          </div>
        </div>
        <div
          className="card kpi"
          style={{
            background:
              "linear-gradient(135deg,rgba(251,113,133,.10),rgba(251,113,133,.04))",
          }}
        >
          <div className="v rose">{feedbackTotal}</div>
          <div className="l">
            Feedback
            <br />
            da leggere
          </div>
        </div>
      </div>

      <h2 className="sec">
        <span className="l">Atleti del team</span>
      </h2>

      {athletes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessun atleta collegato ancora.
        </div>
      ) : (
        <div className="grid-3">
          {athletes.map((a, i) => {
            const race = nextRace(a.id);
            const d = race ? daysUntil(race.race_date) : null;
            const drafts = draftCount(a.id);
            const thisWeek = hasThisWeek(a.id);
            return (
              <div className="ath-card card-hover" key={a.id}>
                <div className="head">
                  <Link
                    href={`/coach/atleta/${a.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}
                  >
                    <div
                      className={`ava avatar ${AV[i % AV.length]}`}
                      style={{ width: 42, height: 42, borderRadius: 12 }}
                    >
                      {initials(a.full_name, a.email)}
                    </div>
                    <span className="name" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.full_name ?? a.email}
                    </span>
                  </Link>
                  {!thisWeek ? (
                    <span className="pill warn" title="Nessuna tabella pubblicata per questa settimana">
                      Settimana scoperta
                    </span>
                  ) : drafts > 0 ? (
                    <span className="pill warn" title="Ci sono bozze non pubblicate">
                      {drafts} {drafts === 1 ? "bozza" : "bozze"}
                    </span>
                  ) : (
                    <span className="pill ok">In regola</span>
                  )}
                </div>
                <div className="meta">
                  {race
                    ? `🎯 ${race.name} · ${fmtDay(race.race_date)}${
                        d !== null ? ` — fra ${d} giorni` : ""
                      }`
                    : a.level
                      ? `Livello: ${a.level}`
                      : "Nessuna gara obiettivo"}
                </div>
                <div className="stats">
                  <div>
                    <div className="v lime">{publishedCount(a.id)}</div>
                    <div className="l">Pubblicate</div>
                  </div>
                  <div>
                    <div className="v">{weekCount(a.id)}</div>
                    <div className="l">Tabelle</div>
                  </div>
                  <div>
                    <div className="v rose">{fbCount(a.id)}</div>
                    <div className="l">Feedback</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Link className="btn btn-subtle btn-sm" href={`/coach/atleta/${a.id}`}>
                    Apri scheda →
                  </Link>
                  <Link className="btn btn-ghost btn-sm" href={`/coach/importa?athlete=${a.id}`}>
                    ↑ Importa
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {comments.length > 0 ? (
        <>
          <h2 className="sec">
            <span className="l">Feedback recenti</span>
          </h2>
          <div className="grid-2">
            {comments.slice(0, 4).map((c, i) => (
              <div className="card" key={c.id}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div className={`avatar ${AV[i % AV.length]}`}>
                    {initials(nameById.get(c.author_id) ?? null, "A")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>{nameById.get(c.author_id) ?? "Atleta"}</strong>
                      <span className="mono">{fmtDay(c.created_at)}</span>
                    </div>
                    <p
                      style={{
                        fontSize: ".88rem",
                        color: "var(--text-2)",
                        lineHeight: 1.5,
                        marginTop: 8,
                      }}
                    >
                      {c.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
