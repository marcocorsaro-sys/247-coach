"use server";
// Azioni dell'area coach di 24/7 Coach (/pro) e dell'invito atleta (/invito).
import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAiCoachMode } from "@/lib/ai/mode";
import { aiAthleteIds } from "@/lib/server/appScope";
import { coachByInvite, getHumanCoach, isCoachOf } from "@/lib/server/humanCoach";
import { generateInitialPlan } from "@/lib/ai/plan";
import { tgSend } from "@/lib/notify/athlete";

const s = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

async function currentUser() {
  if (!isAiCoachMode()) redirect("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

async function ownerTg(text: string) {
  const owner = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (owner) await tgSend(owner, text).catch(() => false);
}

/** Attiva l'area coach per l'utente collegato. */
export async function activateCoach(formData: FormData) {
  const user = await currentUser();
  const name = s(formData.get("display_name")).replace(/[<>]/g, "").slice(0, 60);
  const club = s(formData.get("club")).replace(/[<>]/g, "").slice(0, 80) || null;
  if (name.length < 2) redirect("/pro?err=name");
  const admin = createAdminClient();
  if (!(await getHumanCoach(user.id))) {
    // Profilo minimo se manca (utente creato altrove).
    await admin.from("profiles").upsert({ id: user.id, email: user.email, full_name: name, role: "athlete" } as never, { onConflict: "id", ignoreDuplicates: true });
    const { error } = await admin.from("ai_coaches").insert({ user_id: user.id, display_name: name, club } as never);
    if (error) redirect(`/pro?err=${encodeURIComponent(error.message)}`);
    (await cookies()).delete("pro_signup");
    await ownerTg(`🧑‍🏫 Nuovo coach su 247: <b>${name}</b>${club ? ` (${club})` : ""} · ${user.email ?? ""}`);
  }
  redirect("/pro");
}

/** Indicazioni del coach per l'AI dell'atleta (+ revisione opzionale). */
export async function saveDirectives(formData: FormData) {
  const user = await currentUser();
  const athleteId = s(formData.get("athlete_id"));
  if (!(await getHumanCoach(user.id)) || !(await isCoachOf(user.id, athleteId))) redirect("/pro");
  const text = s(formData.get("directives")).slice(0, 4000);
  const admin = createAdminClient();
  await admin
    .from("ai_athlete_profiles")
    .update({ coach_directives: text || null, coach_directives_at: new Date().toISOString(), coach_directives_by: user.id } as never)
    .eq("athlete_id", athleteId);
  if (formData.get("regen") === "on" || formData.get("regen_now") === "1") {
    const coach = await getHumanCoach(user.id);
    await admin.from("ai_athlete_profiles").update({ ai_generation_started_at: new Date().toISOString(), ai_last_error: null } as never).eq("athlete_id", athleteId);
    const fb = `Il tuo allenatore ${coach?.display_name ?? ""} ha aggiornato le indicazioni${text ? `: ${text.slice(0, 600)}` : ""}`;
    after(async () => {
      try { await generateInitialPlan(athleteId, { feedback: fb }); } catch (e) { console.error("[pro] regen", (e as Error).message); }
    });
  }
  revalidatePath(`/pro/atleta/${athleteId}`);
  redirect(`/pro/atleta/${athleteId}?saved=1`);
}

/** L'atleta accetta l'invito di un coach. */
export async function acceptInvite(formData: FormData) {
  const user = await currentUser();
  const code = s(formData.get("code"));
  const coach = await coachByInvite(code);
  if (!coach) redirect("/atleta?invite=invalid");
  if (coach.user_id === user.id) redirect("/pro?err=self");
  if (!(await aiAthleteIds()).has(user.id)) redirect("/no-access");
  const admin = createAdminClient();
  await admin.from("ai_coach_athletes").upsert({ coach_id: coach.user_id, athlete_id: user.id, status: "active", revoked_at: null } as never, { onConflict: "coach_id,athlete_id" });
  (await cookies()).delete("coach_invite");
  const { data: me } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const who = (me as { full_name?: string } | null)?.full_name ?? user.email ?? "Un atleta";
  const { data: ct } = await admin.from("ai_athlete_profiles").select("telegram_chat_id").eq("athlete_id", coach.user_id).maybeSingle();
  const chat = (ct as { telegram_chat_id?: number | null } | null)?.telegram_chat_id;
  if (chat) await tgSend(chat, `✅ <b>${who}</b> ha accettato il tuo invito su 24/7 Coach. Lo trovi in https://247coachai.com/pro`).catch(() => false);
  await ownerTg(`🤝 ${who} è ora seguito dal coach ${coach.display_name}`);
  const { data: ob } = await admin.from("ai_athlete_profiles").select("onboarding_completed_at").eq("athlete_id", user.id).maybeSingle();
  redirect((ob as { onboarding_completed_at?: string | null } | null)?.onboarding_completed_at ? "/atleta?invite=ok" : "/onboarding?invite=ok");
}

/** L'atleta toglie l'accesso a un coach. */
export async function revokeCoach(formData: FormData) {
  const user = await currentUser();
  const coachId = s(formData.get("coach_id"));
  await createAdminClient().from("ai_coach_athletes").update({ status: "revoked", revoked_at: new Date().toISOString() } as never).eq("coach_id", coachId).eq("athlete_id", user.id);
  revalidatePath("/atleta/dispositivi");
  redirect("/atleta/dispositivi#coach-umano");
}

/** Il coach smette di seguire un atleta. */
export async function removeAthlete(formData: FormData) {
  const user = await currentUser();
  const athleteId = s(formData.get("athlete_id"));
  await createAdminClient().from("ai_coach_athletes").update({ status: "revoked", revoked_at: new Date().toISOString() } as never).eq("coach_id", user.id).eq("athlete_id", athleteId);
  redirect("/pro");
}
