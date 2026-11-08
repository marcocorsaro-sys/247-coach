-- Catalogo gare (per ora circuito Ironman, poi arricchibile con altre).
-- Lettura per tutti gli autenticati; il popolamento avviene fuori banda
-- (scraping Firecrawl) con privilegi elevati.
create table if not exists public.race_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  race_date date not null,
  race_type text,
  location text,
  region text,
  url text,
  source text not null default 'ironman',
  created_at timestamptz not null default now(),
  unique (name, race_date)
);

alter table public.race_catalog enable row level security;

drop policy if exists race_catalog_select on public.race_catalog;
create policy race_catalog_select on public.race_catalog
  for select to authenticated using (true);

grant select on public.race_catalog to authenticated;
