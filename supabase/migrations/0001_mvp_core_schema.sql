-- ============================================================================
-- Irene Tabella — MVP core schema
-- Piattaforma di coaching Coach <-> Atleta (triathlon / running / swimming)
-- Migration 0001 — modello relazionale iniziale + Row Level Security
--
-- Decisioni codificate qui:
--   * profili con ruolo coach/atleta
--   * relazione coach -> atleti
--   * profilo multi-disciplina per atleta (corsa, nuoto, bici, athletics)
--   * Test fisici / soglie / zone versionati nel tempo e per disciplina
--   * Gare obiettivo A/B/C
--   * tabella settimanale con revisioni (i fogli "restart" dell'Excel)
--   * sessioni (cella griglia giorno x disciplina) + step strutturati
--     (base per il futuro export Garmin/Polar, fase 2)
--   * completamento + feedback dell'atleta
--   * filo di dialogo coach <-> atleta su settimana o sessione
--   * RLS: ogni coach vede solo i suoi atleti, ogni atleta solo i propri dati
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- PROFILES  (estende auth.users; un profilo = un coach oppure un atleta)
-- ============================================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  role         text not null default 'athlete' check (role in ('coach','athlete')),
  level        text check (level in ('neofita','intermedio','avanzato','pro')),
  avatar_color text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.profiles is 'Coach e atleti. La colonna role distingue i due lati della piattaforma.';

-- ============================================================================
-- COACHING RELATIONSHIPS  (quali atleti segue un coach)
-- ============================================================================
create table public.coaching_relationships (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (coach_id, athlete_id)
);
create index on public.coaching_relationships (athlete_id);
create index on public.coaching_relationships (coach_id);

-- ============================================================================
-- ATHLETE DISCIPLINES  (profilo multi-sport configurabile per atleta)
-- ============================================================================
create table public.athlete_disciplines (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  discipline  text not null check (discipline in ('swim','bike','run','athletics','other')),
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (athlete_id, discipline)
);
create index on public.athlete_disciplines (athlete_id);

-- ============================================================================
-- ATHLETE METRICS  (Test fisici + soglie/zone, versionati nel tempo)
--   key-value datato: regge sia valori numerici (ftp=250) sia testuali (passo)
-- ============================================================================
create table public.athlete_metrics (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  discipline   text check (discipline in ('swim','bike','run','athletics','other')),
  metric_key   text not null,            -- 'ftp', 'css_swim', 'threshold_pace_run', 'lthr', 'vo2max', ...
  metric_value numeric,                  -- valore numerico (watt, bpm, m/s, ...)
  metric_text  text,                     -- valore non numerico (es. passo '4:05/km')
  unit         text,                     -- 'w','bpm','min/km', ...
  recorded_at  date not null default current_date,
  recorded_by  uuid references public.profiles(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);
create index on public.athlete_metrics (athlete_id, metric_key, recorded_at desc);

-- ============================================================================
-- RACES  (Gare obiettivo A/B/C)
-- ============================================================================
create table public.races (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  race_date      date,
  location       text,
  sport          text,                   -- 'triathlon','running','swimming', ...
  priority       text check (priority in ('A','B','C')),
  distance_label text,                   -- 'Ironman','10K','Olimpico', ...
  target_time    text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.races (athlete_id, race_date);

-- ============================================================================
-- TRAINING WEEKS  (la "tabella" settimanale, con revisioni)
-- ============================================================================
create table public.training_weeks (
  id               uuid primary key default gen_random_uuid(),
  athlete_id       uuid not null references public.profiles(id) on delete cascade,
  coach_id         uuid references public.profiles(id) on delete set null,
  week_start       date not null,        -- lunedì della settimana
  label            text,                 -- es. 'Maggio_2026'
  status           text not null default 'draft' check (status in ('draft','published','archived')),
  version          integer not null default 1,
  previous_week_id uuid references public.training_weeks(id) on delete set null,
  coach_comment    text,
  source_filename  text,                 -- nome dell'Excel importato
  published_at     timestamptz,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.training_weeks (athlete_id, week_start desc);

-- ============================================================================
-- SESSIONS  (una cella della griglia: giorno x disciplina)
-- ============================================================================
create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  week_id         uuid not null references public.training_weeks(id) on delete cascade,
  day_of_week     smallint not null check (day_of_week between 0 and 6),  -- 0 = lunedì
  discipline      text not null check (discipline in ('swim','bike','run','athletics','other')),
  title           text,                  -- riga "tipo": 'fartlek','endurance','aerobico', ...
  intensity_label text,
  volume_value    text,                  -- '120''', '3km', '3h30''-4h'
  volume_unit     text check (volume_unit in ('time','distance','other')),
  raw_text        text,                  -- testo originale di Irene (per editor + audit)
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now()
);
create index on public.sessions (week_id, day_of_week);

-- ============================================================================
-- SESSION STEPS  (struttura fine: step / ripetute / target)
--   base per il futuro export verso Garmin/Polar (fase 2)
--   parent_step_id permette i blocchi ripetuti Nx(...)
-- ============================================================================
create table public.session_steps (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.sessions(id) on delete cascade,
  parent_step_id   uuid references public.session_steps(id) on delete cascade,
  sort_order       smallint not null default 0,
  step_type        text not null default 'steady'
                     check (step_type in ('warmup','interval','recovery','steady','cooldown','rest','repeat')),
  repeat_count     smallint,             -- per blocchi ripetuti Nx(...)
  duration_seconds integer,
  distance_meters  numeric,
  target_type      text check (target_type in ('rpe','zone','power','pace','hr','cadence','open')),
  target_low       numeric,
  target_high      numeric,
  target_unit      text,
  cadence_rpm      smallint,
  recovery_text    text,
  raw_fragment     text,
  note             text
);
create index on public.session_steps (session_id, sort_order);
create index on public.session_steps (parent_step_id);

-- ============================================================================
-- SESSION LOGS  (completamento + feedback dell'atleta)
-- ============================================================================
create table public.session_logs (
  id                      uuid primary key default gen_random_uuid(),
  session_id              uuid not null references public.sessions(id) on delete cascade,
  athlete_id              uuid not null references public.profiles(id) on delete cascade,
  status                  text not null default 'planned'
                            check (status in ('planned','completed','partial','skipped')),
  actual_duration_seconds integer,
  actual_distance_meters  numeric,
  rpe_actual              numeric,
  athlete_note            text,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (session_id, athlete_id)
);
create index on public.session_logs (athlete_id);

-- ============================================================================
-- COMMENTS  (il filo del dialogo coach <-> atleta su settimana o sessione)
-- ============================================================================
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  week_id     uuid references public.training_weeks(id) on delete cascade,
  session_id  uuid references public.sessions(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  check (week_id is not null or session_id is not null)
);
create index on public.comments (week_id, created_at);
create index on public.comments (session_id, created_at);

-- ============================================================================
-- HELPER FUNCTIONS  (SECURITY DEFINER: evitano ricorsione nelle policy RLS)
-- ============================================================================
create or replace function public.is_coach()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach');
$$;

create or replace function public.is_my_athlete(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.coaching_relationships cr
    where cr.coach_id = auth.uid() and cr.athlete_id = target and cr.active
  );
$$;

create or replace function public.is_my_coach(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.coaching_relationships cr
    where cr.athlete_id = auth.uid() and cr.coach_id = target and cr.active
  );
$$;

create or replace function public.can_access_week(w uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.training_weeks tw
    where tw.id = w and (tw.athlete_id = auth.uid() or public.is_my_athlete(tw.athlete_id))
  );
$$;

create or replace function public.can_manage_week(w uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.training_weeks tw
    where tw.id = w and public.is_my_athlete(tw.athlete_id)
  );
$$;

create or replace function public.can_access_session(s uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.sessions se
    join public.training_weeks tw on tw.id = se.week_id
    where se.id = s and (tw.athlete_id = auth.uid() or public.is_my_athlete(tw.athlete_id))
  );
$$;

create or replace function public.can_manage_session(s uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.sessions se
    join public.training_weeks tw on tw.id = se.week_id
    where se.id = s and public.is_my_athlete(tw.athlete_id)
  );
$$;

-- ============================================================================
-- TRIGGERS  (updated_at automatico + creazione profilo alla registrazione)
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_races_updated before update on public.races
  for each row execute function public.set_updated_at();
create trigger trg_weeks_updated before update on public.training_weeks
  for each row execute function public.set_updated_at();
create trigger trg_logs_updated before update on public.session_logs
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'role', 'athlete')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles               enable row level security;
alter table public.coaching_relationships  enable row level security;
alter table public.athlete_disciplines     enable row level security;
alter table public.athlete_metrics         enable row level security;
alter table public.races                   enable row level security;
alter table public.training_weeks          enable row level security;
alter table public.sessions                enable row level security;
alter table public.session_steps           enable row level security;
alter table public.session_logs            enable row level security;
alter table public.comments                enable row level security;

-- profiles -------------------------------------------------------------------
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_my_athlete(id) or public.is_my_coach(id));
create policy "profiles_insert_self" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_update_coach" on public.profiles for update to authenticated
  using (public.is_my_athlete(id)) with check (public.is_my_athlete(id));

-- coaching_relationships -----------------------------------------------------
create policy "cr_select" on public.coaching_relationships for select to authenticated
  using (coach_id = auth.uid() or athlete_id = auth.uid());
create policy "cr_coach_manage" on public.coaching_relationships for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- athlete_disciplines --------------------------------------------------------
create policy "ad_select" on public.athlete_disciplines for select to authenticated
  using (athlete_id = auth.uid() or public.is_my_athlete(athlete_id));
create policy "ad_coach_manage" on public.athlete_disciplines for all to authenticated
  using (public.is_my_athlete(athlete_id)) with check (public.is_my_athlete(athlete_id));

-- athlete_metrics ------------------------------------------------------------
create policy "am_select" on public.athlete_metrics for select to authenticated
  using (athlete_id = auth.uid() or public.is_my_athlete(athlete_id));
create policy "am_coach_manage" on public.athlete_metrics for all to authenticated
  using (public.is_my_athlete(athlete_id)) with check (public.is_my_athlete(athlete_id));

-- races ----------------------------------------------------------------------
create policy "races_select" on public.races for select to authenticated
  using (athlete_id = auth.uid() or public.is_my_athlete(athlete_id));
create policy "races_coach_manage" on public.races for all to authenticated
  using (public.is_my_athlete(athlete_id)) with check (public.is_my_athlete(athlete_id));

-- training_weeks -------------------------------------------------------------
create policy "weeks_select" on public.training_weeks for select to authenticated
  using (athlete_id = auth.uid() or public.is_my_athlete(athlete_id));
create policy "weeks_coach_manage" on public.training_weeks for all to authenticated
  using (public.is_my_athlete(athlete_id)) with check (public.is_my_athlete(athlete_id));

-- sessions -------------------------------------------------------------------
create policy "sessions_select" on public.sessions for select to authenticated
  using (public.can_access_week(week_id));
create policy "sessions_coach_manage" on public.sessions for all to authenticated
  using (public.can_manage_week(week_id)) with check (public.can_manage_week(week_id));

-- session_steps --------------------------------------------------------------
create policy "steps_select" on public.session_steps for select to authenticated
  using (public.can_access_session(session_id));
create policy "steps_coach_manage" on public.session_steps for all to authenticated
  using (public.can_manage_session(session_id)) with check (public.can_manage_session(session_id));

-- session_logs  (l'atleta gestisce i propri log; il coach li legge) ----------
create policy "logs_select" on public.session_logs for select to authenticated
  using (athlete_id = auth.uid() or public.is_my_athlete(athlete_id));
create policy "logs_athlete_manage" on public.session_logs for all to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- comments  (dialogo) --------------------------------------------------------
create policy "comments_select" on public.comments for select to authenticated
  using (
    (week_id is not null and public.can_access_week(week_id))
    or (session_id is not null and public.can_access_session(session_id))
  );
create policy "comments_insert" on public.comments for insert to authenticated
  with check (
    author_id = auth.uid() and (
      (week_id is not null and public.can_access_week(week_id))
      or (session_id is not null and public.can_access_session(session_id))
    )
  );
create policy "comments_update_own" on public.comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "comments_delete_own" on public.comments for delete to authenticated
  using (author_id = auth.uid());

-- ============================================================================
-- GRANTS  (RLS gestisce le righe; servono i privilegi di tabella)
-- ============================================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
