begin;
select plan(8);

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
