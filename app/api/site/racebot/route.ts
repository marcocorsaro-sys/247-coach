// Servizio del bot delle gare e dei canali Telegram.
//  GET ?token=…&action=setup                       collega il webhook e restituisce il nome del bot
//  GET ?token=…&action=channel&lang=it&chat=@nome  registra il canale di una lingua
//  GET ?token=…&action=ask&q=…[&lang=it]           domanda di prova (non manda nulla su Telegram)
//  GET ?token=… [&date=YYYY-MM-DD|&id=<piano>]     pubblica nei canali il post del giorno (cron)
import { NextResponse } from "next/server";
import { opsAuthorized } from "@/lib/server/opsAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { answerRaceQuestion, postDailyToChannels, raceBotSecret, raceBotToken, tg } from "@/lib/site/raceBot";
import { isAlpha } from "@/components/site/SiteShell";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!(await opsAuthorized(req))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const admin = createAdminClient();
  if (action !== "ask" && !raceBotToken()) return NextResponse.json({ ok: false, error: "TELEGRAM_RACES_BOT_TOKEN non impostato su Vercel" });

  if (action === "setup") {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://247coachai.com";
    const hook = await tg("setWebhook", { url: `${base}/api/telegram/races`, secret_token: raceBotSecret(), allowed_updates: ["message"], drop_pending_updates: true });
    const me = await tg("getMe", {});
    await tg("setMyCommands", { commands: [{ command: "start", description: "What I can do" }] });
    await tg("setMyCommands", { language_code: "it", commands: [{ command: "start", description: "Cosa so fare" }] });
    return NextResponse.json({ ok: hook.ok, webhook: hook.description, bot: (me.result as { username?: string } | undefined)?.username ?? null });
  }
  if (action === "channel") {
    const lang = url.searchParams.get("lang"), chat = url.searchParams.get("chat");
    if ((lang !== "en" && lang !== "it") || !chat || !/^@[A-Za-z][A-Za-z0-9_]{3,}$/.test(chat)) return NextResponse.json({ ok: false, error: "lang=en|it e chat=@nome richiesti" }, { status: 400 });
    const info = await tg("getChat", { chat_id: chat });
    if (!info.ok) return NextResponse.json({ ok: false, error: info.description });
    const { error } = await admin.from("tg_channels").upsert({ lang, chat, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: !error, error: error?.message, title: (info.result as { title?: string } | undefined)?.title });
  }
  if (action === "ask") {
    const q = url.searchParams.get("q") ?? "";
    if (!q) return NextResponse.json({ ok: false, error: "q mancante" }, { status: 400 });
    const reply = await answerRaceQuestion(-1, q, url.searchParams.get("lang") === "it" ? "it" : "en", isAlpha());
    return NextResponse.json({ ok: true, reply });
  }
  return NextResponse.json(await postDailyToChannels(admin, { date: url.searchParams.get("date") ?? undefined, planId: url.searchParams.get("id") ?? undefined }));
}
