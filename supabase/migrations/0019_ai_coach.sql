-- ============================================================================
-- 24/7 Coach (app AI su dominio separato, APP_MODE=ai_coach).
-- Il coach AI è un normale utente coach: riusa TUTTA la pipeline esistente
-- (tabelle → sessioni → push Intervals → attività → RPE). Le sue settimane
-- le scrive Claude via service-role.
-- ============================================================================

-- 1) Utente coach AI (id fisso, password casuale: nessuno vi accede via login).
do $$
declare
  v_id uuid := '77777777-7777-7777-7777-777777777777';
begin
  if not exists (select 1 from auth.users where id = v_id) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'coach@247-coach.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"coach","full_name":"24/7 Coach"}'::jsonb,
      '', '', '', ''
    );
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_id, v_id,
      jsonb_build_object('sub', v_id::text, 'email', 'coach@247-coach.app',
                         'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (v_id, 'coach@247-coach.app', '24/7 Coach', 'coach')
  on conflict (id) do update set role = 'coach', full_name = '24/7 Coach';
end $$;

-- 2) Profilo AI dell'atleta: dati di onboarding che le tabelle esistenti non
--    coprono (vincoli, infortuni, disponibilità, razionale del piano).
create table if not exists public.ai_athlete_profiles (
  athlete_id uuid primary key references public.profiles(id) on delete cascade,
  sport text not null default 'triathlon' check (sport in ('triathlon','trail')),
  experience_level text,          -- principiante | intermedio | avanzato
  experience_notes text,          -- anni, gare fatte, background
  injuries text,                  -- infortuni e limitazioni attuali
  availability_days integer,      -- giorni/settimana
  availability_hours numeric,     -- ore/settimana
  fixed_constraints text,         -- es. "piscina solo mar/gio, lungo domenica"
  equipment text,                 -- rulli, palestra, dislivello disponibile…
  goal_notes text,                -- obiettivo raccontato dall'atleta
  onboarding_completed_at timestamptz,
  plan_generated_at timestamptz,
  last_review_at timestamptz,
  ai_rationale text,              -- ultima spiegazione del piano (visibile all'atleta)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_athlete_profiles enable row level security;

create policy ai_profile_own on public.ai_athlete_profiles
  for all to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy ai_profile_coach on public.ai_athlete_profiles
  for select to authenticated
  using (app.is_my_athlete(athlete_id));

create policy admin_all on public.ai_athlete_profiles
  as permissive for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- 3) Signup self-service: crea utente confermato + profilo + relazione col
--    coach AI. Stesso pattern di coach_create_athlete, ma invocabile da anon
--    (solo per l'app 24/7; l'app di Irene non espone la pagina).
create or replace function public.ai_signup(
  p_email text, p_password text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_coach uuid := '77777777-7777-7777-7777-777777777777';
begin
  if v_email = '' or v_email is null or position('@' in v_email) = 0 then
    raise exception 'Email non valida';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'Password troppo corta (minimo 8 caratteri)';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Nome obbligatorio';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Email già registrata';
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
    jsonb_build_object('role', 'athlete', 'full_name', trim(p_full_name)),
    '', '', '', ''
  );
  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    v_id, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, email, full_name, role)
  values (v_id, v_email, trim(p_full_name), 'athlete')
  on conflict (id) do nothing;

  insert into public.coaching_relationships (coach_id, athlete_id, active)
  values (v_coach, v_id, true);

  insert into public.ai_athlete_profiles (athlete_id) values (v_id)
  on conflict (athlete_id) do nothing;

  return v_id;
end;
$function$;

grant execute on function public.ai_signup(text, text, text) to anon, authenticated;
