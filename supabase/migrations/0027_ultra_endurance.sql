-- ============================================================================
-- Migration 0027 — Sport "ultra_endurance" + profilo da atleta elite.
-- Caso d'uso: atleta ibrido ultra-trail + bici lunghissima (es. trail 44-90 km
-- e Milano-Sanremo 300 km nella stessa stagione), con palestra gestita da un
-- preparatore esterno e disponibilità diversa tra giorni feriali e weekend.
--  - sport: nuovo valore 'ultra_endurance' (multi-obiettivo, no nuoto);
--  - disponibilità strutturata: minuti max per seduta feriale, ore max weekend;
--  - forza: sedute/settimana e note (vincolo fisso, non pianificato dal coach);
--  - composizione corporea: % massa grassa (W/kg e carichi in salita);
--  - revisione settimanale: lock separato + desideri/disponibilità per la
--    settimana successiva (ai_feedback.kind = 'next_week').
-- ============================================================================

alter table public.ai_athlete_profiles
  drop constraint if exists ai_athlete_profiles_sport_check;
alter table public.ai_athlete_profiles
  add constraint ai_athlete_profiles_sport_check
  check (sport in ('triathlon', 'trail', 'ultra_endurance'));

alter table public.ai_athlete_profiles
  add column if not exists weekday_minutes_max integer,       -- es. 80 (lun-ven, mattina)
  add column if not exists weekend_hours_max numeric,         -- es. 5 (sab+dom, nei blocchi di carico)
  add column if not exists strength_sessions_per_week integer, -- es. 2
  add column if not exists strength_notes text,               -- es. "gambe, scheda della trainer"
  add column if not exists review_requested_at timestamptz,   -- forced refresh in corso
  add column if not exists ai_last_message text;              -- ultimo messaggio della revisione settimanale

alter table public.athlete_fitness
  add column if not exists body_fat_pct numeric;

-- Messaggi al coach: 'message' (fuori programma, fastidi) oppure 'next_week'
-- (desideri e disponibilità per la settimana successiva, letti dalla revisione
-- della domenica o dal forced refresh e poi marcati come consumati).
alter table public.ai_feedback
  add column if not exists kind text not null default 'message'
    check (kind in ('message', 'next_week')),
  add column if not exists consumed_at timestamptz;

create index if not exists ai_feedback_kind_idx
  on public.ai_feedback (athlete_id, kind, consumed_at);
