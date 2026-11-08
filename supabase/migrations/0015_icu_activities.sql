-- ============================================================================
-- Migration 0015 — Attività svolte via Intervals.icu (hub multi-piattaforma).
--
-- Intervals.icu aggrega le attività svolte da QUALUNQUE piattaforma collegata
-- dall'atleta (Garmin, Polar, Suunto, Strava, COROS, Wahoo, Zwift, ...). L'app
-- le importa via API con la chiave dell'atleta e le mostra a coach e atleta
-- accanto al pianificato. Sostituisce l'integrazione Strava diretta (che
-- copriva una sola piattaforma e un solo atleta).
--
-- * icu_activities: specchio funzionale di strava_activities ma con fonte
--   Intervals (id attività testuale, campo type Intervals, source della
--   piattaforma d'origine quando disponibile).
-- * intervals_connections.channels: canali dichiarati dell'atleta
--   (garmin, polar, suunto, strava, trainingpeaks, ...) — informativo, per
--   l'onboarding e la scheda; il collegamento tecnico avviene su Intervals.
-- ============================================================================

alter table public.intervals_connections
  add column if not exists channels text;

comment on column public.intervals_connections.channels is
  'Canali/piattaforme dichiarati per l''atleta (es. "garmin, polar"). Informativo.';

create table if not exists public.icu_activities (
  id                   uuid primary key default gen_random_uuid(),
  athlete_id           uuid not null references public.profiles(id) on delete cascade,
  icu_activity_id      text not null,
  name                 text,
  sport_type           text,                 -- type Intervals (Run, Ride, Swim, ...)
  source               text,                 -- piattaforma d'origine se nota (GARMIN, POLAR, STRAVA, ...)
  discipline           text check (discipline in ('swim','bike','run','athletics','other')),
  start_date           timestamptz,
  distance_m           numeric,
  moving_time_s        integer,
  elapsed_time_s       integer,
  total_elevation_gain numeric,
  average_heartrate    numeric,
  max_heartrate        numeric,
  average_speed        numeric,              -- m/s
  max_speed            numeric,              -- m/s
  average_watts        numeric,
  average_cadence      numeric,
  calories             numeric,
  training_load        numeric,              -- icu_training_load se presente
  trainer              boolean,
  raw                  jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (athlete_id, icu_activity_id)
);
create index if not exists icu_activities_athlete_date_idx
  on public.icu_activities (athlete_id, start_date desc);

alter table public.icu_activities enable row level security;

-- L'atleta gestisce le proprie; il coach collegato le legge e le sincronizza.
drop policy if exists icu_act_manage on public.icu_activities;
create policy icu_act_manage on public.icu_activities
  for all to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id))
  with check (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));

grant select, insert, update, delete on public.icu_activities to authenticated;
grant all on public.icu_activities to service_role;

create trigger trg_icu_activities_updated before update on public.icu_activities
  for each row execute function public.set_updated_at();
