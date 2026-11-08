import { createAdminClient } from "@/lib/supabase/admin";
import { aiAthleteIds } from "@/lib/server/appScope";
import { coachName } from "@/lib/ai/coachMessage";
import { TOOLS, callTool, type Ctx, type Json } from "@/lib/ai/athleteTools";

/**
 * Server MCP personale dell'atleta 24/7 Coach (Streamable HTTP, stateless).
 * URL: https://247coachai.com/api/mcp/<mcp_token>
 * Si aggiunge come connettore personalizzato in Claude o ChatGPT: l'atleta
 * parla col suo coach (piano, attività, proiezione gara, messaggi, revisioni).
 * Il token nell'URL è la chiave: vale solo per gli atleti del coach AI.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SERVER = { name: "247coachai", title: "24/7 Coach AI", version: "1.0.0" };
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

// ---------------------------------------------------------------- JSON-RPC
type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Json };

function instructions(ctx: Ctx): string {
  return `You are connected to ${ctx.name}'s personal 24/7 Coach AI (247coachai.com), an AI triathlon/endurance coach${ctx.coach !== "Coach" ? ` that the athlete calls "${ctx.coach}": when the athlete mentions ${ctx.coach}, they mean this coach` : ""}. Use coach_overview first to learn the athlete's goals, races, thresholds and the next 7 days. Use get_plan for workout details and get_activities to compare what was done with the plan. The plan is reviewed automatically every Sunday evening; message_coach forwards a message to the coach (it may change the plan from tomorrow) and request_plan_review forces an immediate review: only use these two when the athlete asks. Reply in the athlete's language (${ctx.lang === "en" ? "English" : "Italian"}). Training advice is not medical advice.`;
}

async function handle(ctx: Ctx, m: Rpc): Promise<Json | null> {
  const isNotification = m.id === undefined || m.id === null;
  const ok = (result: Json) => ({ jsonrpc: "2.0", id: m.id, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id: m.id ?? null, error: { code, message } });
  try {
    switch (m.method) {
      case "initialize": {
        const req = String((m.params as Json | undefined)?.protocolVersion ?? "");
        return ok({
          protocolVersion: PROTOCOLS.includes(req) ? req : PROTOCOLS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER,
          instructions: instructions(ctx),
        });
      }
      case "ping":
        return isNotification ? null : ok({});
      case "tools/list":
        return ok({ tools: TOOLS as unknown as Json[] });
      case "tools/call": {
        const p = (m.params ?? {}) as { name?: string; arguments?: Json };
        const name = String(p.name ?? "");
        if (!TOOLS.some((t) => t.name === name)) return err(-32602, `Unknown tool: ${name}`);
        await ctx.admin.from("mcp_log" as never).insert({ athlete_id: ctx.athleteId, tool: name } as never);
        try {
          const text = await callTool(ctx, name, p.arguments ?? {});
          return ok({ content: [{ type: "text", text }], isError: false });
        } catch (e) {
          return ok({ content: [{ type: "text", text: `Errore: ${(e as Error).message}` }], isError: true });
        }
      }
      case "resources/list":
        return ok({ resources: [] });
      case "prompts/list":
        return ok({ prompts: [] });
      default:
        if (isNotification) return null;
        return err(-32601, `Method not found: ${m.method}`);
    }
  } catch (e) {
    return isNotification ? null : err(-32603, (e as Error).message);
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
};

async function resolve(token: string): Promise<Ctx | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, full_name, lang").eq("mcp_token" as never, token).maybeSingle();
  const p = data as { id: string; full_name: string | null; lang: string | null } | null;
  if (!p) return null;
  // Solo atleti di 24/7 Coach: gli atleti di Irene non hanno accesso.
  if (!(await aiAthleteIds()).has(p.id)) return null;
  return { admin, athleteId: p.id, name: p.full_name ?? "Atleta", lang: p.lang === "en" ? "en" : "it", coach: await coachName(p.id) };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  // Niente stream SSE lato server: server stateless, solo POST.
  return new Response("Method Not Allowed", { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } });
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const c = await resolve(token);
  if (!c) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid or revoked 24/7 Coach link" } }, { status: 404, headers: CORS });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS });
  }
  const msgs = (Array.isArray(body) ? body : [body]) as Rpc[];
  const out = (await Promise.all(msgs.map((m) => handle(c, m)))).filter(Boolean) as Json[];
  if (!out.length) return new Response(null, { status: 202, headers: CORS });
  return Response.json(Array.isArray(body) ? out : out[0], { headers: CORS });
}
