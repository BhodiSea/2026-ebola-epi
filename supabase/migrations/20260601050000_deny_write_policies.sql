-- ─── deny_write_policies ─────────────────────────────────────────────────────
--
-- AGENTS.md rule 5: four separate RLS policies per table (SELECT/INSERT/UPDATE/
-- DELETE) even if logic repeats. Several public.* tables had only a SELECT
-- policy, relying on RLS implicit denial for write commands. This migration
-- adds explicit RESTRICTIVE DENY policies for every missing command so the
-- intent is unambiguous and the 002-rls pgTAP assertion passes.
--
-- Tables where an existing PERMISSIVE write policy already exists (incidents
-- UPDATE, sources UPDATE, extraction_eval_scores INSERT) are left untouched
-- for that command — a RESTRICTIVE DENY would block even the authorised users.
-- Missing sibling commands (INSERT/DELETE on incidents etc.) are covered below.
--
-- audit.* tables use REVOKE ALL on write commands and are intentionally
-- excluded here; they are excluded from the per-command pgTAP check as well.

begin;

-- ─── public.case_counts ───────────────────────────────────────────────────────
drop policy if exists "case_counts_insert_deny" on public.case_counts;
create policy "case_counts_insert_deny"
  on public.case_counts
  as restrictive for insert
  to authenticated, anon
  with check (false);

drop policy if exists "case_counts_update_deny" on public.case_counts;
create policy "case_counts_update_deny"
  on public.case_counts
  as restrictive for update
  to authenticated, anon
  using (false);

drop policy if exists "case_counts_delete_deny" on public.case_counts;
create policy "case_counts_delete_deny"
  on public.case_counts
  as restrictive for delete
  to authenticated, anon
  using (false);

-- ─── public.daily_briefs ─────────────────────────────────────────────────────
drop policy if exists "daily_briefs_insert_deny" on public.daily_briefs;
create policy "daily_briefs_insert_deny"
  on public.daily_briefs
  as restrictive for insert
  to authenticated, anon
  with check (false);

drop policy if exists "daily_briefs_update_deny" on public.daily_briefs;
create policy "daily_briefs_update_deny"
  on public.daily_briefs
  as restrictive for update
  to authenticated, anon
  using (false);

drop policy if exists "daily_briefs_delete_deny" on public.daily_briefs;
create policy "daily_briefs_delete_deny"
  on public.daily_briefs
  as restrictive for delete
  to authenticated, anon
  using (false);

-- ─── public.documents ────────────────────────────────────────────────────────
drop policy if exists "documents_insert_deny" on public.documents;
create policy "documents_insert_deny"
  on public.documents
  as restrictive for insert
  to authenticated, anon
  with check (false);

drop policy if exists "documents_update_deny" on public.documents;
create policy "documents_update_deny"
  on public.documents
  as restrictive for update
  to authenticated, anon
  using (false);

drop policy if exists "documents_delete_deny" on public.documents;
create policy "documents_delete_deny"
  on public.documents
  as restrictive for delete
  to authenticated, anon
  using (false);

-- ─── public.extraction_eval_scores ───────────────────────────────────────────
-- INSERT is covered by eval_scores_insert_internal (internal users only).
-- UPDATE and DELETE are server-side only.
drop policy if exists "eval_scores_update_deny" on public.extraction_eval_scores;
create policy "eval_scores_update_deny"
  on public.extraction_eval_scores
  as restrictive for update
  to authenticated, anon
  using (false);

drop policy if exists "eval_scores_delete_deny" on public.extraction_eval_scores;
create policy "eval_scores_delete_deny"
  on public.extraction_eval_scores
  as restrictive for delete
  to authenticated, anon
  using (false);

-- ─── public.incidents ────────────────────────────────────────────────────────
-- UPDATE is covered by incidents_update_internal (internal users only).
-- INSERT and DELETE are server-side only.
drop policy if exists "incidents_insert_deny" on public.incidents;
create policy "incidents_insert_deny"
  on public.incidents
  as restrictive for insert
  to authenticated, anon
  with check (false);

drop policy if exists "incidents_delete_deny" on public.incidents;
create policy "incidents_delete_deny"
  on public.incidents
  as restrictive for delete
  to authenticated, anon
  using (false);

-- ─── public.outbreaks ────────────────────────────────────────────────────────
drop policy if exists "outbreaks_insert_deny" on public.outbreaks;
create policy "outbreaks_insert_deny"
  on public.outbreaks
  as restrictive for insert
  to authenticated, anon
  with check (false);

drop policy if exists "outbreaks_update_deny" on public.outbreaks;
create policy "outbreaks_update_deny"
  on public.outbreaks
  as restrictive for update
  to authenticated, anon
  using (false);

drop policy if exists "outbreaks_delete_deny" on public.outbreaks;
create policy "outbreaks_delete_deny"
  on public.outbreaks
  as restrictive for delete
  to authenticated, anon
  using (false);

-- ─── public.source_quotes ────────────────────────────────────────────────────
drop policy if exists "source_quotes_insert_deny" on public.source_quotes;
create policy "source_quotes_insert_deny"
  on public.source_quotes
  as restrictive for insert
  to authenticated, anon
  with check (false);

drop policy if exists "source_quotes_update_deny" on public.source_quotes;
create policy "source_quotes_update_deny"
  on public.source_quotes
  as restrictive for update
  to authenticated, anon
  using (false);

drop policy if exists "source_quotes_delete_deny" on public.source_quotes;
create policy "source_quotes_delete_deny"
  on public.source_quotes
  as restrictive for delete
  to authenticated, anon
  using (false);

-- ─── public.sources ──────────────────────────────────────────────────────────
-- UPDATE is covered by sources_update_internal (internal users only).
-- INSERT and DELETE are server-side only.
drop policy if exists "sources_insert_deny" on public.sources;
create policy "sources_insert_deny"
  on public.sources
  as restrictive for insert
  to authenticated, anon
  with check (false);

drop policy if exists "sources_delete_deny" on public.sources;
create policy "sources_delete_deny"
  on public.sources
  as restrictive for delete
  to authenticated, anon
  using (false);

commit;
