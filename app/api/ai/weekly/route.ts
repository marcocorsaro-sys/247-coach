// Revisione settimanale 24/7 Coach.
//  GET  — cron Vercel (domenica pomeriggio) con Authorization: Bearer
//         CRON_SECRET, oppure manuale con ?secret=…&athlete_id=… (sincrono).
//         Senza athlete_id fa fan-out: una invocazione per atleta, in
//         parallelo (una revisione può durare minuti).
//  POST — forced refresh dell'atleta loggato (vedi actions.ts); qui solo la
//         variante JSON per client esterni.
// Nell'app di Irene (APP_MODE non ai_coach) è un 404.
import { NextResponse } from "next/server";
import { isAiCoachMode } from "@/lib/ai/mode";
import { listAiAthletes, weeklyReview } from "@/lib/ai/plan";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAiCoachMode()) {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const auth = req.headers.get("authorization");
  const authorized =
    !!secret && (auth === `Bearer ${secret}` || url.searchParams.get("secret") === secret);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const only = url.searchParams.get("athlete_id");
  if (only) {
    const note = url.searchParams.get("note") ?? undefined;
    try {
      const r = await weeklyReview(only, { note });
      return NextResponse.json(
        { athletes: 1, results: { [only]: r.ok ? `ok (${r.weeks} settimane)` : `errore: ${r.error}` }, message: r.message },
        { status: r.ok ? 200 : 500 },
      );
    } catch (e) {
      return NextResponse.json(
        { athletes: 1, results: { [only]: `errore: ${(e as Error).message}` } },
        { status: 500 },
      );
    }
  }

  const athletes = await listAiAthletes();
  const results = Object.fromEntries(
    await Promise.all(
      athletes.map(async (id): Promise<[string, string]> => {
        try {
          const r = await fetch(
            `${url.origin}/api/ai/weekly?secret=${secret}&athlete_id=${id}`,
            { cache: "no-store" },
          );
          const j = (await r.json()) as { results?: Record<string, string> };
          return [id, j.results?.[id] ?? `HTTP ${r.status}`];
        } catch (e) {
          return [id, `errore: ${(e as Error).message}`];
        }
      }),
    ),
  );
  return NextResponse.json({ athletes: athletes.length, results });
}
