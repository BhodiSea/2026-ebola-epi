begin;

-- ─── public.zone_codes view ───────────────────────────────────────────────────
-- Exposes geo.admin2 (code, name, admin1_code) via the public PostgREST-exposed
-- schema. geo.* is restricted to service_role at the schema level; this view
-- runs as its owner (postgres, a superuser) and therefore can read geo.admin2
-- regardless of the caller's schema privileges.
--
-- Used by:
--   1. apps/web/app/sitemap.ts  — list all zone codes for the XML sitemap.
--      Replaces the broken `from("admin1")` call (admin1 is in geo, not public).
--   2. apps/web/app/api/search/route.ts — search zones by name.
--   3. apps/web/lib/queries/zones.ts   — listAdmin2Codes().
--
-- No RLS needed (views are not row-security-governed by default); the view
-- body already shows all rows without filtering — zone names are public info.

create or replace view public.zone_codes as
  select
    code,
    name,
    admin1_code
  from geo.admin2;

grant select on public.zone_codes to anon;
grant select on public.zone_codes to authenticated;

commit;
