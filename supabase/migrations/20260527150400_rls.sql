begin;

-- ─── public.sources ───────────────────────────────────────────────────────────
alter table public.sources enable row level security;

drop policy if exists "sources_anon_select" on public.sources;
create policy "sources_anon_select"
  on public.sources for select
  to anon, authenticated
  using (true);

-- ─── public.documents ─────────────────────────────────────────────────────────
alter table public.documents enable row level security;

drop policy if exists "documents_anon_select" on public.documents;
create policy "documents_anon_select"
  on public.documents for select
  to anon, authenticated
  using (true);

-- ─── public.source_quotes ─────────────────────────────────────────────────────
alter table public.source_quotes enable row level security;

drop policy if exists "source_quotes_anon_select" on public.source_quotes;
create policy "source_quotes_anon_select"
  on public.source_quotes for select
  to anon, authenticated
  using (true);

-- ─── public.outbreaks ─────────────────────────────────────────────────────────
alter table public.outbreaks enable row level security;

drop policy if exists "outbreaks_anon_select" on public.outbreaks;
create policy "outbreaks_anon_select"
  on public.outbreaks for select
  to anon, authenticated
  using (true);

-- ─── public.case_counts ───────────────────────────────────────────────────────
alter table public.case_counts enable row level security;

-- Only published, non-superseded rows are visible to public consumers.
-- Phase 7 adds a researcher tier via auth.jwt() -> app_metadata -> tier.
drop policy if exists "case_counts_anon_select" on public.case_counts;
create policy "case_counts_anon_select"
  on public.case_counts for select
  to anon, authenticated
  using (superseded_by is null and status = 'published');

-- No INSERT/UPDATE/DELETE policies for anon/authenticated.
-- Service role (Inngest jobs) bypasses RLS.

-- B-tree indexes on RLS policy columns (required for plan performance)
create index if not exists case_counts_superseded_by_idx
  on public.case_counts (superseded_by);
create index if not exists case_counts_status_idx
  on public.case_counts (status);

commit;
