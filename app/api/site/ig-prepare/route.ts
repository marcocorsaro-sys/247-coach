// ============================================================================
// Palinsesto Instagram: prepara i testi dei post in uscita nei prossimi 3 giorni
// (ig_plan planned → ready), nella lingua del paese della gara. Cron ogni ora.
// I risultati aspettano l'edizione appena corsa fino a 10 giorni, poi si saltano.
// GET ?secret=… [&id=<piano>] (rigenera quel post)
// ============================================================================
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildIgContent } from "@/lib/site/igContent";

export const maxDuration = 300;
const BUDGET_MS = 240_000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const ok = secret && (url.searchParams.get("secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const t0 = Date.now();
  const admin = createAdminClient();
  const horizon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const one = url.searchParams.get("id");
  const q = admin.from("ig_plan").select("id,race_id,kind,lang,publish_on").order("publish_on").limit(12);
  const { data: plans } = one ? await q.eq("id", one) : await q.eq("status", "planned").lte("publish_on", horizon);
  const done: string[] = [];
  for (const p of plans ?? []) {
    if (Date.now() - t0 > BUDGET_MS) break;
    const r = await buildIgContent(admin as never, p).catch((e) => ({ content: null, error: String(e) }));
    const late = Date.now() - Date.parse(p.publish_on) > 10 * 864e5;
    if (r.content) {
      await admin.from("ig_plan").update({ content: r.content, status: "ready", error: null, updated_at: new Date().toISOString() }).eq("id", p.id);
      done.push(`${p.id}:ready`);
    } else if ("skip" in r && r.skip) {
      // risultati non ancora pubblicati: si riprova al prossimo giro, poi si salta
      if (p.kind !== "results" || late) await admin.from("ig_plan").update({ status: "skipped", error: r.skip, updated_at: new Date().toISOString() }).eq("id", p.id);
      done.push(`${p.id}:skip`);
    } else {
      await admin.from("ig_plan").update({ status: "error", error: (r as { error?: string }).error ?? "?", updated_at: new Date().toISOString() }).eq("id", p.id);
      done.push(`${p.id}:error`);
    }
  }
  await admin.from("site_job_log").insert({ job: "ig-prepare", result: { done } } as never);
  return NextResponse.json({ done });
}
