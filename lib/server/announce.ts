// Annuncio di una novità a tutti gli atleti 24/7 Coach (mai quelli di Irene),
// nella voce del loro coach: si mette in coda (coach_outbox) e parte su
// Telegram al giro orario successivo. {coach} nel testo = nome del coach.
type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
import { aiAthleteIds } from "@/lib/server/appScope";

export async function announceFeature(db: Db, text: string, opts: { includeShadow?: boolean } = {}): Promise<number> {
  const ai = await aiAthleteIds();
  const { data } = await db.from("ai_athlete_profiles").select("athlete_id, coach_name, telegram_chat_id, shadow_plan").not("telegram_chat_id", "is", null);
  const rows = ((data ?? []) as { athlete_id: string; coach_name: string | null; telegram_chat_id: unknown; shadow_plan: boolean | null }[])
    .filter((r) => ai.has(r.athlete_id) && (opts.includeShadow || !r.shadow_plan));
  if (!rows.length) return 0;
  await db.from("feature_announcements").insert({ text, recipients: rows.length });
  const { error } = await db.from("coach_outbox").insert(
    rows.map((r) => {
      const coach = r.coach_name?.trim() || "Il tuo coach";
      const body = text.replaceAll("{coach}", coach).trim();
      return { athlete_id: r.athlete_id, text: body.endsWith(coach) ? body : `${body}\n\n${coach}` };
    }),
  );
  return error ? 0 : rows.length;
}
