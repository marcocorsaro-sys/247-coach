-- ============================================================================
-- Irene Tabella — Integrazione Strava
-- Migration 0009 — connessione OAuth per-atleta + import attività svolte
--
-- Decisioni codificate qui:
--   * strava_connections: una riga per atleta con i token OAuth (access +
--     refresh). I token sono SEGRETI: leggibili/scrivibili solo dall'atleta
--     proprietario (RLS owner-only). Il coach NON può leggere i token.
--   * strava_activities: attività importate da Strava (pianificato vs svolto).
--     L'atleta gestisce le proprie; il coach (collegato) le legge, come per
--     session_logs.
--   * strava_status(athlete): funzione SECURITY DEFINER che espone lo *stato*
--     della connessione (connesso? ultimo sync? nome atleta Strava) senza mai
--     restituire i token. Richiamabile dall'atleta stesso o dal suo coach.
-- ============================================================================

-- ============================================================================
-- STRAVA CONNECTIONS  (token OAuth per atleta — owner-only)
-- ============================================================================
create table if not exists public.strava_connections (
  athlete_id        uuid primary key references public.profiles(id) on delete cascade,
  strava_athlete_id bigint,
  access_token      text not null,
  refresh_token     text not null,
  expires_at        timestamptz not null,   -- scadenza dell'access_token
  scope             text,
  athlete_firstname text,
  athlete_lastname  text,
  last_sync_at      timestamptz,
  connected_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.strava_connections is
  'Token OAuth Strava per atleta. I token sono segreti: RLS espone le righe solo all''atleta proprietario.';

alter table public.strava_connections enable row level security;

-- Solo l'atleta proprietario può vedere/gestire la propria connessione.
-- Il coach NON ha accesso (i token non devono uscire dal contesto atleta).
drop policy if exists strava_conn_owner on public.strava_connections;
create policy strava_conn_owner on public.strava_connections
  for all to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

grant select, insert, update, delete on public.strava_connections to authenticated;
grant all on public.strava_connections to service_role;

create trigger trg_strava_connections_updated before update on public.strava_connections
  for each row execute function public.set_updated_at();

-- ============================================================================
-- STRAVA ACTIVITIES  (attività svolte importate da Strava)
-- ============================================================================
create table if not exists public.strava_activities (
  id                   uuid primary key default gen_random_uuid(),
  athlete_id           uuid not null references public.profiles(id) on delete cascade,
  strava_activity_id   bigint not null,
  name                 text,
  sport_type           text,                 -- valore grezzo Strava (Run, Ride, Swim, ...)
  discipline           text check (discipline in ('swim','bike','run','athletics','other')),
  start_date           timestamptz,          -- start_date (UTC) dell'attività
  distance_m           numeric,              -- metri
  moving_time_s        integer,              -- secondi
  elapsed_time_s       integer,              -- secondi
  total_elevation_gain numeric,              -- metri
  average_heartrate    numeric,              -- bpm
  max_heartrate        numeric,              -- bpm
  average_speed        numeric,              -- m/s
  max_speed            numeric,              -- m/s
  average_watts        numeric,              -- W
  average_cadence      numeric,
  calories             numeric,
  trainer              boolean,              -- attività indoor/rulli
  raw                  jsonb,                -- payload Strava completo (audit/futuro)
  created_at           timestamptz not null default now(),
  unique (athlete_id, strava_activity_id)
);
create index if not exists strava_activities_athlete_start_idx
  on public.strava_activities (athlete_id, start_date desc);

alter table public.strava_activities enable row level security;

-- L'atleta gestisce le proprie attività; il coach collegato le legge.
drop policy if exists strava_act_select on public.strava_activities;
create policy strava_act_select on public.strava_activities
  for select to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));

drop policy if exists strava_act_owner_manage on public.strava_activities;
create policy strava_act_owner_manage on public.strava_activities
  for all to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

grant select, insert, update, delete on public.strava_activities to authenticated;
grant all on public.strava_activities to service_role;

-- ============================================================================
-- STRAVA STATUS  (stato connessione senza esporre i token)
--   Visibile all'atleta stesso o al suo coach. SECURITY DEFINER per leggere
--   strava_connections aggirando la policy owner-only, ma filtrando i token.
-- ============================================================================
create or replace function public.strava_status(p_athlete uuid)
returns table (
  connected         boolean,
  strava_athlete_id bigint,
  athlete_firstname text,
  athlete_lastname  text,
  scope             text,
  last_sync_at      timestamptz,
  connected_at      timestamptz,
  activity_count    bigint
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with allowed as (
    select (p_athlete = auth.uid() or app.is_my_athlete(p_athlete)) as ok
  )
  select
    (c.athlete_id is not null) as connected,
    c.strava_athlete_id,
    c.athlete_firstname,
    c.athlete_lastname,
    c.scope,
    c.last_sync_at,
    c.connected_at,
    (select count(*) from public.strava_activities a where a.athlete_id = p_athlete) as activity_count
  from (select 1) one
  left join public.strava_connections c on c.athlete_id = p_athlete
  where (select ok from allowed);
$$;

-- Solo gli utenti autenticati (atleta o suo coach) chiamano strava_status:
-- togliamo l'EXECUTE di default a PUBLIC/anon.
revoke execute on function public.strava_status(uuid) from public, anon;
grant execute on function public.strava_status(uuid) to authenticated, service_role;
