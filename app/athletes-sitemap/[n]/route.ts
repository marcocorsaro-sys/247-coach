// Sitemap delle pagine atleta: /athletes-sitemap/index elenca i blocchi, /athletes-sitemap/0, /1, ...
// contengono 20.000 atleti ciascuno, in inglese e in italiano.
import { isAiCoachMode } from "@/lib/ai/mode";
import { createPublicClient } from "@/lib/supabase/public";
import { athletePath } from "@/lib/site/athletes";

export const revalidate = 86400;
const SIZE = 20000;
const xml = (body: string) => new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });

export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  if (!isAiCoachMode()) return new Response("not found", { status: 404 });
  const { n } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://247coachai.com";
  const db = createPublicClient();
  if (n === "index") {
    const { count } = await db.from("ath_athletes").select("cid", { count: "exact", head: true });
    const pages = Math.ceil((count ?? 0) / SIZE);
    return xml(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from({ length: pages }, (_, i) => `<sitemap><loc>${base}/athletes-sitemap/${i}</loc></sitemap>`).join("\n")}\n</sitemapindex>`);
  }
  if (!/^\d{1,3}$/.test(n)) return new Response("not found", { status: 404 });
  const { data } = await db.rpc("ath_sitemap", { page: Number(n), size: SIZE });
  const slugs = (data ?? []) as string[];
  if (!slugs.length) return new Response("not found", { status: 404 });
  const urls = slugs.flatMap((s) => [`<url><loc>${base}${athletePath("en", s)}</loc></url>`, `<url><loc>${base}${athletePath("it", s)}</loc></url>`]);
  return xml(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`);
}
