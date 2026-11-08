// Lingua dell'app lato server: profilo dell'utente loggato, poi cookie
// app_lang, poi Accept-Language del browser (italiano → it, altro → en).
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { makeT, normLang, type AppLang, type TFn } from "./index";

export async function getAppLang(): Promise<AppLang> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "ai_coach") return "it";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("lang").eq("id", user.id).maybeSingle();
      const l = (data as { lang?: string } | null)?.lang;
      if (l === "it" || l === "en") return l;
    }
  } catch { /* fallback sotto */ }
  const c = (await cookies()).get("app_lang")?.value;
  if (c === "it" || c === "en") return c;
  const al = (await headers()).get("accept-language") ?? "";
  return normLang(al.split(",")[0]?.trim() || "it");
}

export async function getT(): Promise<{ lang: AppLang; t: TFn }> {
  const lang = await getAppLang();
  return { lang, t: makeT(lang) };
}
