-- 022-no-seed-in-prod.sql
-- Regression guard: dev fixture rows (prompt_version_hash like 'seed-%') must never
-- survive a clean migration run. supabase/fixtures/dev-seed.sql is applied manually
-- with app.env='dev' only; supabase/seed.sql (which runs on db reset) contains no
-- seed rows. If this assertion fails, a dev fixture was accidentally applied to prod.
begin;
select plan(2);

select is(
  (select count(*)::bigint from public.case_counts
    where prompt_version_hash like 'seed-%'),
  0::bigint,
  'no seed case_counts rows after migrations'
);

select is(
  (select count(*)::bigint from audit.extraction_runs
    where prompt_version_hash like 'seed-%'),
  0::bigint,
  'no seed extraction_runs after migrations'
);

select * from finish();
rollback;
