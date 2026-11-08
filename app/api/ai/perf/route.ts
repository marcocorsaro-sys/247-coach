// Storico gare + proiezione di un atleta (diagnostica admin, protetto da CRON_SECRET).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { athletePerformance } from "@/lib/server/raceHistory";

export const maxDuration = 60;
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!process.env.CRON_SECRET || url.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "not found" }, { status: 404 });
  const id = url.searchParams.get("athlete_id");
  if (!id) return NextResponse.json({ error: "athlete_id mancante" }, { status: 400 });
  const p = await athletePerformance(createAdminClient() as never, id);
  return NextResponse.json({ races: p.races, insights: p.ins, target: p.target, projection: p.projection && { totalS: p.projection.proj.totalS, proj: p.projection.proj, need: p.projection.need?.res, reachable: p.projection.need?.reachable, levers: p.projection.levers, basis: p.projection.basis }, text: p.text });
}
