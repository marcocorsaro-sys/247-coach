// ============================================================================
// Client Supabase anonimo per le pagine pubbliche del sito (gare, scheda gara):
// nessun cookie, nessuna sessione — legge solo ciò che le RLS espongono ad
// `anon` (event_races pubblicate, recensioni/media/articoli published).
// Serve a renderizzare le pagine anche senza utente e a cacharle.
// ============================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function createPublicClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cached;
}
