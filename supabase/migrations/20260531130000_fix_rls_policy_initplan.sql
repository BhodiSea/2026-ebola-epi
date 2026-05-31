begin;

-- Fix: policies created in 20260531120000 used bare private.is_internal_user() in
-- USING / WITH CHECK. Postgres evaluates STABLE functions once per row in RLS context
-- regardless of the STABLE qualifier. The (select ...) form forces an InitPlan
-- evaluated once per statement. Drop and recreate all five affected policies.

drop policy if exists "agent_actions_select_internal" on audit.agent_actions;
create policy "agent_actions_select_internal"
  on audit.agent_actions for select
  to authenticated
  using ((select private.is_internal_user()));

drop policy if exists "incidents_update_internal" on public.incidents;
create policy "incidents_update_internal"
  on public.incidents for update
  to authenticated
  using ((select private.is_internal_user()))
  with check ((select private.is_internal_user()));

drop policy if exists "sources_update_internal" on public.sources;
create policy "sources_update_internal"
  on public.sources for update
  to authenticated
  using ((select private.is_internal_user()))
  with check ((select private.is_internal_user()));

drop policy if exists "eval_scores_select_internal" on public.extraction_eval_scores;
create policy "eval_scores_select_internal"
  on public.extraction_eval_scores for select
  to authenticated
  using ((select private.is_internal_user()));

drop policy if exists "eval_scores_insert_internal" on public.extraction_eval_scores;
create policy "eval_scores_insert_internal"
  on public.extraction_eval_scores for insert
  to authenticated
  with check ((select private.is_internal_user()));

commit;
