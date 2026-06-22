begin;

-- Tighten incidents SELECT policy: only internal users (admin/staff) may read.
-- Previously any authenticated user could read all incidents rows.
-- private.is_internal_user() checks app_metadata.role in ('admin','staff').
-- Wrap in (select …) to force an InitPlan (once per statement, not per row).

drop policy if exists "incidents_select_authenticated" on public.incidents;

create policy "incidents_select_internal"
  on public.incidents
  for select
  to authenticated
  using ((select private.is_internal_user()));

commit;
