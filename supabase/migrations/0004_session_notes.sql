-- Note libere del coach per la singola seduta, distinte da raw_text
-- (che resta il testo Excel originale importato, per riferimento/audit).
alter table public.sessions add column if not exists notes text;
comment on column public.sessions.notes is
  'Note libere del coach per la seduta (distinte da raw_text, che è il testo Excel originale).';
