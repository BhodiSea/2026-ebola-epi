begin;
select plan(8);

-- Seed fixtures (superuser context — bypasses RLS)
insert into public.outbreaks (id, pathogen_icd11, country_iso3, onset_date)
values ('a9999999-9999-4999-9999-999999999901', 'XN0AT', 'COD', '2026-01-01');

insert into public.incidents (id, class, outbreak_id, status)
values (
  'b9999999-9999-4999-9999-999999999901',
  'anomaly',
  'a9999999-9999-4999-9999-999999999901',
  'open'
);

-- id is bigserial — omit it and let Postgres auto-assign
insert into audit.agent_actions (agent, action)
values ('extractor', 'extract_figures');

-- 1. No JWT claims → is_internal_user() returns false
set local "request.jwt.claims" = '{}';
select is(
  private.is_internal_user(),
  false,
  'is_internal_user() is false when JWT has no app_metadata.role'
);

-- 2. Unknown role → false
set local "request.jwt.claims" = '{"app_metadata":{"role":"viewer"}}';
select is(
  private.is_internal_user(),
  false,
  'is_internal_user() is false for unrecognised role'
);

-- 3. admin role → true
set local "request.jwt.claims" = '{"app_metadata":{"role":"admin"}}';
select is(
  private.is_internal_user(),
  true,
  'is_internal_user() is true for admin role'
);

-- 4. staff role → true
set local "request.jwt.claims" = '{"app_metadata":{"role":"staff"}}';
select is(
  private.is_internal_user(),
  true,
  'is_internal_user() is true for staff role'
);

-- 5. Non-internal authenticated user sees 0 rows in public.agent_actions
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"viewer"}}';

select is(
  (select count(*)::int from public.agent_actions),
  0,
  'non-internal authenticated user sees 0 rows in public.agent_actions'
);
reset role;

-- 6. Internal authenticated user (admin) sees the seeded row
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","app_metadata":{"role":"admin"}}';

select is(
  (select count(*)::int from public.agent_actions),
  1,
  'internal authenticated user (admin) sees rows in public.agent_actions'
);
reset role;

-- 7. Internal authenticated user can UPDATE incidents
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","app_metadata":{"role":"admin"},"aud":"authenticated"}';

update public.incidents
  set status = 'acked'
where id = 'b9999999-9999-4999-9999-999999999901';

reset role;

select is(
  (select status from public.incidents where id = 'b9999999-9999-4999-9999-999999999901'),
  'acked',
  'internal authenticated user can UPDATE incidents'
);

-- 8. Non-internal authenticated user cannot UPDATE incidents (row unchanged)
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000003","app_metadata":{"role":"viewer"},"aud":"authenticated"}';

update public.incidents
  set status = 'closed'
where id = 'b9999999-9999-4999-9999-999999999901';

reset role;

select is(
  (select status from public.incidents where id = 'b9999999-9999-4999-9999-999999999901'),
  'acked',
  'non-internal authenticated user cannot UPDATE incidents (status unchanged)'
);

select * from finish();
rollback;
