"use client";
import { useEffect, useState } from "react";

/** Nel menu del sito: "Accedi" diventa "La mia app" se l'utente è già collegato. */
export default function AppLink({ login, app }: { login: string; app: string }) {
  const [logged, setLogged] = useState(false);
  useEffect(() => {
    try { setLogged(/(^|;\s*)sb-[^=]+-auth-token(\.\d+)?=/.test(document.cookie)); } catch {}
  }, []);
  return <a href={logged ? "/atleta" : "/login"}>{logged ? app : login}</a>;
}
