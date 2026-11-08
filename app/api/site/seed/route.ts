// Applica il seed di una scheda gara (lib/site/seed/*).
// GET /api/site/seed?secret=CRON_SECRET&slug=nizza-2027   (slug=all per tutti)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applySeed, checkSecret } from "@/lib/site/admin";
import { SEEDS } from "@/lib/site/seed";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "all";
  const seeds = slug === "all" ? Object.values(SEEDS) : SEEDS[slug] ? [SEEDS[slug]] : [];
  if (!seeds.length) return NextResponse.json({ error: `nessun seed per ${slug}`, disponibili: Object.keys(SEEDS) }, { status: 400 });
  const admin = createAdminClient();
  const results = [];
  for (const s of seeds) {
    try { results.push(await applySeed(admin, s)); } catch (e) { results.push({ ok: false, slug: s.slug, error: (e as Error).message }); }
  }
  return NextResponse.json({ results });
}
