"use client";
// Selettore lingua: <select> nativo, salva la scelta in un cookie (letto dal
// middleware per il redirect da /) e aggiorna <html lang>.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LangSwitch({ lang, langs }: { lang: string; langs: { code: string; name: string; href: string }[] }) {
  const router = useRouter();
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return (
    <select
      className="ld-lang" aria-label="Language" value={lang}
      onChange={(e) => {
        const next = langs.find((l) => l.code === e.target.value);
        if (!next) return;
        document.cookie = `site_lang=${next.code}; path=/; max-age=31536000; samesite=lax`;
        router.push(next.href);
      }}
    >
      {langs.map((l) => <option key={l.code} value={l.code}>{l.code.toUpperCase()} · {l.name}</option>)}
    </select>
  );
}
