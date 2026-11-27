"use server";
// Rimozione di una pagina atleta: immediata, senza verifica (meglio una pagina tolta per
// errore che una lasciata contro la volontà dell'interessato). Il nome viene cancellato,
// i risultati restano anonimi, e la richiesta resta registrata per non ricaricare l'atleta.
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { athLang, removePath } from "@/lib/site/athletes";

export async function removeAthlete(form: FormData) {
  const l = athLang(String(form.get("lang") ?? "en"));
  const raw = String(form.get("slug") ?? "").trim().toLowerCase();
  const slug = (raw.split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "").replace(/[^a-z0-9-]/g, "");
  const email = String(form.get("email") ?? "").trim().slice(0, 200) || null;
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || null;
  let ok = false;
  if (slug.length >= 8) {
    const admin = createAdminClient();
    const { data: a } = await admin.from("ath_athletes").select("cid,slug,name").eq("slug", slug).maybeSingle();
    if (a) {
      const row = a as { cid: string; slug: string; name: string };
      await admin.from("ath_removals").insert({ cid: row.cid, slug: row.slug, name: row.name, email, note, status: "done" });
      await admin.from("ath_results").update({ cid: null }).eq("cid", row.cid);
      await admin.from("ath_athletes").delete().eq("cid", row.cid);
      ok = true;
    }
  }
  redirect(`${removePath(l)}${ok ? "?done=1" : "?err=1"}`);
}
