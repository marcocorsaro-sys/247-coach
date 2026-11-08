-- ============================================================================
-- Irene Tabella — Periodi flessibili / "Ferie"
-- Migration 0011
--
-- Problema: durante le ferie Irene non assegna l'allenamento del giorno X, ma
-- offre un *menu* di allenamenti ad-hoc (nuoto1, nuoto2, bike1…) e indica, per
-- ogni giorno, solo la disciplina. L'atleta sceglie dal menu quello che
-- preferisce e lo marca come svolto.
--
-- Questa meccanica scollega il "workout" dal "giorno" del modello settimanale
-- (training_weeks → sessions). Si introducono quattro concetti, sovrapposti
-- alle settimane normali, senza toccarle:
--
--   vacation_periods   un intervallo di date (ferie/blocco flessibile)
--   vacation_workouts  il "roaster": i workout scegliibili del periodo
--   vacation_days      per ogni data, la/le disciplina/e proposte
--   vacation_picks     la scelta dell'atleta (workout) + stato di completamento
--
-- RLS: stessa logica del resto della piattaforma — il coach gestisce i periodi
-- dei propri atleti, l'atleta legge i periodi pubblicati e gestisce le proprie
-- scelte. Le funzioni helper vivono nello schema privato `app` (come 0002).
-- ============================================================================

