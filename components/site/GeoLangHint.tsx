"use client";
// Suggerimento lingua: se il visitatore si collega da un paese di un'altra lingua
// (cookie geo_lang messo dal middleware dall'IP) e non ha mai scelto una lingua,
// proponiamo la stessa pagina nella sua lingua. Nessun redirect automatico:
// le URL restano stabili per Google e per chi condivide i link.
import { useEffect, useState } from "react";

const MSG: Record<string, [string, string]> = {
  en: ["This page is also available in English", "Switch"],
  it: ["Questa pagina è disponibile in italiano", "Vai"],
  de: ["Diese Seite gibt es auch auf Deutsch", "Wechseln"],
  fr: ["Cette page existe aussi en français", "Y aller"],
  es: ["Esta página también está en español", "Ir"],
  pt: ["Esta página também está em português", "Ir"],
  nl: ["Deze pagina is ook in het Nederlands", "Ga"],
  da: ["Denne side findes også på dansk", "Skift"],
  sv: ["Den här sidan finns även på svenska", "Byt"],
  no: ["Denne siden finnes også på norsk", "Bytt"],
  fi: ["Tämä sivu on myös suomeksi", "Vaihda"],
  pl: ["Ta strona jest też po polsku", "Przejdź"],
};

function cookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function GeoLangHint({ lang, hrefs }: { lang: string; hrefs: Record<string, string> }) {
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    const geo = cookie("geo_lang");
    if (!geo || geo === lang || cookie("site_lang") || cookie("geo_hint_off") || !MSG[geo] || !hrefs[geo]) return;
    setTarget(geo);
  }, [lang, hrefs]);
  if (!target) return null;
  const [text, cta] = MSG[target];
  const close = () => {
    document.cookie = `geo_hint_off=1; path=/; max-age=2592000; samesite=lax`;
    setTarget(null);
  };
  return (
    <div className="ld-geo" role="note" lang={target}>
      <span>{text}</span>
      <a href={hrefs[target]} onClick={() => { document.cookie = `site_lang=${target}; path=/; max-age=31536000; samesite=lax`; }}>{cta} →</a>
      <button type="button" aria-label="Close" onClick={close}>×</button>
    </div>
  );
}
