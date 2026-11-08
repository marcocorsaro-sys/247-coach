// POST /api/site/enrich?secret=CRON_SECRET&slug=florida-2026
// body: { facts: string, sources: [{url,title,kind,platform?}] }
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSecret } from "@/lib/site/admin";
import { enrichRace } from "@/lib/site/enrich";
import type { Race } from "@/lib/site/races";

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug");
  const body = (await req.json().catch(() => null)) as { facts?: string; sources?: { url: string; title?: string; kind?: string; platform?: string }[] } | null;
  if (!slug || !body?.facts) return NextResponse.json({ error: "slug o facts mancanti" }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin.from("event_races").select("*").eq("slug", slug).maybeSingle();
  if (!data) return NextResponse.json({ error: `gara ${slug} non trovata` }, { status: 404 });
  const r = await enrichRace(admin, data as Race, body.facts, (body.sources ?? []).map((s) => ({ kind: s.kind ?? "official", url: s.url, title: s.title ?? null, platform: s.platform ?? null })));
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
