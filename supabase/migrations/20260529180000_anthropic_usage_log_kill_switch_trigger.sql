begin;

set search_path = public, audit, private, pg_temp;

-- ─── audit.tg_check_daily_spend() ─────────────────────────────────────────────
--
-- AFTER INSERT trigger on audit.anthropic_usage_log.
-- On each new usage row:
--   1. Reads daily_anthropic_spend_cap from private.settings (no GUC — superuser-only on Supabase).
--   2. Sums cost_usd WHERE ts >= current_date (C1: column is ts, not logged_at).
--   3. Computes ratio = total / cap.
--   4. POSTs ratio upsert to Vercel Edge Config (fire-and-forget via pg_net).
--   5. When total > cap: POSTs extraction_enabled=false + inserts audit.agent_actions row.
--
-- Operator seed required in private.settings:
--   daily_anthropic_spend_cap        — numeric string, e.g. '50.00' (USD)
--   vercel_edge_config_update_url    — Vercel Items endpoint or internal relay URL
--   vercel_edge_config_token         — bearer token for that URL
--
-- HTTP calls are guarded: skipped gracefully when URL/token settings absent.
-- pg_net is fire-and-forget; delivery is not asserted.

create or replace function audit.tg_check_daily_spend()
returns trigger
language plpgsql
security definer
set search_path = public, audit, private, pg_temp
as $$
declare
  v_cap_str   text;
  v_cap       numeric;
  v_total     numeric;
  v_ratio     numeric;
  v_ec_url    text;
  v_ec_token  text;
begin
  -- 1. Read cap; pass through silently when unconfigured.
  select value into v_cap_str
  from private.settings
  where key = 'daily_anthropic_spend_cap';

  if v_cap_str is null then
    return new;
  end if;

  v_cap := v_cap_str::numeric;

  -- 2. Sum today's cost (ts >= current_date — guards correct column name C1).
  select coalesce(sum(cost_usd), 0) into v_total
  from audit.anthropic_usage_log
  where ts >= current_date;

  -- 3. Compute spend ratio (guard zero-cap).
  v_ratio := case when v_cap > 0 then v_total / v_cap else 0 end;

  -- 4. Read EC credentials.
  select value into v_ec_url   from private.settings where key = 'vercel_edge_config_update_url';
  select value into v_ec_token from private.settings where key = 'vercel_edge_config_token';

  -- 5. Upsert spend ratio to Edge Config on every insert (operational dashboard).
  if v_ec_url is not null and v_ec_token is not null then
    perform net.http_post(
      url     := v_ec_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_ec_token,
        'Content-Type',  'application/json'
      ),
      body    := jsonb_build_object(
        'items', jsonb_build_array(
          jsonb_build_object('key', 'extraction_spend_ratio', 'value', v_ratio::text)
        )
      )
    );
  end if;

  -- 6. Over cap: flip kill-switch + record in agent_actions.
  --    Existence guard: skip when already fired today so concurrent/subsequent
  --    inserts don't flood agent_actions or hammer the Edge Config API.
  if v_total > v_cap then
    if not exists (
      select 1 from audit.agent_actions
      where agent  = 'kill-switch'
        and action = 'extraction_disabled'
        and ts     >= current_date
    ) then
      if v_ec_url is not null and v_ec_token is not null then
        perform net.http_post(
          url     := v_ec_url,
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_ec_token,
            'Content-Type',  'application/json'
          ),
          body    := jsonb_build_object(
            'items', jsonb_build_array(
              jsonb_build_object('key', 'extraction_enabled', 'value', false)
            )
          )
        );
      end if;

      insert into audit.agent_actions (agent, action, payload)
      values (
        'kill-switch',
        'extraction_disabled',
        jsonb_build_object(
          'total_usd', v_total,
          'cap_usd',   v_cap,
          'ratio',     v_ratio
        )
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace trigger anthropic_usage_log_check_spend
  after insert on audit.anthropic_usage_log
  for each row
  execute function audit.tg_check_daily_spend();

commit;
