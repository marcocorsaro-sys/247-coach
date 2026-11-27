"use client";
// Ricerca unica: gare e atleti. "nav" = bottone nella barra che apre il pannello;
// "hero" = campo sempre visibile (home, pagina atleti).
import { useEffect, useRef, useState } from "react";

type R = { title: string; href: string; date: string | null; place: string };
type A = { name: string; country: string | null; races: number; best_full: number | null; best_half: number | null; href: string };
export type SearchTxt = { open: string; ph: string; races: string; athletes: string; none: string; race1: string; raceN: string; allAth: string };
const hms = (s: number | null) => (s == null ? null : `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
const flag = (cc: string | null) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "");

export default function SiteSearch({ lang, txt, variant = "nav", athletesHref }: { lang: string; txt: SearchTxt; variant?: "nav" | "hero"; athletesHref: string }) {
  const [open, setOpen] = useState(variant === "hero");
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ races: R[]; athletes: A[] } | null>(null);
  const seq = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setRes(null); return; }
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/site/search?lang=${encodeURIComponent(lang)}&q=${encodeURIComponent(s)}`);
        const j = (await r.json()) as { races: R[]; athletes: A[] };
        if (id === seq.current) setRes(j);
      } catch { if (id === seq.current) setRes({ races: [], athletes: [] }); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, lang]);
  useEffect(() => {
    if (variant !== "nav" || !open) return;
    input.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const click = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key); document.addEventListener("mousedown", click);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("mousedown", click); };
  }, [open, variant]);
  const empty = res && !res.races.length && !res.athletes.length;
  const panel = (
    <div className="ld-ss-panel">
      <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={txt.ph} aria-label={txt.ph} autoComplete="off" />
      {empty ? <p className="note">{txt.none}</p> : null}
      {res && !empty ? (
        <div className="ld-ss-res">
          {res.races.length ? (
            <div>
              <p className="lab">{txt.races}</p>
              <ul>{res.races.map((r) => <li key={r.href}><a href={r.href}><b>{r.title}</b><span>{[r.date, r.place].filter(Boolean).join(" · ")}</span></a></li>)}</ul>
            </div>
          ) : null}
          {res.athletes.length ? (
            <div>
              <p className="lab">{txt.athletes}</p>
              <ul>{res.athletes.map((a) => <li key={a.href}><a href={a.href}><b>{flag(a.country)} {a.name}</b><span>{a.races} {a.races === 1 ? txt.race1 : txt.raceN}{a.best_full ? ` · IM ${hms(a.best_full)}` : ""}{a.best_half ? ` · 70.3 ${hms(a.best_half)}` : ""}</span></a></li>)}</ul>
              <p style={{ marginTop: 8 }}><a href={athletesHref}>{txt.allAth}</a></p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
  if (variant === "hero") return <div className="ld-ss hero">{panel}</div>;
  return (
    <div className="ld-ss" ref={box}>
      <button type="button" className="ld-ss-btn" aria-expanded={open} aria-label={txt.open} onClick={() => setOpen((v) => !v)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
        <span>{txt.open}</span>
      </button>
      {open ? panel : null}
    </div>
  );
}
