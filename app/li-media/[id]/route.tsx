// Immagine JPEG 1080×1350 del post LinkedIn del giorno (li_plan.content.slide),
// con la foto della località della gara di aggancio. URL: /li-media/<id>.jpg
import { createPublicClient } from "@/lib/supabase/public";
import type { LiContent } from "@/lib/site/liContent";
import { renderSocial, type RacePhoto } from "@/lib/site/socialRender";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createPublicClient();
  const { data } = await db.from("li_plan").select("content,race_id").eq("id", id.replace(/\.jpe?g$/, "")).maybeSingle();
  const c = data?.content as LiContent | null;
  if (!c?.slide) return new Response("not found", { status: 404 });
  const { data: ph } = data!.race_id ? await db.from("race_photos").select("url,author,license,focus_x,status").eq("race_id", data!.race_id).maybeSingle() : { data: null };
  const jpg = await renderSocial(c.slide, 1, 1, (ph as RacePhoto | null) ?? null);
  return new Response(new Uint8Array(jpg), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=3600, s-maxage=3600" } });
}
