-- Richieste degli atleti di unire profili doppi o correggere risultati (sito 24/7 Coach).
create table if not exists public.ath_claims (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  cid text, slug text not null, name text,
  email text not null, other text, note text, lang text,
  status text not null default 'new', handled_at timestamptz
);
alter table public.ath_claims enable row level security;
