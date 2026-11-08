-- Funzione per la pagina "Attività" del coach: ritorna, per il coach e i suoi
-- atleti, i dati di accesso (auth.users.last_sign_in_at) e contatori di attività.
-- SECURITY DEFINER perché legge auth.users; restituisce righe solo se il
-- chiamante è un coach.
create or replace function public.coach_activity()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  last_sign_in_at timestamptz,
  account_created timestamptz,
  weeks_total int,
  weeks_published int,
  sessions_total int,
  logs_count int,
  last_log_at timestamptz,
  comments_count int,
  last_comment_at timestamptz
)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  with cid as (select auth.uid() as id),
  is_coach as (
    select exists(
      select 1 from public.profiles where id = (select id from cid) and role = 'coach'
    ) as ok
  ),
  ids as (
    select (select id from cid) as aid
    union
    select athlete_id from public.coaching_relationships
      where coach_id = (select id from cid) and active = true
  )
  select
    p.id, p.full_name, p.email, p.role,
    u.last_sign_in_at, u.created_at as account_created,
    (select count(*) from public.training_weeks w where w.athlete_id = p.id)::int,
    (select count(*) from public.training_weeks w where w.athlete_id = p.id and w.status = 'published')::int,
    (select count(*) from public.sessions s join public.training_weeks w on w.id = s.week_id where w.athlete_id = p.id)::int,
    (select count(*) from public.session_logs l where l.athlete_id = p.id)::int,
    (select max(coalesce(l.completed_at, l.created_at)) from public.session_logs l where l.athlete_id = p.id),
    (select count(*) from public.comments c where c.author_id = p.id)::int,
    (select max(c.created_at) from public.comments c where c.author_id = p.id)
  from ids
  join public.profiles p on p.id = ids.aid
  join auth.users u on u.id = p.id
  where (select ok from is_coach)
  order by (p.id = (select id from cid)) desc, p.full_name;
$$;

grant execute on function public.coach_activity() to authenticated;
