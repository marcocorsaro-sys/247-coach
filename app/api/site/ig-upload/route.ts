// Carica un reel (MP4, max 4 MB) nel bucket pubblico 'social' e ne restituisce l'URL,
// così Instagram lo può scaricare. POST ?token=…&name=<file>.mp4 con il video nel body.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { opsAuthorized } from "@/lib/server/opsAuth";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await opsAuthorized(req))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const name = (new URL(req.url).searchParams.get("name") ?? "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (!/\.(mp4|jpg)$/.test(name)) return NextResponse.json({ error: "name deve finire in .mp4 o .jpg" }, { status: 400 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length < 1000 || buf.length > 4_200_000) return NextResponse.json({ error: `dimensione non valida: ${buf.length}` }, { status: 400 });
  const path = `reels/${new Date().toISOString().slice(0, 10)}/${name}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from("social").upload(path, buf, { contentType: name.endsWith(".mp4") ? "video/mp4" : "image/jpeg", upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: admin.storage.from("social").getPublicUrl(path).data.publicUrl });
}
