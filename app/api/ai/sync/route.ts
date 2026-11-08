// ============================================================================
// Import profondo delle attività da Intervals per un atleta.
// GET /api/ai/sync?secret=CRON_SECRET&athlete_id=…[&days=1100]
// Serve per il backfill dello storico (l'import automatico copre 90 giorni,
// l'onboarding 2 anni): protetto dal CRON_SECRET, non esposto agli utenti.
// ============================================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { syncIcuActivities } from "@/lib/server/icuSync";

export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const athleteId = url.searchParams.get("athlete_id");
  if (!athleteId) return NextResponse.json({ error: "athlete_id mancante" }, { status: 400 });
  const days = Math.min(Number(url.searchParams.get("days") ?? 1100) || 1100, 8000);

  const admin = createAdminClient();
  const conn = await loadIntervalsConnection(admin as never, athleteId);
  if (!conn) return NextResponse.json({ error: "nessuna connessione Intervals" }, { status: 404 });

  const res = await syncIcuActivities(admin as never, athleteId, conn, days);
  return NextResponse.json({ ...res, days }, { status: res.ok ? 200 : 500 });
}
