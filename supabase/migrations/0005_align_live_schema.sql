-- ============================================================================
-- Allineamento migration ↔ DB live.
-- Questi oggetti erano stati creati direttamente sul progetto Supabase
-- (fuori dalle migration). Qui vengono riportati per poter ricostruire lo
-- schema da zero. È idempotente: usa IF NOT EXISTS / CREATE OR REPLACE e
-- ricrea le policy in modo sicuro. NON va eseguito sul DB live (gli oggetti
-- esistono già) ma serve per ambienti nuovi e per l'audit dello schema.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- athlete_categories: tipo atleta multi-valore (triatleta, runner, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.athlete_categories (
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  category   text not null check (category in
                ('triathlete','runner','ultra_runner','swimmer','cyclist')),
  created_at timestamptz not null default now(),
  primary key (athlete_id, category)
);

alter table public.athlete_categories enable row level security;

drop policy if exists ac_coach_manage on public.athlete_categories;
create policy ac_coach_manage on public.athlete_categories
  for all using (app.is_my_athlete(athlete_id))
  with check (app.is_my_athlete(athlete_id));

drop policy if exists ac_select on public.athlete_categories;
create policy ac_select on public.athlete_categories
  for select using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));

grant select, insert, update, delete on public.athlete_categories to authenticated;
grant all on public.athlete_categories to service_role;

-- ---------------------------------------------------------------------------
-- athlete_fitness: scheda fisiologica (zone/soglie), una riga per atleta
-- ---------------------------------------------------------------------------
create table if not exists public.athlete_fitness (
  athlete_id                  uuid primary key references public.profiles(id) on delete cascade,
  birth_date                  date,
  sex                         text check (sex in ('M','F','X')),
  height_cm                   numeric,
  weight_kg                   numeric,
  resting_hr                  integer,
  max_hr                      integer,
  lthr                        integer,
  threshold_pace_run_s_per_km integer,
  ftp_watts                   integer,
  css_swim_s_per_100m         integer,
  vo2max                      numeric,
  notes                       text,
  updated_by                  uuid references public.profiles(id),
  updated_at                  timestamptz not null default now(),
  created_at                  timestamptz not null default now()
);

alter table public.athlete_fitness enable row level security;

drop policy if exists fitness_coach_manage on public.athlete_fitness;
create policy fitness_coach_manage on public.athlete_fitness
  for all using (app.is_my_athlete(athlete_id))
  with check (app.is_my_athlete(athlete_id));

drop policy if exists fitness_select on public.athlete_fitness;
create policy fitness_select on public.athlete_fitness
  for select using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));

grant select, insert, update, delete on public.athlete_fitness to authenticated;
grant all on public.athlete_fitness to service_role;

-- ---------------------------------------------------------------------------
-- Funzioni amministrative del coach (SECURITY DEFINER): creano/aggiornano
-- account atleta scrivendo direttamente in auth.users / auth.identities.
-- ---------------------------------------------------------------------------
create or replace function public.coach_create_athlete(
  p_email text, p_password text, p_full_name text, p_level text default null)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_coach uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if v_coach is null or not exists (
    select 1 from public.profiles where id = v_coach and role = 'coach'
  ) then
    raise exception 'Solo un coach può creare atleti';
  end if;
  if v_email = '' or v_email is null then
    raise exception 'Email obbligatoria';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password troppo corta (minimo 6 caratteri)';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Nome obbligatorio';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Email già in uso: %', v_email;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('role', 'athlete', 'full_name', p_full_name),
    '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    v_id, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  -- il trigger handle_new_user potrebbe aver già creato il profilo
  insert into public.profiles (id, email, full_name, role, level)
  values (v_id, v_email, p_full_name, 'athlete', p_level)
  on conflict (id) do update
    set full_name = excluded.full_name,
        level = excluded.level,
        email = excluded.email,
        role = 'athlete';

  insert into public.coaching_relationships (coach_id, athlete_id, active)
  values (v_coach, v_id, true);

  return v_id;
end;
$function$;

create or replace function public.coach_update_athlete(
  p_athlete_id uuid, p_full_name text, p_level text default null, p_email text default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_coach uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not exists (
    select 1 from public.coaching_relationships
    where coach_id = v_coach and athlete_id = p_athlete_id
  ) then
    raise exception 'Atleta non gestito da questo coach';
  end if;

  update public.profiles
  set full_name = p_full_name, level = p_level, updated_at = now()
  where id = p_athlete_id;

  if v_email <> '' then
    if exists (select 1 from auth.users where lower(email) = v_email and id <> p_athlete_id) then
      raise exception 'Email già in uso: %', v_email;
    end if;
    update auth.users set email = v_email, updated_at = now() where id = p_athlete_id;
    update auth.identities
    set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_email)), updated_at = now()
    where user_id = p_athlete_id and provider = 'email';
    update public.profiles set email = v_email where id = p_athlete_id;
  end if;
end;
$function$;

create or replace function public.coach_set_athlete_password(
  p_athlete_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_coach uuid := auth.uid();
begin
  if not exists (
    select 1 from public.coaching_relationships
    where coach_id = v_coach and athlete_id = p_athlete_id
  ) then
    raise exception 'Atleta non gestito da questo coach';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password troppo corta (minimo 6 caratteri)';
  end if;
  update auth.users
  set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
  where id = p_athlete_id;
end;
$function$;

create or replace function public.coach_delete_athlete(p_athlete_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_coach uuid := auth.uid();
begin
  if not exists (
    select 1 from public.coaching_relationships
    where coach_id = v_coach and athlete_id = p_athlete_id
  ) then
    raise exception 'Atleta non gestito da questo coach';
  end if;

  delete from public.session_steps
   where session_id in (
     select s.id from public.sessions s
     join public.training_weeks w on w.id = s.week_id
     where w.athlete_id = p_athlete_id
   );
  delete from public.session_logs
   where athlete_id = p_athlete_id
      or session_id in (
        select s.id from public.sessions s
        join public.training_weeks w on w.id = s.week_id
        where w.athlete_id = p_athlete_id
      );
  delete from public.comments
   where author_id = p_athlete_id
      or week_id in (select id from public.training_weeks where athlete_id = p_athlete_id)
      or session_id in (
        select s.id from public.sessions s
        join public.training_weeks w on w.id = s.week_id
        where w.athlete_id = p_athlete_id
      );
  delete from public.sessions
   where week_id in (select id from public.training_weeks where athlete_id = p_athlete_id);
  delete from public.training_weeks where athlete_id = p_athlete_id;
  delete from public.races where athlete_id = p_athlete_id;
  delete from public.athlete_metrics where athlete_id = p_athlete_id or recorded_by = p_athlete_id;
  delete from public.athlete_fitness where athlete_id = p_athlete_id;
  delete from public.athlete_disciplines where athlete_id = p_athlete_id;
  delete from public.coaching_relationships where athlete_id = p_athlete_id;
  delete from public.profiles where id = p_athlete_id;
  delete from auth.identities where user_id = p_athlete_id;
  delete from auth.users where id = p_athlete_id;
end;
$function$;

grant execute on function public.coach_create_athlete(text, text, text, text) to authenticated, service_role;
grant execute on function public.coach_update_athlete(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.coach_set_athlete_password(uuid, text) to authenticated, service_role;
grant execute on function public.coach_delete_athlete(uuid) to authenticated, service_role;
