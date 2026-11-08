// Catalogo percorsi (24/7 Coach): scarica le tracce GPS mancanti da Intervals
// e ricostruisce i percorsi abituali dell'atleta.
//  GET ?secret=CRON_SECRET&athlete_id=…[&days=400&limit=80]  (manuale/backfill)
//  POST (atleta loggato): aggiorna i propri percorsi.
import { NextResponse } from "next/server";
import { isAiCoachMode } from "@/lib/ai/mode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { rebuildRouteCatalog, syncTracks } from "@/lib/server/routes";

export const maxDuration = 300;

async function run(athleteId: string, days: number, limit: number) {
  const admin = createAdminClient();
  const conn = await loadIntervalsConnection(admin as never, athleteId);
  if (!conn) return { ok: false, error: "Intervals non collegato" };
  const t = await syncTracks(admin, athleteId, conn, { days, limit });
  const routes = await rebuildRouteCatalog(admin, athleteId, { prune: t.skipped === 0 || limit >= 80 });
  return { ok: true, tracks_fetched: t.fetched, tracks_skipped: t.skipped, routes };
}

export async function GET(req: Request) {
  if (!isAiCoachMode()) return NextResponse.json({ error: "not available" }, { status: 404 });
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const athleteId = url.searchParams.get("athlete_id");
  if (!athleteId) return NextResponse.json({ error: "athlete_id mancante" }, { status: 400 });
  const days = Number(url.searchParams.get("days") ?? 400);
  const limit = Number(url.searchParams.get("limit") ?? 80);
  return NextResponse.json(await run(athleteId, days, limit));
}

export async function POST() {
  if (!isAiCoachMode()) return NextResponse.json({ error: "not available" }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await run(user.id, 400, 80));
}
