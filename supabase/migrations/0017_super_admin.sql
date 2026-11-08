-- ============================================================================
-- Migration 0017 — Super admin.
--
-- Un utente flaggato is_admin (Marco) si logga col PROPRIO account e può
-- entrare nella vista di qualunque atleta e nella vista coach. Le policy RLS
-- esistenti restano invariate; si aggiunge UNA policy permissiva per tabella
-- (le policy sono in OR) che concede tutto agli admin. La verifica passa da
-- app.is_admin(), SECURITY DEFINER per evitare ricorsioni su profiles.
-- strava_connections è esclusa di proposito (token segreti, integrazione
-- deprecata: nessun motivo di aprirla).
-- ============================================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Super admin: accesso completo via policy admin_all e switch di vista nell''app.';

create or replace function app.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;
revoke execute on function app.is_admin() from public, anon;
grant execute on function app.is_admin() to authenticated, service_role;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','coaching_relationships','athlete_disciplines','athlete_metrics',
    'races','training_weeks','sessions','session_steps','session_logs',
    'athlete_categories','athlete_fitness','athlete_custom_zones','comments',
    'race_catalog','vacation_periods','vacation_days','vacation_workouts',
    'vacation_picks','intervals_connections','icu_activities',
    'strava_activities','garmin_connections','garmin_activities',
    'garmin_scheduled_workouts'
  ] loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (app.is_admin()) with check (app.is_admin())',
      t
    );
  end loop;
end $$;
