begin;

-- ─── sources_with_health: restrict to internal users ─────────────────────────
-- The previous version granted SELECT to all authenticated users, leaking
-- operational failure counts derived from audit.extraction_runs.
-- Same pattern as public.agent_actions / public.shadow_results.
create or replace view public.sources_with_health as
  select
    s.id,
    s.slug,
    s.name,
    s.last_fetched_at,
    s.parser_version,
    s.extraction_paused,
    s.license_tier,
    coalesce(
      (
        select count(*)::int
        from audit.extraction_runs er
        join public.documents d on d.id = er.document_id
        where d.source_id = s.id
          and er.created_at >= now() - interval '7 days'
          and er.rows_extracted = 0
      ),
      0
    ) as failure_count_7d
  from public.sources s
  where (select private.is_internal_user());

revoke all on public.sources_with_health from anon, public;
grant select on public.sources_with_health to authenticated;

-- ─── shadow_results: wrap is_internal_user in InitPlan ───────────────────────
-- Bare function call in WHERE evaluates once per row; (select …) creates an
-- InitPlan evaluated once per statement — same fix applied to RLS policies in
-- migration 20260531130000_fix_rls_policy_initplan.sql.
create or replace view public.shadow_results as
  select
    id,
    document_id,
    candidate_version,
    production_run_id,
    field_variances,
    promoted,
    created_at
  from audit.shadow_results
  where (select private.is_internal_user());

revoke all on public.shadow_results from anon, public;
grant select on public.shadow_results to authenticated;

-- ─── batch_results: same InitPlan fix ────────────────────────────────────────
create or replace view public.batch_results as
  select
    id,
    batch_id,
    custom_id,
    document_id,
    result,
    created_at
  from audit.batch_results
  where (select private.is_internal_user());

revoke all on public.batch_results from anon, public;
grant select on public.batch_results to authenticated;

commit;
