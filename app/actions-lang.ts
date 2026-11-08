"use server";
// Cambio lingua dell'app (IT/EN): cookie + profilo dell'utente loggato.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setAppLang(formData: FormData) {
  const lang = formData.get("lang") === "en" ? "en" : "it";
  (await cookies()).set("app_lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await createAdminClient().from("profiles").update({ lang } as never).eq("id", user.id);
  revalidatePath("/", "layout");
}
