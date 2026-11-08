// Importa la guida pratica (lib/site/seed/places.json) in event_race_places.
// Idempotente: salta le gare che hanno già luoghi. GET /api/site/import-places?secret=…[&slug=…]
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSecret } from "@/lib/site/admin";
import places from "@/lib/site/seed/places.json";

type P = { kind: string; title: string; body: string; url: string; area: string; position: number };

export async function GET(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const only = new URL(req.url).searchParams.get("slug");
  const admin = createAdminClient();
  const out: Record<string, string> = {};
  for (const [slug, rows] of Object.entries(places as Record<string, P[]>)) {
    if (only && only !== slug) continue;
    const { data: race } = await admin.from("event_races").select("id").eq("slug", slug).maybeSingle();
    if (!race) { out[slug] = "gara non trovata"; continue; }
    const id = (race as { id: string }).id;
    const { count } = await admin.from("event_race_places").select("id", { count: "exact", head: true }).eq("race_id", id);
    if (count) { out[slug] = `già presenti ${count}`; continue; }
    const { error } = await admin.from("event_race_places").insert(rows.map((r) => ({ race_id: id, kind: r.kind, title: r.title, body: r.body, url: r.url || null, area: r.area, position: r.position, published: true })));
    out[slug] = error ? `errore: ${error.message}` : `inserite ${rows.length}`;
  }
  return NextResponse.json(out);
}
