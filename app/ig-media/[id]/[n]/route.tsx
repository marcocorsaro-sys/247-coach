// Slide JPEG 1080×1350 di un post del palinsesto Instagram (ig_plan.content).
// URL pubblico: /ig-media/<id piano>/<n>.jpg — Instagram (via Windsor) lo scarica
// al momento della pubblicazione. Stile del sito: fondo nero, arancio, Barlow Condensed.
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { createPublicClient } from "@/lib/supabase/public";
import type { IgContent, IgSlide } from "@/lib/site/igContent";

export const runtime = "nodejs";
export const revalidate = 86400;

const W = 1080, H = 1350;
const BG = "#0c0c0b", INK = "#f4f2ec", MUTED = "#9a978e", LINE = "#2a2a27", ACC = "#ff4d14";

let fonts: { name: string; data: ArrayBuffer; weight: 400 | 600 | 700 | 800; style: "normal" }[] | null = null;
async function loadFonts() {
  if (fonts) return fonts;
  const get = async (family: string, weight: 400 | 600 | 700 | 800) => {
    // con un user-agent vecchio Google Fonts risponde con TTF (Satori non legge woff2)
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`, { headers: { "user-agent": "Mozilla/4.0" } }).then((r) => r.text());
    const url = /src:\s*url\(([^)]+)\)/.exec(css)?.[1];
    if (!url) throw new Error(`font ${family} ${weight}`);
    return { name: family, data: await fetch(url).then((r) => r.arrayBuffer()), weight, style: "normal" as const };
  };
  fonts = await Promise.all([get("Barlow Condensed", 600), get("Barlow Condensed", 800), get("Inter", 400), get("Inter", 600)]);
  return fonts;
}

const FD = "Barlow Condensed";

function Slide({ s, i, total }: { s: IgSlide; i: number; total: number }) {
  const cover = i === 1;
  const cells = (s.cells ?? []).slice(0, 4);
  return (
    <div style={{ width: W, height: H, display: "flex", background: BG, color: INK, fontFamily: "Inter", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 14, height: H, background: ACC }} />
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 80, right: 80, top: 80, bottom: 170 }}>
        <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 30, letterSpacing: 4, color: MUTED, textTransform: "uppercase" }}>{s.kicker}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: cover ? 36 : 22 }}>
          <div style={{ fontFamily: FD, fontWeight: 800, fontSize: cover ? 150 : 104, lineHeight: 0.9, textTransform: "uppercase" }}>{s.title}</div>
          {s.accent ? <div style={{ fontFamily: FD, fontWeight: 800, fontSize: cover ? 96 : 104, lineHeight: 0.95, textTransform: "uppercase", color: ACC }}>{s.accent}</div> : null}
        </div>
        {cells.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 48, gap: 18 }}>
            {cells.map((c) => (
              <div key={c.l} style={{ display: "flex", flexDirection: "column", width: cells.length === 3 ? 292 : 451, border: `2px solid ${LINE}`, padding: "26px 30px" }}>
                <div style={{ fontFamily: FD, fontWeight: 800, fontSize: cells.length === 3 ? 88 : 100, lineHeight: 1 }}>{c.v}</div>
                <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 27, letterSpacing: 3, color: MUTED, textTransform: "uppercase", marginTop: 8 }}>{c.l}</div>
              </div>
            ))}
          </div>
        ) : null}
        {(s.winners ?? []).slice(0, 3).map((w) => (
          <div key={w.name} style={{ display: "flex", flexDirection: "column", borderLeft: `10px solid ${ACC}`, padding: "14px 0 14px 34px", marginTop: 30 }}>
            <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 28, letterSpacing: 3, color: MUTED, textTransform: "uppercase" }}>{w.label}</div>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 62, lineHeight: 1, textTransform: "uppercase" }}>{w.name}</div>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 96, lineHeight: 1, color: ACC, marginTop: 6 }}>{w.time}</div>
          </div>
        ))}
        {(s.lines ?? []).length ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 34, gap: 14 }}>
            {(s.lines ?? []).slice(0, 3).map((l) => <div key={l} style={{ fontSize: cover ? 42 : 32, lineHeight: 1.3, color: cover ? "#d9d6cd" : MUTED }}>{l}</div>)}
          </div>
        ) : null}
        {s.cta ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", background: ACC, color: BG, padding: "32px 40px" }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 52, lineHeight: 1.05, textTransform: "uppercase" }}>{s.cta.title}</div>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 30, marginTop: 10 }}>{s.cta.url.replace(/^https?:\/\//, "")}</div>
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 64, display: "flex", justifyContent: "space-between", borderTop: `2px solid ${LINE}`, paddingTop: 24, fontFamily: FD, fontWeight: 800, fontSize: 30, letterSpacing: 2, textTransform: "uppercase" }}>
        <div style={{ display: "flex" }}><span>24/7&nbsp;</span><span style={{ color: ACC }}>Coach</span></div>
        <div style={{ color: MUTED }}>{`${i}/${total}`}</div>
      </div>
    </div>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const i = Number(n.replace(/\.jpe?g$/, ""));
  const { data } = await createPublicClient().from("ig_plan").select("content").eq("id", id).maybeSingle();
  const c = data?.content as IgContent | null;
  const s = c?.slides?.[i - 1];
  if (!c || !s) return new Response("not found", { status: 404 });
  const png = await new ImageResponse(<Slide s={s} i={i} total={c.slides.length} />, { width: W, height: H, fonts: await loadFonts() }).arrayBuffer();
  const jpg = await sharp(Buffer.from(png)).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400, s-maxage=86400" } });
}
