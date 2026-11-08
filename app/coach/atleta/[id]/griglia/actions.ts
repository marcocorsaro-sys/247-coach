"use server";

import { redirect } from "next/navigation";
import { runSaveGrid } from "@/lib/server/gridSave";

/** Salva la griglia: resta per i client con la pagina aperta prima del cambio. */
export async function saveGrid(formData: FormData) {
  const r = await runSaveGrid(formData);
  if (!r.ok) redirect(r.code === "auth" ? "/login" : "/coach");
  redirect(r.dest);
}
