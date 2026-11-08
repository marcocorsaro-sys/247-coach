// Avviso al titolare quando arriva un nuovo lead (registrazione 24/7 Coach).
// Telegram (bot) e WhatsApp (CallMeBot) sono opzionali e indipendenti: se le
// variabili non ci sono la funzione non fa nulla e non solleva mai eccezioni.
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID   bot creato con @BotFather
//   WA_PHONE (es. 39340xxxxxxx), WA_APIKEY  chiave CallMeBot per WhatsApp
import type { ChannelResult } from "./email";

export interface Lead {
  name: string;
  email: string | null;
  source: "email" | "google";
  race?: string;
}

async function telegram(text: string): Promise<ChannelResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { status: "skipped" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    return r.ok ? { status: "sent" } : { status: "error", detail: String(r.status) };
  } catch (e) { return { status: "error", detail: (e as Error).message }; }
}

async function whatsapp(text: string): Promise<ChannelResult> {
  const phone = process.env.WA_PHONE, key = process.env.WA_APIKEY;
  if (!phone || !key) return { status: "skipped" };
  try {
    const r = await fetch(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(key)}&text=${encodeURIComponent(text)}`);
    return r.ok ? { status: "sent" } : { status: "error", detail: String(r.status) };
  } catch (e) { return { status: "error", detail: (e as Error).message }; }
}

export async function notifyLead(l: Lead): Promise<void> {
  const text = `🏁 Nuovo lead 24/7 Coach\n${l.name}${l.email ? ` · ${l.email}` : ""}\nVia: ${l.source === "google" ? "Google" : "email"}${l.race ? `\nGara scelta: ${l.race}` : ""}`;
  await Promise.allSettled([telegram(text), whatsapp(text)]);
}
