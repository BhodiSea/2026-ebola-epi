begin;

create table if not exists audit.llm_traces (
  id uuid primary key default gen_random_uuid(),
  extraction_run_id uuid references audit.extraction_runs(id),
  trace_id text not null,
  span_id text not null,
  parent_span_id text,
  name text not null,
  agent_name text,
  model_id text,
  prompt_version_hash text,
  cache_read_input_tokens integer,
  cache_creation_input_tokens integer,
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  attributes jsonb not null default '{}'::jsonb
);

create index if not exists llm_traces_trace_id_idx on audit.llm_traces (trace_id);
create index if not exists llm_traces_started_at_idx on audit.llm_traces (started_at desc);

-- append-only: authenticated and anon roles cannot write or modify rows
revoke insert, update, delete on audit.llm_traces from authenticated, anon;

commit;