-- ============================================================================
-- VACATION PERIODS  (un periodo flessibile per un atleta)
-- ============================================================================
create table public.vacation_periods (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  coach_id    uuid references public.profiles(id) on delete set null,
  label       text,                          -- es. 'Ferie agosto', 'Settimana al mare'
  start_date  date not null,
  end_date    date not null,
  note        text,                          -- istruzioni generali del periodo
  status      text not null default 'draft'
                check (status in ('draft','published','archived')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create index on public.vacation_periods (athlete_id, start_date desc);

-- ============================================================================
-- VACATION WORKOUTS  (il "roaster": menu di allenamenti scegliibili)
--   leggeri e ad-hoc: disciplina + titolo + volume + descrizione libera.
--   (Per workout strutturati con zone/step si usano le sessioni normali.)
-- ============================================================================
create table public.vacation_workouts (
  id              uuid primary key default gen_random_uuid(),
  period_id       uuid not null references public.vacation_periods(id) on delete cascade,
  discipline      text not null check (discipline in ('swim','bike','run','athletics','other')),
  title           text not null,             -- 'Nuoto 1', 'Bike lunga', …
  intensity_label text,                      -- 'facile', 'medio', 'libero'
  volume_value    text,                      -- '45''', '60-90''', '2km'
  description     text,                      -- corpo dell'allenamento (testo libero)
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now()
);
create index on public.vacation_workouts (period_id, discipline, sort_order);

-- ============================================================================
-- VACATION DAYS  (per ogni data del periodo, una disciplina proposta)
--   più discipline nello stesso giorno = più righe (es. nuoto + bike).
-- ============================================================================
create table public.vacation_days (
  id          uuid primary key default gen_random_uuid(),
  period_id   uuid not null references public.vacation_periods(id) on delete cascade,
  date        date not null,
  discipline  text not null check (discipline in ('swim','bike','run','athletics','other')),
  note        text,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  unique (period_id, date, discipline)
);
create index on public.vacation_days (period_id, date);

-- ============================================================================
-- VACATION PICKS  (la scelta dell'atleta per un giorno + completamento)
--   un atleta sceglie un workout per ogni giorno-disciplina.
-- ============================================================================
create table public.vacation_picks (
  id                  uuid primary key default gen_random_uuid(),
  vacation_day_id     uuid not null references public.vacation_days(id) on delete cascade,
  athlete_id          uuid not null references public.profiles(id) on delete cascade,
  vacation_workout_id uuid references public.vacation_workouts(id) on delete set null,
  status              text not null default 'planned'
                        check (status in ('planned','completed','skipped')),
  athlete_note        text,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (vacation_day_id, athlete_id)
);
create index on public.vacation_picks (athlete_id);

-- ============================================================================
-- HELPER FUNCTIONS  (schema privato `app`, come 0002 — evitano ricorsione RLS)
-- ============================================================================
-- L'atleta accede solo ai periodi pubblicati (come la policy vp_select); il
-- coach accede anche alle bozze dei propri atleti.
create function app.can_access_period(p uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.vacation_periods vp
    where vp.id = p and (
      app.is_my_athlete(vp.athlete_id)
      or (vp.athlete_id = auth.uid() and vp.status = 'published')
    )
  );
$$;

create function app.can_manage_period(p uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.vacation_periods vp
    where vp.id = p and app.is_my_athlete(vp.athlete_id)
  );
$$;

create function app.can_access_vacation_day(d uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.vacation_days vd
    join public.vacation_periods vp on vp.id = vd.period_id
    where vd.id = d and (
      app.is_my_athlete(vp.athlete_id)
      or (vp.athlete_id = auth.uid() and vp.status = 'published')
    )
  );
$$;

grant execute on function app.can_access_period(uuid) to authenticated;
grant execute on function app.can_manage_period(uuid) to authenticated;
grant execute on function app.can_access_vacation_day(uuid) to authenticated;

-- ============================================================================
-- TRIGGERS  (updated_at automatico)
-- ============================================================================
create trigger trg_vacation_periods_updated before update on public.vacation_periods
  for each row execute function public.set_updated_at();
create trigger trg_vacation_picks_updated before update on public.vacation_picks
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.vacation_periods  enable row level security;
alter table public.vacation_workouts enable row level security;
alter table public.vacation_days     enable row level security;
alter table public.vacation_picks    enable row level security;

-- vacation_periods -----------------------------------------------------------
-- L'atleta vede solo i periodi pubblicati; il coach vede tutto (anche bozze).
create policy "vp_select" on public.vacation_periods for select to authenticated
  using (
    app.is_my_athlete(athlete_id)
    or (athlete_id = auth.uid() and status = 'published')
  );
create policy "vp_coach_manage" on public.vacation_periods for all to authenticated
  using (app.is_my_athlete(athlete_id)) with check (app.is_my_athlete(athlete_id));

-- vacation_workouts ----------------------------------------------------------
create policy "vw_select" on public.vacation_workouts for select to authenticated
  using (app.can_access_period(period_id));
create policy "vw_coach_manage" on public.vacation_workouts for all to authenticated
  using (app.can_manage_period(period_id)) with check (app.can_manage_period(period_id));

-- vacation_days --------------------------------------------------------------
create policy "vd_select" on public.vacation_days for select to authenticated
  using (app.can_access_period(period_id));
create policy "vd_coach_manage" on public.vacation_days for all to authenticated
  using (app.can_manage_period(period_id)) with check (app.can_manage_period(period_id));

-- vacation_picks  (l'atleta gestisce le proprie scelte; il coach le legge) ----
create policy "vpk_select" on public.vacation_picks for select to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));
create policy "vpk_athlete_manage" on public.vacation_picks for all to authenticated
  using (athlete_id = auth.uid() and app.can_access_vacation_day(vacation_day_id))
  with check (athlete_id = auth.uid() and app.can_access_vacation_day(vacation_day_id));

-- ============================================================================
-- GRANTS
-- ============================================================================
grant select, insert, update, delete on public.vacation_periods  to authenticated;
grant select, insert, update, delete on public.vacation_workouts to authenticated;
grant select, insert, update, delete on public.vacation_days     to authenticated;
grant select, insert, update, delete on public.vacation_picks    to authenticated;
grant all on public.vacation_periods  to service_role;
grant all on public.vacation_workouts to service_role;
grant all on public.vacation_days     to service_role;
grant all on public.vacation_picks    to service_role;
