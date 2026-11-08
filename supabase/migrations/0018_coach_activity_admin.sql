-- La pagina "Attività" usa coach_activity(), che riconosceva solo chi ha
-- role='coach'. Il super admin che apre la vista coach chiamava la funzione
-- con il proprio uid (ruolo atleta) e otteneva zero righe ("Nessun atleta
-- collegato"). Ora il coach effettivo è: sé stesso se coach, altrimenti la
-- coach (prima per created_at) se il chiamante è super admin — stessa regola
-- di resolveCoachAccess() lato app.
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
  with me as (
    select p.id, p.role, coalesce(p.is_admin, false) as is_admin
    from public.profiles p
    where p.id = auth.uid()
  ),
  cid as (
    select case
      when (select me.role from me) = 'coach' then (select me.id from me)
      when (select me.is_admin from me) then (
        select p.id from public.profiles p
        where p.role = 'coach'
        order by p.created_at asc
        limit 1
      )
      else null
    end as id
  ),
  ids as (
    select (select cid.id from cid) as aid
    union
    select athlete_id from public.coaching_relationships
      where coach_id = (select cid.id from cid) and active = true
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
  where (select cid.id from cid) is not null
  order by (p.role = 'coach') desc, p.full_name;
$$;
