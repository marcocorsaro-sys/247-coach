-- Stato della generazione del piano AI: lock anti-doppio-click e ultimo
-- errore visibile all'atleta nella pagina di onboarding.
alter table public.ai_athlete_profiles
  add column if not exists ai_generation_started_at timestamptz,
  add column if not exists ai_last_error text;
