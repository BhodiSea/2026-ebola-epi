-- 023-no-backfill-duplicates.sql
-- Regression guard: for any given (outbreak_id, as_of, metric, admin scope, value)
-- cluster, at most one case_counts row should be active (superseded_by IS NULL) with
-- status='published'. Repeated back-fill runs against the same document previously
-- violated this invariant (10 identical Uganda confirmed=2 rows). The dedup migration
-- and the isAlreadyExtracted guard in back-fill.ts prevent recurrence.
begin;
select plan(1);

select is(
  (
    select count(*)::bigint
    from (
      select
        outbreak_id,
        as_of,
        metric,
        coalesce(admin_name, '') as admin_name,
        coalesce(admin2_code, '') as admin2_code,
        value
      from public.case_counts
      where status = 'published'
        and superseded_by is null
      group by 1, 2, 3, 4, 5, 6
      having count(*) > 1
    ) dups
  ),
  0::bigint,
  'no duplicate active case_counts rows per (outbreak, date, metric, scope, value)'
);

select * from finish();
rollback;
