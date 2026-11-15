// ============================================================================
// Riempie e rinfresca event_race_facts a piccoli passi (cron ogni 10 minuti).
// Ogni gara avanza di un passo per giro (geo → meteo → acqua → negozi bici →
// pagina ufficiale → risultati); finito il giro iniziale, i dati si
// rinfrescano da soli (iscrizioni/risultati ogni 30 giorni, negozi 90, meteo 365).
// GET ?secret=… [&race=slug] [&dry=1]
// ============================================================================
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stepFacts } from "@/lib/site/facts";
import type { Race } from "@/lib/site/races";

export const maxDuration = 300;
const BUDGET_MS = 230_000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const ok = secret && (url.searchParams.get("secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const t0 = Date.now();
  const admin = createAdminClient();
  const only = url.searchParams.get("race");
  let q = admin.from("event_races").select("*").eq("status", "published");
  if (only) q = q.eq("slug", only);
  const [{ data: races }, { data: facts }, { data: srcs }] = await Promise.all([
    q,
    admin.from("event_race_facts").select("*"),
    admin.from("event_race_sources").select("race_id,url").eq("kind", "official"),
  ]);
  const F = new Map(((facts ?? []) as { race_id: string }[]).map((f) => [f.race_id, f as Record<string, unknown> & { race_id: string }]));
  const off = new Map<string, string>();
  for (const s of (srcs ?? []) as { race_id: string; url: string }[]) {
    const m = /^https?:\/\/(?:www\.)?ironman\.com\/races\/[a-z0-9-]+\/?$/i.exec(s.url);
    if (m && (!off.has(s.race_id) || s.url.length < off.get(s.race_id)!.length)) off.set(s.race_id, s.url.replace(/\/$/, ""));
  }
  // prima le gare più vicine nel tempo (le più cercate), poi le altre
  const R = ((races ?? []) as Race[]).sort((a, b) => (a.race_date ?? "9").localeCompare(b.race_date ?? "9"));
  if (url.searchParams.get("dry") === "1") return NextResponse.json({ races: R.length, facts: F.size, official: off.size });
  const done: string[] = [];
  // più passaggi sulla lista finché c'è tempo: ogni gara fa un passo per passaggio
  for (let pass = 0; pass < 6 && Date.now() - t0 < BUDGET_MS; pass++) {
    let progressed = false;
    for (const r of R) {
      if (Date.now() - t0 > BUDGET_MS) break;
      const step = await stepFacts(admin as never, r, (F.get(r.id) ?? null) as never, off.get(r.id) ?? null).catch((e) => `err:${(e as Error).message}`);
      if (step) {
        progressed = true;
        done.push(`${r.slug}:${step}`);
        const { data: fresh } = await admin.from("event_race_facts").select("*").eq("race_id", r.id).maybeSingle();
        if (fresh) F.set(r.id, fresh as never);
      }
    }
    if (!progressed) break;
  }
  return NextResponse.json({ steps: done.length, done: done.slice(0, 60), ms: Date.now() - t0 });
}
