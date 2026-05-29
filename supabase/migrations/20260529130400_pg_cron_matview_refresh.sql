begin;

-- Daily CONCURRENT refresh of zone choropleth matviews at 03:00 UTC.
-- CONCURRENTLY avoids the ACCESS EXCLUSIVE lock that would stall tile serving.
-- The unique indexes created in 20260529130100 are required prerequisites.

select cron.schedule(
  'refresh_zone_geom_z6',
  '0 3 * * *',
  $$refresh materialized view concurrently geo.zone_geom_z6;$$
);

select cron.schedule(
  'refresh_zone_geom_z10',
  '0 3 * * *',
  $$refresh materialized view concurrently geo.zone_geom_z10;$$
);

commit;
