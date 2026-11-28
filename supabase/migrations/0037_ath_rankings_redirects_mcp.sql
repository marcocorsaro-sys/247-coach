-- Classifiche atleti (miglior tempo su percorso completo), reindirizzamenti dei profili uniti,
-- contatore giornaliero del server MCP pubblico. Applicata sul progetto il 28/11/2026.
create table if not exists public.ath_flagged_editions (edition_id text primary key);
alter table public.ath_flagged_editions enable row level security;
alter table public.ath_athletes add column if not exists rank_full integer, add column if not exists rank_half integer;
create table if not exists public.ath_redirects (slug text primary key, to_slug text not null, created_at timestamptz not null default now());
alter table public.ath_redirects enable row level security;
create policy ath_redirects_read on public.ath_redirects for select using (true);
create table if not exists public.mcp_public_usage (day date not null, ip_hash text not null, n integer not null default 0, primary key (day, ip_hash));
alter table public.mcp_public_usage enable row level security;
-- funzioni mcp_public_hit(text) e ath_recount(text), indici su rank_full/rank_half/finishes: vedi la migrazione sul progetto.
