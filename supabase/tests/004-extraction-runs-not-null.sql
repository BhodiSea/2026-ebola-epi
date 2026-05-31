begin;
select plan(1);

-- Fixture: source + document (superuser bypasses RLS)
with
  src as (
    insert into public.sources (id, slug, name, url, posture_terms, posture_attribution)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aa0000000004',
      'test-004-src',
      'Test 004 Source',
      'https://example.com/test-004',
      'Publicly licensed content for testing purposes.',
      'Test 004 Source'
    )
    returning id
  ),
  doc as (
    insert into public.documents (id, source_id, sha256, url, full_text)
    select
      'bbbbbbbb-bbbb-4bbb-8bbb-bb0000000004',
      src.id,
      '\xdeadbeef04'::bytea,
      'https://example.com/test-004/doc',
      'test 004 content'
    from src
    returning id
  )
select id from doc;

-- prompt_version_hash is NOT NULL — insert without it must be rejected
select throws_ok(
  $$
    insert into audit.extraction_runs (document_id, model_id, tool_schema_hash)
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bb0000000004',
      'test-model',
      'schema-hash-004'
    )
  $$,
  '23502',
  null,
  'prompt_version_hash NOT NULL rejects null insert'
);

select * from finish();
rollback;
