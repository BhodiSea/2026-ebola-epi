begin;
select plan(6);

-- ── Zone count ────────────────────────────────────────────────────────────────

select cmp_ok(
  (select count(*)::integer from geo.admin2 where admin1_code = 'COD-IT'),
  '>=',
  30,
  'at least 30 admin2 rows for COD-IT after zone seed'
);

-- ── DON602 key zones present with geometry ───────────────────────────────────

select isnt(
  (select geom from geo.admin2 where code = 'COD-IT-RW'),
  null,
  'Rwampara (COD-IT-RW) has non-null geom'
);

select isnt(
  (select geom from geo.admin2 where code = 'COD-IT-MG'),
  null,
  'Mongbwalu (COD-IT-MG) has non-null geom'
);

select isnt(
  (select geom from geo.admin2 where code = 'COD-IT-BU'),
  null,
  'Bunia (COD-IT-BU) has non-null geom'
);

-- ── Zone names resolve case-insensitively ─────────────────────────────────────
-- Mirrors the resolver logic in resolveAdminCode.

select results_eq(
  $$select code from geo.admin2
      where admin1_code = 'COD-IT'
        and lower(name) = lower('Rwampara')
      limit 1$$,
  $$values ('COD-IT-RW')$$,
  'lower(name) match on Rwampara returns COD-IT-RW'
);

select results_eq(
  $$select code from geo.admin2
      where admin1_code = 'COD-IT'
        and lower(name) = lower('Mongbwalu')
      limit 1$$,
  $$values ('COD-IT-MG')$$,
  'lower(name) match on Mongbwalu returns COD-IT-MG'
);

select * from finish();
rollback;
