"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";

const TABS: [string, string][] = [
  ["/coach", "Dashboard"],
  ["/coach/atleti", "Atleti"],
  ["/coach/importa", "Importa"],
  ["/coach/calendario", "Calendario"],
  ["/coach/attivita", "Attività"],
];

/**
 * Barra di navigazione coach condivisa. Stato attivo automatico dal path,
 * link sempre funzionanti, e un link "indietro" contestuale opzionale per le
 * pagine profonde (settimana / allenamento).
 */
export default function CoachNav({
  label = "COACH",
  back,
  crumbs,
}: {
  label?: string;
  back?: { href: string; label: string };
  crumbs?: Crumb[];
}) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/coach" ? path === "/coach" : path === href;

  return (
    <>
      <nav className="topnav">
        <div className="brand">
          <Link href="/coach" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
            <span className="dot">T</span>
            <span className="name">
              Tabella<em>.</em>
            </span>
          </Link>
          <span className="mono" style={{ marginLeft: 14 }}>
            // {label}
          </span>
        </div>
        <div className="nav-tabs">
          {TABS.map(([href, l]) => (
            <Link key={href} href={href} className={isActive(href) ? "active" : undefined}>
              {l}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          {back && !crumbs ? (
            <Link className="btn btn-subtle btn-sm" href={back.href}>
              ← {back.label}
            </Link>
          ) : null}
          <form action="/auth/signout" method="post">
            <button className="btn btn-subtle btn-sm" type="submit">
              Esci
            </button>
          </form>
        </div>
      </nav>
      {crumbs && crumbs.length > 0 ? <Breadcrumbs items={crumbs} /> : null}
    </>
  );
}
