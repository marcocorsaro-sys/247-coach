-- Bot pubblico delle gare su Telegram (24/7 Coach) e canali per lingua.
create table if not exists public.race_bot_chat (
  id bigint generated always as identity primary key,
  chat_id bigint not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  lang text,
  created_at timestamptz not null default now()
);
create index if not exists race_bot_chat_chat_idx on public.race_bot_chat (chat_id, created_at desc);
alter table public.race_bot_chat enable row level security;

create table if not exists public.tg_channels (
  lang text primary key,
  chat text not null,
  updated_at timestamptz not null default now()
);
alter table public.tg_channels enable row level security;

create table if not exists public.tg_posts (
  plan_id uuid not null,
  lang text not null,
  message_id bigint,
  posted_at timestamptz not null default now(),
  primary key (plan_id, lang)
);
alter table public.tg_posts enable row level security;
