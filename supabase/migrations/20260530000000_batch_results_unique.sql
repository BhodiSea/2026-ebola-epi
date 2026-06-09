begin;

-- Inngest replays the `persist-results` step on transient failure.
-- Without this constraint the step replay writes duplicate audit rows.
-- ON CONFLICT DO NOTHING in persistBatchResults keeps the insert idempotent.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'batch_results_batch_custom_uniq'
      and conrelid = 'audit.batch_results'::regclass
  ) then
    alter table audit.batch_results
      add constraint batch_results_batch_custom_uniq unique (batch_id, custom_id);
  end if;
end $$;

commit;
