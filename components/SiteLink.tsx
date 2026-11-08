import { isAiCoachMode } from "@/lib/ai/mode";
import { getAppLang } from "@/lib/app-i18n/server";

/** Dall'app 247 al sito pubblico (gare, magazine, calcolatore). Nell'app di Irene non compare. */
export default async function SiteLink({ label }: { label?: string }) {
  if (!isAiCoachMode()) return null;
  const lang = await getAppLang();
  return (
    <a className="btn btn-subtle btn-sm" href={lang === "en" ? "/en" : "/it"} title={lang === "en" ? "Go to the 24/7 Coach website" : "Vai al sito 24/7 Coach"}>
      {label ?? (lang === "en" ? "← Website" : "← Sito")}
    </a>
  );
}
