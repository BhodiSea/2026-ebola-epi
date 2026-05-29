begin;

-- Pre-subdivide large admin1 (province) polygons for faster GIST selectivity and
-- per-tile clipping. Province borders are admin-context only (never joined to
-- case_counts) — this matview is consumed by the MVT pipeline / future context layer,
-- not the choropleth join. Source: research/performance.md §2.1 (ST_Subdivide).
--
-- ST_Subdivide emits one row per piece (<= 256 vertices each), so each source polygon
-- with > 2000 vertices becomes many small-bbox rows. Smaller bounding boxes mean the
-- GIST && filter rejects far more non-matching tiles before clipping.

create materialized view if not exists geo.admin1_subdivided as
  select
    st_subdivide(geom_3857, 256) as geom_3857,
    code,
    name
  from geo.admin1
  where st_npoints(geom_3857) > 2000;

create index if not exists geo_admin1_subdivided_gix
  on geo.admin1_subdivided using gist (geom_3857);

commit;
