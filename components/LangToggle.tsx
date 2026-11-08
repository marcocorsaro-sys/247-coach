// Interruttore IT/EN per l'app (solo 24/7 Coach).
import { setAppLang } from "@/app/actions-lang";
import type { AppLang } from "@/lib/app-i18n";

export default function LangToggle({ lang }: { lang: AppLang }) {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "ai_coach") return null;
  const other: AppLang = lang === "it" ? "en" : "it";
  return (
    <form action={setAppLang} style={{ display: "inline" }}>
      <input type="hidden" name="lang" value={other} />
      <button type="submit" className="mono" style={{ background: "none", border: "1px solid var(--line, #333)", borderRadius: 6, padding: "2px 8px", cursor: "pointer", color: "inherit", fontSize: ".72rem" }} aria-label={other === "en" ? "Switch to English" : "Passa all'italiano"}>
        {lang === "it" ? "IT · EN" : "EN · IT"}
      </button>
    </form>
  );
}
