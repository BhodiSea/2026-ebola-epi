begin;

-- Two fixes to the outbreak_zone_svg choropleth RPC (red-team Phase 5):
--
-- 1. Latest-snapshot-per-zone, not SUM across dates. case_counts.value is a CUMULATIVE
--    restatement per (as_of), so summing the confirmed rows of one zone across multiple sitrep
--    dates inflates the per-zone total without bound. Take the latest as_of per zone instead.
--    (No behavioral change for single-date seed data; fixes the multi-sitrep steady state.)
--
-- 2. License filter (hard rule 14). Exclude `excluded` sources entirely. `display_only` is
--    permitted here because the choropleth is a rendered overlay with attribution (not an
--    export and not a redistributed raster — see the MVT tile filter for the stricter case).
--
-- search_path includes `extensions` so the PostGIS functions (st_assvg, st_xmin, …) resolve
-- whether PostGIS is installed in `public` or `extensions`.

create or replace function public.outbreak_zone_svg(p_outbreak_id uuid)
returns table (
  admin2_code   text,
  name          text,
  svg_path      text,
  total_value   integer,
  bbox_xmin     double precision,
  bbox_xmax     double precision,
  bbox_ymin     double precision,
  bbox_ymax     double precision
)
language sql
stable
security definer
set search_path = public, geo, extensions, pg_temp
as $$
  with confirmed_totals as (
    select distinct on (cc.admin2_code)
      cc.admin2_code,
      cc.value as total_value
    from public.case_counts cc
    join public.source_quotes sq on sq.id = cc.source_quote_id
    join public.documents d on d.id = sq.document_id
    join public.sources s on s.id = d.source_id
    where cc.outbreak_id = p_outbreak_id
      and cc.metric      = 'confirmed'
      and cc.superseded_by is null
      and cc.status      = 'published'
      and s.license_tier <> 'excluded'
    order by cc.admin2_code, cc.as_of desc
  ),
  outbreak_country as (
    select o.country_iso3
    from public.outbreaks o
    where o.id = p_outbreak_id
  )
  select
    a.code                                   as admin2_code,
    a.name                                   as name,
    st_assvg(a.geom, 0, 5)                   as svg_path,
    coalesce(ct.total_value, 0)              as total_value,
    st_xmin(a.geom::box2d)::double precision as bbox_xmin,
    st_xmax(a.geom::box2d)::double precision as bbox_xmax,
    st_ymin(a.geom::box2d)::double precision as bbox_ymin,
    st_ymax(a.geom::box2d)::double precision as bbox_ymax
  from geo.admin2 a
  join geo.admin1 a1
    on a1.code = a.admin1_code
  join outbreak_country oc
    on a1.country_iso3 = oc.country_iso3
  left join confirmed_totals ct
    on ct.admin2_code = a.code;
$$;

commit;
