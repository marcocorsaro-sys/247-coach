// Richieste "Sei tu?" degli atleti e unione di due profili (solo con il token ops).
//   GET ?token=…                         elenco delle richieste aperte
//   GET ?token=…&action=done&id=N        segna una richiesta come chiusa
//   GET ?token=…&action=merge&from=SLUG&into=SLUG
//       sposta i risultati di "from" su "into", ricalcola i totali, cancella "from"
//       e lascia un reindirizzamento dal vecchio indirizzo. Se i due profili hanno la
//       stessa edizione, quel risultato di "from" resta senza nome (non si duplica).
import { NextResponse } from "next/server";
import { opsAuthorized } from "@/lib/server/opsAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;
const slugOf = (v: string | null) => ((v ?? "").trim().toLowerCase().split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "").replace(/[^a-z0-9-]/g, "");

export async function GET(req: Request) {
  if (!(await opsAuthorized(req))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const u = new URL(req.url), action = u.searchParams.get("action"), admin = createAdminClient();
  if (action === "done") {
    const { error } = await admin.from("ath_claims").update({ status: "done", handled_at: new Date().toISOString() }).eq("id", Number(u.searchParams.get("id")));
    return NextResponse.json({ ok: !error, error: error?.message });
  }
  if (action === "merge") {
    const from = slugOf(u.searchParams.get("from")), into = slugOf(u.searchParams.get("into"));
    if (!from || !into || from === into) return NextResponse.json({ ok: false, error: "from e into richiesti, diversi" }, { status: 400 });
    const { data: pair } = await admin.from("ath_athletes").select("cid,slug,name").in("slug", [from, into]);
    const a = (pair ?? []).find((x) => x.slug === from) as { cid: string; slug: string; name: string } | undefined;
    const b = (pair ?? []).find((x) => x.slug === into) as { cid: string; slug: string; name: string } | undefined;
    if (!a || !b) return NextResponse.json({ ok: false, error: "profilo non trovato" }, { status: 404 });
    const { data: have } = await admin.from("ath_results").select("edition_id").eq("cid", b.cid);
    const taken = new Set(((have ?? []) as { edition_id: string }[]).map((r) => r.edition_id));
    const { data: mine } = await admin.from("ath_results").select("edition_id,source_row").eq("cid", a.cid);
    let moved = 0, skipped = 0;
    for (const r of (mine ?? []) as { edition_id: string; source_row: number }[]) {
      const dup = taken.has(r.edition_id);
      await admin.from("ath_results").update({ cid: dup ? null : b.cid }).eq("edition_id", r.edition_id).eq("source_row", r.source_row);
      if (dup) skipped++; else moved++;
    }
    await admin.rpc("ath_recount", { p_cid: b.cid });
    await admin.from("ath_athletes").delete().eq("cid", a.cid);
    await admin.from("ath_redirects").upsert({ slug: a.slug, to_slug: b.slug });
    await admin.from("ath_redirects").update({ to_slug: b.slug }).eq("to_slug", a.slug);
    return NextResponse.json({ ok: true, from: a.name, into: b.name, moved, skipped });
  }
  const { data, error } = await admin.from("ath_claims").select("id,created_at,slug,name,email,other,note,lang,status").eq("status", "new").order("created_at", { ascending: false }).limit(200);
  return NextResponse.json({ ok: !error, claims: data ?? [] });
}
