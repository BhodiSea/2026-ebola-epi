begin;
select plan(3);

-- Minimal fixture chain: source → document → source_quote → outbreak →
-- extraction_run → case_count.  All inserts run as postgres (superuser),
-- which bypasses RLS.  We then switch to anon to exercise the policy.
with
  src as (
    insert into public.sources (id, slug, name, url, posture_terms, posture_attribution)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'rls-filter-src',
      'RLS Filter Test Source',
      'https://example.com/rls',
      'Publicly licensed content for testing purposes.',
      'RLS Filter Test Source'
    )
    returning id
  ),
  doc as (
    insert into public.documents (id, source_id, sha256, url, full_text)
    select
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      src.id,
      '\xbeefdead02'::bytea,
      'https://example.com/rls/doc',
      'published row test data'
    from src
    returning id
  ),
  ob as (
    insert into public.outbreaks (id, pathogen_icd11, country_iso3, onset_date)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'XN0AT',
      'COD',
      '2026-01-01'
    )
    returning id
  ),
  sq as (
    insert into public.source_quotes (id, document_id, char_start, char_end, quote_text)
    select
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      doc.id,
      0, 9,
      'published'
    from doc
    returning id
  ),
  er as (
    insert into audit.extraction_runs (id, document_id, model_id, prompt_version_hash, tool_schema_hash)
    select
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      doc.id,
      'test-model',
      'hash-rls-001',
      'schema-hash-001'
    from doc
    returning id
  ),
  cc as (
    insert into public.case_counts (
      id, outbreak_id, as_of, metric, value,
      source_quote_id, extraction_run_id, model_id, prompt_version_hash,
      status
    )
    select
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      ob.id, current_date, 'cases', 1,
      sq.id, er.id, 'test-model', 'hash-rls-001',
      'pending_review'
    from ob, sq, er
    returning id
  ),
  -- winner row used to supersede cc without a self-reference (Phase 6 CHECK constraint
  -- case_counts_no_self_supersede forbids superseded_by = id)
  cc_winner as (
    insert into public.case_counts (
      id, outbreak_id, as_of, metric, value,
      source_quote_id, extraction_run_id, model_id, prompt_version_hash,
      status
    )
    select
      'ffffffff-ffff-4fff-8fff-000000000002',
      ob.id, current_date, 'cases', 2,
      sq.id, er.id, 'test-model', 'hash-rls-001',
      'published'
    from ob, sq, er
    returning id
  )
select 1 from cc, cc_winner;

-- 1. anon cannot see a pending_review row
set local role anon;
select is(
  (select count(*)::int from public.case_counts
     where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'),
  0,
  'anon sees 0 rows when status = pending_review'
);
reset role;

-- 2. anon sees the row once published and not superseded
update public.case_counts
  set status = 'published'
  where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

set local role anon;
select is(
  (select count(*)::int from public.case_counts
     where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'),
  1,
  'anon sees 1 row when status = published and superseded_by is null'
);
reset role;

-- 3. anon cannot see the row once superseded (use cc_winner as the superseding row;
--    the Phase 6 CHECK constraint case_counts_no_self_supersede forbids superseded_by = id)
update public.case_counts
  set superseded_by = 'ffffffff-ffff-4fff-8fff-000000000002'
  where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

set local role anon;
select is(
  (select count(*)::int from public.case_counts
     where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'),
  0,
  'anon sees 0 rows when superseded_by is not null'
);
reset role;

select * from finish();
rollback;
