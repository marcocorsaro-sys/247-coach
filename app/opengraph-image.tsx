import { ImageResponse } from "next/og";

// Immagine di condivisione e per i dati strutturati (SportsEvent/Article).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "24/7 Coach — triathlon race guides and AI training plans";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0d0b09", color: "#f4efe8", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 6, color: "#ff6a1a", fontWeight: 800 }}>24/7 COACH</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 900, lineHeight: 1, textTransform: "uppercase" }}>Race guides</div>
          <div style={{ fontSize: 92, fontWeight: 900, lineHeight: 1, textTransform: "uppercase", color: "#ff6a1a" }}>swim · bike · run</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#b8ad9f" }}>Courses, splits, travel and AI training plans for every Ironman and 70.3</div>
      </div>
    ),
    { ...size },
  );
}
