-- ============================================================================
-- Irene Tabella — Security hardening
-- Migration 0002
--
-- Risolve i warning del Supabase security advisor sullo schema 0001:
--   * sposta le funzioni helper SECURITY DEFINER in uno schema privato `app`
--     (non esposto via PostgREST → non più richiamabili come RPC pubbliche)
--   * fissa il search_path su tutte le funzioni
--   * revoca l'EXECUTE su handle_new_user (resta invocabile solo dal trigger)
-- Stato finale: security advisor pulito (0 lint).
-- ============================================================================

-- Schema privato per le funzioni helper di RLS -------------------------------
create schema if not exists app;
grant usage on schema app to authenticated;

create function app.is_coach()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach');
$$;

create function app.is_my_athlete(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.coaching_relationships cr
    where cr.coach_id = auth.uid() and cr.athlete_id = target and cr.active);
$$;

create function app.is_my_coach(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.coaching_relationships cr
    where cr.athlete_id = auth.uid() and cr.coach_id = target and cr.active);
$$;

create function app.can_access_week(w uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.training_weeks tw
    where tw.id = w and (tw.athlete_id = auth.uid() or app.is_my_athlete(tw.athlete_id)));
$$;

create function app.can_manage_week(w uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.training_weeks tw
    where tw.id = w and app.is_my_athlete(tw.athlete_id));
$$;

create function app.can_access_session(s uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.sessions se join public.training_weeks tw on tw.id = se.week_id
    where se.id = s and (tw.athlete_id = auth.uid() or app.is_my_athlete(tw.athlete_id)));
$$;

create function app.can_manage_session(s uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.sessions se join public.training_weeks tw on tw.id = se.week_id
    where se.id = s and app.is_my_athlete(tw.athlete_id));
$$;

grant execute on all functions in schema app to authenticated;

-- Fissa il search_path sulla trigger function -------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Ricrea le policy che referenziavano public.* → ora app.* --------------------
drop policy "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or app.is_my_athlete(id) or app.is_my_coach(id));
drop policy "profiles_update_coach" on public.profiles;
create policy "profiles_update_coach" on public.profiles for update to authenticated
  using (app.is_my_athlete(id)) with check (app.is_my_athlete(id));

drop policy "ad_select" on public.athlete_disciplines;
create policy "ad_select" on public.athlete_disciplines for select to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));
drop policy "ad_coach_manage" on public.athlete_disciplines;
create policy "ad_coach_manage" on public.athlete_disciplines for all to authenticated
  using (app.is_my_athlete(athlete_id)) with check (app.is_my_athlete(athlete_id));

drop policy "am_select" on public.athlete_metrics;
create policy "am_select" on public.athlete_metrics for select to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));
drop policy "am_coach_manage" on public.athlete_metrics;
create policy "am_coach_manage" on public.athlete_metrics for all to authenticated
  using (app.is_my_athlete(athlete_id)) with check (app.is_my_athlete(athlete_id));

drop policy "races_select" on public.races;
create policy "races_select" on public.races for select to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));
drop policy "races_coach_manage" on public.races;
create policy "races_coach_manage" on public.races for all to authenticated
  using (app.is_my_athlete(athlete_id)) with check (app.is_my_athlete(athlete_id));

drop policy "weeks_select" on public.training_weeks;
create policy "weeks_select" on public.training_weeks for select to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));
drop policy "weeks_coach_manage" on public.training_weeks;
create policy "weeks_coach_manage" on public.training_weeks for all to authenticated
  using (app.is_my_athlete(athlete_id)) with check (app.is_my_athlete(athlete_id));

drop policy "sessions_select" on public.sessions;
create policy "sessions_select" on public.sessions for select to authenticated
  using (app.can_access_week(week_id));
drop policy "sessions_coach_manage" on public.sessions;
create policy "sessions_coach_manage" on public.sessions for all to authenticated
  using (app.can_manage_week(week_id)) with check (app.can_manage_week(week_id));

drop policy "steps_select" on public.session_steps;
create policy "steps_select" on public.session_steps for select to authenticated
  using (app.can_access_session(session_id));
drop policy "steps_coach_manage" on public.session_steps;
create policy "steps_coach_manage" on public.session_steps for all to authenticated
  using (app.can_manage_session(session_id)) with check (app.can_manage_session(session_id));

drop policy "logs_select" on public.session_logs;
create policy "logs_select" on public.session_logs for select to authenticated
  using (athlete_id = auth.uid() or app.is_my_athlete(athlete_id));

drop policy "comments_select" on public.comments;
create policy "comments_select" on public.comments for select to authenticated
  using ((week_id is not null and app.can_access_week(week_id))
      or (session_id is not null and app.can_access_session(session_id)));
drop policy "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and (
       (week_id is not null and app.can_access_week(week_id))
    or (session_id is not null and app.can_access_session(session_id))));

-- Rimuove le vecchie funzioni helper da public --------------------------------
drop function public.is_coach();
drop function public.is_my_athlete(uuid);
drop function public.is_my_coach(uuid);
drop function public.can_access_week(uuid);
drop function public.can_manage_week(uuid);
drop function public.can_access_session(uuid);
drop function public.can_manage_session(uuid);

-- handle_new_user: invocabile solo dal trigger, non come RPC ------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
