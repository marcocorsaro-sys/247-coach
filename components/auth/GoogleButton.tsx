"use client";
// "Continua con Google" (solo 24/7 Coach): OAuth via Supabase, ritorno su
// /auth/callback che crea il profilo se manca. race/connect arrivano dal sito.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppLang } from "@/components/AppLang";
import { makeT } from "@/lib/app-i18n";

export default function GoogleButton({ race, connect, lang, label }: { race?: string; connect?: string; lang?: string; label?: string }) {
  const ctxLang = useAppLang();
  const t = makeT(lang === "it" || lang === "en" ? lang : ctxLang);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    const q = new URLSearchParams();
    if (race) q.set("race", race);
    if (connect) q.set("connect", connect);
    if (lang) q.set("lang", lang);
    const redirectTo = `${window.location.origin}/auth/callback${q.size ? `?${q}` : ""}`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { access_type: "offline", prompt: "select_account" } },
    });
    if (error) { setErr(error.message); setBusy(false); }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
      <button type="button" className="btn btn-ghost btn-lg" onClick={go} disabled={busy} style={{ width: "100%", justifyContent: "center", gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41 35.4 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {busy ? t("Apro Google…") : (label ?? t("Continua con Google"))}
      </button>
      {err ? <span className="pill err pill-plain">{err}</span> : null}
    </div>
  );
}
