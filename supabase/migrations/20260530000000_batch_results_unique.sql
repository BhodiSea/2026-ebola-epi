begin;

-- Inngest replays the `persist-results` step on transient failure.
-- Without this constraint the step replay writes duplicate audit rows.
-- ON CONFLICT DO NOTHING in persistBatchResults keeps the insert idempotent.
alter table audit.batch_results
  add constraint batch_results_batch_custom_uniq unique (batch_id, custom_id);

commit;
