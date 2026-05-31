begin;

-- ─── public.shadow_results view ───────────────────────────────────────────────
-- Exposes audit.shadow_results to internal authenticated users.
-- The view owner (postgres) can reach the audit schema; PostgREST clients cannot.
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
  where private.is_internal_user();

revoke all on public.shadow_results from anon, public;
grant select on public.shadow_results to authenticated;

-- ─── public.batch_results view ────────────────────────────────────────────────
-- Exposes audit.batch_results to internal authenticated users.
create or replace view public.batch_results as
  select
    id,
    batch_id,
    custom_id,
    document_id,
    result,
    created_at
  from audit.batch_results
  where private.is_internal_user();

revoke all on public.batch_results from anon, public;
grant select on public.batch_results to authenticated;

commit;
