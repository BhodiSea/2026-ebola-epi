begin;
select plan(5);

-- ─── helpers ─────────────────────────────────────────────────────────────────
-- Temp table so the filtered set of RLS-enabled tables is accessible to
-- every assertion in this transaction, not just the first SELECT statement.
-- audit.llm_traces uses a revoke-all/deny approach rather than policies;
-- it is intentionally excluded from the four-policy rule.
create temp table rls_tables as
  select n.nspname || '.' || c.relname as fqtn
  from   pg_class     c
  join   pg_namespace n on n.oid = c.relnamespace
  where  c.relkind = 'r'
    and  c.relrowsecurity = true
    and  n.nspname in ('public', 'audit', 'private')
    and  c.relname != 'llm_traces';

-- ─── Assertion 1: no FOR ALL policies ────────────────────────────────────────
select is(
  (
    select count(*)::int
    from   pg_policies p
    join   rls_tables  r on r.fqtn = p.schemaname || '.' || p.tablename
    where  p.cmd = 'ALL'
  ),
  0,
  'no FOR ALL policies on any RLS-enabled table'
);

-- ─── Assertion 2: no policy implicitly applies to the {public} role ──────────
select is(
  (
    select count(*)::int
    from   pg_policies p
    join   rls_tables  r on r.fqtn = p.schemaname || '.' || p.tablename
    where  p.roles = '{public}'
  ),
  0,
  'no policies default to {public} role'
);

-- ─── Assertion 3: every auth.uid() reference is the (SELECT auth.uid()) form ─
-- Bare auth.uid() in USING/WITH CHECK is called once per row; the wrapped form
-- is evaluated once per statement (InitPlan), avoiding a 100× regression.
select is(
  (
    select count(*)::int
    from   pg_policies p
    join   rls_tables  r on r.fqtn = p.schemaname || '.' || p.tablename
    where (
      coalesce(p.qual,        '') ~ 'auth\.uid\(\)'
      or
      coalesce(p.with_check, '') ~ 'auth\.uid\(\)'
    )
    and not (
      -- Case-insensitive match; Postgres normalises the stored qual to lowercase
      -- keywords and appends " AS uid", so the exact text is e.g.
      -- "(( SELECT auth.uid() AS uid) IS NOT NULL)" — not the raw source form.
      coalesce(p.qual,        '') ~* '\(\s*select\s+auth\.uid\(\)'
      or
      coalesce(p.with_check, '') ~* '\(\s*select\s+auth\.uid\(\)'
    )
  ),
  0,
  'every auth.uid() reference is wrapped in (SELECT auth.uid())'
);

-- ─── Assertion 4: every public.* RLS table has at least one policy per command ─
-- AGENTS.md hard rule 5: four separate policies (SELECT/INSERT/UPDATE/DELETE)
-- even if logic repeats. audit.* tables use REVOKE ALL for write commands
-- rather than explicit DENY policies; they are intentionally excluded here
-- (like llm_traces above). public.* tables must have all four policies.
select is(
  (
    select count(*)::int
    from (
      select r.fqtn, c.cmd
      from   rls_tables r
      cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) as c(cmd)
      left join pg_policies p
        on  p.schemaname || '.' || p.tablename = r.fqtn
        and p.cmd = c.cmd
      where  r.fqtn like 'public.%'
      group by r.fqtn, c.cmd
      having count(p.policyname) = 0
    ) gaps
  ),
  0,
  'every public.* RLS table has at least one policy per command (SELECT/INSERT/UPDATE/DELETE)'
);

-- ─── Assertion 5: smoke — anon cannot write to case_counts ───────────────────
set local role anon;

select throws_ok(
  $$
    insert into public.case_counts (
      outbreak_id, as_of, admin2_code, metric, value,
      source_quote_id, extraction_run_id, model_id, prompt_version_hash
    ) values (
      gen_random_uuid(), current_date, 'COD-IT-IR', 'confirmed', 1,
      gen_random_uuid(), gen_random_uuid(), 'test', 'testhash'
    )
  $$,
  '42501',
  null,
  'anon cannot insert into public.case_counts'
);

reset role;

select * from finish();
rollback;
