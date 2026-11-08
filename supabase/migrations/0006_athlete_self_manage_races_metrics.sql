-- L'atleta può gestire (inserire/modificare/eliminare) le PROPRIE gare e test.
-- Additive rispetto alle policy *_coach_manage esistenti (PERMISSIVE = OR):
-- il coach gestisce i propri atleti, l'atleta i propri dati.
drop policy if exists races_athlete_manage on public.races;
create policy races_athlete_manage on public.races
  for all to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

drop policy if exists am_athlete_manage on public.athlete_metrics;
create policy am_athlete_manage on public.athlete_metrics
  for all to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());
