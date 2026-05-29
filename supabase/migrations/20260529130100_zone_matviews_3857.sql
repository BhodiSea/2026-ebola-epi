begin;

-- Rebuild zone choropleth matviews to include geom_3857 (pre-projected) and
-- a unique index on `code` for REFRESH CONCURRENTLY.
-- The geom_3857 column is NOT auto-projected from the parent table into matviews;
-- the matview definition must explicitly select it.

drop materialized view if exists geo.zone_geom_z10;
drop materialized view if exists geo.zone_geom_z6;

create materialized view if not exists geo.zone_geom_z6 as
  select
    code,
    name,
    st_simplifypreservetopology(geom, 0.05)  as geom,
    st_simplifypreservetopology(geom_3857, 5000) as geom_3857
  from geo.admin2;

create unique index if not exists geo_zone_geom_z6_pk
  on geo.zone_geom_z6 (code);
create index if not exists zone_geom_z6_gix
  on geo.zone_geom_z6 using gist (geom);
create index if not exists zone_geom_z6_3857_gix
  on geo.zone_geom_z6 using gist (geom_3857);

create materialized view if not exists geo.zone_geom_z10 as
  select
    code,
    name,
    st_simplifypreservetopology(geom, 0.005)   as geom,
    st_simplifypreservetopology(geom_3857, 500) as geom_3857
  from geo.admin2;

create unique index if not exists geo_zone_geom_z10_pk
  on geo.zone_geom_z10 (code);
create index if not exists zone_geom_z10_gix
  on geo.zone_geom_z10 using gist (geom);
create index if not exists zone_geom_z10_3857_gix
  on geo.zone_geom_z10 using gist (geom_3857);

commit;
