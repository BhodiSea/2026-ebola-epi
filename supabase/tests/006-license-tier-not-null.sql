begin;
select plan(3);

-- license_tier column exists
select has_column(
  'public', 'sources', 'license_tier',
  'sources has license_tier column'
);

-- license_tier is NOT NULL
select col_not_null(
  'public', 'sources', 'license_tier',
  'sources.license_tier is NOT NULL'
);

-- invalid tier value must be rejected by check constraint (23514 = check_violation)
select throws_ok(
  $$
    insert into public.sources (slug, name, url, license_tier)
    values ('test-006-reject', 'Test 006 Reject', 'https://example.com/006', 'invalid_tier')
  $$,
  '23514',
  null,
  'invalid license_tier rejected by check constraint'
);

select * from finish();
rollback;
