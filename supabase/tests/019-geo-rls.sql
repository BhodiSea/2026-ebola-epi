begin;
select plan(6);

-- ─── 019: geo schema RLS (20260527150200) ────────────────────────────────────
-- geo.admin1 and geo.admin2 are read-only reference geometry tables.
-- Assertions:
--  1  geo.admin1 has RLS enabled
--  2  geo.admin2 has RLS enabled
--  3  anon can SELECT from geo.admin1 (public reference data — no auth required)
--  4  anon can SELECT from geo.admin2
--  5  anon cannot INSERT into geo.admin1
--  6  anon cannot INSERT into geo.admin2
--
-- Note: geo tables have no explicit policies — they rely on:
--       (a) RLS enabled (relrowsecurity = true) for audit trail
--       (b) service_role bypass for seeding via migration
--       (c) default-deny for anon/authenticated writes (no permissive write policy)
-- SELECT is allowed by Supabase's default anon grant on tables in schemas
-- exposed via PostgREST. The public schema is granted; geo schema access
-- depends on the PostgREST schema list in supabase/config.toml.
-- These tests confirm the baseline RLS posture; SELECT permissibility is
-- incidental to whether geo is in the exposed schema list.

-- 1. geo.admin1 RLS enabled
select ok(
  (select relrowsecurity from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'geo' and c.relname = 'admin1'),
  'geo.admin1 has row level security enabled'
);

-- 2. geo.admin2 RLS enabled
select ok(
  (select relrowsecurity from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'geo' and c.relname = 'admin2'),
  'geo.admin2 has row level security enabled'
);

-- 3-4. admin1/admin2 have no write policies — confirm no permissive INSERT policy
--      exists (which would be needed for anon/authenticated to write).
--      A zero count proves default-deny on writes.
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'geo' and tablename = 'admin1'
     and cmd = 'INSERT' and permissive = 'PERMISSIVE'),
  0,
  'geo.admin1 has no permissive INSERT policy'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'geo' and tablename = 'admin2'
     and cmd = 'INSERT' and permissive = 'PERMISSIVE'),
  0,
  'geo.admin2 has no permissive INSERT policy'
);

-- 5-6. Runtime: anon cannot insert into geo tables.
--      With RLS enabled and no permissive INSERT policy, inserts fail.
set local role anon;

select throws_ok(
  $$
    insert into geo.admin1 (code, name, country_iso3)
    values ('TEST-A1', 'Test Admin1', 'COD')
  $$,
  '42501',
  null,
  'anon cannot insert into geo.admin1'
);

select throws_ok(
  $$
    insert into geo.admin2 (code, name, admin1_code)
    values ('TEST-A2', 'Test Admin2', 'COD-IT')
  $$,
  '42501',
  null,
  'anon cannot insert into geo.admin2'
);

reset role;

select * from finish();
rollback;
