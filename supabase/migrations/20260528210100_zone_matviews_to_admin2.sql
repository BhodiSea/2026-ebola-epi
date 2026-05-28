begin;

-- Repoint zone choropleth matviews from geo.admin1 to geo.admin2.
-- case_counts.admin1_code was removed in 20260528210000; the FK now targets
-- geo.admin2(code).  Matviews must match so Phase 5 choropleth joins correctly.

drop materialized view if exists geo.zone_geom_z10;
drop materialized view if exists geo.zone_geom_z6;

create materialized view if not exists geo.zone_geom_z6 as
  select code, name, st_simplifypreservetopology(geom, 0.05) as geom
  from geo.admin2;
create index if not exists zone_geom_z6_gix on geo.zone_geom_z6 using gist (geom);

create materialized view if not exists geo.zone_geom_z10 as
  select code, name, st_simplifypreservetopology(geom, 0.005) as geom
  from geo.admin2;
create index if not exists zone_geom_z10_gix on geo.zone_geom_z10 using gist (geom);

commit;
