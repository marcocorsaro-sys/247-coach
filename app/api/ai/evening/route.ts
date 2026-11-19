// ============================================================================
// Buonanotte serale (cron ogni ora al minuto 30: parte alle 20:30 del fuso
// dell'atleta, ai_athlete_profiles.timezone): a ogni atleta che ha
// collegato Telegram manda l'allenamento di domani, spiegato, con la prontezza.
// Una volta al giorno (last_evening_sent). GET con Bearer CRON_SECRET.
// ============================================================================
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_COACH_ID } from "@/lib/ai/mode";
import { sendEvening } from "@/lib/notify/athlete";
import { DEFAULT_TZ, localDate, localHour, validTz } from "@/lib/server/tz";

export const maxDuration = 120;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const ok = secret && (url.searchParams.get("secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const only = url.searchParams.get("athlete_id");

  const admin = createAdminClient();
  const { data: rel } = await admin.from("coaching_relationships").select("athlete_id").eq("coach_id", AI_COACH_ID);
  const ids = ((rel ?? []) as { athlete_id: string }[]).map((r) => r.athlete_id).filter((id) => !only || id === only);
  const { data: ais } = await admin
    .from("ai_athlete_profiles")
    .select("athlete_id, last_evening_sent, timezone")
    .in("athlete_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .eq("notify_evening", true)
    .not("telegram_chat_id", "is", null);
  const out: Record<string, string> = {};
  for (const a of (ais ?? []) as { athlete_id: string; last_evening_sent: string | null; timezone: string | null }[]) {
    const tz = validTz(a.timezone) ? a.timezone : DEFAULT_TZ;
    const today = localDate(tz);
    // una volta al giorno, nella fascia 20:00-20:59 locali (con ?athlete_id= parte subito)
    if (!only && (a.last_evening_sent === today || localHour(tz) !== 20)) continue;
    try {
      out[a.athlete_id] = await sendEvening(a.athlete_id);
      if (out[a.athlete_id] !== "none") await admin.from("ai_athlete_profiles").update({ last_evening_sent: today } as never).eq("athlete_id", a.athlete_id);
    } catch (e) {
      out[a.athlete_id] = `error: ${(e as Error).message}`;
    }
  }
  return NextResponse.json({ ok: true, sent: out });
}
