"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function toggleWatch(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) return;
  const id = String(formData.get("athlete_id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  const { data: w } = await admin.from("athlete_watch" as never).select("athlete_id").eq("athlete_id", id).maybeSingle();
  if (w) await admin.from("athlete_watch" as never).delete().eq("athlete_id", id);
  else await admin.from("athlete_watch" as never).insert({ athlete_id: id } as never);
  revalidatePath("/admin");
}

/** Messaggio Telegram all'atleta a nome del suo coach (solo admin). */
export async function sendCoachTelegram(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) return;
  const athleteId = String(formData.get("athlete_id") ?? "");
  const text = String(formData.get("text") ?? "").trim().slice(0, 3500);
  if (!athleteId || text.length < 2) redirect("/admin?tg=err");
  const { tgSend } = await import("@/lib/notify/athlete");
  const admin = createAdminClient();
  const { data: ai } = await admin.from("ai_athlete_profiles").select("telegram_chat_id").eq("athlete_id", athleteId).maybeSingle();
  const chat = (ai as { telegram_chat_id?: number | null } | null)?.telegram_chat_id;
  if (!chat) redirect("/admin?tg=nochat");
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const ok = await tgSend(chat, esc);
  if (ok) await admin.from("ai_feedback").insert({ athlete_id: athleteId, message: "[messaggio del coach]", coach_reply: text, decision: "answer", kind: "message", consumed_at: new Date().toISOString() } as never);
  redirect(`/admin?tg=${ok ? "ok" : "fail"}`);
}

/** Novità a tutti gli atleti 24/7 Coach, a nome del loro coach (coda Telegram). */
export async function announceToAthletes(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) return;
  const text = String(formData.get("text") ?? "").trim().slice(0, 3500);
  if (text.length < 5) redirect("/admin?ann=err");
  const { announceFeature } = await import("@/lib/server/announce");
  const n = await announceFeature(createAdminClient() as never, text);
  redirect(`/admin?ann=${n}`);
}
