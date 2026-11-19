// ============================================================================
// Palinsesto LinkedIn: tiene pronte le righe dei prossimi 14 giorni (una al
// giorno, rubrica per giorno della settimana) e scrive il post di oggi e di
// domani (planned → ready). La pubblicazione la fa il task programmato via Windsor.
// GET ?secret=… [&id=<riga>] (riscrive quel post)
// ============================================================================
import { opsAuthorized } from "@/lib/server/opsAuth";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLiPost, rubricFor } from "@/lib/site/liContent";

export const maxDuration = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!(await opsAuthorized(req))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const rows = Array.from({ length: 14 }, (_, k) => {
    const d = new Date(Date.parse(today) + k * 864e5).toISOString().slice(0, 10);
    return { publish_on: d, rubric: rubricFor(d) };
  });
  await admin.from("li_plan").upsert(rows as never, { onConflict: "publish_on", ignoreDuplicates: true });
  const one = url.searchParams.get("id");
  const tomorrow = new Date(Date.parse(today) + 864e5).toISOString().slice(0, 10);
  const q = admin.from("li_plan").select("id,publish_on,rubric").order("publish_on");
  const { data: todo } = one ? await q.eq("id", one) : await q.eq("status", "planned").gte("publish_on", today).lte("publish_on", tomorrow);
  const done: string[] = [];
  for (const p of (todo ?? []) as { id: string; publish_on: string; rubric: string }[]) {
    const r = await buildLiPost(admin as never, p).catch((e) => ({ content: null, error: String(e) }) as Awaited<ReturnType<typeof buildLiPost>>);
    if (r.content) {
      await admin.from("li_plan").update({ content: r.content, race_id: r.race_id ?? null, topic: r.topic ?? null, rubric: r.rubric ?? p.rubric, status: "ready", error: null, updated_at: new Date().toISOString() }).eq("id", p.id);
      done.push(`${p.publish_on}:ready`);
    } else {
      await admin.from("li_plan").update({ status: "error", error: r.error ?? "?", updated_at: new Date().toISOString() }).eq("id", p.id);
      done.push(`${p.publish_on}:error`);
    }
  }
  await admin.from("site_job_log").insert({ job: "li-prepare", result: { done } } as never);
  return NextResponse.json({ done });
}
