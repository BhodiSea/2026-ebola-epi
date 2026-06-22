begin;
select plan(4);

-- 1. status column exists
select has_column(
  'audit', 'extraction_runs', 'status',
  'audit.extraction_runs has a status column'
);

-- 2. status defaults to ''running''
select col_default_is(
  'audit', 'extraction_runs', 'status', 'running',
  'status default is running'
);

-- 3. dropped_rows column exists and is not null
select col_not_null(
  'audit', 'extraction_runs', 'dropped_rows',
  'dropped_rows is not null'
);

-- 4. model_id_resolved column exists (nullable)
select has_column(
  'audit', 'extraction_runs', 'model_id_resolved',
  'audit.extraction_runs has a model_id_resolved column'
);

select * from finish();
rollback;
