begin;

-- Add pre-projected geom_3857 STORED generated columns to geo tables.
-- Running BEFORE the real-geometry seed (20260529130200) so the ACCESS EXCLUSIVE
-- table rewrite hits the small synthetic rows, not the full polygon set.
-- Eliminates per-tile ST_Transform in the MVT pipeline (biggest single tile win).

alter table geo.admin1
  add column if not exists geom_3857 geometry(MultiPolygon, 3857)
    generated always as (st_transform(geom, 3857)) stored;

create index if not exists geo_admin1_geom_3857_gix
  on geo.admin1 using gist (geom_3857);

alter table geo.admin2
  add column if not exists geom_3857 geometry(MultiPolygon, 3857)
    generated always as (st_transform(geom, 3857)) stored;

create index if not exists geo_admin2_geom_3857_gix
  on geo.admin2 using gist (geom_3857);

commit;
