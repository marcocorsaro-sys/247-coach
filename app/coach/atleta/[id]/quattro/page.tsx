import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessCoachArea } from "@/lib/server/viewAs";
import CoachNav from "@/components/CoachNav";
import WeeksGrid from "@/app/atleta/mese/WeeksGrid";
import { weekWindow, loadMonthItems } from "@/lib/server/month";
import { toISODate } from "@/lib/training/weeks";

export default async function CoachAthleteFourWeeks({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!(await canAccessCoachArea(supabase, user.id))) redirect("/atleta");

  const { data: athData } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", id)
    .single();
  const ath = athData as unknown as { full_name: string | null; email: string } | null;
  if (!ath) redirect("/coach");

  const today = new Date();
  const win = weekWindow(today, 4);
  // Il coach vede anche le bozze (l'intera pianificazione delle 4 settimane).
  const itemsByDate = await loadMonthItems(supabase, id, win, { publishedOnly: false });

  return (
    <div className="wrap-tight">
      <CoachNav
        label="4 SETTIMANE"
        crumbs={[
          { href: "/coach/atleti", label: "Atleti" },
          { href: `/coach/atleta/${id}`, label: ath.full_name ?? ath.email },
          { label: "4 settimane" },
        ]}
      />

      <div className="hero">
        <div>
          <span className="mono">// VISTA 4 SETTIMANE</span>
          <h1>{ath.full_name ?? ath.email}</h1>
          <p>Settimana corrente e 3 successive — bozze comprese. Tocca un giorno per il dettaglio.</p>
        </div>
      </div>

      <WeeksGrid itemsByDate={itemsByDate} todayISO={toISODate(today)} weekStarts={win.weekStarts} />
    </div>
  );
}
