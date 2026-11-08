// Inserisce nel catalogo le gare del calendario mondiale non ancora presenti.
// GET /api/site/catalog?secret=CRON_SECRET[&status=draft|published][&dry=1]
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSecret } from "@/lib/site/admin";
import { WORLD } from "@/lib/site/catalog/world";

export const maxDuration = 120;

function worldRow(key: string, date: string, city: string, country: string, status: "draft" | "published") {
  const half = key.startsWith("im703-");
  const year = date.slice(0, 4);
  const base = key.replace(/^im703-|^im-/, "").replace(/-2027$/, "");
  const slug = half ? `${base}-703-${year}` : `${base}-${year}`;
  return {
    slug, series: "ironman", distance: half ? "half" : "full", name: city, official_name: `IRONMAN ${half ? "70.3 " : ""}${city}`,
    country, race_date: date, date_confirmed: true, status,
    swim_km: half ? 1.9 : 3.8, bike_km: half ? 90 : 180, run_km: half ? 21.1 : 42.2,
    course_version: "scheda base",
  };
}

export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const q = new URL(req.url).searchParams;
  const status = q.get("status") === "published" ? "published" : "draft";
  const rows = WORLD.map(([k, d, c, co]) => worldRow(k, d, c, co, status));
  if (q.get("dry") === "1") return NextResponse.json({ n: rows.length, sample: rows.slice(0, 3) });
  const admin = createAdminClient();
  const { data: ex } = await admin.from("event_races").select("slug");
  const have = new Set((ex ?? []).map((r: { slug: string }) => r.slug));
  const fresh = rows.filter((r) => !have.has(r.slug));
  if (fresh.length) {
    const { error } = await admin.from("event_races").insert(fresh);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inserted: fresh.length, skipped: rows.length - fresh.length });
}
