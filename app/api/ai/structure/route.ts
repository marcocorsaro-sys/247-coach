// ============================================================================
// Strutturatore AI — endpoint di servizio.
// GET /api/ai/structure?secret=CRON_SECRET[&week_id=…|&athlete_id=…][&force=1]
// Struttura le settimane pubblicate da oggi in avanti (o una specifica).
// Protetto dal CRON_SECRET: non è esposto agli utenti.
// ============================================================================

import { NextResponse } from "next/server";
import { structureWeek, structureUpcomingWeeks } from "@/lib/ai/structurer";

export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const force = url.searchParams.get("force") === "1";
  const weekId = url.searchParams.get("week_id");
  if (weekId) {
    const r = await structureWeek(weekId, { force });
    return NextResponse.json(r, { status: r.ok ? 200 : 500 });
  }

  const r = await structureUpcomingWeeks({
    athleteId: url.searchParams.get("athlete_id") ?? undefined,
    force,
  });
  return NextResponse.json(r);
}
