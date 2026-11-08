-- ============================================================================
-- Preferenza dell'atleta: riscaldamento "aperto" fino al tasto giro.
-- Con la spunta attiva, il riscaldamento di BICI e CORSA viene inviato a
-- Intervals con "press lap" (until_lap_press): il lavoro vero parte quando
-- l'atleta preme lap, comodo per uscire di città prima di iniziare.
-- La durata resta comunque come limite massimo.
-- ============================================================================

alter table public.intervals_connections
  add column if not exists warmup_lap_press boolean not null default false;

comment on column public.intervals_connections.warmup_lap_press is
  'Se true, il riscaldamento di bici e corsa dura finché l''atleta non preme il tasto giro (until_lap_press su Intervals).';
