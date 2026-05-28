begin;

-- ─── outbreaks: phase 4 editorial columns ────────────────────────────────────

alter table public.outbreaks
  add column if not exists pathogen_slug text,
  add column if not exists severity_level text
    check (severity_level in ('emergency', 'alert', 'warn', 'info'));

-- Partial unique index: the (slug, country, onset) triple must be unique
-- across non-null slugs, so the URL /outbreaks/[slug]/[iso3]/[date] resolves
-- to at most one outbreak. Null slugs are allowed for legacy rows.
create unique index if not exists outbreaks_slug_country_onset_udx
  on public.outbreaks (pathogen_slug, country_iso3, onset_date)
  where pathogen_slug is not null;

-- ─── documents: add title for sitrep feed and source detail pages ─────────────

alter table public.documents
  add column if not exists title text;

-- ─── public.outbreak_zone_svg RPC ─────────────────────────────────────────────
-- Returns admin2 geometries (as ST_AsSVG paths) joined to confirmed case totals
-- for an outbreak. Runs SECURITY DEFINER so anon/authenticated can query
-- geo.admin2 even though the geo schema USAGE is revoked from those roles.
-- search_path locked to prevent privilege escalation via schema injection.

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
set search_path = public, geo, pg_temp
as $$
  with confirmed_totals as (
    select
      cc.admin2_code,
      sum(cc.value)::int as total_value
    from public.case_counts cc
    where cc.outbreak_id = p_outbreak_id
      and cc.metric      = 'confirmed'
      and cc.superseded_by is null
      and cc.status      = 'published'
    group by cc.admin2_code
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

-- Revoke public EXECUTE (default) then grant only to roles that need it.
revoke all on function public.outbreak_zone_svg(uuid) from public;
grant execute on function public.outbreak_zone_svg(uuid) to anon, authenticated;

commit;
