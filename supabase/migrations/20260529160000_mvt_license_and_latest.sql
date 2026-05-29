begin;

-- Two correctness/compliance fixes to the `cases` MVT layer (red-team Phase 5):
--
-- 1. License filter (hard rule 14). The MVT tiles are CDN-cached `immutable` for a week and
--    therefore a redistributable raster. display_only/excluded sources must NEVER feed such a
--    raster. The prior body filtered only status='published' and never joined the provenance
--    chain to check license_tier, so a published count from a display_only/excluded source would
--    leak into the public tile. Join case_counts → source_quotes → documents → sources and keep
--    only redistributable tiers.
--
-- 2. Latest-snapshot-per-(zone, metric), not one stacked point per row. case_counts holds one row
--    per (outbreak, as_of, metric, admin2) — values are CUMULATIVE restatements. The prior body
--    emitted a centroid for every matching row, stacking N dated points at the identical zone
--    centroid in every covering tile (tile bloat O(days × metrics × zones)) and double-representing
--    cumulative figures. DISTINCT ON the latest as_of per (admin2, metric) bounds the layer at
--    O(zones × metrics) and keeps the figure the latest cumulative snapshot. Provenance
--    (source_quote_id) of that snapshot is preserved.

create or replace function internal.mvt(
  z          integer,
  x          integer,
  y          integer,
  p_outbreak uuid default null
) returns bytea
  language plpgsql
  stable
  parallel safe
  security definer
  set search_path = public, geo, extensions, pg_temp
as $$
declare
  _envelope geometry := st_tileenvelope(z, x, y);
  _margin   geometry := st_tileenvelope(z, x, y, margin => 64.0 / 4096);
  result    bytea;
begin
  with
  zones_layer as (
    select st_asmvt(t, 'zones', 4096, 'geom') as mvt
    from (
      select
        st_asmvtgeom(
          zg.geom_3857,
          _envelope,
          extent => 4096,
          buffer => 64
        ) as geom,
        zg.code,
        zg.name
      from (
        select code, name, geom_3857 from geo.zone_geom_z6  where z < 8
        union all
        select code, name, geom_3857 from geo.zone_geom_z10 where z >= 8
      ) zg
      where zg.geom_3857 && _margin
    ) t
    where t.geom is not null
  ),
  cases_layer as (
    select st_asmvt(t, 'cases', 4096, 'geom') as mvt
    from (
      select distinct on (cc.admin2_code, cc.metric)
        st_asmvtgeom(
          st_centroid(a.geom_3857),
          _envelope,
          extent => 4096,
          buffer => 16
        ) as geom,
        cc.outbreak_id::text,
        cc.metric,
        cc.value,
        cc.as_of::text,
        cc.source_quote_id::text
      from public.case_counts cc
      join geo.admin2 a on a.code = cc.admin2_code
      join public.source_quotes sq on sq.id = cc.source_quote_id
      join public.documents d on d.id = sq.document_id
      join public.sources s on s.id = d.source_id
      where cc.superseded_by is null
        and cc.status = 'published'
        and s.license_tier not in ('display_only', 'excluded')
        and (p_outbreak is null or cc.outbreak_id = p_outbreak)
        and a.geom_3857 && _margin
      order by cc.admin2_code, cc.metric, cc.as_of desc
    ) t
    where t.geom is not null
  )
  select
    coalesce((select mvt from zones_layer), ''::bytea)
    || coalesce((select mvt from cases_layer), ''::bytea)
  into result;

  return result;
end;
$$;

commit;
