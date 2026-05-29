begin;

-- Drop the dead geo.admin1_subdivided matview (red-team Phase 5). It is:
--   • empty — its filter `st_npoints(geom_3857) > 2000` exceeds the only seeded province
--     polygon (~519 points), so no rows are ever materialized;
--   • unread — internal.mvt and every other consumer use geo.zone_geom_z6/z10 + geo.admin2,
--     never admin1_subdivided;
--   • unrefreshed — the pg_cron job (20260529130400) predates it and never refreshes it, and it
--     has no UNIQUE index so a CONCURRENTLY refresh would fail anyway.
-- A permanently-empty, unconsumed, unrefreshed matview is a maintenance trap whose comment
-- misrepresents an active selectivity win. Recreate it properly (synthetic unique key + a
-- threshold the data clears + a real consumer) if/when a province-context layer needs it.

drop materialized view if exists geo.admin1_subdivided;

commit;
