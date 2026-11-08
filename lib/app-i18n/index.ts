// i18n dell'app di allenamento 24/7 Coach: italiano (sorgente) e inglese.
// Le stringhe restano scritte in italiano nel codice e passano da t("…"):
// in inglese si cerca la traduzione nel dizionario EN (chiave = testo italiano);
// se manca si mostra l'italiano. Variabili: t("Ciao {name}", { name }).
// L'app di Irene (non AI) resta sempre in italiano.
import { EN } from "./en";

export type AppLang = "it" | "en";
export type TFn = (s: string, vars?: Record<string, string | number | null | undefined>) => string;

const IS_AI = process.env.NEXT_PUBLIC_APP_MODE === "ai_coach";

export function normLang(v: string | null | undefined): AppLang {
  if (!IS_AI) return "it";
  return v && v.toLowerCase().startsWith("it") ? "it" : v ? "en" : "it";
}

export function makeT(lang: AppLang): TFn {
  return (s, vars) => {
    let out = lang === "en" ? (EN[s] ?? s) : s;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v == null ? "" : String(v));
    return out;
  };
}

/** Locale per date e numeri. */
export const LOCALE: Record<AppLang, string> = { it: "it-IT", en: "en-GB" };
