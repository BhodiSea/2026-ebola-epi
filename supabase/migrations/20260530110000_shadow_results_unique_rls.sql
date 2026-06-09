begin;

set search_path = public, audit, private, pg_temp;

-- Unique index so (document_id, candidate_version) is an idempotency key.
-- Without this, onConflictDoNothing() in shadow-extraction.ts is a no-op.
create unique index if not exists shadow_results_doc_version_udx
  on audit.shadow_results (document_id, candidate_version);

-- SELECT policy: authenticated users can read their own shadow results.
-- The table had RLS enabled with no SELECT policy, making it unreadable.
drop policy if exists "shadow_results_select_authenticated" on audit.shadow_results;
create policy "shadow_results_select_authenticated"
  on audit.shadow_results
  for select
  to authenticated
  using ((select auth.uid()) is not null);

commit;
