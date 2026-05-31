begin;

-- ─── sources: parser-tracking columns ────────────────────────────────────────
-- last_fetched_at: timestamp of the most recent successful ingest run.
-- parser_version: semver string of the parser module version that produced
--   the most recent documents for this source.
alter table public.sources
  add column if not exists last_fetched_at  timestamptz,
  add column if not exists parser_version   text;

-- ─── public.sources_with_health ──────────────────────────────────────────────
-- View over public.sources enriched with a 7-day failure count. A "failure" is
-- an extraction run that produced zero rows for a source's documents in the
-- last 7 days. The view owner (postgres) can reach audit.extraction_runs even
-- though authenticated clients cannot — same pattern as public.agent_actions.
create or replace view public.sources_with_health as
  select
    s.id,
    s.slug,
    s.name,
    s.last_fetched_at,
    s.parser_version,
    s.extraction_paused,
    s.license_tier,
    coalesce(
      (
        select count(*)::int
        from audit.extraction_runs er
        join public.documents d on d.id = er.document_id
        where d.source_id = s.id
          and er.created_at >= now() - interval '7 days'
          and er.rows_extracted = 0
      ),
      0
    ) as failure_count_7d
  from public.sources s;

revoke all on public.sources_with_health from anon, public;
grant select on public.sources_with_health to authenticated;

commit;
