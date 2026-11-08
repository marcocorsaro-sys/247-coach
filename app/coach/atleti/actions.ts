"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
const enc = (s: string) => encodeURIComponent(s);

// Wrapper per aggirare lo skew di tipi nell'overload .rpc() di supabase-js
// (il formato Args generato non viene letto correttamente). A runtime gli
// argomenti vengono comunque inviati come body della RPC.
type Rpc = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

// .bind() è obbligatorio: estrarre supabase.rpc in una variabile perde il
// binding di `this` e a runtime supabase-js fallisce su `this.rest`.
const rpcOf = (s: Awaited<ReturnType<typeof createClient>>) =>
  s.rpc.bind(s) as unknown as Rpc;

const VALID_CATEGORIES = ["triathlete", "runner", "ultra_runner", "swimmer", "cyclist"];

function categoriesFrom(formData: FormData): string[] {
  return formData
    .getAll("categories")
    .map((v) => String(v))
    .filter((v) => VALID_CATEGORIES.includes(v));
}

async function replaceCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
  categories: string[],
) {
  await supabase.from("athlete_categories").delete().eq("athlete_id", athleteId);
  if (categories.length > 0) {
    await supabase
      .from("athlete_categories")
      .insert(categories.map((c) => ({ athlete_id: athleteId, category: c })) as never);
  }
}

export async function createAthlete(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = str(formData.get("full_name"));
  const email = str(formData.get("email"));
  const password = str(formData.get("password"));
  const level = str(formData.get("level"));

  if (!full_name || !email || !password) {
    redirect("/coach/atleti?error=" + enc("Nome, email e password sono obbligatori."));
  }

  const rpc = rpcOf(supabase);
  const { data, error } = await rpc("coach_create_athlete", {
    p_email: email,
    p_password: password,
    p_full_name: full_name,
    p_level: level,
  });
  if (error) {
    redirect("/coach/atleti?error=" + enc(error.message));
  }
  const newId = typeof data === "string" ? data : null;
  if (newId) {
    await replaceCategories(supabase, newId, categoriesFrom(formData));
    const phone = str(formData.get("phone"));
    if (phone) {
      await supabase.from("profiles").update({ phone } as never).eq("id", newId);
    }
  }
  revalidatePath("/coach/atleti");
  redirect("/coach/atleti?created=" + enc(email as string));
}

export async function updateAthlete(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const athleteId = str(formData.get("athlete_id"));
  const full_name = str(formData.get("full_name"));
  const level = str(formData.get("level"));
  const email = str(formData.get("email"));
  if (!athleteId || !full_name) {
    redirect("/coach/atleti?error=" + enc("Nome obbligatorio."));
  }

  const rpc = rpcOf(supabase);
  const { error } = await rpc("coach_update_athlete", {
    p_athlete_id: athleteId,
    p_full_name: full_name,
    p_level: level,
    p_email: email,
  });
  if (error) {
    redirect("/coach/atleti?error=" + enc(error.message));
  }
  await replaceCategories(supabase, athleteId as string, categoriesFrom(formData));
  // Telefono per le notifiche SMS: scrittura diretta sul profilo (consentita al
  // coach dalla policy profiles_update_coach). Stringa vuota → azzera il numero.
  const phone = str(formData.get("phone"));
  await supabase
    .from("profiles")
    .update({ phone } as never)
    .eq("id", athleteId as string);
  revalidatePath("/coach/atleti");
  redirect("/coach/atleti?updated=1");
}

export async function setAthletePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const athleteId = str(formData.get("athlete_id"));
  const password = str(formData.get("password"));
  if (!athleteId || !password) {
    redirect("/coach/atleti?error=" + enc("Password obbligatoria."));
  }

  const rpc = rpcOf(supabase);
  const { error } = await rpc("coach_set_athlete_password", {
    p_athlete_id: athleteId,
    p_password: password,
  });
  if (error) {
    redirect("/coach/atleti?error=" + enc(error.message));
  }
  revalidatePath("/coach/atleti");
  redirect("/coach/atleti?pwd=" + enc(athleteId as string));
}

export async function deleteAthlete(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const athleteId = str(formData.get("athlete_id"));
  if (!athleteId) redirect("/coach/atleti");

  const rpc = rpcOf(supabase);
  const { error } = await rpc("coach_delete_athlete", {
    p_athlete_id: athleteId,
  });
  if (error) {
    redirect("/coach/atleti?error=" + enc(error.message));
  }
  revalidatePath("/coach/atleti");
  redirect("/coach/atleti?deleted=1");
}
