"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Il sync con Intervals parte dopo che la pagina è stata disegnata (così non
 * la rallenta): le attività nuove, come la corsa appena fatta, comparivano
 * solo alla visita successiva. Qui la pagina si ricarica da sola una volta,
 * poco dopo, e le mostra nella stessa visita.
 *
 * Il limite sta nel browser: al massimo una ricarica ogni 2 minuti per
 * atleta. Se il sync fallisse e ripartisse a ogni visita, la pagina non
 * entrerebbe in un ciclo di ricariche.
 */
export default function RefreshAfterSync({ athleteId, afterMs = 9000 }: { athleteId: string; afterMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const key = `refresh-after-sync:${athleteId}`;
    try {
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < 120_000) return;
    } catch {}
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(key, String(Date.now()));
      } catch {}
      router.refresh();
    }, afterMs);
    return () => clearTimeout(t);
  }, [athleteId, afterMs, router]);
  return null;
}
