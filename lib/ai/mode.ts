// ============================================================================
// 24/7 Coach: modalità app. Lo stesso repo serve due prodotti:
//  - app di Irene (default)
//  - 24/7 Coach (APP_MODE=ai_coach + NEXT_PUBLIC_APP_MODE=ai_coach): signup
//    self-service, onboarding, piani generati da Claude.
// ============================================================================

/** Id fisso dell'utente coach AI (migrazione 0019). */
export const AI_COACH_ID = "77777777-7777-7777-7777-777777777777";

/** true se questa istanza è l'app 24/7 Coach (lato server). */
export function isAiCoachMode(): boolean {
  return (
    process.env.APP_MODE === "ai_coach" ||
    process.env.NEXT_PUBLIC_APP_MODE === "ai_coach"
  );
}
