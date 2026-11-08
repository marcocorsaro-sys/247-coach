// Percorso guidato al primo accesso (24/7 Coach). Richiamabile da "Guida".
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAiCoachMode } from "@/lib/ai/mode";
import { BRAND_DOT, BRAND_NAME } from "@/lib/branding";
import Wizard, { type WizardRace } from "./Wizard";
import { saveWelcome } from "./actions";
import { getT } from "@/lib/app-i18n/server";

const secToPace = (s: number | null | undefined) =>
  s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "";
const str = (v: unknown) => (v == null ? "" : String(v));

export default async function Benvenuto() {
  if (!isAiCoachMode()) redirect("/atleta");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { t } = await getT();

  const [{ data: prof }, { data: fitData }, { data: aiData }, { data: racesData }, { data: conn }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("athlete_fitness").select("*").eq("athlete_id", user.id).maybeSingle(),
    supabase.from("ai_athlete_profiles" as never).select("*").eq("athlete_id", user.id).maybeSingle(),
    supabase.from("races").select("id, name, race_date, distance_label, target_time, priority").eq("athlete_id", user.id).gte("race_date", new Date().toISOString().slice(0, 10)).order("race_date"),
    supabase.from("intervals_connections" as never).select("athlete_id").eq("athlete_id", user.id).maybeSingle(),
  ]);
  const fitRow = (fitData ?? {}) as Record<string, unknown>;
  const ai = (aiData ?? {}) as Record<string, unknown>;
  const fit: Record<string, string> = {
    birth_date: str(fitRow.birth_date), height_cm: str(fitRow.height_cm), weight_kg: str(fitRow.weight_kg),
    body_fat_pct: str(fitRow.body_fat_pct), resting_hr: str(fitRow.resting_hr), max_hr: str(fitRow.max_hr),
    lthr: str(fitRow.lthr), ftp_watts: str(fitRow.ftp_watts), threshold_pace: secToPace(fitRow.threshold_pace_run_s_per_km as number | null),
  };
  const aiStr: Record<string, string> = Object.fromEntries(Object.entries(ai).map(([k, v]) => [k, str(v)]));
  const firstName = ((prof as { full_name: string | null } | null)?.full_name ?? "").split(" ")[0] || t("atleta");

  return (
    <div className="wrap-tight" style={{ maxWidth: 820 }}>
      <nav className="topnav">
        <div className="brand">
          <Link href="/atleta" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
            <span className="dot">{BRAND_DOT}</span>
            <span className="name">{BRAND_NAME}<em>.</em></span>
          </Link>
          <span className="mono" style={{ marginLeft: 14 }}>{t("// BENVENUTO")}</span>
        </div>
        <div className="nav-right">
          {ai.tour_completed_at ? <Link className="btn btn-subtle btn-sm" href="/atleta">{t("← Torna")}</Link> : null}
          <form action="/auth/signout" method="post"><button className="btn btn-subtle btn-sm" type="submit">{t("Esci")}</button></form>
        </div>
      </nav>
      <Wizard
        action={saveWelcome}
        data={{
          firstName,
          fit,
          ai: aiStr,
          races: (racesData ?? []) as unknown as WizardRace[],
          hasIntervals: !!conn,
          hasPlan: !!ai.plan_generated_at,
        }}
      />
    </div>
  );
}
