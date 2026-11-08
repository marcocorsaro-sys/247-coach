// Webhook del bot Telegram @Coachai247_bot: chi lo avvia (link dall'app o
// dall'email di benvenuto) riceve la guida passo-passo per collegare Intervals.
// Telegram firma ogni chiamata con l'header X-Telegram-Bot-Api-Secret-Token.
import { after, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiAthleteIds } from "@/lib/server/appScope";
import { coachName, handleCoachMessage } from "@/lib/ai/coachMessage";
import { eveningMessage, tgSend, todayMessage } from "@/lib/notify/athlete";
import { loadReadiness } from "@/lib/server/readiness";
import { agentEnabled, runAgent } from "@/lib/ai/agent";

export const maxDuration = 300;

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://247coachai.com";

const GUIDE = [
  "🏁 *Ciao! Sono il bot di 24/7 Coach.*",
  "Ecco come collegare *Intervals.icu*: è gratis e serve a due cose: leggere il tuo storico Garmin/Strava e mandare gli allenamenti del piano sul tuo orologio.",
  "",
  "*1. Crea l'account* → https://intervals.icu (Sign up, anche con Google)",
  "*2. Collega il dispositivo* → icona ingranaggio *Settings* → *Connections* → *Connect* su Garmin (o Strava, Coros, Polar, Suunto). Per Garmin spunta anche *Upload planned workouts*.",
  "*3. Aspetta l'import* dello storico: qualche minuto, a volte fino a mezz'ora.",
  "*4. Copia la API key* → sempre in *Settings*, in fondo: *Developer Settings* → *Generate API Key*.",
  "*5. Incollala nell'app* → " + APP + "/onboarding#intervals (sezione 5) e premi *Salva i miei dati*. L'Athlete ID è facoltativo.",
  "",
  "Fatto questo leggo i tuoi allenamenti veri e il piano parte dai tuoi dati. Se ti blocchi, rispondi qui con cosa vedi a schermo 👇",
].join("\n");

const GUIDE_EN = [
  "🏁 *Hi! I'm the 24/7 Coach bot.*",
  "Here's how to connect *Intervals.icu*: it's free and does two things: reads your Garmin/Strava history and sends your plan's workouts to your watch.",
  "",
  "*1. Create an account* → https://intervals.icu (Sign up, Google works too)",
  "*2. Connect your device* → gear icon *Settings* → *Connections* → *Connect* on Garmin (or Strava, Coros, Polar, Suunto). For Garmin also tick *Upload planned workouts*.",
  "*3. Wait for the import* of your history: a few minutes, sometimes up to half an hour.",
  "*4. Copy your API key* → still in *Settings*, at the bottom: *Developer Settings* → *Generate API Key*.",
  "*5. Paste it in the app* → " + APP + "/onboarding#intervals (section 5) and press *Save*. The Athlete ID is optional.",
  "",
  "Then I read your real workouts and your plan starts from your data. If you get stuck, reply here with what you see on screen 👇",
].join("\n");

