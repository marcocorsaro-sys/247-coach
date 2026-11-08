// Avvia la generazione del piano per l'atleta loggato (app 24/7 Coach).
// La generazione dura minuti: risponde SUBITO con un redirect alla pagina di
// attesa e lavora in background (after()); la pagina si auto-aggiorna finché
// il piano non è pronto. Lock su ai_generation_started_at contro i doppi click.
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAiCoachMode } from "@/lib/ai/mode";
import { generateInitialPlan } from "@/lib/ai/plan";
import { resolveViewAs } from "@/lib/server/viewAs";

export const maxDuration = 300;

/**
 * Variante di servizio (protetta da CRON_SECRET): genera il piano per un
 * atleta specifico, in modo sincrono. Usata per interventi manuali/admin.
 * GET /api/ai/generate?secret=CRON_SECRET&athlete_id=…
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const athleteId = url.searchParams.get("athlete_id");
  if (!athleteId) return NextResponse.json({ error: "athlete_id mancante" }, { status: 400 });
  const feedback = url.searchParams.get("feedback") ?? undefined;
  const r = await generateInitialPlan(athleteId, { feedback });
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}

export async function POST(req: Request) {
  if (!isAiCoachMode()) {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const va = await resolveViewAs(supabase, user!.id);
  const athleteId = va.athleteId ?? user!.id;

  // Già in corso da meno di 10 minuti? Non avviarne un'altra.
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_athlete_profiles")
    .select("ai_generation_started_at")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const startedAt = (data as { ai_generation_started_at: string | null } | null)
    ?.ai_generation_started_at;
  const running =
    startedAt != null && Date.now() - new Date(startedAt).getTime() < 10 * 60_000;

  if (!running) {
    // Lock sincrono prima del redirect: la pagina di attesa deve trovare la
    // generazione già "in corso" al primo caricamento.
    await admin
      .from("ai_athlete_profiles")
      .update({ ai_generation_started_at: new Date().toISOString(), ai_last_error: null })
      .eq("athlete_id", athleteId);
    after(async () => {
      try {
        await generateInitialPlan(athleteId);
      } catch (e) {
        console.error("[ai-generate]", athleteId, (e as Error).message);
      }
    });
  }

  redirect("/onboarding?generating=1");
}
