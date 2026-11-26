// Archivio risultati: lavora la coda delle edizioni da scaricare.
// Cron spento dal 27/11/2026: la fonte rifiuta le richieste dai nostri server (verifica anti-bot).
// Lo scarico riparte solo con il suo consenso. La rotta resta per i giri manuali.
//  GET ?token=… [&max=8] [&discover=1]
import { NextResponse } from "next/server";
import { opsAuthorized } from "@/lib/server/opsAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { discoverLatest, harvestQueue } from "@/lib/site/resultsArchive";
import seed from "@/lib/site/seed/ir-series.json";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!(await opsAuthorized(req))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const admin = createAdminClient();
  if (url.searchParams.get("action") === "seed") {
    // elenco di serie ed edizioni rilevato il 26/11/2026 (1.771 edizioni, 2002-2026)
    const series = seed as { id: number; half: boolean; title: string; editions: [number, number][] }[];
    const a = await admin.from("ir_series").upsert(series.map((s) => ({ id: s.id, half: s.half, title: s.title })), { onConflict: "id" });
    const eds = series.flatMap((s) => s.editions.map(([race_id, year]) => ({ race_id, series_id: s.id, year, half: s.half })));
    const uniq = [...new Map(eds.map((e) => [e.race_id, e])).values()];
    let err = a.error?.message ?? null;
    for (let i = 0; i < uniq.length && !err; i += 500) err = (await admin.from("ir_editions").upsert(uniq.slice(i, i + 500), { onConflict: "race_id", ignoreDuplicates: true })).error?.message ?? null;
    return NextResponse.json({ ok: !err, error: err, series: series.length, editions: uniq.length });
  }
  if (url.searchParams.get("action") === "status") {
    const { data } = await admin.from("ir_editions").select("race_id,status").limit(5000);
    const rows = (data ?? []) as { race_id: number; status: string }[];
    return NextResponse.json({ total: rows.length, done: rows.filter((r) => r.status === "done" || r.status === "empty").map((r) => r.race_id) });
  }
  const now = new Date();
  let added: number | undefined;
  if (url.searchParams.get("discover") === "1" || (now.getUTCHours() === 3 && now.getUTCMinutes() < 5)) added = await discoverLatest(admin).catch(() => 0);
  const max = Math.min(20, Math.max(1, Number(url.searchParams.get("max") ?? 2)));
  const r = await harvestQueue(admin, { max });
  return NextResponse.json({ ok: true, added, ...r });
}

