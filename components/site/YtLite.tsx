"use client";
// Player YouTube "click to load": miniatura + play; l'iframe (youtube-nocookie)
// si carica solo al click, così la pagina resta leggera e senza cookie di terzi.
import { useState } from "react";

export default function YtLite({ id, title, thumb, big }: { id: string; title: string; thumb?: string | null; big?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <div className={`yt ${big ? "big" : ""}`}>
      {on ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      ) : (
        <button type="button" onClick={() => setOn(true)} aria-label={title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" referrerPolicy="no-referrer" />
          <span className="play" aria-hidden>▶</span>
        </button>
      )}
    </div>
  );
}
