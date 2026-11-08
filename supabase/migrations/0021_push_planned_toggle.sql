-- Scelta per atleta: inviare o no gli allenamenti PIANIFICATI al dispositivo
-- (via Intervals). Con off, le attività svolte continuano a sincronizzarsi.
-- Caso d'uso: un atleta con due piani (es. coach umano + 24/7 Coach) che
-- sull'orologio vuole una sola fonte.
alter table public.intervals_connections
  add column if not exists push_planned boolean not null default true;
