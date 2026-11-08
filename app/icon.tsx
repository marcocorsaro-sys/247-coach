import { ImageResponse } from "next/og";
import { IS_AI_APP } from "@/lib/branding";

// Icona dell'app (scheda del browser, "Aggiungi a Home" su Android). È il
// quadratino con la T che si vede in alto a sinistra dentro l'app. La T è
// disegnata con due barre, non con un carattere: così non dipende da font.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<AppMark px={512} rounded />, { ...size });
}

/** Il quadratino con la T. Tutte le misure sono in proporzione a `px`. */
export function AppMark({ px, rounded }: { px: number; rounded: boolean }) {
  const u = px / 512;
  const bg = IS_AI_APP
    ? "linear-gradient(135deg,#c8e64a,#8ba832)"
    : "linear-gradient(135deg,#1e3aff,#0f2bd9)";
  const fg = IS_AI_APP ? "#0a0b10" : "#ffffff";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        borderRadius: rounded ? 112 * u : 0,
      }}
    >
      {IS_AI_APP ? (
        <div style={{ display: "flex", fontSize: 230 * u, fontWeight: 800, color: fg }}>24</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 290 * u, height: 72 * u, background: fg, borderRadius: 14 * u }} />
          <div
            style={{
              width: 84 * u,
              height: 204 * u,
              background: fg,
              borderRadius: `0 0 ${14 * u}px ${14 * u}px`,
            }}
          />
        </div>
      )}
    </div>
  );
}
