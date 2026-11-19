import { AppLangProvider } from "@/components/AppLang";
import { getAppLang } from "@/lib/app-i18n/server";
import TzSync from "@/components/TzSync";
import { createClient } from "@/lib/supabase/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const lang = await getAppLang();
  // Fuso orario dell'atleta: lo rileva il browser e lo salva (serve a messaggi e date).
  let tz: string | null = null;
  let own = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("ai_athlete_profiles").select("timezone").eq("athlete_id", user.id).maybeSingle();
      own = !!data;
      tz = (data as { timezone?: string | null } | null)?.timezone ?? null;
    }
  } catch { /* senza sessione non si sincronizza */ }
  return <AppLangProvider lang={lang}>{own ? <TzSync current={tz} /> : null}{children}</AppLangProvider>;
}
