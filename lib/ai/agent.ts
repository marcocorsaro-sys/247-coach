// ============================================================================
// Agente Telegram (sperimentale): risponde in linguaggio naturale a domande
// sull'atleta usando gli stessi strumenti del connettore MCP (piano, attività,
// proiezione gara, messaggi al coach) più forma, prontezza e meteo.
// Attivo solo per gli atleti elencati in TELEGRAM_AGENT_ATHLETE_IDS.
// ============================================================================
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOOLS as BASE_TOOLS, callTool, type Ctx, type Json } from "@/lib/ai/athleteTools";
import { coachName } from "@/lib/ai/coachMessage";
import { computeForm, formText } from "@/lib/ai/fitness";
import { freshReadiness, readinessText } from "@/lib/server/readiness";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { weatherFor } from "@/lib/server/weather";

const MODEL = process.env.TELEGRAM_AGENT_MODEL || "claude-sonnet-5-5";
const MAX_STEPS = 8;
const HISTORY_ROWS = 10;
const HISTORY_HOURS = 24;

export function agentEnabled(athleteId: string): boolean {
  return (process.env.TELEGRAM_AGENT_ATHLETE_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean).includes(athleteId);
}

// Solo lettura, più message_coach perché ciò che l'atleta scriveva al coach da
// Telegram (un dolore, un viaggio) deve continuare ad arrivargli.
const FROM_MCP = ["coach_overview", "get_plan", "tomorrow_briefing", "get_activities", "race_projection", "coach_messages", "message_coach"];

const EXTRA_TOOLS = [
  {
    name: "get_form",
    description: "Forma di allenamento (modello PMC da Intervals): CTL (fitness), ATL (fatica), TSB (freschezza), ramp rate, carico degli ultimi 7 giorni e stato (fresco, in forma, neutro, affaticato, sovraccarico).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_readiness",
    description: "Prontezza di oggi (0-100) da HRV, FC a riposo, sonno e carico, con i fattori e gli ultimi 7 giorni. I dati vengono da Garmin via Intervals.icu.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_weather",
    description: "Previsioni meteo di un giorno (fino a ~16 giorni avanti): condizioni, minima/massima, temperatura alle 7, probabilità di pioggia, vento. Senza 'place' usa la località feriale o del weekend che l'atleta ha impostato in app.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Giorno YYYY-MM-DD (default: domani)." },
        place: { type: "string", description: "Città o località (opzionale)." },
      },
      additionalProperties: false,
    },
  },
] as const;

const TOOLS: Anthropic.Tool[] = [
  ...BASE_TOOLS.filter((t) => FROM_MCP.includes(t.name)).map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema as unknown as Anthropic.Tool.InputSchema })),
  ...EXTRA_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as unknown as Anthropic.Tool.InputSchema })),
];

const romeDate = (offsetDays = 0) => new Date(Date.now() + offsetDays * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });

async function runTool(ctx: Ctx, name: string, args: Json): Promise<string> {
  switch (name) {
    case "get_form":
      return formText(await computeForm(ctx.admin as never, ctx.athleteId).catch(() => null));
    case "get_readiness": {
      const conn = await loadIntervalsConnection(ctx.admin as never, ctx.athleteId).catch(() => null);
      return readinessText(await freshReadiness(ctx.admin as never, ctx.athleteId, conn).catch(() => null)) || "Nessun dato di benessere (serve Garmin collegato a Intervals.icu).";
    }
    case "get_weather": {
      const date = typeof args.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : romeDate(1);
      let place = typeof args.place === "string" ? args.place.trim() : "";
      if (!place) {
        const { data } = await ctx.admin.from("ai_athlete_profiles").select("weather_weekday, weather_weekend, home_base").eq("athlete_id", ctx.athleteId).maybeSingle();
        const w = (data ?? {}) as { weather_weekday?: string | null; weather_weekend?: string | null; home_base?: string | null };
        const dow = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
        place = ((dow >= 5 ? w.weather_weekend || w.weather_weekday : w.weather_weekday || w.weather_weekend) || w.home_base || "").trim();
      }
      if (!place) return "Nessuna località impostata: l'atleta la imposta in app (Dispositivi → Il tuo coach), oppure chiedimi una città.";
      return (await weatherFor(place, date)) ?? `Previsioni non disponibili per ${place} il ${date} (oltre ~16 giorni o località non trovata).`;
    }
    default:
      return callTool(ctx, name, args);
  }
}

