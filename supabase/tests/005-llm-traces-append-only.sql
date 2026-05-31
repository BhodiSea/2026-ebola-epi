begin;
select plan(6);

-- Full fixture chain: source → document → extraction_run → llm_trace
with
  src as (
    insert into public.sources (id, slug, name, url, posture_terms, posture_attribution)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aa0000000005',
      'test-005-src',
      'Test 005 Source',
      'https://example.com/test-005',
      'Publicly licensed content for testing purposes.',
      'Test 005 Source'
    )
    returning id
  ),
  doc as (
    insert into public.documents (id, source_id, sha256, url, full_text)
    select
      'bbbbbbbb-bbbb-4bbb-8bbb-bb0000000005',
      src.id,
      '\xdeadbeef05'::bytea,
      'https://example.com/test-005/doc',
      'test 005 content'
    from src
    returning id
  ),
  er as (
    insert into audit.extraction_runs (id, document_id, model_id, prompt_version_hash, tool_schema_hash)
    select
      'eeeeeeee-eeee-4eee-8eee-ee0000000005',
      doc.id,
      'test-model',
      'hash-llm-005',
      'schema-hash-005'
    from doc
    returning id
  ),
  lt as (
    insert into audit.llm_traces (id, extraction_run_id, trace_id, span_id, name)
    select
      'ffffffff-ffff-4fff-8fff-ff0000000005',
      er.id,
      'trace-005',
      'span-005',
      'test-extraction-span'
    from er
    returning id
  )
select id from lt;

-- authenticated cannot update
set local role authenticated;
select throws_ok(
  $$ update audit.llm_traces set name = 'tampered'
     where id = 'ffffffff-ffff-4fff-8fff-ff0000000005' $$,
  '42501',
  null,
  'authenticated cannot UPDATE audit.llm_traces'
);
reset role;

-- authenticated cannot delete
set local role authenticated;
select throws_ok(
  $$ delete from audit.llm_traces
     where id = 'ffffffff-ffff-4fff-8fff-ff0000000005' $$,
  '42501',
  null,
  'authenticated cannot DELETE audit.llm_traces'
);
reset role;

-- anon cannot update
set local role anon;
select throws_ok(
  $$ update audit.llm_traces set name = 'tampered'
     where id = 'ffffffff-ffff-4fff-8fff-ff0000000005' $$,
  '42501',
  null,
  'anon cannot UPDATE audit.llm_traces'
);
reset role;

-- anon cannot delete
set local role anon;
select throws_ok(
  $$ delete from audit.llm_traces
     where id = 'ffffffff-ffff-4fff-8fff-ff0000000005' $$,
  '42501',
  null,
  'anon cannot DELETE audit.llm_traces'
);
reset role;

-- authenticated cannot insert (REVOKE INSERT enforces server-only writes)
set local role authenticated;
select throws_ok(
  $$ insert into audit.llm_traces (extraction_run_id, trace_id, span_id, name)
     values (
       'eeeeeeee-eeee-4eee-8eee-ee0000000005',
       'trace-forge-001',
       'span-forge-001',
       'forged-by-client'
     ) $$,
  '42501',
  null,
  'authenticated cannot INSERT into audit.llm_traces'
);
reset role;

-- anon cannot insert
set local role anon;
select throws_ok(
  $$ insert into audit.llm_traces (extraction_run_id, trace_id, span_id, name)
     values (
       'eeeeeeee-eeee-4eee-8eee-ee0000000005',
       'trace-forge-002',
       'span-forge-002',
       'forged-by-anon'
     ) $$,
  '42501',
  null,
  'anon cannot INSERT into audit.llm_traces'
);
reset role;

select * from finish();
rollback;
