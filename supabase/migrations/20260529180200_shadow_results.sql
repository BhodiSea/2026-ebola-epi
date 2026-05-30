begin;

set search_path = public, audit, private, pg_temp;

-- ─── audit.shadow_results ─────────────────────────────────────────────────────
--
-- Stores candidate extraction results from shadow-run (10% document sample).
-- Rows never touch public.case_counts; the nightly comparison script promotes
-- or discards based on field_variances threshold (≤5%).
--
-- Append-only: authenticated / anon cannot mutate rows.
-- Service role inserts via Inngest shadow-extraction function.

create table if not exists audit.shadow_results (
  id                  uuid        primary key default gen_random_uuid(),
  document_id         uuid        not null references public.documents(id),
  candidate_version   text        not null,
  production_run_id   uuid        references audit.extraction_runs(id),
  field_variances     jsonb       not null default '{}'::jsonb,
  promoted            boolean     not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists shadow_results_document_idx
  on audit.shadow_results (document_id);

create index if not exists shadow_results_created_idx
  on audit.shadow_results (created_at desc);

alter table audit.shadow_results enable row level security;

-- Append-only: block direct writes from authenticated / anon.
-- Service-role inserts bypass RLS by default (no policy needed).
revoke insert, update, delete on audit.shadow_results from authenticated, anon;

commit;
