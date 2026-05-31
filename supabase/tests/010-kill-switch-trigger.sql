begin;
select plan(7);

-- ── Fixture: source → document (extraction_run not needed; anthropic_usage_log.extraction_run_id is nullable)
with
  src as (
    insert into public.sources (id, slug, name, url, posture_terms, posture_attribution)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aa0000000010',
      'test-010-src',
      'Test 010 Source',
      'https://example.com/test-010',
      'Publicly licensed content for testing purposes.',
      'Test 010 Source'
    )
    returning id
  )
select id from src;

-- ── Structural checks ──────────────────────────────────────────────────────────

select ok(
  exists(
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'audit'
      and p.proname = 'tg_check_daily_spend'
  ),
  'audit.tg_check_daily_spend() function exists'
);

select ok(
  exists(
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'audit'
      and c.relname = 'anthropic_usage_log'
      and t.tgname = 'anthropic_usage_log_check_spend'
  ),
  'kill-switch trigger anthropic_usage_log_check_spend exists on audit.anthropic_usage_log'
);

-- Confirm the trigger sums on `ts` (not a non-existent `logged_at` column).
select matches(
  pg_get_functiondef('audit.tg_check_daily_spend()'::regprocedure),
  'ts >= current_date',
  'trigger function filters audit.anthropic_usage_log on ts >= current_date'
);

-- ── Fire path: cap = $0.01, EC settings absent so HTTP is skipped,
--               insert $1.00 → agent_actions row must be written. ────────────

-- Seed a tiny cap; omit EC URL/token so net.http_post is never called.
insert into private.settings (key, value)
values ('daily_anthropic_spend_cap', '0.01')
on conflict (key) do update set value = excluded.value;

-- Insert a usage row that exceeds the cap.
insert into audit.anthropic_usage_log (model_id, input_tokens, output_tokens, cost_usd)
values ('claude-sonnet-4-6', 1000, 100, 1.00);

select ok(
  exists(
    select 1
    from audit.agent_actions
    where agent  = 'kill-switch'
      and action = 'extraction_disabled'
  ),
  'kill-switch trigger writes agent_actions row when daily cap exceeded'
);

-- Note: net._http_response delivery is NOT asserted here — pg_net is
-- fire-and-forget and does not execute under a rolled-back transaction.

-- ── No-fire path: raise cap to $1000, spend is $1.00 → no new row ────────────

update private.settings set value = '1000' where key = 'daily_anthropic_spend_cap';

insert into audit.anthropic_usage_log (model_id, input_tokens, output_tokens, cost_usd)
values ('claude-sonnet-4-6', 100, 10, 0.01);

select is(
  (
    select count(*)::integer
    from audit.agent_actions
    where agent  = 'kill-switch'
      and action = 'extraction_disabled'
  ),
  1,  -- only the one row from the fire path above
  'kill-switch trigger does NOT write agent_actions when spend is below cap'
);

-- ── Flood guard: a second over-cap insert must NOT duplicate agent_actions ────
--    Lower the cap back below the running total ($1.01) so the trigger re-enters
--    the over-cap branch.  The existence guard must suppress the duplicate.

update private.settings set value = '0.50' where key = 'daily_anthropic_spend_cap';

insert into audit.anthropic_usage_log (model_id, input_tokens, output_tokens, cost_usd)
values ('claude-sonnet-4-6', 10, 5, 0.01);  -- total now $1.02 > $0.50 cap

select is(
  (
    select count(*)::integer
    from audit.agent_actions
    where agent  = 'kill-switch'
      and action = 'extraction_disabled'
  ),
  1,
  'kill-switch trigger does NOT add a second agent_actions row on repeated over-cap inserts (flood guard)'
);

-- ── Append-only: authenticated cannot tamper with anthropic_usage_log ─────────

set local role authenticated;
select throws_ok(
  $$ delete from audit.anthropic_usage_log $$,
  '42501',
  null,
  'authenticated cannot DELETE from audit.anthropic_usage_log'
);
reset role;

select * from finish();
rollback;
