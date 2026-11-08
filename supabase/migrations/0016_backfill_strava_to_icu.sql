-- ============================================================================
-- Migration 0016 — Backfill: attività Strava storiche → icu_activities.
--
-- Con il passaggio all'hub Intervals.icu l'app legge le attività svolte solo
-- da icu_activities: le attività importate a suo tempo dall'integrazione
-- Strava diretta (tabella strava_activities, conservata come archivio) non
-- erano più visibili. Questo backfill le copia una-tantum in icu_activities
-- con id "strava-<id>" e source STRAVA, idempotente (on conflict do nothing).
--
-- Nota: se l'atleta collega Strava anche su Intervals, le stesse attività
-- potrebbero rientrare dal sync con id Intervals (possibile doppione sul
-- periodo sovrapposto): accettabile, ripulibile in seguito.
-- ============================================================================

insert into public.icu_activities (
  athlete_id, icu_activity_id, name, sport_type, source, discipline,
  start_date, distance_m, moving_time_s, elapsed_time_s, total_elevation_gain,
  average_heartrate, max_heartrate, average_speed, max_speed, average_watts,
  average_cadence, calories, trainer, raw
)
select
  athlete_id, 'strava-' || strava_activity_id, name, sport_type, 'STRAVA', discipline,
  start_date, distance_m, moving_time_s, elapsed_time_s, total_elevation_gain,
  average_heartrate, max_heartrate, average_speed, max_speed, average_watts,
  average_cadence, calories, trainer, raw
from public.strava_activities
on conflict (athlete_id, icu_activity_id) do nothing;
