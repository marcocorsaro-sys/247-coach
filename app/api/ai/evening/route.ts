// ============================================================================
// Buonanotte serale (cron 19:30 UTC ≈ 20:30 in Italia): a ogni atleta che ha
// collegato Telegram manda l'allenamento di domani, spiegato, con la prontezza.
// Una volta al giorno (last_evening_sent). GET con Bearer CRON_SECRET.
// ============================================================================
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_COACH_ID } from "@/lib/ai/mode";
import { sendEvening } from "@/lib/notify/athlete";

export const maxDuration = 120;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const ok = secret && (url.searchParams.get("secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const only = url.searchParams.get("athlete_id");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

  const admin = createAdminClient();
  const { data: rel } = await admin.from("coaching_relationships").select("athlete_id").eq("coach_id", AI_COACH_ID);
  const ids = ((rel ?? []) as { athlete_id: string }[]).map((r) => r.athlete_id).filter((id) => !only || id === only);
  const { data: ais } = await admin
    .from("ai_athlete_profiles")
    .select("athlete_id, last_evening_sent")
    .in("athlete_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .eq("notify_evening", true)
    .not("telegram_chat_id", "is", null);
  const out: Record<string, string> = {};
  for (const a of (ais ?? []) as { athlete_id: string; last_evening_sent: string | null }[]) {
    if (a.last_evening_sent === today && !only) continue;
    try {
      out[a.athlete_id] = await sendEvening(a.athlete_id);
      if (out[a.athlete_id] !== "none") await admin.from("ai_athlete_profiles").update({ last_evening_sent: today } as never).eq("athlete_id", a.athlete_id);
    } catch (e) {
      out[a.athlete_id] = `error: ${(e as Error).message}`;
    }
  }
  return NextResponse.json({ ok: true, sent: out });
}
