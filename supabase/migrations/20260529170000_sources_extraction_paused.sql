begin;

-- Kill-switch flag: when true the ingest Inngest function for this source skips
-- extraction steps (LLM calls) but still fetches and persists documents. Used by
-- the Phase 7 cost kill-switch mechanism.
alter table public.sources
  add column if not exists extraction_paused boolean not null default false;

commit;
