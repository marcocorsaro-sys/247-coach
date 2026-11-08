"use client";
// Provider della lingua per i componenti client dell'app: const t = useT().
import { createContext, useContext, useMemo } from "react";
import { makeT, type AppLang, type TFn } from "@/lib/app-i18n";

const Ctx = createContext<AppLang>("it");

export function AppLangProvider({ lang, children }: { lang: AppLang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export function useAppLang(): AppLang { return useContext(Ctx); }
export function useT(): TFn {
  const lang = useContext(Ctx);
  return useMemo(() => makeT(lang), [lang]);
}
