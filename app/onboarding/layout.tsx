import { AppLangProvider } from "@/components/AppLang";
import { getAppLang } from "@/lib/app-i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const lang = await getAppLang();
  return <AppLangProvider lang={lang}>{children}</AppLangProvider>;
}
