import { createPublicClient } from "@/lib/supabase/public";
import { SOURCE_LANG, type Lang } from "@/lib/i18n/config";
import type { MagPost } from "@/lib/site/magazine";

export async function listPosts(lang: Lang, limit = 60): Promise<(MagPost & { translated: boolean })[]> {
  const db = createPublicClient();
  const { data } = await db.from("site_magazine_posts").select("*").eq("published", true).order("published_at", { ascending: false }).limit(limit);
  const posts = (data ?? []) as MagPost[];
  return applyTr(posts, lang);
}
export async function getPost(slug: string, lang: Lang) {
  const { data } = await createPublicClient().from("site_magazine_posts").select("*").eq("published", true).eq("slug", slug).maybeSingle();
  if (!data) return null;
  return (await applyTr([data as MagPost], lang))[0];
}
async function applyTr(posts: MagPost[], lang: Lang) {
  if (lang === SOURCE_LANG || !posts.length) return posts.map((p) => ({ ...p, translated: lang === SOURCE_LANG }));
  const { data } = await createPublicClient().from("site_magazine_translations").select("post_id,title,dek,body_md").eq("lang", lang).in("post_id", posts.map((p) => p.id));
  const m = new Map((data ?? []).map((x: { post_id: string; title: string; dek: string | null; body_md: string }) => [x.post_id, x]));
  return posts.map((p) => { const t = m.get(p.id); return t ? { ...p, title: t.title, dek: t.dek, body_md: t.body_md, translated: true } : { ...p, translated: false }; });
}
