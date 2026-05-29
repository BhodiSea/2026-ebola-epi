begin;

-- Prevent a case_counts row from superseding itself. The reconciliation agent
-- must always produce winner_id != loser_id; this constraint is the DB-level
-- backstop enforced regardless of application logic.
-- Required by pgTAP test 007-superseded-by.sql (throws_ok on self-reference).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'case_counts_no_self_supersede'
      and conrelid = 'public.case_counts'::regclass
  ) then
    alter table public.case_counts
      add constraint case_counts_no_self_supersede
        check (superseded_by is null or superseded_by <> id);
  end if;
end $$;

commit;
