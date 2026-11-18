// Rendering JPEG delle grafiche social (Instagram e LinkedIn) con la foto della gara.
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { SocialSlideView, SW, SH, type SocialSlide } from "@/lib/site/socialSlide";
import { photoCredit, photoCrop } from "@/lib/site/racePhotos";
import type { IgSlide } from "@/lib/site/igContent";

type Font = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700 | 800; style: "normal" };
let fonts: Font[] | null = null;
async function loadFonts(): Promise<Font[]> {
  if (fonts) return fonts;
  const get = async (family: string, weight: 400 | 600 | 700 | 800): Promise<Font> => {
    // con un user-agent vecchio Google Fonts risponde con TTF (Satori non legge woff2)
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`, { headers: { "user-agent": "Mozilla/4.0" } }).then((r) => r.text());
    const url = /src:\s*url\(([^)]+)\)/.exec(css)?.[1];
    if (!url) throw new Error(`font ${family} ${weight}`);
    return { name: family, data: await fetch(url).then((r) => r.arrayBuffer()), weight, style: "normal" };
  };
  fonts = await Promise.all([get("Barlow Condensed", 600), get("Barlow Condensed", 700), get("Barlow Condensed", 800), get("Inter", 400), get("Inter", 600)]);
  return fonts;
}

export type RacePhoto = { url: string | null; author: string | null; license: string | null; focus_x: number | null; status: string };

/** Converte le slide del vecchio formato (cells/lines) nel nuovo: un'idea per slide. */
export function toSocial(s: IgSlide & SocialSlide, i: number): SocialSlide {
  if (s.variant || s.stat || s.stats) return s;
  const cells = s.cells ?? [];
  if (i === 1) return { variant: "cover", kicker: s.kicker, title: s.title, accent: s.accent, sub: s.lines?.[0] ?? null };
  if (s.cta) return { variant: "cta", kicker: s.kicker, title: s.title, accent: s.accent, cta: s.cta };
  if (s.winners?.length) return { variant: "list", kicker: s.kicker, title: s.title, accent: s.accent, winners: s.winners };
  if (cells.length === 1) return { variant: "stat", kicker: s.kicker, stat: cells[0], lines: s.lines?.slice(0, 1) };
  if (cells.length > 1) return { variant: "list", kicker: s.kicker, title: s.title, accent: s.accent, stats: cells.slice(0, 3) };
  return { variant: "text", kicker: s.kicker, title: s.title, accent: s.accent, lines: s.lines?.slice(0, 2) };
}

const bgCache = new Map<string, string>();
export async function renderSocial(slide: SocialSlide, i: number, total: number, photo: RacePhoto | null): Promise<Buffer> {
  let bg: string | null = null;
  let credit: string | null = null;
  if (photo?.status === "ok" && photo.url) {
    const key = `${photo.url}|${photo.focus_x ?? 0.5}`;
    bg = bgCache.get(key) ?? null;
    if (!bg) {
      const crop = await photoCrop(photo.url, SW, SH, photo.focus_x ?? 0.5);
      if (crop) { bg = `data:image/jpeg;base64,${crop.toString("base64")}`; if (bgCache.size > 20) bgCache.clear(); bgCache.set(key, bg); }
    }
    if (bg) credit = photoCredit(photo);
  }
  const png = await new ImageResponse(<SocialSlideView s={slide} i={i} total={total} bg={bg} credit={credit} />, { width: SW, height: SH, fonts: await loadFonts() }).arrayBuffer();
  return sharp(Buffer.from(png)).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
