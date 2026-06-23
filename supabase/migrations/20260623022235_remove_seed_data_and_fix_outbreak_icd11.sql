-- migration: remove_seed_data_and_fix_outbreak_icd11
-- description: Purge synthetic seed rows from case_counts/source_quotes/documents/extraction_runs
--   and correct the Bundibugyo outbreak pathogen_icd11 from the erroneous '1D60.00' to '1D60.2'.
--   The wrong code caused isNovelPair() to always return true, trapping every Bundibugyo document
--   in the 7-day escalation waitForEvent and preventing all real extractions from completing.
begin;

-- 1. Remove synthetic case_counts first (references source_quotes and extraction_runs).
--    Matches both Phase 4 seed tag and the WP7 Africa CDC seed tag.
delete from public.case_counts
where prompt_version_hash in ('seed-v1-phase4', 'seed-v1-africa-cdc');

-- 2. Remove synthetic source_quotes (references documents).
--    Only the four well-known seed UUIDs; avoids touching any live quote rows.
delete from public.source_quotes
where id in (
  'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'a5eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
);

-- 3. Remove synthetic extraction_runs (references documents).
delete from audit.extraction_runs
where prompt_version_hash in ('seed-v1-phase4', 'seed-v1-africa-cdc');

-- 4. Remove synthetic documents (no remaining FK dependencies after steps 1–3).
delete from public.documents
where id in (
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
);

-- 5. Remove the synthetic incident (WP7 anomaly fixture).
delete from public.incidents
where id = '11111111-1111-1111-1111-111111111111';

-- 6. Fix the Bundibugyo/COD outbreak ICD-11 code.
--    '1D60.00' is not a valid ICD-11 coded entity; the correct disease-level code is '1D60.2'.
--    The wrong code caused every triage call to see a mismatch in isNovelPair(), treating all
--    incoming Bundibugyo documents as novel pairs and holding them in the 7-day escalation queue.
update public.outbreaks
set pathogen_icd11 = '1D60.2'
where pathogen_icd11 = '1D60.00'
  and country_iso3   = 'COD';

commit;
