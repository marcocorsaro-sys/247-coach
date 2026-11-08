// ============================================================================
// Chiamata a Claude per la generazione dei piani. Modello: Fable 5 (il più
// capace) con fallback server-side automatico su Opus in caso di refusal dei
// classificatori. Output strutturato via JSON schema: la risposta è già il
// piano tipizzato, niente parsing fragile.
// Streaming: le generazioni possono durare minuti, lo stream evita i timeout
// HTTP dell'SDK.
// ============================================================================

import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-fable-5";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY mancante: configura la variabile su Vercel.");
    }
    _client = new Anthropic();
  }
  return _client;
}

export interface AiCallResult<T> {
  ok: boolean;
  data?: T;
  model?: string;
  refusal?: boolean;
  error?: string;
}

/**
 * Una chiamata "genera JSON secondo questo schema". `system` è il ruolo del
 * coach, `prompt` il contesto+richiesta, `schema` lo JSON schema dell'output.
 */
export async function generateStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  /** "high" (default) per i piani da zero; "medium" per le revisioni rapide. */
  effort?: "low" | "medium" | "high";
}): Promise<AiCallResult<T>> {
  try {
    const stream = client().beta.messages.stream({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 32000,
      betas: ["server-side-fallback-2026-07-01"],
      // Refusal dei classificatori → ritenta automaticamente su Opus.
      fallbacks: "default",
      system: opts.system,
      output_config: {
        effort: opts.effort ?? "high",
        format: {
          type: "json_schema",
          schema: opts.schema,
        },
      },
      messages: [{ role: "user", content: opts.prompt }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return { ok: false, refusal: true, error: "Richiesta rifiutata dai filtri di sicurezza." };
    }
    if (message.stop_reason === "max_tokens") {
      return { ok: false, error: "Output troncato (max_tokens): riprovare." };
    }
    const text = message.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { ok: true, data: JSON.parse(text) as T, model: message.model };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
