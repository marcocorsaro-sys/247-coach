"use client";

import Link from "next/link";
import { useT } from "@/components/AppLang";

export interface Crumb {
  href?: string;
  label: string;
}

/**
 * Scia di breadcrumb per la navigazione profonda: ogni livello è cliccabile
 * per tornare indietro, l'ultimo è la pagina corrente (non cliccabile).
 * Usata sia lato coach (dentro CoachNav) sia lato atleta.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <nav className="crumbs" aria-label={t("Percorso")}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="crumb">
            {c.href && !last ? (
              <Link href={c.href}>{c.label}</Link>
            ) : (
              <span className={last ? "crumb-current" : undefined}>{c.label}</span>
            )}
            {!last ? <span className="crumb-sep" aria-hidden>›</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
