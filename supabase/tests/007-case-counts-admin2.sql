begin;
select plan(3);

-- (a) admin2_code column exists on public.case_counts
select has_column(
  'public', 'case_counts', 'admin2_code',
  'case_counts has admin2_code column'
);

-- (b) FK target is geo.admin2
select col_is_fk(
  'public', 'case_counts', 'admin2_code',
  'admin2_code is a foreign key'
);

-- (c) admin1_code is gone
select hasnt_column(
  'public', 'case_counts', 'admin1_code',
  'case_counts does not have admin1_code (migrated to admin2_code)'
);

select * from finish();
rollback;
