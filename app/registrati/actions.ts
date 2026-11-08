"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAiCoachMode } from "@/lib/ai/mode";
import { notifyLead } from "@/lib/notify/lead";
import { sendWelcome } from "@/lib/notify/welcome";
import { getRaceBundle } from "@/lib/site/races";
import { normLang, makeT } from "@/lib/app-i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

/**
 * Signup self-service 24/7 Coach: la funzione SQL ai_signup crea utente
 * confermato + profilo + relazione col coach AI, poi si entra subito.
 */
export async function signUp(formData: FormData) {
  if (!isAiCoachMode()) redirect("/login");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  // Arrivo dal sito (scheda gara): la gara scelta e la sorgente dati
  // viaggiano fino all'onboarding, che le propone già compilate.
  const race = String(formData.get("race") ?? "").trim();
  const connect = String(formData.get("connect") ?? "").trim();
  const q = new URLSearchParams();
  if (race) q.set("race", race);
  if (connect) q.set("connect", connect);
  const onboardingUrl = q.size ? `/onboarding?${q}` : "/onboarding";

  const supabase = await createClient();
  const { error } = await supabase.rpc("ai_signup" as never, {
    p_email: email,
    p_password: password,
    p_full_name: fullName,
  } as never);
  if (error) {
    const back = new URLSearchParams({ error: error.message });
    if (race) back.set("race", race);
    redirect(`/registrati?${back}`);
  }

  const lang = normLang(String(formData.get("lang") ?? "it"));
  const { data: created } = await createAdminClient().from("profiles").select("id").eq("email", email).maybeSingle();
  if (created) await createAdminClient().from("profiles").update({ lang } as never).eq("id", (created as { id: string }).id);
  (await cookies()).set("app_lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  await notifyLead({ name: fullName || email, email, source: "email", race });
  const rb = race ? await getRaceBundle(race).catch(() => null) : null;
  await sendWelcome(email, fullName || email, rb?.race.name ?? null, lang);

  const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
  if (loginErr) {
    redirect(`/login?info=${encodeURIComponent(makeT(lang)("Account creato: accedi con le tue credenziali."))}`);
  }
  const inv = (await cookies()).get("coach_invite")?.value;
  if (inv && /^[0-9a-f]{6,16}$/.test(inv)) redirect(`/invito/${inv}`);
  if ((await cookies()).get("pro_signup")?.value) redirect("/pro");
  redirect(onboardingUrl);
}
