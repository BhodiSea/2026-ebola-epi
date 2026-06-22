begin;

-- health.go.ug unreachable as of 2026-06-22 (TLS cert error on apex domain,
-- ECONNREFUSED on www subdomain). Pause to suppress repeated ingest_failed rows
-- while the audit trail still emits ingest_skipped_paused via ingest-runner.ts.
-- Re-enable: update public.sources set extraction_paused = false where slug = 'uganda-moh';
update public.sources
set extraction_paused = true
where slug = 'uganda-moh';

commit;
