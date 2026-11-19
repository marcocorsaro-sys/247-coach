// Webhook del bot pubblico delle gare ("Race Desk"). Risponde solo nelle chat
// private; ignora canali e gruppi. Telegram firma ogni chiamata con l'header
// X-Telegram-Bot-Api-Secret-Token (segreto derivato dal token del bot).
import { after, NextResponse } from "next/server";
import { answerRaceQuestion, raceBotSecret, raceBotToken, tg } from "@/lib/site/raceBot";
import { isAlpha } from "@/components/site/SiteShell";

export const maxDuration = 120;

const HELLO = {
  en: "🏁 Hi! I'm Race Desk, the race guide of 24/7 Coach.\n\nAsk me about any IRONMAN or 70.3 race: course, climbing, weather, water temperature, cut-offs, entry, results. Or tell me how you train and when, and I'll suggest races.\n\nExamples:\n- How hilly is the bike in Nice?\n- Water temperature at 70.3 Cervia?\n- A flat 70.3 in Europe in June?\n\nIndependent guide, not affiliated with The IRONMAN Group.",
  it: "🏁 Ciao! Sono Race Desk, la guida alle gare di 24/7 Coach.\n\nChiedimi di qualsiasi gara IRONMAN o 70.3: percorso, dislivello, meteo, temperatura dell'acqua, tempi massimi, iscrizione, risultati. Oppure dimmi come ti alleni e quando, e ti propongo le gare.\n\nEsempi:\n- Quanto dislivello ha la bici di Nizza?\n- Temperatura dell'acqua al 70.3 di Cervia?\n- Un 70.3 piatto in Europa a giugno?\n\nGuida indipendente, non affiliata a The IRONMAN Group.",
};
const LIMIT = { en: "You've reached today's limit of questions. Come back tomorrow, or browse the races on 247coachai.com/en/races", it: "Hai raggiunto il limite di domande per oggi. Torna domani, oppure guarda le gare su 247coachai.com/it/gare" };
const OOPS = { en: "Something went wrong on my side. Try again in a minute.", it: "Qualcosa è andato storto da parte mia. Riprova tra un minuto." };

type Update = { message?: { chat: { id: number; type: string }; from?: { language_code?: string; is_bot?: boolean }; text?: string } };

export async function POST(req: Request) {
  if (!raceBotToken() || req.headers.get("x-telegram-bot-api-secret-token") !== raceBotSecret()) return NextResponse.json({ error: "not found" }, { status: 404 });
  const u = (await req.json().catch(() => ({}))) as Update;
  const m = u.message;
  if (!m || m.chat.type !== "private" || m.from?.is_bot) return NextResponse.json({ ok: true });
  const lang = (m.from?.language_code ?? "").toLowerCase().startsWith("it") ? "it" : "en";
  const chatId = m.chat.id;
  const text = (m.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: true });
  if (/^\/(start|help)\b/i.test(text)) {
    await tg("sendMessage", { chat_id: chatId, text: HELLO[lang], disable_web_page_preview: true });
    return NextResponse.json({ ok: true });
  }
  // risposta dopo l'ack: Telegram ritenta se il webhook non risponde in fretta
  after(async () => {
    await tg("sendChatAction", { chat_id: chatId, action: "typing" });
    try {
      const reply = await answerRaceQuestion(chatId, text, lang, isAlpha());
      await tg("sendMessage", { chat_id: chatId, text: reply === "limit" ? LIMIT[lang] : reply, disable_web_page_preview: true });
    } catch (e) {
      console.warn("[racebot]", (e as Error).message);
      await tg("sendMessage", { chat_id: chatId, text: OOPS[lang] });
    }
  });
  return NextResponse.json({ ok: true });
}
