// ============================================================================
// Grafica social 1080×1350 (Instagram e LinkedIn): foto della località a tutto
// schermo, sfumatura scura in basso, poche parole molto grandi.
// Regole di leggibilità: un'idea per slide, titolo ≥ 120px, numeri ≥ 200px,
// testo ≥ 40px, massimo 3 righe di testo. Il credito della foto è sempre stampato.
// Usata da /ig-media/[id]/[n] e /li-media/[id] con next/og (Satori).
// ============================================================================
import type { ReactElement } from "react";

export const SW = 1080, SH = 1350;
const ACC = "#ff5a1f", INK = "#ffffff", SOFT = "rgba(255,255,255,0.86)", DIM = "rgba(255,255,255,0.62)", BG = "#0c0c0b";
const FD = "Barlow Condensed";

export type SocialSlide = {
  /** cover: nome gara enorme; stat: un numero gigante; list: 2-3 numeri o vincitori; cta: chiusura con link */
  variant?: "cover" | "stat" | "list" | "cta" | "text";
  kicker?: string | null;
  title?: string | null;
  accent?: string | null;
  sub?: string | null;
  stat?: { v: string; l: string } | null;
  stats?: { v: string; l: string }[] | null;
  lines?: string[] | null;
  winners?: { label: string; name: string; time: string }[] | null;
  cta?: { title: string; url: string } | null;
};

function fit(text: string, base: number, maxChars: number): number {
  const n = text.length;
  return n <= maxChars ? base : Math.max(Math.round(base * 0.55), Math.round((base * maxChars) / n));
}

export function SocialSlideView({ s, i, total, bg, credit }: { s: SocialSlide; i: number; total: number; bg?: string | null; credit?: string | null }): ReactElement {
  const v = s.variant ?? (i === 1 ? "cover" : s.cta ? "cta" : s.stat ? "stat" : s.stats?.length || s.winners?.length ? "list" : "text");
  const cover = v === "cover";
  // sfumatura: sulla copertina lascia respirare la foto in alto, nelle altre scurisce di più
  const shade = cover
    ? "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 22%, rgba(0,0,0,0.10) 45%, rgba(0,0,0,0.78) 70%, rgba(0,0,0,0.94) 100%)"
    : "linear-gradient(180deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.22) 28%, rgba(0,0,0,0.70) 55%, rgba(0,0,0,0.95) 100%)";
  const title = s.title ?? "";
  const accent = s.accent ?? "";
  return (
    <div style={{ width: SW, height: SH, display: "flex", position: "relative", background: BG, color: INK, fontFamily: "Inter" }}>
      {bg ? <img src={bg} width={SW} height={SH} style={{ position: "absolute", left: 0, top: 0, width: SW, height: SH, objectFit: "cover" }} /> : null}
      <div style={{ position: "absolute", left: 0, top: 0, width: SW, height: SH, display: "flex", backgroundImage: shade }} />

      {/* testata: marchio a sinistra, contatore a destra */}
      <div style={{ position: "absolute", left: 72, right: 72, top: 64, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", fontFamily: FD, fontWeight: 800, fontSize: 38, letterSpacing: 2, textTransform: "uppercase" }}>
          <div style={{ display: "flex", width: 54, height: 54, background: INK, color: BG, alignItems: "center", justifyContent: "center", fontSize: 30, marginRight: 16 }}>24</div>
          <span>24/7&nbsp;</span><span style={{ color: ACC }}>Coach</span>
        </div>
        {total > 1 ? (
          <div style={{ display: "flex", gap: 10 }}>
            {Array.from({ length: total }).map((_, k) => (
              <div key={k} style={{ width: k + 1 === i ? 44 : 14, height: 14, borderRadius: 7, background: k + 1 === i ? ACC : "rgba(255,255,255,0.55)" }} />
            ))}
          </div>
        ) : null}
      </div>

      {/* blocco testo in basso */}
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 120, display: "flex", flexDirection: "column" }}>
        {s.kicker ? (
          <div style={{ display: "flex", alignSelf: "flex-start", background: ACC, color: INK, fontFamily: FD, fontWeight: 800, fontSize: 36, letterSpacing: 3, textTransform: "uppercase", padding: "8px 18px", marginBottom: 26 }}>{s.kicker}</div>
        ) : null}

        {v === "stat" && s.stat ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: fit(s.stat.v, 300, 5), lineHeight: 0.9, color: ACC }}>{s.stat.v}</div>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: fit(s.stat.l, 70, 22), lineHeight: 1, textTransform: "uppercase", marginTop: 12 }}>{s.stat.l}</div>
          </div>
        ) : null}

        {v !== "stat" && title ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: cover ? fit(title, 170, 9) : fit(title, 120, 14), lineHeight: 0.92, textTransform: "uppercase" }}>{title}</div>
            {accent ? <div style={{ fontFamily: FD, fontWeight: 800, fontSize: cover ? fit(accent, 170, 9) : fit(accent, 120, 14), lineHeight: 0.92, textTransform: "uppercase", color: ACC }}>{accent}</div> : null}
          </div>
        ) : null}

        {v === "list" && s.stats?.length ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 34, gap: 22 }}>
            {s.stats.slice(0, 3).map((c) => (
              <div key={c.l} style={{ display: "flex", alignItems: "baseline", borderTop: "2px solid rgba(255,255,255,0.35)", paddingTop: 14 }}>
                <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 96, lineHeight: 1, color: ACC, width: 400 }}>{c.v}</div>
                <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 44, lineHeight: 1.05, textTransform: "uppercase", flex: 1 }}>{c.l}</div>
              </div>
            ))}
          </div>
        ) : null}

        {v === "list" && s.winners?.length ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, gap: 26 }}>
            {s.winners.slice(0, 2).map((w) => (
              <div key={w.name} style={{ display: "flex", flexDirection: "column", borderLeft: `12px solid ${ACC}`, paddingLeft: 30 }}>
                <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 36, letterSpacing: 2, color: DIM, textTransform: "uppercase" }}>{w.label}</div>
                <div style={{ fontFamily: FD, fontWeight: 800, fontSize: fit(w.name, 76, 20), lineHeight: 1, textTransform: "uppercase" }}>{w.name}</div>
                <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 110, lineHeight: 1, color: ACC }}>{w.time}</div>
              </div>
            ))}
          </div>
        ) : null}

        {(s.sub || s.lines?.length) && v !== "list" ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 28, gap: 12 }}>
            {[s.sub, ...(s.lines ?? [])].filter(Boolean).slice(0, 3).map((l) => (
              <div key={l as string} style={{ fontSize: 44, lineHeight: 1.25, color: SOFT }}>{l}</div>
            ))}
          </div>
        ) : null}

        {s.cta ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 40, background: INK, color: BG, padding: "30px 38px" }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 60, lineHeight: 1, textTransform: "uppercase" }}>{s.cta.title}</div>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 38, marginTop: 10, color: ACC }}>{s.cta.url.replace(/^https?:\/\//, "").replace(/^www\./, "")}</div>
          </div>
        ) : null}
      </div>

      {/* piede: credito della foto */}
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 44, display: "flex", justifyContent: "space-between", fontSize: 20, color: DIM }}>
        <span style={{ maxWidth: 660, overflow: "hidden", whiteSpace: "nowrap" }}>{(credit ?? "").length > 78 ? `${(credit ?? "").slice(0, 76)}…` : credit ?? ""}</span>
        <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 26, letterSpacing: 2, color: SOFT }}>247COACHAI.COM</span>
      </div>
    </div>
  );
}