async function send(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }),
  }).catch(() => {});
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const upd = (await req.json().catch(() => null)) as { message?: { chat?: { id: number; first_name?: string; username?: string }; from?: { language_code?: string }; text?: string } } | null;
  const msg = upd?.message;
  const chatId = msg?.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true });
  const text = (msg?.text ?? "").trim();
  const owner = process.env.TELEGRAM_CHAT_ID;
  const en = !(msg?.from?.language_code ?? "it").toLowerCase().startsWith("it");

  const admin = createAdminClient();
  const who = [msg?.chat?.first_name, msg?.chat?.username ? `@${msg.chat.username}` : null].filter(Boolean).join(" ");

  // 1) Collegamento dall'app: /start l_<token personale> → questa chat diventa il canale del coach.
  const link = text.match(/^\/start\s+l_([0-9a-f-]{36})/i);
  if (link) {
    const { data: p } = await admin.from("profiles").select("id, full_name").eq("mcp_token" as never, link[1]).maybeSingle();
    const prof = p as { id: string; full_name: string | null } | null;
    if (prof && (await aiAthleteIds()).has(prof.id)) {
      await admin.from("ai_athlete_profiles").update({ telegram_chat_id: null } as never).eq("telegram_chat_id" as never, chatId);
      await admin.from("ai_athlete_profiles").update({ telegram_chat_id: chatId } as never).eq("athlete_id", prof.id);
      const coach = await coachName(prof.id);
      await send(chatId, en
        ? `✅ *Connected!* I'm ${coach}, your coach on 24/7 Coach.\n\nEvery evening I'll send you tomorrow's workout, and I'll tell you here whenever I change your plan.\nWrite to me here like in the app: how a workout went, if you're tired, if you're travelling.\n\nCommands: /domani tomorrow's workout · /oggi today · /stato readiness`
        : `✅ *Collegato!* Sono ${coach}, il tuo coach su 24/7 Coach.\n\nOgni sera ti mando l'allenamento di domani e ti avviso qui quando cambio la tabella.\nScrivimi qui come nell'app: com'è andato un allenamento, se sei stanco, se sei in viaggio.\n\nComandi: /domani allenamento di domani · /oggi oggi · /stato prontezza`);
      if (owner) await send(Number(owner), `🔗 ${prof.full_name ?? who} ha collegato Telegram al coach`);
    } else {
      await send(chatId, en ? "This link is not valid anymore: open the app and tap the Telegram button again." : "Questo link non è più valido: apri l'app e premi di nuovo il bottone Telegram.");
    }
    return NextResponse.json({ ok: true });
  }

  // 2) Chat già collegata a un atleta: comandi o messaggio al coach.
  const { data: linked } = await admin.from("ai_athlete_profiles").select("athlete_id").eq("telegram_chat_id" as never, chatId).maybeSingle();
  const athleteId = (linked as { athlete_id?: string } | null)?.athlete_id;
  if (athleteId && text) {
    if (/^\/(domani|tomorrow)/i.test(text)) {
      const m = await eveningMessage(athleteId);
      if (m) await tgSend(chatId, m.text);
    } else if (/^\/(oggi|today)/i.test(text)) {
      const m = await todayMessage(athleteId);
      await tgSend(chatId, m);
    } else if (/^\/(stato|status|prontezza)/i.test(text)) {
      const r = await loadReadiness(admin as never, athleteId).catch(() => null);
      await tgSend(chatId, r ? `<b>${r.score}/100 · ${r.level}</b>\n${r.advice}\n\n${r.factors.map((f) => `• ${f.label}: ${f.value} (${f.note})`).join("\n")}` : "Nessun dato di benessere ancora (serve Garmin collegato a Intervals.icu).");
    } else if (/^\/start/i.test(text)) {
      await send(chatId, en ? GUIDE_EN : GUIDE);
    } else if (agentEnabled(athleteId)) {
      // Agente sperimentale (solo atleti in TELEGRAM_AGENT_ATHLETE_IDS): risponde dopo
      // aver risposto 200 a Telegram, così non rimanda l'aggiornamento. Se fallisce
      // il messaggio passa al coach come prima.
      after(async () => {
        const typing = () => fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendChatAction`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, action: "typing" }) }).catch(() => {});
        await typing();
        const keepTyping = setInterval(typing, 4500);
        try {
          const reply = await runAgent(athleteId, text.slice(0, 4000));
          await tgSend(chatId, reply.slice(0, 3900).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
        } catch (e) {
          console.error("[telegram-agent]", (e as Error).message);
          try {
            const r = await handleCoachMessage(athleteId, text.slice(0, 4000), "telegram");
            await tgSend(chatId, r.reply.replace(/&/g, "&amp;").replace(/</g, "&lt;"));
          } catch {
            await send(chatId, en ? "Sorry, something went wrong: try again in a minute." : "Scusa, qualcosa è andato storto: riprova tra un minuto.");
          }
        } finally {
          clearInterval(keepTyping);
        }
      });
    } else {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendChatAction`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, action: "typing" }) }).catch(() => {});
      try {
        const r = await handleCoachMessage(athleteId, text.slice(0, 4000), "telegram");
        const what = r.decision === "now" ? (en ? "\n\n🔄 I'm updating your plan from tomorrow: you'll get a message here when it's ready." : "\n\n🔄 Sto aggiornando la tabella da domani: ti scrivo qui quando è pronta.") : r.decision === "sunday" ? (en ? "\n\n🗓 I'll factor it into Sunday's review." : "\n\n🗓 Ne tengo conto nella revisione di domenica.") : "";
        await tgSend(chatId, `${r.reply.replace(/&/g, "&amp;").replace(/</g, "&lt;")}${what}`);
      } catch {
        await send(chatId, en ? "Sorry, something went wrong: try again in a minute." : "Scusa, qualcosa è andato storto: riprova tra un minuto.");
      }
    }
    if (owner && String(chatId) !== owner) await send(Number(owner), `💬 ${who || chatId} → coach: ${text.slice(0, 500)}`);
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/start") || /intervals|guida|help|aiuto/i.test(text)) {
    await send(chatId, en ? GUIDE_EN : GUIDE);
  } else if (String(chatId) !== owner) {
    await send(chatId, en ? "Thanks! I've passed your message to the team, we'll reply here. To see the Intervals guide again type /start" : "Grazie! Ho girato il tuo messaggio al team, ti rispondiamo qui. Per rivedere la guida Intervals scrivi /start");
  }
  // Ogni messaggio di un atleta arriva anche al titolare.
  if (owner && String(chatId) !== owner) {
    await send(Number(owner), `💬 Telegram da ${who || chatId}: ${text.slice(0, 500)}`);
  }
  return NextResponse.json({ ok: true });
}
