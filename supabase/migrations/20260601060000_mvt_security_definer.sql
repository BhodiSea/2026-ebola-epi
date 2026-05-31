-- ─── mvt_security_definer ────────────────────────────────────────────────────
--
-- public.mvt was created as SECURITY INVOKER in 20260529130300_mvt_functions.sql.
-- When anon calls public.mvt, PostgreSQL inlines the function body and tries to
-- resolve internal.mvt in the anon role context, which fails because anon does
-- not have USAGE on the internal schema.
--
-- Changing to SECURITY DEFINER makes the function run as the function owner
-- (postgres), which has the necessary schema access. The function itself
-- enforces access control by filtering status = 'published' inside internal.mvt,
-- so no RLS bypass occurs.
--
-- set search_path is required when using SECURITY DEFINER to prevent function
-- hijacking via schema path manipulation.

begin;

create or replace function public.mvt(
  z           integer,
  x           integer,
  y           integer,
  outbreak_id uuid default null
) returns bytea
  language sql
  stable
  parallel safe
  security definer
  set search_path = internal, public, pg_catalog
as $$
  select internal.mvt(z, x, y, outbreak_id);
$$;

revoke all on function public.mvt(integer, integer, integer, uuid) from public;
grant execute on function public.mvt(integer, integer, integer, uuid)
  to anon, authenticated;

commit;
