begin;

-- ─── public.quote_custody view ────────────────────────────────────────────────
-- Provides per-quote chain-of-custody metadata for the evidence page and the
-- source-quote drawer. Joins public.source_quotes → public.case_counts →
-- audit.extraction_runs and checks public.incidents for open anomalies.
--
-- Because this view accesses the audit schema (USAGE revoked from anon/authenticated),
-- it runs as its owner (postgres) — the default for views is effectively
-- "security definer" for table access. The WHERE clause in this view has no
-- user-specific filter; RLS on the underlying audit tables is bypassed by the
-- view owner's superuser privileges (same pattern as public.agent_actions view).
--
-- This is safe: the columns exposed are metadata only (timestamps, ratios) — no
-- PHI, no full_text, no embedding vectors.
--
-- Columns:
--   quote_id      — the source_quote this row describes.
--   reviewed_at   — timestamp when the extraction run that produced this quote
--                   completed (extraction_runs.ended_at). Null for seed/legacy quotes.
--   anomaly_open  — true if any open incident is linked to the quote's document.
--   confidence    — rows_verified / rows_extracted for the producing run (0–1).
--                   Null when the run has no extracted rows (seed data).
--
-- Usage: one row per unique source_quote. DISTINCT ON eliminates the case where
-- one quote anchors multiple published case_counts rows.

create or replace view public.quote_custody as
select distinct on (sq.id)
  sq.id                                   as quote_id,
  er.ended_at                             as reviewed_at,
  exists (
    select 1
    from public.incidents i
    where i.document_id = sq.document_id
      and i.status = 'open'
  )                                       as anomaly_open,
  case
    when er.rows_extracted is not null and er.rows_extracted > 0
      then (er.rows_verified::numeric / er.rows_extracted::numeric)
    else null
  end                                     as confidence
from public.source_quotes sq
left join public.case_counts cc
  on cc.source_quote_id = sq.id
  and cc.status = 'published'
  and cc.superseded_by is null
left join audit.extraction_runs er
  on er.id = cc.extraction_run_id
order by sq.id, er.ended_at desc nulls last;

grant select on public.quote_custody to anon;
grant select on public.quote_custody to authenticated;

commit;
