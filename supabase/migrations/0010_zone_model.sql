-- ============================================================================
-- Pacchetto 2: modello zone selezionabile per atleta.
--   - zone_model: 'standard' (Coggan/Friel, default) oppure 'irene'
--     (modello Trisutto del foglio Calcolo_TEST: FTP = watt medi −5%, zone
--     corsa in % dell'andatura media del test, nuoto dal test 400m).
--   - swim_test_400_s: tempo (s) del test nuoto 400m max, base del modello
--     passi nuoto di Irene (GA1/GA2/WSA per 50/100/200/400).
-- Additiva e retro-compatibile: gli atleti esistenti restano su 'standard'.
-- ============================================================================
alter table public.athlete_fitness
  add column if not exists zone_model text not null default 'standard'
    check (zone_model in ('standard','irene')),
  add column if not exists swim_test_400_s integer;

comment on column public.athlete_fitness.zone_model is
  'Modello di calcolo zone: standard (Coggan/Friel) oppure irene (Trisutto/Calcolo_TEST).';
comment on column public.athlete_fitness.swim_test_400_s is
  'Tempo (s) del test nuoto 400m max; base del modello passi nuoto di Irene.';
