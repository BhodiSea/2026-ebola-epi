begin;
select plan(1);

-- source_quote_id is NOT NULL — cannot insert case_counts without it
select throws_ok(
  $$
    insert into public.case_counts (
      outbreak_id, as_of, metric, value,
      extraction_run_id, model_id, prompt_version_hash
    ) values (
      gen_random_uuid(), current_date, 'cases', 0,
      gen_random_uuid(), 'test-model', 'test-hash'
    )
  $$,
  '23502',
  null,
  'case_counts rejects insert without source_quote_id (NOT NULL violation)'
);

select * from finish();
rollback;
