-- ============================================================================
-- Migration 0014 — Connessione Intervals.icu per atleta.
--
-- Workaround per portare gli allenamenti su Garmin Connect passando da
-- Intervals.icu (partner Garmin): l'app crea allenamenti pianificati via API
-- Intervals, che li sincronizza sul calendario Garmin Connect dell'atleta e
-- quindi sull'orologio.
--
-- Una riga per atleta con la sua API key Intervals + athlete id (es. i123456).
-- Per scelta di prodotto la connessione è gestibile SIA dall'atleta SIA dal suo
-- coach (Irene può fare l'onboarding al posto dell'atleta): la RLS consente a
-- entrambi lettura e scrittura. La api_key è un segreto: resta comunque confinata
-- alla coppia atleta↔coach.
-- ============================================================================

create table if not exists public.intervals_connections (
  athlete_id           uuid primary key references public.profiles(id) on delete cascade,
  intervals_athlete_id text,                 -- es. "i123456"
  api_key              text not null,
  enabled              boolean not null default true,
  last_ok_at           timestamptz,          -- ultima verifica/chiamata riuscita
  connected_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on table public.intervals_connections is
  'Credenziali API Intervals.icu per atleta (per pubblicare workout → Garmin). Gestibile da atleta e coach.';

alter table public.intervals_connections enable row level security;

-- Atleta proprietario OPPURE suo coach: lettura e gestione.
drop policy if exists intervals_conn_manage on public.intervals_connections;
create policy intervals_conn_manage on public.intervals_connections
  for all to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id))
  with check (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));

grant select, insert, update, delete on public.intervals_connections to authenticated;
grant all on public.intervals_connections to service_role;

create trigger trg_intervals_connections_updated before update on public.intervals_connections
  for each row execute function public.set_updated_at();
