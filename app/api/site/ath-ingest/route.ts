// Caricamento dei risultati atleta preparati fuori dal sito (solo con il token ops).
// POST { table: "ath_athletes" | "ath_results", rows: [...] } · gli atleti rimossi non vengono ricaricati.
import { NextResponse } from "next/server";
import { opsAuthorized } from "@/lib/server/opsAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 120;
const KEY = { ath_athletes: "cid", ath_results: "edition_id,source_row" } as const;

export async function POST(req: Request) {
  if (!(await opsAuthorized(req))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as { table?: keyof typeof KEY; rows?: Record<string, unknown>[] } | null;
  if (!b || !b.table || !(b.table in KEY) || !Array.isArray(b.rows)) return NextResponse.json({ ok: false, error: "table e rows richiesti" }, { status: 400 });
  const admin = createAdminClient();
  let rows = b.rows;
  const cids = [...new Set(rows.map((r) => r.cid).filter((c): c is string => typeof c === "string"))];
  if (cids.length) {
    const gone = new Set<string>();
    for (let i = 0; i < cids.length; i += 500) {
      const { data } = await admin.from("ath_removals").select("cid").in("cid", cids.slice(i, i + 500));
      for (const x of (data ?? []) as { cid: string | null }[]) if (x.cid) gone.add(x.cid);
    }
    if (gone.size) rows = b.table === "ath_athletes" ? rows.filter((r) => !gone.has(r.cid as string)) : rows.map((r) => (gone.has(r.cid as string) ? { ...r, cid: null } : r));
  }
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await admin.from(b.table).upsert(rows.slice(i, i + 1000), { onConflict: KEY[b.table] });
    if (error) return NextResponse.json({ ok: false, error: error.message, at: i }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rows: rows.length });
}
