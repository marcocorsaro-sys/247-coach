-- ============================================================================
-- Migration 0013 — Range di zona personalizzati (inseriti a mano dal coach).
--
-- Irene calcola i range delle zone a mano (li invia in Word) e vuole poterli
-- INCOLLARE nell'app senza che vengano ricalcolati: i valori vanno mostrati
-- all'atleta ESATTAMENTE come li scrive lei. Questa tabella conserva, per
-- atleta e disciplina, un elenco ordinato di zone come coppie nome + testo del
-- range. Il testo è verbatim (nessun arrotondamento): l'atleta vede i numeri
-- della coach. Quando esistono righe per una disciplina, hanno la PRECEDENZA
-- sulle zone calcolate.
-- ============================================================================

create table if not exists public.athlete_custom_zones (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  discipline  text not null check (discipline in ('swim','bike','run','athletics','other')),
  sort_order  integer not null default 0,
  zone_name   text not null,            -- es. "FR", "FL", "FM", "SA", "VO2Max"
  range_text  text not null,            -- es. "5:04–4:45 /km", "150-162 bpm" (verbatim)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists athlete_custom_zones_athlete_disc_idx
  on public.athlete_custom_zones (athlete_id, discipline, sort_order);

alter table public.athlete_custom_zones enable row level security;

-- Il coach gestisce le zone dei propri atleti; l'atleta le legge (sola lettura).
drop policy if exists custom_zones_coach_manage on public.athlete_custom_zones;
create policy custom_zones_coach_manage on public.athlete_custom_zones
  for all using (app.is_my_athlete(athlete_id))
  with check (app.is_my_athlete(athlete_id));

drop policy if exists custom_zones_select on public.athlete_custom_zones;
create policy custom_zones_select on public.athlete_custom_zones
  for select using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));

grant select, insert, update, delete on public.athlete_custom_zones to authenticated;
grant all on public.athlete_custom_zones to service_role;
