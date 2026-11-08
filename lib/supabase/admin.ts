// ============================================================================
// Client Supabase service-role: SOLO lato server, SOLO per il motore AI
// (scrive tabelle/sessioni a nome del coach AI, bypassando RLS) e per il cron.
// Mai importarlo in codice raggiungibile dal client.
// ============================================================================

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY mancante: il motore AI non può scrivere i piani.");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
