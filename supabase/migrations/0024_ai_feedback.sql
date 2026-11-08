-- ============================================================================
-- Migration 0024 — Dialogo atleta → coach AI (24/7 Coach)
-- L'atleta scrive al coach ("oggi ho fatto 200 km in bici", "ho l'anca
-- contratta"): il messaggio viene salvato e il piano rigenerato di
-- conseguenza. Lo storico entra nel contesto di ogni generazione/revisione,
-- così il coach "ricorda" gli ultimi messaggi.
-- ============================================================================
create table public.ai_feedback (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  message     text not null,
  created_at  timestamptz not null default now()
);
create index on public.ai_feedback (athlete_id, created_at desc);

alter table public.ai_feedback enable row level security;

create policy "fb_own" on public.ai_feedback for select to authenticated
  using (athlete_id = auth.uid());
create policy "fb_insert_own" on public.ai_feedback for insert to authenticated
  with check (athlete_id = auth.uid());
create policy "fb_admin_all" on public.ai_feedback for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

grant select, insert on public.ai_feedback to authenticated;
grant all on public.ai_feedback to service_role;
