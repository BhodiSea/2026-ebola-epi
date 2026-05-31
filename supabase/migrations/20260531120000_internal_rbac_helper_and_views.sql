begin;

-- ─── private schema ───────────────────────────────────────────────────────────
-- Holds SECURITY DEFINER helpers that must not be callable via PostgREST.
-- Supabase only exposes schemas listed in db_schema (default: public), but the
-- explicit revoke is a hard guard independent of the config.
create schema if not exists private;
revoke usage on schema private from anon, authenticated;

-- ─── private.is_internal_user() ──────────────────────────────────────────────
-- Returns true when the current JWT carries app_metadata.role = 'admin' | 'staff'.
-- STABLE: marks the function result as repeatable within a transaction; Postgres
-- may cache the result when planning, but this is not guaranteed for RLS policies.
-- Always call via (select private.is_internal_user()) in policy USING / WITH CHECK
-- clauses to force an InitPlan evaluated once per statement (not once per row).
-- SECURITY DEFINER + set search_path = '': prevents search-path injection.
create or replace function private.is_internal_user()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'staff'),
    false
  );
$$;

-- ─── public.agent_actions view ────────────────────────────────────────────────
-- Exposes audit.agent_actions to authenticated PostgREST clients without
-- granting USAGE on the audit schema. The WHERE clause acts as a row-level
-- filter: only JWT-authenticated internal users (admin/staff) see rows.
-- The view executes as its owner (postgres), which can reach the audit schema.
-- private.is_internal_user() is SECURITY DEFINER and reads request.jwt.claims
-- (a session-level GUC set by PostgREST) so it correctly reflects the
-- caller's JWT regardless of the view-owner execution context.
create or replace view public.agent_actions as
  select
    id,
    agent,
    action,
    subject_table,
    subject_id,
    payload,
    trace_id,
    ts
  from audit.agent_actions
  where private.is_internal_user();

revoke all on public.agent_actions from anon, public;
grant select on public.agent_actions to authenticated;

-- ─── audit.agent_actions RLS ──────────────────────────────────────────────────
-- Enables RLS as a second line of defense if audit schema USAGE is ever granted.
-- The 002-rls pgTAP test asserts relrowsecurity = true; this makes it pass.
-- Direct access via the authenticated role is still blocked at the schema level
-- (USAGE revoked in init_schemas.sql); RLS adds depth for future-proofing.
alter table audit.agent_actions enable row level security;

create policy "agent_actions_select_internal"
  on audit.agent_actions for select
  to authenticated
  using ((select private.is_internal_user()));

-- ─── public.incidents — internal UPDATE policy ────────────────────────────────
-- Allows authenticated internal users to ack/snooze/close incidents without the
-- service_role bypass. The ackIncidentAction currently uses createAdminClient()
-- (service_role, bypasses RLS); this policy provides a DB-side invariant so
-- any future code path using the regular server client is also gated.
-- INSERT/DELETE remain default-deny for authenticated (Inngest jobs use service_role).
create policy "incidents_update_internal"
  on public.incidents for update
  to authenticated
  using ((select private.is_internal_user()))
  with check ((select private.is_internal_user()));

-- ─── public.sources — internal UPDATE policy ──────────────────────────────────
-- Allows authenticated internal users to toggle sources.extraction_paused.
-- toggleSourcePauseAction currently uses service_role; same rationale as above.
-- SELECT policies (anon + authenticated) already exist from the four-policy split.
create policy "sources_update_internal"
  on public.sources for update
  to authenticated
  using ((select private.is_internal_user()))
  with check ((select private.is_internal_user()));

-- ─── public.extraction_eval_scores ───────────────────────────────────────────
-- Persists per-run eval metrics for the /internal/quality dashboard.
-- Written by the eval pipeline (evals/__tests__/gold-set.test.ts) when
-- PERSIST_EVAL_SCORES=1 is set (CI). Append-only: no UPDATE/DELETE policies.
create table if not exists public.extraction_eval_scores (
  run_id        uuid        not null,
  metric        text        not null
                              check (metric in (
                                'f1', 'precision', 'recall',
                                'citation_correct', 'substring_verify'
                              )),
  score         numeric     not null check (score >= 0 and score <= 1),
  source_slug   text,
  evaluated_at  timestamptz not null default now(),
  primary key (run_id, metric)
);

alter table public.extraction_eval_scores enable row level security;

create policy "eval_scores_select_internal"
  on public.extraction_eval_scores for select
  to authenticated
  using ((select private.is_internal_user()));

create policy "eval_scores_insert_internal"
  on public.extraction_eval_scores for insert
  to authenticated
  with check ((select private.is_internal_user()));

commit;
