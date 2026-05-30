begin;

-- Autonomy flip (Phase 7): rows publish immediately by default.
-- escalation_class records which of the four escalation classes flagged the row (if any).
alter table public.case_counts
  alter column status set default 'published';

alter table public.case_counts
  add column if not exists escalation_class text
    check (escalation_class in (
      'anomaly',
      'conflict_unresolvable',
      'novel_pathogen_country',
      'substring_verify_fail'
    ));

commit;
