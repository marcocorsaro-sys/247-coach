-- ============================================================================
-- Migration 0028 — Percorsi abituali dell'atleta + forma (24/7 Coach).
--  - icu_activity_tracks: traccia GPS (semplificata) per attività, scaricata
--    da Intervals (/activity/{id}/map) una volta sola.
--  - athlete_routes: catalogo dei percorsi abituali, ricavato raggruppando le
--    tracce simili (stesso sport, partenza vicina, distanza e dislivello
--    simili). È quello che il coach usa per suggerire DOVE fare la seduta.
--  - sessions.route_id: percorso suggerito per la seduta pianificata.
-- La forma (CTL/ATL/TSB stile Performance Management Chart) si calcola al
-- volo da icu_activities.training_load: nessuna tabella.
-- ============================================================================

create table if not exists public.icu_activity_tracks (
  activity_id   uuid primary key references public.icu_activities(id) on delete cascade,
  athlete_id    uuid not null references public.profiles(id) on delete cascade,
  start_lat     double precision,
  start_lng     double precision,
  bounds        jsonb,          -- [[minLat,minLng],[maxLat,maxLng]]
  points        jsonb not null, -- [[lat,lng], ...] semplificata (~120 punti)
  n_points      integer,
  fetched_at    timestamptz not null default now()
);
create index if not exists icu_activity_tracks_athlete_idx on public.icu_activity_tracks (athlete_id);
alter table public.icu_activity_tracks enable row level security;
create policy tracks_own on public.icu_activity_tracks for select to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));
grant select on public.icu_activity_tracks to authenticated;
grant all on public.icu_activity_tracks to service_role;

create table if not exists public.athlete_routes (
  id              uuid primary key default gen_random_uuid(),
  athlete_id      uuid not null references public.profiles(id) on delete cascade,
  sport           text not null check (sport in ('run','bike')),
  name            text not null,            -- nome più frequente delle attività del gruppo
  distance_km     numeric not null,
  elevation_m     numeric not null,
  typical_minutes integer,                  -- mediana del tempo in movimento
  times_done      integer not null default 1,
  last_done       date,
  start_lat       double precision,
  start_lng       double precision,
  bounds          jsonb,
  points          jsonb not null,           -- traccia rappresentativa (attività più recente)
  sample_activity_id uuid references public.icu_activities(id) on delete set null,
  terrain         text,                     -- 'pianura' | 'collina' | 'montagna' (da D+/km)
  updated_at      timestamptz not null default now()
);
create index if not exists athlete_routes_athlete_idx on public.athlete_routes (athlete_id, sport);
alter table public.athlete_routes enable row level security;
create policy routes_own on public.athlete_routes for select to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));
grant select on public.athlete_routes to authenticated;
grant all on public.athlete_routes to service_role;

alter table public.sessions
  add column if not exists route_id uuid references public.athlete_routes(id) on delete set null,
  add column if not exists route_note text;   -- perché quel percorso (dal coach)

-- Partenza esplicita del piano (fresh start) e numero di settimane da
-- generare al primo colpo: se plan_start_date è nel futuro il motore salta la
-- settimana ponte e costruisce plan_weeks settimane piene da quel lunedì.
alter table public.ai_athlete_profiles
  add column if not exists plan_start_date date,
  add column if not exists plan_weeks integer;

-- Triage dei messaggi: decisione dell'app (now/sunday/answer) e risposta del coach.
alter table public.ai_feedback
  add column if not exists decision text check (decision in ('now','sunday','answer')),
  add column if not exists coach_reply text;

-- Foto profilo dell'atleta (profile_medium di Intervals), letta al collegamento.
alter table public.intervals_connections add column if not exists avatar_url text;

-- Onboarding guidato (24/7 Coach): basi di allenamento e completamento del tour.
alter table public.ai_athlete_profiles
  add column if not exists home_base text,        -- dove si allena lun-ven (es. "Novara")
  add column if not exists weekend_base text,     -- dove passa i weekend (es. "Morgex, Valle d'Aosta")
  add column if not exists tour_completed_at timestamptz;
