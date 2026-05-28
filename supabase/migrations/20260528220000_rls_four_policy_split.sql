begin;

-- Split combined "for select to anon, authenticated" policies into one policy per role.
-- AGENTS.md rule 5: four separate policies (SELECT, INSERT, UPDATE, DELETE) even if
-- logic repeats, so the RLS audit log is greppable per (action, role).
-- INSERT/UPDATE/DELETE remain default-deny (no policy = blocked) for anon + authenticated.

-- ─── public.sources ───────────────────────────────────────────────────────────
drop policy if exists "sources_anon_select" on public.sources;

create policy "sources_select_anon"
  on public.sources for select to anon
  using (true);

create policy "sources_select_authenticated"
  on public.sources for select to authenticated
  using (true);

-- ─── public.documents ─────────────────────────────────────────────────────────
drop policy if exists "documents_anon_select" on public.documents;

create policy "documents_select_anon"
  on public.documents for select to anon
  using (true);

create policy "documents_select_authenticated"
  on public.documents for select to authenticated
  using (true);

-- ─── public.source_quotes ─────────────────────────────────────────────────────
drop policy if exists "source_quotes_anon_select" on public.source_quotes;

create policy "source_quotes_select_anon"
  on public.source_quotes for select to anon
  using (true);

create policy "source_quotes_select_authenticated"
  on public.source_quotes for select to authenticated
  using (true);

-- ─── public.outbreaks ─────────────────────────────────────────────────────────
drop policy if exists "outbreaks_anon_select" on public.outbreaks;

create policy "outbreaks_select_anon"
  on public.outbreaks for select to anon
  using (true);

create policy "outbreaks_select_authenticated"
  on public.outbreaks for select to authenticated
  using (true);

-- ─── public.case_counts ───────────────────────────────────────────────────────
drop policy if exists "case_counts_anon_select" on public.case_counts;

create policy "case_counts_select_anon"
  on public.case_counts for select to anon
  using (superseded_by is null and status = 'published');

create policy "case_counts_select_authenticated"
  on public.case_counts for select to authenticated
  using (superseded_by is null and status = 'published');

commit;
