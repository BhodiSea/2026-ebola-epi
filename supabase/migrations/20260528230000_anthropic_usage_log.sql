begin;

-- Cost kill switch source table (backend.md §467).
-- Phase 7 wires a pg_net trigger that posts to Vercel Edge Config when
-- rolling 10-min spend exceeds a threshold.  This migration creates the table
-- so step.ai.wrap runs can append a row per Anthropic call immediately.
create table if not exists audit.anthropic_usage_log (
  id                          bigint generated always as identity primary key,
  extraction_run_id           uuid references audit.extraction_runs(id),
  model_id                    text not null,
  input_tokens                integer not null default 0,
  output_tokens               integer not null default 0,
  cache_read_input_tokens     integer not null default 0,
  cache_creation_input_tokens integer not null default 0,
  cost_usd                    numeric(10, 4),
  ts                          timestamptz not null default now()
);

create index if not exists anthropic_usage_log_ts_idx
  on audit.anthropic_usage_log (ts desc);

create index if not exists anthropic_usage_log_run_idx
  on audit.anthropic_usage_log (extraction_run_id);

-- Append-only: only service role may insert; no reads for anon/authenticated.
-- (audit schema USAGE is already revoked from anon/authenticated in init_schemas.)
alter table audit.anthropic_usage_log enable row level security;
revoke insert, update, delete on audit.anthropic_usage_log from authenticated, anon;

commit;
