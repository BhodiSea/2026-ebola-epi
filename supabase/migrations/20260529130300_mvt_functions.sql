begin;

-- ─── internal.mvt ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER in the non-exposed internal schema.
-- Uses pre-projected geom_3857 columns added in 20260529130000 to eliminate
-- per-tile ST_Transform (biggest single PostGIS tile-pipeline win).
-- Only columns the client renders are passed to ST_AsMVT — never SELECT *.

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
      select
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
      where cc.superseded_by is null
        and (p_outbreak is null or cc.outbreak_id = p_outbreak)
        and a.geom_3857 && _margin
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

revoke all on function internal.mvt(integer, integer, integer, uuid) from public;
grant execute on function internal.mvt(integer, integer, integer, uuid)
  to anon, authenticated;

-- ─── public.mvt ────────────────────────────────────────────────────────────────
-- PostgREST-visible SECURITY INVOKER wrapper.
-- anon/authenticated call this; internal.mvt does the actual work.

create or replace function public.mvt(
  z           integer,
  x           integer,
  y           integer,
  outbreak_id uuid default null
) returns bytea
  language sql
  stable
  parallel safe
  security invoker
as $$
  select internal.mvt(z, x, y, outbreak_id);
$$;

revoke all on function public.mvt(integer, integer, integer, uuid) from public;
grant execute on function public.mvt(integer, integer, integer, uuid)
  to anon, authenticated;

commit;
