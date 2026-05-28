begin;

-- private.settings: key/value store for operator config that pg_cron jobs need.
-- Replaces the GUC approach (ALTER DATABASE SET app.* requires superuser, unavailable on Supabase).
create schema if not exists private;

create table if not exists private.settings (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);

-- Not exposed via PostgREST (private schema). No RLS needed.

-- Replace the GUC-dependent cron job with a table lookup.
select cron.unschedule('synthetic-monitor');

select cron.schedule(
  'synthetic-monitor',
  '0 6 * * *',
  $cron$
    select net.http_post(
      url  := (select value from private.settings where key = 'inngest_event_endpoint'),
      body := '{"name":"synthetic.check","data":{}}'::jsonb
    )
    where exists (select 1 from private.settings where key = 'inngest_event_endpoint')
  $cron$
);

commit;
