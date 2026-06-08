begin;
select plan(4);

-- ─── 017: documents conditional-GET columns (20260529170100) ─────────────────
-- Assertions:
--  1  documents.etag column exists
--  2  documents.last_modified column exists
--  3  documents.http_status column exists
--  4  documents.license column exists (also added in same migration)

select ok(
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'etag'
  ),
  'documents.etag column exists for conditional-GET support'
);

select ok(
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'last_modified'
  ),
  'documents.last_modified column exists for If-Modified-Since support'
);

select ok(
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'http_status'
  ),
  'documents.http_status column exists for last-fetch status tracking'
);

select ok(
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'license'
  ),
  'documents.license column exists for per-document license inheritance'
);

select * from finish();
rollback;
