begin;

-- Add lifecycle and observability columns to audit.extraction_runs.
-- Pre-fix: all 65 existing rows have ended_at = NULL and no status column,
-- making it impossible to distinguish a successful run from a crash or skip.

alter table audit.extraction_runs
  add column if not exists status text not null default 'running'
    constraint extraction_runs_status_check
      check (status in ('running', 'succeeded', 'failed', 'skipped')),
  add column if not exists error_message text,
  add column if not exists error_class text,
  add column if not exists dropped_rows integer not null default 0,
  add column if not exists model_id_resolved text;

-- Backfill historical rows: rows_extracted > 0 → succeeded, else → failed.
-- ended_at estimated as started_at + 1 minute for historical runs that never
-- closed because the UPDATE code path did not exist.
update audit.extraction_runs
set
  ended_at = started_at + interval '1 minute',
  status = case
    when rows_extracted > 0 then 'succeeded'
    else 'failed'
  end
where ended_at is null;

commit;
