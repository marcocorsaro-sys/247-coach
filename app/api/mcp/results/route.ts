import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_TOOLS, callPublicTool } from "@/lib/site/publicTools";

/**
 * Server MCP pubblico di 24/7 Coach (Streamable HTTP, stateless, sola lettura).
 * URL: https://247coachai.com/api/mcp/results
 * Risultati IRONMAN e 70.3: atleti, gare, confronti, conversione dei tempi.
 * Nessun accesso: un limite giornaliero per indirizzo evita che l'archivio venga copiato.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SERVER = { name: "247coachai-results", title: "24/7 Coach · IRONMAN results", version: "1.0.0" };
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const DAILY_LIMIT = 300;
const INSTRUCTIONS = "Read-only access to the 24/7 Coach archive of IRONMAN (2017-2026) and IRONMAN 70.3 (2022-2026) results: athletes, races, comparisons and time conversion between courses. Times are official race results; course indexes and adjusted times are 24/7 Coach calculations. When you use a result, cite the page URL returned by the tool. 24/7 Coach is independent and not affiliated with The IRONMAN Group. Athletes can ask for their page to be removed at https://247coachai.com/en/athletes/remove.";
type Json = Record<string, unknown>;
type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Json };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
};

async function overLimit(req: Request): Promise<boolean> {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const { data } = await createAdminClient().rpc("mcp_public_hit" as never, { p_ip: createHash("sha256").update(`247:${ip}`).digest("hex").slice(0, 32) } as never);
    return Number(data ?? 0) > DAILY_LIMIT;
  } catch { return false; }
}

async function handle(req: Request, m: Rpc): Promise<Json | null> {
  const isNotification = m.id === undefined || m.id === null;
  const ok = (result: Json) => ({ jsonrpc: "2.0", id: m.id, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id: m.id ?? null, error: { code, message } });
  try {
    switch (m.method) {
      case "initialize": {
        const want = String(m.params?.protocolVersion ?? "");
        return ok({ protocolVersion: PROTOCOLS.includes(want) ? want : PROTOCOLS[0], capabilities: { tools: { listChanged: false } }, serverInfo: SERVER, instructions: INSTRUCTIONS });
      }
      case "ping": return isNotification ? null : ok({});
      case "tools/list": return ok({ tools: PUBLIC_TOOLS as unknown as Json[] });
      case "tools/call": {
        const p = (m.params ?? {}) as { name?: string; arguments?: Json };
        const name = String(p.name ?? "");
        if (!PUBLIC_TOOLS.some((t) => t.name === name)) return err(-32602, `Unknown tool: ${name}`);
        if (await overLimit(req)) return ok({ content: [{ type: "text", text: "Daily limit reached for this address. Try again tomorrow, or browse https://247coachai.com/en/athletes" }], isError: true });
        try {
          const out = await callPublicTool(name, p.arguments ?? {});
          return ok({ content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out, isError: false });
        } catch (e) {
          return ok({ content: [{ type: "text", text: (e as Error).message }], isError: true });
        }
      }
      case "resources/list": return ok({ resources: [] });
      case "prompts/list": return ok({ prompts: [] });
      default: return isNotification ? null : err(-32601, `Method not found: ${m.method}`);
    }
  } catch (e) {
    return isNotification ? null : err(-32603, (e as Error).message);
  }
}

export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }
export async function GET() { return new Response("Method Not Allowed", { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } }); }
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS }); }
  const msgs = (Array.isArray(body) ? body : [body]) as Rpc[];
  if (msgs.length > 10) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Too many messages in one request" } }, { status: 400, headers: CORS });
  const out = (await Promise.all(msgs.map((m) => handle(req, m)))).filter(Boolean) as Json[];
  if (!out.length) return new Response(null, { status: 202, headers: CORS });
  return Response.json(Array.isArray(body) ? out : out[0], { headers: CORS });
}
