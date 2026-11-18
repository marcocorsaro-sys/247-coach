// ============================================================================
// Foto delle località di gara per le grafiche social: per le gare senza foto
// (prima quelle più vicine nel calendario) cerca su Wikimedia Commons e fa
// scegliere a Claude. GET ?secret=… [&race=<id>] (rifà quella gara)
// ============================================================================
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findRacePhoto } from "@/lib/site/racePhotos";

export const maxDuration = 300;
const BUDGET_MS = 230_000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const ok = secret && (url.searchParams.get("secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const t0 = Date.now();
  const admin = createAdminClient();
  const one = url.searchParams.get("race");
  const { data: races } = await admin.from("event_races").select("id,name,country,city,water_type,race_date").order("race_date");
  const { data: have } = await admin.from("race_photos").select("race_id,status,checked_at");
  const done = new Map(((have ?? []) as { race_id: string; status: string; checked_at: string | null }[]).map((h) => [h.race_id, h]));
  const today = new Date().toISOString().slice(0, 10);
  // da fare: mai cercate, oppure in errore da più di un giorno; prima le gare future più vicine, poi le passate recenti
  const todo = ((races ?? []) as { id: string; name: string; country: string | null; city: string | null; water_type: string | null; race_date: string | null }[])
    .filter((r) => {
      if (one) return r.id === one;
      const h = done.get(r.id);
      if (!h) return true;
      const age = Date.now() - Date.parse(h.checked_at ?? "0");
      if (h.status === "pending") return age > 30 * 60e3; // un altro giro ci sta lavorando
      return h.status === "error" && age > 6 * 3600e3;
    })
    .sort((a, b) => {
      const fa = (a.race_date ?? "9") >= today, fb = (b.race_date ?? "9") >= today;
      if (fa !== fb) return fa ? -1 : 1;
      return fa ? (a.race_date ?? "").localeCompare(b.race_date ?? "") : (b.race_date ?? "").localeCompare(a.race_date ?? "");
    });
  const { data: facts } = await admin.from("event_race_facts").select("race_id,geo_label");
  const geo = new Map(((facts ?? []) as { race_id: string; geo_label: string | null }[]).map((f) => [f.race_id, f.geo_label]));
  const res: string[] = [];
  for (const r of todo) {
    if (Date.now() - t0 > BUDGET_MS) break;
    await admin.from("race_photos").upsert({ race_id: r.id, status: "pending", checked_at: new Date().toISOString() } as never);
    const o = await findRacePhoto(admin as never, r, geo.get(r.id)).catch((e) => ({ status: "error", note: String(e) }));
    res.push(`${r.name}:${o.status}`);
  }
  await admin.from("site_job_log").insert({ job: "race-photos", result: { done: res, left: Math.max(0, todo.length - res.length) } } as never);
  return NextResponse.json({ done: res, left: Math.max(0, todo.length - res.length) });
}
