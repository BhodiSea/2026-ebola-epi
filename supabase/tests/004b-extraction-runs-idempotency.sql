begin;
select plan(2);

-- Fixture: source + document
with
  src as (
    insert into public.sources (id, slug, name, url, posture_terms, posture_attribution)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aa000000004b',
      'test-004b-src',
      'Test 004b Source',
      'https://example.com/test-004b',
      'Publicly licensed content for testing purposes.',
      'Test 004b Source'
    )
    returning id
  ),
  doc as (
    insert into public.documents (id, source_id, sha256, url, full_text)
    select
      'bbbbbbbb-bbbb-4bbb-8bbb-bb000000004b',
      src.id,
      '\xdeadbeef4b'::bytea,
      'https://example.com/test-004b/doc',
      'test 004b content'
    from src
    returning id
  )
select id from doc;

-- First insert must succeed
select lives_ok(
  $$
    insert into audit.extraction_runs (id, document_id, model_id, prompt_version_hash, tool_schema_hash)
    values (
      'eeeeeeee-eeee-4eee-8eee-ee000000004b',
      'bbbbbbbb-bbbb-4bbb-8bbb-bb000000004b',
      'test-model',
      'hash-idempotency-004b',
      'schema-hash-004b'
    )
  $$,
  'first extraction_run insert succeeds'
);

-- Second insert with same (document_id, prompt_version_hash) must be rejected
select throws_ok(
  $$
    insert into audit.extraction_runs (id, document_id, model_id, prompt_version_hash, tool_schema_hash)
    values (
      'eeeeeeee-eeee-4eee-8eee-ee000000005b',
      'bbbbbbbb-bbbb-4bbb-8bbb-bb000000004b',
      'test-model',
      'hash-idempotency-004b',
      'schema-hash-004b'
    )
  $$,
  '23505',
  null,
  'duplicate (document_id, prompt_version_hash) rejected with unique violation'
);

select * from finish();
rollback;
