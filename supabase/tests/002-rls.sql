begin;
select plan(14);

-- Every public table has RLS enabled
select is(
  (select relrowsecurity from pg_class where oid = 'public.sources'::regclass),
  true,
  'public.sources has RLS enabled'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.documents'::regclass),
  true,
  'public.documents has RLS enabled'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.source_quotes'::regclass),
  true,
  'public.source_quotes has RLS enabled'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.outbreaks'::regclass),
  true,
  'public.outbreaks has RLS enabled'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.case_counts'::regclass),
  true,
  'public.case_counts has RLS enabled'
);

-- audit tables have RLS enabled (defense-in-depth against future schema grants)
select is(
  (select relrowsecurity from pg_class where oid = 'audit.extraction_runs'::regclass),
  true,
  'audit.extraction_runs has RLS enabled'
);

select is(
  (select relrowsecurity from pg_class where oid = 'audit.agent_actions'::regclass),
  true,
  'audit.agent_actions has RLS enabled'
);

select is(
  (select relrowsecurity from pg_class where oid = 'audit.anthropic_usage_log'::regclass),
  true,
  'audit.anthropic_usage_log has RLS enabled'
);

-- Each public table must have exactly 2 SELECT policies (one per role)
-- to satisfy AGENTS.md rule 5: separate per-(action, role).
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'sources' and cmd = 'SELECT'),
  2,
  'public.sources has 2 SELECT policies (anon + authenticated)'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'documents' and cmd = 'SELECT'),
  2,
  'public.documents has 2 SELECT policies (anon + authenticated)'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'source_quotes' and cmd = 'SELECT'),
  2,
  'public.source_quotes has 2 SELECT policies (anon + authenticated)'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'outbreaks' and cmd = 'SELECT'),
  2,
  'public.outbreaks has 2 SELECT policies (anon + authenticated)'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'case_counts' and cmd = 'SELECT'),
  2,
  'public.case_counts has 2 SELECT policies (anon + authenticated)'
);

-- anon role cannot insert into case_counts (no INSERT policy exists)
set local role anon;

select throws_ok(
  $$
    insert into public.case_counts (
      outbreak_id, as_of, metric, value,
      source_quote_id, extraction_run_id, model_id, prompt_version_hash
    ) values (
      gen_random_uuid(), current_date, 'cases', 1,
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
