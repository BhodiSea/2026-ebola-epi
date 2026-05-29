begin;
select plan(7);

-- (a) internal.mvt function exists
select has_function(
  'internal', 'mvt',
  'internal.mvt function exists'
);

-- (b) public.mvt wrapper exists
select has_function(
  'public', 'mvt',
  'public.mvt wrapper exists'
);

-- (c) internal.mvt is STABLE (volatility = 's')
select is(
  (
    select p.provolatile
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'internal' and p.proname = 'mvt'
    limit 1
  ),
  's',
  'internal.mvt volatility is STABLE'
);

-- (d) internal.mvt returns bytea
select ok(
  pg_catalog.pg_typeof(internal.mvt(6, 32, 32)) = 'bytea'::regtype,
  'internal.mvt returns bytea'
);

-- (e) anon cannot call internal.mvt directly (EXECUTE revoked + schema access revoked)
set local role anon;
select throws_ok(
  $$select internal.mvt(6, 32, 32)$$,
  'insufficient_privilege',
  'anon cannot execute internal.mvt directly'
);
reset role;

-- (f) anon can call public.mvt (SECURITY INVOKER wrapper — grants in place)
set local role anon;
select ok(
  (select pg_catalog.pg_typeof(public.mvt(6, 32, 32)) = 'bytea'::regtype),
  'anon can execute public.mvt and receives bytea'
);
reset role;

-- (g) cases layer is restricted to published rows (regression guard against the
--     SECURITY DEFINER RLS-bypass that would otherwise leak pending_review figures)
select matches(
  pg_catalog.pg_get_functiondef('internal.mvt(integer,integer,integer,uuid)'::regprocedure),
  'status = ''published''',
  'internal.mvt cases layer filters status = published'
);

select * from finish();
rollback;
