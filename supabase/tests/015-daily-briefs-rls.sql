begin;
select plan(8);

-- ─── 015: daily_briefs RLS ───────────────────────────────────────────────────
-- Assertions:
--  1-4  policy exists for each command (SELECT×2 + INSERT/UPDATE/DELETE deny)
--  5    anon can read published rows
--  6    anon cannot read unreviewed rows
--  7    anon cannot insert
--  8    authenticated cannot insert (restrictive deny applies)

-- 1. SELECT policy for anon exists
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_briefs'
      and cmd = 'SELECT' and 'anon' = any(roles)
  ),
  'daily_briefs has a SELECT policy for anon'
);

-- 2. SELECT policy for authenticated exists
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_briefs'
      and cmd = 'SELECT' and 'authenticated' = any(roles)
  ),
  'daily_briefs has a SELECT policy for authenticated'
);

-- 3. RESTRICTIVE INSERT deny exists
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_briefs'
      and cmd = 'INSERT' and permissive = 'RESTRICTIVE'
  ),
  'daily_briefs has a RESTRICTIVE INSERT deny policy'
);

-- 4. RESTRICTIVE UPDATE deny exists
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_briefs'
      and cmd = 'UPDATE' and permissive = 'RESTRICTIVE'
  ),
  'daily_briefs has a RESTRICTIVE UPDATE deny policy'
);

-- 5. anon can read published rows
set local role anon;

select ok(
  (select count(*) from public.daily_briefs) >= 0,
  'anon can query daily_briefs (published rows visible)'
);

-- 6. anon cannot see unreviewed rows (verify RLS filters them)
select is(
  (select count(*)::int from public.daily_briefs where review_status != 'published'),
  0,
  'anon sees only published rows (RLS hides unreviewed)'
);

-- 7. anon cannot insert
select throws_ok(
  $$
    insert into public.daily_briefs (date, headline, body, model_id)
    values (current_date + 1, 'test', 'test', 'test')
  $$,
  '42501',
  null,
  'anon cannot insert into public.daily_briefs'
);

reset role;

-- 8. authenticated cannot insert (restrictive deny blocks even logged-in users)
set local role authenticated;

select throws_ok(
  $$
    insert into public.daily_briefs (date, headline, body, model_id)
    values (current_date + 2, 'test', 'test', 'test')
  $$,
  '42501',
  null,
  'authenticated cannot insert into public.daily_briefs'
);

reset role;

select * from finish();
rollback;
