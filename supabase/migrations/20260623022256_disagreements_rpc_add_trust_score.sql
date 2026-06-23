-- migration: disagreements_rpc_add_trust_score
-- description: Extend get_disagreements RPC to return trust_score so the UI can show source authority per side of a conflict
begin;

-- DROP first: CREATE OR REPLACE cannot change a function's return type.
drop function if exists public.get_disagreements(uuid);

create function public.get_disagreements(p_outbreak_id uuid)
returns table (
  row_id          uuid,
  metric          text,
  as_of           date,
  value           integer,
  source_slug     text,
  source_quote_id uuid,
  superseded_by   uuid,
  trust_score     numeric
)
language sql
stable
security definer
set search_path = public, audit, pg_temp
as $$
  with base as (
    select
      cc.id                                       as row_id,
      cc.metric,
      cc.as_of,
      cc.value,
      cc.source_quote_id,
      cc.superseded_by,
      s.id                                        as source_id,
      s.slug                                      as source_slug,
      s.trust_score                               as trust_score
    from public.case_counts cc
    join audit.extraction_runs er on er.id = cc.extraction_run_id
    join public.documents       d  on d.id  = er.document_id
    join public.sources         s  on s.id  = d.source_id
    where cc.outbreak_id = p_outbreak_id
      and cc.status = 'published'
  ),
  multi_source as (
    select metric, as_of
    from   base
    group  by metric, as_of
    having count(distinct source_id) > 1
  )
  select b.row_id, b.metric, b.as_of, b.value, b.source_slug,
         b.source_quote_id, b.superseded_by, b.trust_score
  from   base b
  join   multi_source ms using (metric, as_of)
  order  by b.metric, b.as_of desc, b.source_slug;
$$;

revoke all    on function public.get_disagreements(uuid) from public;
grant  execute on function public.get_disagreements(uuid) to anon, authenticated;

commit;
