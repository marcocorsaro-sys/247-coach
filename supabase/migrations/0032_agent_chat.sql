-- Memoria breve della conversazione con l'agente Telegram (sperimentale):
-- solo testo dell'atleta e risposta finale, per capire "e domani?".
-- Accesso solo dal server (service role): RLS attiva e nessuna policy.
create table if not exists agent_chat (
  id bigint generated always as identity primary key,
  athlete_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_chat_athlete_created on agent_chat (athlete_id, created_at desc);
alter table agent_chat enable row level security;
