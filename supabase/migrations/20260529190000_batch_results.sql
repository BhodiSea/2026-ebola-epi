begin;

set search_path = public, audit, private, pg_temp;

create table if not exists audit.batch_results (
  id          uuid        primary key default gen_random_uuid(),
  batch_id    text        not null,
  custom_id   text        not null,
  document_id uuid        references public.documents(id),
  result      jsonb       not null,
  created_at  timestamptz not null default now()
);

create index if not exists batch_results_batch_idx
  on audit.batch_results (batch_id);

alter table audit.batch_results enable row level security;

-- Append-only: authenticated / anon cannot mutate rows.
-- Service role inserts via Inngest back-fill function (bypasses RLS by default).
revoke insert, update, delete on audit.batch_results from authenticated, anon;

commit;
