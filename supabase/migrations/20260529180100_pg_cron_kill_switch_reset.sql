begin;

set search_path = public, audit, private, pg_temp;

-- ─── audit.fn_reset_kill_switch() ─────────────────────────────────────────────
--
-- Called daily at 00:00 UTC by pg_cron to flip the Edge Config kill-switch back
-- to enabled and zero the spend ratio for the new UTC day.
--
-- No-ops gracefully when private.settings rows are absent (dev / staging).

create or replace function audit.fn_reset_kill_switch()
returns void
language plpgsql
security definer
set search_path = public, audit, private, pg_temp
as $$
declare
  v_ec_url    text;
  v_ec_token  text;
begin
  select value into v_ec_url   from private.settings where key = 'vercel_edge_config_update_url';
  select value into v_ec_token from private.settings where key = 'vercel_edge_config_token';

  if v_ec_url is null or v_ec_token is null then
    return;
  end if;

  -- Reset both flags atomically in one POST.
  perform net.http_post(
    url     := v_ec_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_ec_token,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object('key', 'extraction_enabled',     'value', true),
        jsonb_build_object('key', 'extraction_spend_ratio', 'value', '0')
      )
    )
  );

  insert into audit.agent_actions (agent, action, payload)
  values (
    'kill-switch',
    'daily_reset',
    jsonb_build_object('reset_at', now()::text)
  );
end;
$$;

-- Unschedule any prior registration before re-registering (idempotent).
select cron.unschedule('kill-switch-daily-reset')
where exists (
  select 1 from cron.job where jobname = 'kill-switch-daily-reset'
);

select cron.schedule(
  'kill-switch-daily-reset',
  '0 0 * * *',
  $cron$
    select audit.fn_reset_kill_switch();
  $cron$
);

commit;
