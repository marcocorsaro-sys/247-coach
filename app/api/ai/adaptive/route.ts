// ============================================================================
// Coach adattivo 24/7 (cron Vercel, ogni mattina): sync attività + confronto
// piano/svolto di ieri + reazione (revisione automatica o domanda all'atleta).
// GET con Authorization: Bearer CRON_SECRET (cron) o ?secret= (manuale);
// ?athlete_id= limita il controllo a un solo atleta.
// Nell'app di Irene (APP_MODE non ai_coach) è un 404, come /api/ai/weekly.
// ============================================================================

import { NextResponse } from "next/server";
import { isAiCoachMode } from "@/lib/ai/mode";
import { listAiAthletes } from "@/lib/ai/plan";
import { adaptiveCheck } from "@/lib/ai/adaptive";

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
    try {
      const r = await adaptiveCheck(only);
      return NextResponse.json({
        athletes: 1,
        results: { [only]: r.ok ? `${r.event ?? "ok"} (sync ${r.synced ?? 0})` : `errore: ${r.error ?? "?"}` },
      });
    } catch (e) {
      return NextResponse.json(
        { athletes: 1, results: { [only]: `errore: ${(e as Error).message}` } },
        { status: 500 },
      );
    }
  }

  // FAN-OUT: una invocazione per atleta, in parallelo. Una revisione può
  // durare 2-4 minuti: in sequenza due atleti sforano i 300s della funzione
  // (revisioni uccise a metà). Ogni sotto-richiesta ha il suo maxDuration e
  // completa anche se questa richiesta madre venisse interrotta.
  const athletes = await listAiAthletes();
  const results = Object.fromEntries(
    await Promise.all(
      athletes.map(async (id): Promise<[string, string]> => {
        try {
          const r = await fetch(
            `${url.origin}/api/ai/adaptive?secret=${secret}&athlete_id=${id}`,
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
