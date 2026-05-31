begin;
select plan(5);

-- posture_terms column exists
select has_column(
  'public', 'sources', 'posture_terms',
  'sources has posture_terms column'
);

-- posture_attribution column exists
select has_column(
  'public', 'sources', 'posture_attribution',
  'sources has posture_attribution column'
);

-- posture_terms is NOT NULL
select col_not_null(
  'public', 'sources', 'posture_terms',
  'sources.posture_terms is NOT NULL'
);

-- posture_attribution is NOT NULL
select col_not_null(
  'public', 'sources', 'posture_attribution',
  'sources.posture_attribution is NOT NULL'
);

-- every seeded row has posture text (catches seed migrations that omit the columns)
select is(
  (select count(*)::int from public.sources where posture_terms is null or posture_attribution is null),
  0,
  'every seeded source has posture text'
);

select * from finish();
rollback;
