-- ============================================================================
-- 0003 — Unicità della settimana di allenamento
--
-- Regola: non possono esistere due tabelle che coprono lo stesso giorno.
-- Ogni settimana è un blocco lun→dom allineato al lunedì (`week_start`), quindi
-- la regola equivale a: un solo `week_start` per atleta. Vincolo garantito da
-- un indice unico. Le label vengono allineate al numero di settimana ISO
-- (es. 'week20'); il nome non è più modificabile dall'app.
-- ============================================================================

create unique index if not exists training_weeks_athlete_week_uniq
  on public.training_weeks (athlete_id, week_start);

update public.training_weeks
set label = 'week' || to_char(week_start, 'IW')
where label is distinct from 'week' || to_char(week_start, 'IW');
