// Slide JPEG 1080×1350 di un post del palinsesto Instagram (ig_plan.content).
// URL pubblico: /ig-media/<id piano>/<n>.jpg — Instagram (via Windsor) lo scarica
// al momento della pubblicazione. Foto della località a tutto schermo (race_photos).
import { createPublicClient } from "@/lib/supabase/public";
import type { IgContent } from "@/lib/site/igContent";
import { renderSocial, toSocial, type RacePhoto } from "@/lib/site/socialRender";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const i = Number(n.replace(/\.jpe?g$/, ""));
  const db = createPublicClient();
  const { data } = await db.from("ig_plan").select("content,race_id").eq("id", id).maybeSingle();
  const c = data?.content as IgContent | null;
  const s = c?.slides?.[i - 1];
  if (!c || !s) return new Response("not found", { status: 404 });
  const { data: ph } = await db.from("race_photos").select("url,author,license,focus_x,status").eq("race_id", data!.race_id).maybeSingle();
  const jpg = await renderSocial(toSocial(s as never, i), i, c.slides.length, (ph as RacePhoto | null) ?? null);
  return new Response(new Uint8Array(jpg), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400, s-maxage=86400" } });
}
