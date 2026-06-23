-- migration: dedupe_case_counts_backfill
-- description: Supersede duplicate case_counts rows produced by repeated back-fill runs
-- against the same document. For each duplicate cluster (same outbreak_id, as_of, metric,
-- admin scope, value) the earliest row (by created_at) is kept; all others have
-- superseded_by set to that canonical row's id. Addresses 10 identical confirmed=2 rows
-- for the Uganda outbreak at as_of=2026-05-22.
begin;

with ranked as (
  select
    id,
    created_at,
    row_number() over (
      partition by
        outbreak_id,
        as_of,
        metric,
        coalesce(admin_name, ''),
        coalesce(admin2_code, ''),
        value
      order by created_at asc
    ) as rn,
    first_value(id) over (
      partition by
        outbreak_id,
        as_of,
        metric,
        coalesce(admin_name, ''),
        coalesce(admin2_code, ''),
        value
      order by created_at asc
      rows between unbounded preceding and unbounded following
    ) as canonical_id
  from public.case_counts
  where status = 'published'
    and superseded_by is null
)
update public.case_counts cc
set superseded_by = ranked.canonical_id
from ranked
where cc.id = ranked.id
  and ranked.rn > 1
  and ranked.canonical_id != cc.id;

commit;
