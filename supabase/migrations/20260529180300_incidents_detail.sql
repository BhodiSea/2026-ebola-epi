begin;

-- Phase 7: add payload columns to public.incidents so escalation rows are
-- self-contained for the editorial review UI.
--
-- detail    — structured anomaly / conflict / verify-fail data (class-specific JSON).
-- document_id — the document whose extraction triggered the incident (nullable
--               because class-1 novel-pair incidents fire at triage, before extraction).

alter table public.incidents
  add column if not exists detail jsonb not null default '{}'::jsonb,
  add column if not exists document_id uuid references public.documents(id);

comment on column public.incidents.detail is
  'Class-specific structured payload (anomaly signals, conflict hashes, etc.)';
comment on column public.incidents.document_id is
  'FK to the source document that triggered this incident; null for class-1 (novel pair) incidents.';

commit;
