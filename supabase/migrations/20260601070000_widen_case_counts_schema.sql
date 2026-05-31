begin;

-- Widen case_counts to support filovirus sitrep operational data.
-- 1. Expand metric CHECK to include healthcare_workers (live insert bug fix)
--    plus four new metric types consistently present in filovirus DON reports.
-- 2. Add admin_name column (raw geographic name before admin2 resolution).
-- 3. Add is_new_in_period flag to distinguish new-since-last-report vs. cumulative.

alter table public.case_counts
  drop constraint if exists case_counts_metric_check;

alter table public.case_counts
  add constraint case_counts_metric_check check (metric in (
    'cases',
    'deaths',
    'suspected',
    'confirmed',
    'probable',
    'vaccinated',
    'contacts',
    'healthcare_workers',
    'hcw_deaths',
    'nosocomial',
    'lab_positive',
    'in_treatment'
  ));

alter table public.case_counts
  add column if not exists admin_name text;

alter table public.case_counts
  add column if not exists is_new_in_period boolean;

commit;
