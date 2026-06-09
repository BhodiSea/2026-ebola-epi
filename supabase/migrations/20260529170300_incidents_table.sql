begin;

-- Escalation-tracking table. An incident is opened when the pipeline encounters
-- a situation requiring human review: a novel pathogen/country pair, an
-- unresolvable cross-source conflict, a substring verification failure, or a
-- statistical anomaly. Human operators can snooze, acknowledge, or close them.
-- INSERT/UPDATE/DELETE are restricted to service_role (Inngest functions);
-- authenticated users may read; anon may not.

create table if not exists public.incidents (
  id             uuid        primary key default gen_random_uuid(),
  class          text        not null
                               check (class in (
                                 'novel_pathogen_country',
                                 'substring_verify_fail',
                                 'conflict_unresolvable',
                                 'anomaly'
                               )),
  outbreak_id    uuid        references public.outbreaks(id),
  thread_id      text,
  status         text        not null default 'open'
                               check (status in ('open', 'snoozed', 'acked', 'closed')),
  snoozed_until  timestamptz,
  ack_by         text,
  ack_at         timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.incidents enable row level security;

-- Authenticated users can read incidents for the editorial UI.
-- Use (select auth.uid()) to run the auth check as an InitPlan once per
-- statement rather than once per row (AGENTS.md rule 5).
drop policy if exists "incidents_select_authenticated" on public.incidents;
create policy "incidents_select_authenticated"
  on public.incidents
  for select
  to authenticated
  using ((select auth.uid()) is not null);

-- INSERT/UPDATE/DELETE: no policy → default-deny for anon and authenticated.
-- Service_role bypasses RLS and manages all writes.

-- Partial unique index: prevents duplicate open incidents for the same class +
-- outbreak. Only enforced when outbreak_id is non-null (NULL values are distinct
-- in Postgres unique indexes, so novel-pathogen escalations without an outbreak_id
-- yet assigned are not deduplicated by this index — handle in application logic).
create unique index if not exists incidents_open_class_outbreak_udx
  on public.incidents (class, outbreak_id)
  where status = 'open' and outbreak_id is not null;

commit;
