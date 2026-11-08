-- Magazine 24/7 Coach: anteprime settimanali, recap post-gara, speciali.
create table if not exists site_magazine_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  kind text not null check (kind in ('preview','recap','feature')),
  race_id uuid references event_races(id) on delete set null,
  week_start date not null,
  title text not null,
  dek text,
  body_md text not null,
  data jsonb not null default '{}'::jsonb,   -- risultati (podio, vincitori AG), media IG usati
  source_urls text[] not null default '{}',
  reading_min int,
  published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists site_magazine_posts_pub on site_magazine_posts (published, published_at desc);
create table if not exists site_magazine_translations (
  post_id uuid references site_magazine_posts(id) on delete cascade,
  lang text not null, title text not null, dek text, body_md text not null,
  model text, updated_at timestamptz not null default now(),
  primary key (post_id, lang)
);
alter table site_magazine_posts enable row level security;
alter table site_magazine_translations enable row level security;
create policy mag_read on site_magazine_posts for select using (published);
create policy mag_tr_read on site_magazine_translations for select using (exists (select 1 from site_magazine_posts p where p.id = post_id and p.published));
