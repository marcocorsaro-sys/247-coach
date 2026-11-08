-- ============================================================================
-- Migration 0012 — Telefono atleta, attrezzi nuoto e supporto notifiche.
--
-- Aggiunge due colonne, entrambe idempotenti (add column if not exists):
--   * profiles.phone          → recapito per la notifica SMS alla pubblicazione
--   * session_steps.equipment → attrezzi del nuoto (pull, palette, pinne, ...)
--
-- La notifica email+SMS alla pubblicazione della tabella è gestita lato app
-- (server action publishWeek → lib/notify), non serve schema dedicato: usa
-- l'email del profilo e questa nuova colonna telefono.
-- ============================================================================

-- Telefono dell'atleta (formato E.164 consigliato, es. +39333...) per l'SMS.
-- Aggiornabile dal coach grazie alla policy profiles_update_coach esistente.
alter table public.profiles
  add column if not exists phone text;

comment on column public.profiles.phone is
  'Recapito telefonico (E.164) per le notifiche SMS. Opzionale.';

-- Attrezzi associati allo step (soprattutto nuoto): testo libero breve come
-- "pull+palette", "pinne", "tavoletta". Mostrato all'atleta accanto allo step.
alter table public.session_steps
  add column if not exists equipment text;

comment on column public.session_steps.equipment is
  'Attrezzi dello step (es. nuoto: pull, palette, pinne). Testo libero breve.';
