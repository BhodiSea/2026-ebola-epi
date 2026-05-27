begin;
select plan(3);

-- Fixtures
with src as (
  insert into public.sources (id, slug, name, url)
  values (
    '11111111-1111-1111-1111-111111111101',
    'test-source-001',
    'Test Source',
    'https://example.com'
  )
  returning id
),
doc as (
  insert into public.documents (id, source_id, sha256, url, full_text)
  select
    '22222222-2222-2222-2222-222222222201',
    src.id,
    '\xdeadbeef'::bytea,
    'https://example.com/doc1',
    'correct text here'
  from src
  returning id
)
select 1 from doc;

-- Rejects mismatched quote_text (char 0-7 of 'correct text here' = 'correct')
select throws_ok(
  $$
    insert into public.source_quotes (document_id, char_start, char_end, quote_text)
    values (
      '22222222-2222-2222-2222-222222222201',
      0, 7,
      'WRONG T'
    )
  $$,
  'P0001',
  'quote_text does not match document substring',
  'trigger rejects fabricated quote_text'
);

-- Accepts matching quote_text (char 0-7 of 'correct text here' = 'correct')
select lives_ok(
  $$
    insert into public.source_quotes (document_id, char_start, char_end, quote_text)
    values (
      '22222222-2222-2222-2222-222222222201',
      0, 7,
      'correct'
    )
  $$,
  'trigger accepts quote_text that matches document substring'
);

-- Rejects negative char_start (CHECK constraint source_quotes_char_start_non_negative)
select throws_ok(
  $$
    insert into public.source_quotes (document_id, char_start, char_end, quote_text)
    values (
      '22222222-2222-2222-2222-222222222201',
      -1, 7,
      'correct'
    )
  $$,
  '23514',
  null,
  'trigger rejects negative char_start (check constraint violation)'
);

select * from finish();
rollback;
