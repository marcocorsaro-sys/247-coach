// Ricerca atleti per nome (pubblica, sola lettura). ?q=nome[&race=chiave gara]
import { NextResponse } from "next/server";
import { searchAthletes } from "@/lib/site/athletes";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const race = url.searchParams.get("race");
  const hits = await searchAthletes(q, race && /^[a-z0-9]{2,40}$/.test(race) ? race : null);
  return NextResponse.json({ hits }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600", "X-Robots-Tag": "noindex" } });
}
