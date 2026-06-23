-- migration: incidents_add_all_rows_dropped_class
-- description: Extend the incidents.class check constraint to include 'all_rows_dropped',
--   written when an extraction returns rows but every row fails zod validation — previously
--   this state was silently logged as succeeded with rowsVerified=0 and no user-visible signal.
begin;

alter table public.incidents
  drop constraint if exists incidents_class_check;

alter table public.incidents
  add constraint incidents_class_check
    check (class = any (array[
      'novel_pathogen_country',
      'substring_verify_fail',
      'conflict_unresolvable',
      'anomaly',
      'all_rows_dropped'
    ]));

commit;
