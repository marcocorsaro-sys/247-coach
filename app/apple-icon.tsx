import { ImageResponse } from "next/og";
import { AppMark } from "./icon";

// Icona per "Aggiungi a Home" su iPhone/iPad. iOS arrotonda da solo gli
// angoli: qui il quadrato è pieno, altrimenti gli angoli restano neri.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppMark px={180} rounded={false} />, { ...size });
}
