import Link from "next/link";
import SiteLink from "@/components/SiteLink";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Breadcrumbs from "@/components/Breadcrumbs";
import MonthGrid from "./MonthGrid";
import { monthWindow, loadMonthItems } from "@/lib/server/month";
import { toISODate } from "@/lib/training/weeks";
import { resolveViewAs } from "@/lib/server/viewAs";
import { BRAND_DOT, BRAND_NAME } from "@/lib/branding";
import { getT } from "@/lib/app-i18n/server";

export default async function AthleteMonth() {
  const supabase = await createClient();
  const { t } = await getT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const va = await resolveViewAs(supabase, user.id);
  if (va.role === "coach" && !va.impersonating) redirect("/coach");
  const athleteId = va.athleteId!;

  const today = new Date();
  const win = monthWindow(today);
  const itemsByDate = await loadMonthItems(supabase, athleteId, win, { publishedOnly: true });

  return (
    <div className="wrap-tight">
      <nav className="topnav">
        <div className="brand">
          <Link href="/atleta" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
            <span className="dot">{BRAND_DOT}</span>
            <span className="name">
              {BRAND_NAME}<em>.</em>
            </span>
          </Link>
          <span className="mono" style={{ marginLeft: 14 }}>{t("// MESE")}</span>
        </div>
        <div className="nav-right">
          <Link className="btn btn-subtle btn-sm" href="/atleta">{t("← Torna")}</Link>
          <SiteLink />
          <form action="/auth/signout" method="post">
            <button className="btn btn-subtle btn-sm" type="submit">{t("Esci")}</button>
          </form>
        </div>
      </nav>
      <Breadcrumbs items={[{ href: "/atleta", label: t("I miei allenamenti") }, { label: t("Mese") }]} />

      <div className="hero">
        <div>
          <span className="mono">{t("// VISTA MENSILE")}</span>
          <h1>
            {t("Il tuo")} <em>{t("mese")}</em>.
          </h1>
          <p>{t("Mese corrente, successivo e precedente. Tocca un giorno per vedere il dettaglio.")}</p>
        </div>
      </div>

      <MonthGrid
        itemsByDate={itemsByDate}
        todayISO={toISODate(today)}
        prev={win.prev}
        current={win.current}
        next={win.next}
      />
    </div>
  );
}
