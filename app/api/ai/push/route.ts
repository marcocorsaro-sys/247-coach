// ============================================================================
// Push manuale del piano pianificato verso Intervals (→ Garmin/Suunto/...)
// per un atleta. GET /api/ai/push?secret=CRON_SECRET&athlete_id=…
// Spinge tutte le settimane pubblicate dalla settimana corrente in avanti.
// Protetta dal CRON_SECRET: non esposta agli utenti.
//
// Con &cleanup=1 prima cancella da Intervals tutti gli eventi creati da noi
// e poi ri-pusha: serve quando una seduta è stata cancellata in app e la sua
// copia è rimasta sul calendario dell'atleta (e quindi sull'orologio). È la
// stessa cosa del pulsante nella scheda atleta, richiamabile da qui quando
// va fatto per un atleta solo senza passare dall'interfaccia.
// ============================================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanupIntervalsDuplicates,
  pushAllPublishedWeeksFromNow,
} from "@/lib/server/icuPush";

export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const athleteId = url.searchParams.get("athlete_id");
  if (!athleteId) return NextResponse.json({ error: "athlete_id mancante" }, { status: 400 });

  const admin = createAdminClient();
  const r =
    url.searchParams.get("cleanup") === "1"
      ? await cleanupIntervalsDuplicates(admin as never, athleteId)
      : await pushAllPublishedWeeksFromNow(admin as never, athleteId);
  return NextResponse.json(r);
}
