begin;

-- ─── service_role: USAGE + table grants on audit schema ───────────────────────
-- init_schemas.sql revokes anon/authenticated from audit/geo but never grants
-- service_role. BYPASSRLS does NOT bypass schema or table privilege checks in
-- Postgres — it only skips RLS policies. Without these grants, Inngest workers
-- (which connect as service_role) get "permission denied for schema audit" on
-- every write to audit.extraction_runs or audit.agent_actions.
grant usage on schema audit to service_role;
grant all on all tables in schema audit to service_role;
grant all on all sequences in schema audit to service_role;
alter default privileges for role postgres in schema audit grant all on tables to service_role;
alter default privileges for role postgres in schema audit grant all on sequences to service_role;

-- ─── service_role: USAGE + table grants on geo schema ─────────────────────────
-- Phase 5 loads geo data and refreshes matviews via service_role.
-- Grant access now so the migration history is consistent and no emergency
-- grants are needed when geodata loading lands.
grant usage on schema geo to service_role;
grant all on all tables in schema geo to service_role;
alter default privileges for role postgres in schema geo grant all on tables to service_role;

-- ─── trigger: restrict to provenance-relevant columns only ────────────────────
-- The original trigger fired on ALL UPDATE operations, including embedding
-- updates. Phase 2 batch-writes embeddings for thousands of source_quotes;
-- each row-update would trigger a full-text SELECT on public.documents.
-- Restricting to UPDATE OF document_id, char_start, char_end, quote_text
-- eliminates the unnecessary I/O while preserving the provenance invariant.
drop trigger if exists source_quotes_verify_substring on public.source_quotes;
create trigger source_quotes_verify_substring
  before insert or update of document_id, char_start, char_end, quote_text
  on public.source_quotes
  for each row execute function public.tg_verify_quote_substring();

commit;
