// ============================================================================
// Branding per-app: lo stesso codice serve "Tabella" (Irene Coletto Coaching)
// e "24/7 Coach" (coach AI self-service). NEXT_PUBLIC_APP_MODE è inlined al
// build, quindi ogni progetto Vercel mostra solo il proprio brand.
// ============================================================================

export const IS_AI_APP = process.env.NEXT_PUBLIC_APP_MODE === "ai_coach";

/** Lettera nel quadratino del logo. */
export const BRAND_DOT = IS_AI_APP ? "24" : "T";

/** Nome dell'app (senza punto finale: lo aggiunge il markup). */
export const BRAND_NAME = IS_AI_APP ? "24/7 Coach" : "Tabella";

export const APP_TITLE = IS_AI_APP
  ? "24/7 Coach · Gare Ironman e tabelle di allenamento AI"
  : "Tabella · Irene Coletto Coaching";

export const APP_DESCRIPTION = IS_AI_APP
  ? "Guida alle gare Ironman e 70.3 in Europa e tabelle di allenamento AI costruite sul percorso della tua gara, che si adattano a come ti alleni davvero."
  : "Le tabelle di Irene, tutte in un posto.";
