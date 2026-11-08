// Callback OAuth (Google) per 24/7 Coach: scambia il code con la sessione e,
// se l'utente è nuovo, crea profilo + relazione con il coach AI + profilo AI
// (lo stesso che fa ai_signup per la registrazione via email).
// GET /auth/callback?code=…&next=/onboarding&race=…&connect=…
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_COACH_ID, isAiCoachMode } from "@/lib/ai/mode";
import { notifyLead } from "@/lib/notify/lead";
import { sendWelcome } from "@/lib/notify/welcome";
import { normLang } from "@/lib/app-i18n";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  if (err || !code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err ?? "Accesso Google non riuscito")}`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message ?? "Sessione non creata")}`);
  }
  const user = data.user;

  // Profilo: esiste già (utente di ritorno) oppure va creato (nuovo da Google).
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("id, role, created_at").eq("id", user.id).maybeSingle();
  let isNew = false;
  // Il trigger on_auth_user_created crea già il profilo: un utente Google è
  // "nuovo" anche se il profilo esiste, purché appena creato e senza coach.
  let freshFromTrigger = false;
  if (prof && isAiCoachMode()) {
    const { count } = await admin.from("coaching_relationships").select("id", { count: "exact", head: true }).eq("athlete_id", user.id);
    const age = Date.now() - new Date((prof as { created_at: string }).created_at).getTime();
    freshFromTrigger = (count ?? 0) === 0 && age < 15 * 60 * 1000;
  }
  if (!prof || freshFromTrigger) {
    if (!isAiCoachMode()) {
      // App di Irene: gli atleti li crea la coach, niente self-signup.
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Account non abilitato: chiedi alla tua coach.")}`);
    }
    isNew = true;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = String(meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Atleta").trim();
    if (!prof) await admin.from("profiles").insert({ id: user.id, email: user.email, full_name: fullName, role: "athlete" });
    await admin.from("coaching_relationships").insert({ coach_id: AI_COACH_ID, athlete_id: user.id, active: true });
    // Lingua: dal sito (?lang=), poi cookie, poi browser. Non italiano → inglese.
    const lang = normLang(url.searchParams.get("lang") ?? (await cookies()).get("app_lang")?.value ?? req.headers.get("accept-language")?.split(",")[0] ?? "it");
    await admin.from("profiles").update({ lang } as never).eq("id", user.id);
    await notifyLead({ name: fullName, email: user.email ?? null, source: "google", race: url.searchParams.get("race") ?? undefined });
    await sendWelcome(user.email, fullName, null, lang);
    await admin.from("ai_athlete_profiles").upsert({ athlete_id: user.id }, { onConflict: "athlete_id", ignoreDuplicates: true });
  }

  const q = new URLSearchParams();
  for (const k of ["race", "connect"]) { const v = url.searchParams.get(k); if (v) q.set(k, v); }
  const next = url.searchParams.get("next");
  const inv = (await cookies()).get("coach_invite")?.value;
  if (inv && /^[0-9a-f]{6,16}$/.test(inv) && isAiCoachMode()) return NextResponse.redirect(`${origin}/invito/${inv}`);
  if ((await cookies()).get("pro_signup")?.value && isAiCoachMode()) return NextResponse.redirect(`${origin}/pro`);
  const dest = isNew ? `/onboarding${q.size ? `?${q}` : ""}` : next && next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${dest}`);
}
