import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessCoachArea } from "@/lib/server/viewAs";
import CoachNav from "@/components/CoachNav";
import MonthGrid from "@/app/atleta/mese/MonthGrid";
import { monthWindow, loadMonthItems } from "@/lib/server/month";
import { toISODate } from "@/lib/training/weeks";
import { addSessionOnDate } from "../actions";

export default async function CoachAthleteMonth({
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
  const win = monthWindow(today);
  // Il coach vede anche le bozze (l'intera pianificazione del mese).
  const itemsByDate = await loadMonthItems(supabase, id, win, { publishedOnly: false });

  return (
    <div className="wrap-tight">
      <CoachNav
        label="MESE"
        crumbs={[
          { href: "/coach/atleti", label: "Atleti" },
          { href: `/coach/atleta/${id}`, label: ath.full_name ?? ath.email },
          { label: "Mese" },
        ]}
      />

      <div className="hero">
        <div>
          <span className="mono">// VISTA MENSILE</span>
          <h1>{ath.full_name ?? ath.email}</h1>
          <p>
            Mese corrente, successivo e precedente — bozze comprese. Tocca un giorno per il
            dettaglio o per <strong>aggiungere un allenamento</strong>.
          </p>
        </div>
      </div>

      <MonthGrid
        itemsByDate={itemsByDate}
        todayISO={toISODate(today)}
        prev={win.prev}
        current={win.current}
        next={win.next}
        athleteId={id}
        addWorkout={addSessionOnDate}
      />
    </div>
  );
}
