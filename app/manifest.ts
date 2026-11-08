import type { MetadataRoute } from "next";
import { BRAND_NAME, APP_DESCRIPTION, IS_AI_APP } from "@/lib/branding";

// Nome e icona quando l'app viene salvata sulla schermata Home.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: IS_AI_APP ? "#0a0b10" : "#ffffff",
    theme_color: IS_AI_APP ? "#0a0b10" : "#1e3aff",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
