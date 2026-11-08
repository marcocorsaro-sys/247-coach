-- ============================================================================
-- Coach adattivo 24/7: eventi rilevati dal confronto piano ↔ attività svolte.
-- Ogni mattina un cron sincronizza le attività e confronta ieri pianificato
-- vs ieri svolto: gli scostamenti significativi generano un evento qui.
--   action 'revised' → il piano è stato rivisto automaticamente (coach_note
--                      spiega cosa è cambiato, mostrata nell'app);
--   action 'asked'   → caso ambiguo (es. seduta saltata): il coach fa una
--                      domanda all'atleta nell'app; la risposta passa dal
--                      normale dialogo col coach e risolve l'evento.
-- Unique (athlete, giorno, tipo): il cron è idempotente, mai doppie reazioni.
-- ============================================================================

create table if not exists public.ai_adaptive_events (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  event_date date not null,
  kind text not null check (kind in ('unplanned_activity', 'overdone', 'different_sport', 'skipped')),
  detail text not null,
  action text not null check (action in ('revised', 'asked')),
  coach_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (athlete_id, event_date, kind)
);

alter table public.ai_adaptive_events enable row level security;

-- L'atleta vede i propri eventi (nota di revisione / domanda del coach).
create policy adaptive_own on public.ai_adaptive_events
  for select using (auth.uid() = athlete_id);

-- Le scritture avvengono solo via service role (cron e azioni server).