function system(ctx: Ctx): string {
  const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return [
    `Sei l'assistente personale di ${ctx.name} su 24/7 Coach, il suo allenatore di endurance AI${ctx.coach !== "Coach" ? ` (lui lo chiama ${ctx.coach})` : ""}. Parli con ${ctx.name.split(" ")[0]} su Telegram.`,
    `Adesso: ${now} (Europe/Rome).`,
    "Rispondi alle sue domande su allenamenti, piano, forma, prontezza, meteo, gare e attività svolte. Per ogni dato usa gli strumenti: non inventare mai numeri, date, ritmi o previsioni, e se uno strumento non ha il dato dillo.",
    "Stile Telegram: breve, diretto, tono amichevole da coach, in italiano. Testo semplice: niente markdown, niente tabelle, niente titoli; al massimo elenchi con il trattino e qualche emoji. Mai più di 12-15 righe, salvo che ti chieda il dettaglio di un allenamento.",
    "Per le date relative (oggi, domani, sabato) calcola il giorno esatto dalla data di adesso. Se la richiesta è ambigua scegli l'interpretazione più probabile e dilla in poche parole.",
    "message_coach inoltra un messaggio al coach, che può cambiare la tabella da domani: usalo SOLO se l'atleta riferisce qualcosa che il piano deve sapere (dolore, malattia, viaggio, allenamento extra, cambio di disponibilità) o chiede esplicitamente di cambiare il piano, con le sue parole. Per le semplici domande non usarlo. Dopo averlo usato dì chiaramente cosa ha deciso il coach.",
    "Non puoi cambiare impostazioni, località meteo, notifiche o gare: si fa nell'app. Non dare consigli medici: per dolori o sintomi rimanda a un professionista.",
  ].join("\n");
}

async function loadHistory(athleteId: string): Promise<Anthropic.MessageParam[]> {
  const since = new Date(Date.now() - HISTORY_HOURS * 3600e3).toISOString();
  const { data } = await createAdminClient()
    .from("agent_chat" as never)
    .select("role, content")
    .eq("athlete_id", athleteId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(HISTORY_ROWS);
  const rows = ((data ?? []) as { role: "user" | "assistant"; content: string }[]).reverse();
  while (rows.length && rows[0].role !== "user") rows.shift();
  return rows.map((r) => ({ role: r.role, content: r.content }));
}

async function buildCtx(athleteId: string): Promise<Ctx> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("full_name, lang").eq("id", athleteId).maybeSingle();
  const p = (data ?? {}) as { full_name?: string | null; lang?: string | null };
  return { admin, athleteId, name: p.full_name ?? "Atleta", lang: p.lang === "en" ? "en" : "it", coach: await coachName(athleteId) };
}

export async function runAgent(athleteId: string, text: string): Promise<string> {
  const ctx = await buildCtx(athleteId);
  const history = await loadHistory(athleteId);
  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: text }];
  const client = new Anthropic();
  const sys = system(ctx);

  let reply = "";
  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 1500, system: sys, tools: TOOLS, messages });
    if (res.stop_reason !== "tool_use") {
      reply = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
      break;
    }
    messages.push({ role: "assistant", content: res.content });
    const results = await Promise.all(
      res.content.flatMap((b) => (b.type === "tool_use" ? [b] : [])).map(async (b): Promise<Anthropic.ToolResultBlockParam> => {
        try {
          const out = await runTool(ctx, b.name, (b.input ?? {}) as Json);
          return { type: "tool_result", tool_use_id: b.id, content: out.slice(0, 20000) };
        } catch (e) {
          return { type: "tool_result", tool_use_id: b.id, content: `Errore: ${(e as Error).message}`, is_error: true };
        }
      }),
    );
    messages.push({ role: "user", content: results });
  }
  if (!reply) throw new Error("agente senza risposta");

  await createAdminClient()
    .from("agent_chat" as never)
    .insert([{ athlete_id: athleteId, role: "user", content: text.slice(0, 4000) }, { athlete_id: athleteId, role: "assistant", content: reply.slice(0, 4000) }] as never);
  return reply;
}
