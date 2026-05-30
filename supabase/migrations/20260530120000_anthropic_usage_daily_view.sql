begin;

-- public.anthropic_usage_log — thin wrapper over audit.anthropic_usage_log.
-- The underlying table uses column `ts`; this view aliases it to `logged_at`
-- so the Supabase JS client (which defaults to the public schema) and the
-- existing app code don't need to know about the audit schema.
-- security_invoker defaults to false (PG15+), so the view runs as the
-- postgres owner who has USAGE on the audit schema.
create or replace view public.anthropic_usage_log as
select
  id,
  extraction_run_id,
  model_id,
  input_tokens,
  output_tokens,
  cache_read_input_tokens,
  cache_creation_input_tokens,
  cost_usd,
  ts as logged_at
from audit.anthropic_usage_log;

revoke all on public.anthropic_usage_log from anon;
grant select on public.anthropic_usage_log to authenticated;

-- public.extraction_runs — read-only pass-through over audit.extraction_runs
-- so the /internal/cost page can count runs via the standard Supabase client.
create or replace view public.extraction_runs as
select * from audit.extraction_runs;

revoke all on public.extraction_runs from anon;
grant select on public.extraction_runs to authenticated;

-- public.anthropic_usage_daily — pre-aggregated daily spend, consumed by
-- the /internal/cost area chart component.
create or replace view public.anthropic_usage_daily as
select
  date_trunc('day', ts)::date as day,
  model_id,
  sum(cost_usd)::numeric(12, 6) as total_cost
from audit.anthropic_usage_log
group by 1, 2
order by 1 desc, 2;

revoke all on public.anthropic_usage_daily from anon;
grant select on public.anthropic_usage_daily to authenticated;

commit;
