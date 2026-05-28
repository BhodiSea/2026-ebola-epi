begin;

-- Migrate case_counts from health-district level (admin1) to health-zone level (admin2).
-- DRC zones de santé are admin2 per geo schema; backend.md §6 is explicit.

-- 1. Add admin2_code column (nullable — existing rows may have no zone data)
alter table public.case_counts
  add column if not exists admin2_code text references geo.admin2(code);

-- 2. Backfill: where a seed row had admin1_code, attempt to match the first admin2
--    child of that admin1. Unambiguous for seed data; NULL is acceptable otherwise.
update public.case_counts cc
  set admin2_code = (
    select a2.code
    from geo.admin2 a2
    where a2.admin1_code = cc.admin1_code
    limit 1
  )
  where cc.admin1_code is not null
    and cc.admin2_code is null;

-- 3. Drop the old admin1_code column
alter table public.case_counts
  drop column if exists admin1_code;

-- 4. Index for zone-level time-series queries
create index if not exists case_counts_admin2_idx
  on public.case_counts (admin2_code);

commit;
