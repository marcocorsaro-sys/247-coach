import type { MetadataRoute } from "next";
import { IS_AI_APP } from "@/lib/branding";

// Solo il sito pubblico 24/7 Coach è indicizzabile; l'app (coach/atleta) no.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://247coachai.com";
  if (!IS_AI_APP) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [{ userAgent: "*", allow: ["/", "/gare", "/gare/", "/en", "/it", "/de", "/fr", "/es", "/pt", "/nl", "/da", "/sv", "/no", "/fi", "/pl"], disallow: ["/atleta", "/coach", "/api/", "/onboarding", "/benvenuto", "/workout", "/login", "/registrati", "/auth"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
