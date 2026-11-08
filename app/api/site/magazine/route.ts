// Magazine: generazione e traduzione.
//  Manuale (?secret=CRON_SECRET):
//    ?kind=preview&slug=klagenfurt-2027[&publish=1]
//    ?kind=recap&slug=klagenfurt-2027&results=2673[&publish=1]
//    ?kind=feature&brief=...&facts=...[&pslug=...][&publish=1]
//    ?translate=1&post=<slug-post>[&langs=en,de]   (default: tutte tranne it)
//  Cron Vercel (Authorization: Bearer CRON_SECRET, ?cron=1): lunedì anteprime delle gare
//  nei prossimi 14 giorni; ogni giorno recap delle gare di ieri se è noto l'id risultati.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSecret } from "@/lib/site/admin";
import { generateFeature, generatePreview, generateRecap, translateMagazine, type MagPost } from "@/lib/site/magazine";
import { RESULTS_ID } from "@/lib/site/magazine-map";
import { isLang, LANGS, type Lang } from "@/lib/i18n/config";
import type { Race } from "@/lib/site/races";

export const maxDuration = 300;

function authorized(req: Request) {
  const s = process.env.CRON_SECRET;
  return checkSecret(req) || (Boolean(s) && req.headers.get("authorization") === `Bearer ${s}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const q = new URL(req.url).searchParams;
  const admin = createAdminClient();
  const publish = q.get("publish") === "1" || q.get("cron") === "1";

  if (q.get("translate") === "1") {
    const { data } = await admin.from("site_magazine_posts").select("*").eq("slug", q.get("post") ?? "").maybeSingle();
    if (!data) return NextResponse.json({ error: "post non trovato" }, { status: 404 });
    const langs = (q.get("langs") ?? "").split(",").map((s) => s.trim()).filter(isLang) as Lang[];
    const out = [];
    for (const l of langs.length ? langs : LANGS.filter((x) => x !== "it")) out.push(await translateMagazine(admin, data as MagPost, l));
    return NextResponse.json({ post: q.get("post"), results: out });
  }

  if (q.get("cron") === "1") {
    const now = new Date();
    const day = (n: number) => new Date(now.getTime() + n * 864e5).toISOString().slice(0, 10);
    const log: unknown[] = [];
    if (now.getUTCDay() === 1) {
      const { data } = await admin.from("event_races").select("*").gte("race_date", day(0)).lte("race_date", day(14)).eq("status", "published");
      for (const r of (data ?? []) as Race[]) log.push({ preview: r.slug, ...(await generatePreview(admin, r, { publish: true })) });
    }
    const { data: yest } = await admin.from("event_races").select("*").eq("race_date", day(-1)).eq("status", "published");
    for (const r of (yest ?? []) as Race[]) {
      const id = RESULTS_ID[r.slug];
      log.push(id ? { recap: r.slug, ...(await generateRecap(admin, r, id, { publish: true })) } : { recap: r.slug, ok: false, error: "id risultati non mappato" });
    }
    return NextResponse.json({ ok: true, log });
  }

  const kind = q.get("kind");
  if (kind === "feature") return NextResponse.json(await generateFeature(admin, q.get("brief") ?? "", q.get("facts") ?? "", { publish, slug: q.get("pslug") ?? undefined }));
  const { data } = await admin.from("event_races").select("*").eq("slug", q.get("slug") ?? "").maybeSingle();
  const race = data as Race | null;
  if (!race) return NextResponse.json({ error: "gara non trovata" }, { status: 404 });
  if (kind === "preview") return NextResponse.json(await generatePreview(admin, race, { publish }));
  if (kind === "recap") return NextResponse.json(await generateRecap(admin, race, Number(q.get("results")), { publish }));
  return NextResponse.json({ error: "kind mancante" }, { status: 400 });
}
