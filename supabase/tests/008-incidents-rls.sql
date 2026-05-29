begin;
select plan(2);

-- Minimal outbreak fixture to satisfy the incidents.outbreak_id FK
with
  ob as (
    insert into public.outbreaks (id, pathogen_icd11, country_iso3, onset_date)
    values (
      'a8888888-8888-4888-8888-888888888801',
      'XN0AT',
      'COD',
      '2026-01-01'
    )
    returning id
  ),
  inc as (
    insert into public.incidents (id, class, outbreak_id, status)
    select
      'b8888888-8888-4888-8888-888888888801',
      'conflict_unresolvable',
      ob.id,
      'open'
    from ob
    returning id
  )
select 1 from inc;

-- 1. anon cannot SELECT from public.incidents
set local role anon;
select is(
  (select count(*)::int from public.incidents
     where id = 'b8888888-8888-4888-8888-888888888801'),
  0,
  'anon cannot read incidents (RLS default-deny for anon)'
);
reset role;

-- 2. The row is visible to the superuser (bypasses RLS), confirming it was inserted
select is(
  (select count(*)::int from public.incidents
     where id = 'b8888888-8888-4888-8888-888888888801'),
  1,
  'superuser can read incidents (RLS bypass, row was inserted correctly)'
);

select * from finish();
rollback;
