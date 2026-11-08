// ============================================================================
// Digest giornaliero per il titolare (Telegram): nuovi iscritti delle ultime
// 24h e atleti bloccati nel percorso (onboarding, Intervals, storico, errori).
// GET /api/ai/digest  (cron, Authorization: Bearer CRON_SECRET) o ?secret=
// ============================================================================
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_COACH_ID } from "@/lib/ai/mode";

export const maxDuration = 60;

type Ai = { athlete_id: string; onboarding_completed_at: string | null; plan_generated_at: string | null; ai_last_error: string | null };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const ok = secret && (url.searchParams.get("secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const dry = url.searchParams.get("dry") === "1";

  const admin = createAdminClient();
  const { data: rel } = await admin.from("coaching_relationships").select("athlete_id").eq("coach_id", AI_COACH_ID);
  const ids = ((rel ?? []) as { athlete_id: string }[]).map((r) => r.athlete_id);
  if (!ids.length) return NextResponse.json({ ok: true, text: "nessun atleta" });

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ data: profs }, { data: ais }, { data: icu }, { data: races }, { data: acts }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, created_at").in("id", ids),
    admin.from("ai_athlete_profiles").select("athlete_id, onboarding_completed_at, plan_generated_at, ai_last_error").in("athlete_id", ids),
    admin.from("intervals_connections").select("athlete_id, last_ok_at").in("athlete_id", ids),
    admin.from("races").select("athlete_id, name, race_date").in("athlete_id", ids).gte("race_date", new Date().toISOString().slice(0, 10)).order("race_date"),
    admin.from("icu_activities").select("athlete_id, start_date").eq("is_duplicate" as never, false as never).in("athlete_id", ids).gte("start_date", new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);
  const aiBy = new Map(((ais ?? []) as Ai[]).map((a) => [a.athlete_id, a]));
  const icuBy = new Set(((icu ?? []) as { athlete_id: string }[]).map((c) => c.athlete_id));
  const raceBy = new Map<string, string>();
  for (const r of (races ?? []) as { athlete_id: string; name: string; race_date: string }[]) if (!raceBy.has(r.athlete_id)) raceBy.set(r.athlete_id, `${r.name} (${r.race_date})`);
  const act7 = new Map<string, number>();
  for (const a of (acts ?? []) as { athlete_id: string }[]) act7.set(a.athlete_id, (act7.get(a.athlete_id) ?? 0) + 1);

  // Storico totale importato (anche oltre 7 giorni) per chi ha Intervals.
  const total = new Map<string, number>();
  for (const id of icuBy) {
    const { count } = await admin.from("icu_activities").select("id", { count: "exact", head: true }).eq("is_duplicate" as never, false as never).eq("athlete_id", id);
    total.set(id, count ?? 0);
  }

  const P = (profs ?? []) as { id: string; full_name: string | null; email: string | null; created_at: string }[];
  const status = (id: string) => {
    const a = aiBy.get(id);
    const s = [
      a?.onboarding_completed_at ? "✅ onboarding" : "⏳ onboarding da fare",
      icuBy.has(id) ? `✅ Intervals (${total.get(id) ?? 0} attività, ${act7.get(id) ?? 0} ultimi 7gg)` : "⏳ Intervals non collegato",
      a?.plan_generated_at ? "✅ piano" : "⏳ piano non generato",
    ];
    if (a?.ai_last_error) s.push(`❌ errore AI: ${a.ai_last_error.slice(0, 80)}`);
    return s.join(" · ");
  };

  const fresh = P.filter((p) => p.created_at >= since).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const stuck = P.filter((p) => p.created_at < since && (!aiBy.get(p.id)?.onboarding_completed_at || !icuBy.has(p.id) || (total.get(p.id) ?? 0) === 0 || aiBy.get(p.id)?.ai_last_error));
  const active = P.filter((p) => (act7.get(p.id) ?? 0) > 0).length;

  const lines: string[] = [`☀️ Digest 24/7 Coach · ${new Date().toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}`];
  lines.push(`Atleti totali: ${P.length} · nuovi 24h: ${fresh.length} · attivi 7gg: ${active}`);
  if (fresh.length) {
    lines.push("", "🆕 NUOVI ISCRITTI");
    for (const p of fresh) lines.push(`• ${p.full_name ?? "—"} · ${p.email ?? ""}${raceBy.get(p.id) ? ` · 🏁 ${raceBy.get(p.id)}` : ""}\n  ${status(p.id)}`);
  } else lines.push("", "Nessun nuovo iscritto nelle ultime 24 ore.");
  if (stuck.length) {
    lines.push("", "⚠️ DA SEGUIRE");
    for (const p of stuck.slice(0, 15)) lines.push(`• ${p.full_name ?? "—"} · ${p.email ?? ""}\n  ${status(p.id)}`);
    if (stuck.length > 15) lines.push(`…e altri ${stuck.length - 15}`);
  }
  const text = lines.join("\n");

  if (!dry) {
    const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
    if (token && chat) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }),
      }).catch(() => null);
    }
  }
  return NextResponse.json({ ok: true, text });
}
