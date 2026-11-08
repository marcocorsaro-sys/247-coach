-- Migration 0030 — Traduzioni dei contenuti gara (schede e articoli) per il
-- sito multilingua 24/7 Coach. Lingua sorgente: it. Generate da Claude via
-- /api/site/translate e lette dalle pagine /[lang]/… con fallback alla sorgente.
create table if not exists public.event_race_translations (
  race_id uuid not null references public.event_races(id) on delete cascade,
  lang text not null,
  name text, tagline text, intro text, kpis jsonb, legs jsonb, splits jsonb, demands jsonb, tips jsonb, logistics jsonb, faq jsonb,
  segments jsonb, -- [{position, leg, title, note}]
  reviews jsonb,  -- [{id, title, body, sources_note}]
  model text, updated_at timestamptz not null default now(),
  primary key (race_id, lang));
create table if not exists public.event_race_article_translations (
  article_id uuid not null references public.event_race_articles(id) on delete cascade,
  lang text not null,
  title text not null, dek text, body_md text not null,
  model text, updated_at timestamptz not null default now(),
  primary key (article_id, lang));
alter table public.event_race_translations enable row level security;
alter table public.event_race_article_translations enable row level security;
create policy event_race_translations_public_read on public.event_race_translations for select to anon, authenticated using (true);
create policy event_race_article_translations_public_read on public.event_race_article_translations for select to anon, authenticated using (true);
grant select on public.event_race_translations, public.event_race_article_translations to anon, authenticated;
grant all on public.event_race_translations, public.event_race_article_translations to service_role;

-- Dizionari UI per lingua (generati da /api/site/translate?ui=1)
create table if not exists public.site_ui_i18n (
  lang text primary key,
  dict jsonb not null default '{}'::jsonb,
  model text,
  updated_at timestamptz not null default now()
);
alter table public.site_ui_i18n enable row level security;
drop policy if exists "site_ui_i18n read" on public.site_ui_i18n;
create policy "site_ui_i18n read" on public.site_ui_i18n for select using (true);
grant select on public.site_ui_i18n to anon, authenticated;
