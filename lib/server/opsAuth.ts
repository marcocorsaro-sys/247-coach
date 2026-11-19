// Accesso alle rotte di servizio: CRON_SECRET (cron Vercel) oppure il token 'ops'
// in site_tokens (usato dai task programmati che pubblicano sui social).
import { createAdminClient } from "@/lib/supabase/admin";

export async function opsAuthorized(req: Request): Promise<boolean> {
  const url = new URL(req.url);
  const given = url.searchParams.get("secret") ?? url.searchParams.get("token") ?? (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!given) return false;
  const secret = process.env.CRON_SECRET;
  if (secret && given === secret) return true;
  const { data } = await createAdminClient().from("site_tokens").select("token").eq("name", "ops").maybeSingle();
  const t = (data as { token?: string } | null)?.token;
  return !!t && t.length >= 32 && given === t;
}
