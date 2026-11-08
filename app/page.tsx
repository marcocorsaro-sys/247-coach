import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAiCoachMode } from "@/lib/ai/mode";
import { isLang, pickLang, sitePath } from "@/lib/i18n/config";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // 24/7 Coach: sito pubblico nella lingua del visitatore. App di Irene: login.
    if (isAiCoachMode()) {
      const c = (await cookies()).get("site_lang")?.value;
      const lang = isLang(c) ? c : pickLang((await headers()).get("accept-language"));
      redirect(sitePath(lang));
    }
    redirect("/login");
  }

  const { data: profileData } = await supabase.from("profiles").select("role, is_admin").eq("id", user.id).single();
  const profile = profileData as unknown as { role: string | null; is_admin: boolean | null } | null;
  if (isAiCoachMode()) {
    if (profile?.is_admin) redirect("/admin");
    if (profile?.role === "coach") redirect("/no-access");
    redirect("/atleta");
  }
  if (profile?.role === "coach") redirect("/coach");
  redirect("/atleta");
}
