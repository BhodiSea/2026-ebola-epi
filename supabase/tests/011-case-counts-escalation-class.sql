-- pgTAP: Phase 7 autonomy flip — case_counts.escalation_class column + status default

begin;
select plan(3);

select has_column(
  'public', 'case_counts', 'escalation_class',
  'case_counts.escalation_class column exists (phase7 autonomy flip)'
);

select col_is_null(
  'public', 'case_counts', 'escalation_class',
  'escalation_class is nullable (most rows are published without escalation)'
);

select col_default_is(
  'public', 'case_counts', 'status', 'published',
  'case_counts.status default is ''published'' after autonomy flip'
);

select * from finish();
rollback;
