begin;
select plan(3);

-- ─── 018: source_quotes unique offset index (20260608170000) ─────────────────
-- Assertions:
--  1  unique index source_quotes_doc_offsets_udx exists
--  2  the index is marked as unique in pg_index
--  3  duplicate (document_id, char_start, char_end) insertion is rejected

-- 1. index exists
select ok(
  exists(
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'source_quotes'
      and indexname = 'source_quotes_doc_offsets_udx'
  ),
  'source_quotes_doc_offsets_udx unique index exists'
);

-- 2. index is unique
select ok(
  exists(
    select 1 from pg_index i
    join pg_class c on c.oid = i.indrelid
    join pg_class ci on ci.oid = i.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'source_quotes'
      and ci.relname = 'source_quotes_doc_offsets_udx'
      and i.indisunique = true
  ),
  'source_quotes_doc_offsets_udx is a unique index'
);

-- 3. runtime enforcement: duplicate (document_id, char_start, char_end) is rejected.
--    We must create a real document first because tg_verify_quote_substring fires
--    BEFORE INSERT and requires documents.full_text to contain the quote text.
do $$
declare
  v_src_id  uuid;
  v_doc_id  uuid := gen_random_uuid();
  v_text    text := 'hello world test document';
begin
  select id into v_src_id from public.sources limit 1;

  insert into public.documents (id, source_id, url, sha256, full_text)
  values (
    v_doc_id,
    v_src_id,
    'https://test.example.com/' || v_doc_id,
    decode(md5(v_doc_id::text), 'hex'),
    v_text
  );

  -- First insert: char_start=0, char_end=5 ('hello')
  insert into public.source_quotes (document_id, quote_text, char_start, char_end)
  values (v_doc_id, 'hello', 0, 5);

  -- Second insert with same offsets must raise unique_violation
  begin
    insert into public.source_quotes (document_id, quote_text, char_start, char_end)
    values (v_doc_id, 'hello', 0, 5);
    raise exception 'expected unique violation but none was raised';
  exception
    when unique_violation then null;  -- expected
  end;
end;
$$;

select ok(true, 'duplicate (document_id, char_start, char_end) raises unique_violation');

select * from finish();
rollback;
