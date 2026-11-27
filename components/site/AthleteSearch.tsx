"use client";
// Ricerca atleti per nome: chiama /api/site/athletes e mostra i risultati come link
// (pagina atleta) oppure come scelta (onPick) nella pagina di confronto.
import { useEffect, useRef, useState } from "react";

type Hit = { slug: string; name: string; country: string | null; races: number; best_full: number | null; best_half: number | null; last_year: number | null };
const hms = (s: number | null) => (s == null ? null : `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
const flag = (cc: string | null) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "");

export default function AthleteSearch({ base, race, hrefFor, txt, autoFocus }: { base: string; race?: string | null; hrefFor?: string; txt: { ph: string; none: string; typeMore: string; race1: string; raceN: string }; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 3) { setHits(null); return; }
    const id = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/site/athletes?q=${encodeURIComponent(s)}${race ? `&race=${encodeURIComponent(race)}` : ""}`);
        const j = (await r.json()) as { hits?: Hit[] };
        if (id === seq.current) setHits(j.hits ?? []);
      } catch { if (id === seq.current) setHits([]); }
      finally { if (id === seq.current) setBusy(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [q, race]);
  return (
    <div className="ld-ath-search">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={txt.ph} aria-label={txt.ph} autoFocus={autoFocus} autoComplete="off" />
      {q.trim().length > 0 && q.trim().length < 3 ? <p className="note">{txt.typeMore}</p> : null}
      {hits && !hits.length && !busy ? <p className="note">{txt.none}</p> : null}
      {hits?.length ? (
        <ul>
          {hits.map((h) => (
            <li key={h.slug}>
              <a href={hrefFor ? hrefFor.replace("{slug}", h.slug) : `${base}/${h.slug}`}>
                <b>{flag(h.country)} {h.name}</b>
                <span>{h.races} {h.races === 1 ? txt.race1 : txt.raceN}{h.best_full ? ` · IM ${hms(h.best_full)}` : ""}{h.best_half ? ` · 70.3 ${hms(h.best_half)}` : ""}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
