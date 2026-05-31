begin;
select plan(2);

-- Minimal fixture chain (superuser, bypasses RLS)
with
  src as (
    insert into public.sources (id, slug, name, url, posture_terms, posture_attribution)
    values (
      'a7777777-7777-4777-8777-777777777701',
      'test-src-007',
      'Supersede Test Source',
      'https://example.com/007',
      'Publicly licensed content for testing purposes.',
      'Supersede Test Source'
    )
    returning id
  ),
  doc as (
    insert into public.documents (id, source_id, sha256, url, full_text)
    select
      'b7777777-7777-4777-8777-777777777701',
      src.id,
      '\xdeadbeef07'::bytea,
      'https://example.com/007/doc',
      'who 142 cases confirmed'
    from src
    returning id
  ),
  ob as (
    insert into public.outbreaks (id, pathogen_icd11, country_iso3, onset_date)
    values (
      'c7777777-7777-4777-8777-777777777701',
      'XN0AT',
      'COD',
      '2026-01-01'
    )
    returning id
  ),
  sq as (
    insert into public.source_quotes (id, document_id, char_start, char_end, quote_text)
    select
      'd7777777-7777-4777-8777-777777777701',
      doc.id,
      0, 3,
      'who'
    from doc
    returning id
  ),
  er as (
    insert into audit.extraction_runs (id, document_id, model_id, prompt_version_hash, tool_schema_hash)
    select
      'e7777777-7777-4777-8777-777777777701',
      doc.id,
      'test-model',
      'hash-007-a',
      'schema-hash-007'
    from doc
    returning id
  ),
  -- "winner" row (higher value, higher trust source)
  cc_winner as (
    insert into public.case_counts (
      id, outbreak_id, as_of, metric, value,
      source_quote_id, extraction_run_id, model_id, prompt_version_hash,
      status
    )
    select
      'f7777777-7777-4777-8777-777777777701',
      ob.id, '2026-05-27', 'cases', 142,
      sq.id, er.id, 'test-model', 'hash-007-a',
      'published'
    from ob, sq, er
    returning id
  ),
  -- "loser" row (lower value, lower trust source) — superseded_by will be set
  cc_loser as (
    insert into public.case_counts (
      id, outbreak_id, as_of, metric, value,
      source_quote_id, extraction_run_id, model_id, prompt_version_hash,
      status
    )
    select
      'f7777777-7777-4777-8777-777777777702',
      ob.id, '2026-05-27', 'cases', 108,
      sq.id, er.id, 'test-model', 'hash-007-a',
      'published'
    from ob, sq, er
    returning id
  )
select 1 from cc_winner, cc_loser;

-- 1. superseded_by cannot reference itself (the case_counts_no_self_supersede CHECK)
select throws_ok(
  $$ update public.case_counts
       set superseded_by = id
       where id = 'f7777777-7777-4777-8777-777777777702' $$,
  '23514',
  null,
  'self-supersede violates case_counts_no_self_supersede CHECK'
);

-- 2. After reconciliation (simulated), the loser row has superseded_by set to the winner
update public.case_counts
  set superseded_by = 'f7777777-7777-4777-8777-777777777701'
  where id = 'f7777777-7777-4777-8777-777777777702';

select ok(
  exists (
    select 1 from public.case_counts
    where id = 'f7777777-7777-4777-8777-777777777702'
      and superseded_by = 'f7777777-7777-4777-8777-777777777701'
  ),
  'loser row has superseded_by pointing to winner after reconciliation'
);

select * from finish();
rollback;
