import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAiCoachMode } from "@/lib/ai/mode";
import { countryLang, isLang, pickLang, sitePath } from "@/lib/i18n/config";

export default async function Home() {
  // 24/7 Coach: la home del dominio è sempre il sito pubblico, anche per chi è già
  // collegato (admin compreso). All'app si entra da "La mia app" nel menu.
  if (isAiCoachMode()) {
    // Scelta salvata dal selettore > paese da cui si collega (IP) > lingua del browser.
    const c = (await cookies()).get("site_lang")?.value;
    const h = await headers();
    const accept = h.get("accept-language");
    const lang = isLang(c) ? c : (countryLang(h.get("x-vercel-ip-country"), accept) ?? pickLang(accept));
    redirect(sitePath(lang));
  }

  // App di Irene: login, poi area coach o atleta.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileData as unknown as { role: string | null } | null;
  if (profile?.role === "coach") redirect("/coach");
  redirect("/atleta");
}
