begin;

create or replace view public.anthropic_usage_daily as
select
  date_trunc('day', logged_at)::date as day,
  model_id,
  sum(cost_usd)::numeric(12, 6) as total_cost
from public.anthropic_usage_log
group by 1, 2
order by 1 desc, 2;

commit;
