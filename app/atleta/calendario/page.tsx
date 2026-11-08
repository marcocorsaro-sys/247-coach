import Link from "next/link";
import SiteLink from "@/components/SiteLink";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RaceCalendar, { type CatalogRace } from "@/components/RaceCalendar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { addRaceFromCatalog } from "../actions";
import { resolveViewAs } from "@/lib/server/viewAs";
import { BRAND_DOT, BRAND_NAME } from "@/lib/branding";
import LangToggle from "@/components/LangToggle";
import { getT } from "@/lib/app-i18n/server";

export default async function AthleteCalendar() {
  const { t, lang } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const va = await resolveViewAs(supabase, user.id);
  if (va.role === "coach" && !va.impersonating) redirect("/coach/calendario");
  const athleteId = va.athleteId!;

  const today = new Date().toISOString().slice(0, 10);
  const [catRes, mineRes] = await Promise.all([
    supabase
      .from("race_catalog")
      .select("id, name, race_date, race_type, location, url")
      .gte("race_date", today)
      .order("race_date", { ascending: true }),
    supabase.from("races").select("name, race_date").eq("athlete_id", athleteId),
  ]);
  const races = (catRes.data ?? []) as unknown as CatalogRace[];
  const addedKeys = ((mineRes.data ?? []) as unknown as { name: string; race_date: string }[]).map(
    (r) => `${r.name.trim().toLowerCase()}|${r.race_date.slice(0, 10)}`,
  );

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
          <span className="mono" style={{ marginLeft: 14 }}>
            {t("// CALENDARIO")}
          </span>
        </div>
        <div className="nav-right">
          <LangToggle lang={lang} />
          <Link className="btn btn-subtle btn-sm" href="/atleta">
            ← {t("Torna")}
          </Link>
          <SiteLink />
          <form action="/auth/signout" method="post">
            <button className="btn btn-subtle btn-sm" type="submit">
              {t("Esci")}
            </button>
          </form>
        </div>
      </nav>
      <Breadcrumbs items={[{ href: "/atleta", label: t("I miei allenamenti") }, { label: t("Calendario") }]} />

      <div className="hero">
        <div>
          <span className="mono">{t("// CALENDARIO GARE")}</span>
          <h1>
            {t("Scegli la tua")} <em>{t("gara")}</em>.
          </h1>
          <p>
            {t("Sfoglia il circuito Ironman e aggiungi una gara alle tue gare obiettivo.")}
            {races.length > 0 ? ` ${t("{n} gare in calendario.", { n: races.length })}` : ""}
          </p>
        </div>
      </div>

      {races.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          {t("Catalogo gare ancora vuoto.")}
        </div>
      ) : (
        <RaceCalendar races={races} addAction={addRaceFromCatalog} mode="athlete" addedKeys={addedKeys} />
      )}
    </div>
  );
}
