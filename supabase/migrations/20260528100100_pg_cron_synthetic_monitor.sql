begin;

-- Operator must run once per environment before this cron job fires:
--   ALTER DATABASE postgres SET app.inngest_event_endpoint = 'https://inn.gs/e/<event-key>';
-- For local dev:
--   ALTER DATABASE postgres SET app.inngest_event_endpoint = 'http://localhost:8288/e/test-key';
-- Without this GUC, current_setting() throws and pg_cron silently records the failure.
select cron.schedule(
  'synthetic-monitor',
  '0 6 * * *',
  $$ select net.http_post(
       url  := current_setting('app.inngest_event_endpoint'),
       body := '{"name":"synthetic.check","data":{}}'::jsonb
     ) $$
);

commit;
