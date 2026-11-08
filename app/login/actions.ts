"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  // Invito di un coach 247 in sospeso: torna alla pagina dell'invito per accettarlo.
  const inv = (await cookies()).get("coach_invite")?.value;
  if (inv && /^[0-9a-f]{6,16}$/.test(inv)) redirect(`/invito/${inv}`);
  if ((await cookies()).get("pro_signup")?.value) redirect("/pro");
  redirect("/");
}
