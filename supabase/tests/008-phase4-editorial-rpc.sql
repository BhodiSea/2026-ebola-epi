begin;
select plan(7);

-- (a) outbreaks.pathogen_slug column exists
select has_column(
  'public', 'outbreaks', 'pathogen_slug',
  'outbreaks has pathogen_slug column'
);

-- (b) outbreaks.severity_level column exists
select has_column(
  'public', 'outbreaks', 'severity_level',
  'outbreaks has severity_level column'
);

-- (c) documents.title column exists
select has_column(
  'public', 'documents', 'title',
  'documents has title column'
);

-- (d) outbreak_zone_svg function exists in public schema
select has_function(
  'public', 'outbreak_zone_svg',
  'public.outbreak_zone_svg function exists'
);

-- (e) anon role can execute outbreak_zone_svg (SECURITY DEFINER bypasses geo schema lock)
set local role anon;
select ok(
  (select count(*) from public.outbreak_zone_svg(gen_random_uuid())) >= 0,
  'anon can execute public.outbreak_zone_svg without permission error'
);
reset role;

-- (f) function returns exactly 5 zone rows for the seeded bundibugyo outbreak
select is(
  (select count(*)::int
   from public.outbreak_zone_svg(
     (select id from public.outbreaks where pathogen_slug = 'bundibugyo' limit 1)
   )
  ),
  5,
  'outbreak_zone_svg returns 5 admin2 zones for bundibugyo outbreak'
);

-- (g) all total_value are non-negative (coalesce ensures no nulls)
select ok(
  (select bool_and(total_value >= 0)
   from public.outbreak_zone_svg(
     (select id from public.outbreaks where pathogen_slug = 'bundibugyo' limit 1)
   )
  ),
  'all zone total_value are >= 0'
);

select * from finish();
rollback;
