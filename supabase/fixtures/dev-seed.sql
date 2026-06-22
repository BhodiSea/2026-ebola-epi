-- ─── Dev-only fixture data ────────────────────────────────────────────────────
-- Synthetic Phase 4 + WP7 e2e case_counts for local UI development.
-- DO NOT apply to production. Run via: psql $LOCAL_DB < supabase/fixtures/dev-seed.sql
-- Production guard: aborts if app.env is not 'dev' or 'test'.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if coalesce(current_setting('app.env', true), '') not in ('dev', 'test') then
    raise exception 'dev-seed.sql must not be applied in env "%". Set app.env=dev to proceed.',
      coalesce(current_setting('app.env', true), '(unset)');
  end if;
end $$;

-- ─── Phase 4 seed data ────────────────────────────────────────────────────────
-- Realistic Bundibugyo outbreak in DRC Ituri Province for Phase 4 editorial
-- surfaces. All values are synthetic but consistent with the 2026 outbreak
-- scenario described in research/copy.md.

-- doc1 — WHO DON 603 (24 May 2026)
-- full_text designed so that quote offsets work with tg_verify_quote_substring:
--   "189 confirmed and 37 deaths" starts at char 0 (char_start=0, char_end=27)
--   "37 deaths" starts at char 18 (char_start=18, char_end=27)
insert into public.documents (id, source_id, sha256, url, title, full_text, published_at, ingested_at)
select
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  s.id,
  sha256(convert_to('189 confirmed and 37 deaths — WHO Disease Outbreak News 603.', 'UTF8')),
  'https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON603',
  'Disease Outbreak News — Bundibugyo Virus Disease, DRC (Update 3)',
  '189 confirmed and 37 deaths — WHO Disease Outbreak News 603.',
  '2026-05-24T12:00:00Z',
  '2026-05-24T12:05:00Z'
from public.sources s where s.slug = 'who-don'
on conflict (sha256) do nothing;

-- doc2 — WHO AFRO Sitrep 11 (10 May 2026)
-- full_text: "312 suspected cases as of 10 May 2026. WHO AFRO Sitrep 11."
insert into public.documents (id, source_id, sha256, url, title, full_text, published_at, ingested_at)
select
  'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  s.id,
  sha256(convert_to('312 suspected cases as of 10 May 2026. WHO AFRO Sitrep 11.', 'UTF8')),
  'https://www.afro.who.int/sitreps/bdbv-drc-2026-11',
  'Bundibugyo Virus Disease DRC — Situation Report 11',
  '312 suspected cases as of 10 May 2026. WHO AFRO Sitrep 11.',
  '2026-05-10T09:00:00Z',
  '2026-05-10T09:30:00Z'
from public.sources s where s.slug = 'who-afro'
on conflict (sha256) do nothing;

-- doc3 — WHO AFRO Sitrep 12 (22 May 2026)
insert into public.documents (id, source_id, sha256, url, title, full_text, published_at, ingested_at)
select
  'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  s.id,
  sha256(convert_to('347 suspected cases as of 22 May 2026. WHO AFRO Sitrep 12.', 'UTF8')),
  'https://www.afro.who.int/sitreps/bdbv-drc-2026-12',
  'Bundibugyo Virus Disease DRC — Situation Report 12',
  '347 suspected cases as of 22 May 2026. WHO AFRO Sitrep 12.',
  '2026-05-22T09:00:00Z',
  '2026-05-22T09:30:00Z'
from public.sources s where s.slug = 'who-afro'
on conflict (sha256) do nothing;

-- audit.extraction_runs — one run referenced by all Phase 4 case_counts
insert into audit.extraction_runs (
  id, document_id, model_id, prompt_version_hash, tool_schema_hash,
  schema_version, rows_extracted, rows_verified, started_at, ended_at
)
values (
  'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'claude-sonnet-4-6',
  'seed-v1-phase4',
  'seed-v1-phase4',
  '1',
  9,
  9,
  '2026-05-24T12:05:00Z',
  '2026-05-24T12:10:00Z'
) on conflict (document_id, prompt_version_hash) do nothing;

-- public.source_quotes
-- doc1 char positions:
--   pos 0-27 (0-indexed, exclusive end): "189 confirmed and 37 deaths"
--   pos 18-27:                            "37 deaths"
-- doc2 pos 0-19: "312 suspected cases"
-- doc3 pos 0-19: "347 suspected cases"
insert into public.source_quotes (id, document_id, char_start, char_end, quote_text)
values
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   0, 27,
   '189 confirmed and 37 deaths'),
  ('a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   18, 27,
   '37 deaths'),
  ('a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   0, 19,
   '312 suspected cases'),
  ('a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   0, 19,
   '347 suspected cases')
on conflict (id) do nothing;

-- public.case_counts — confirmed per zone (choropleth + stat totals)
-- All linked to quote1 (WHO DON 603 confirmed figure). status=published, no supersededBy.
insert into public.case_counts (
  id, outbreak_id, as_of, admin2_code, metric, value,
  source_quote_id, extraction_run_id, model_id, prompt_version_hash, status
)
values
  ('cc000000-0000-0000-0000-000000000001',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-24', 'COD-IT-IR', 'confirmed',  98,
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  ('cc000000-0000-0000-0000-000000000002',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-24', 'COD-IT-MB', 'confirmed',  45,
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  ('cc000000-0000-0000-0000-000000000003',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-24', 'COD-IT-BU', 'confirmed',  23,
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  ('cc000000-0000-0000-0000-000000000004',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-24', 'COD-IT-KO', 'confirmed',  15,
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  ('cc000000-0000-0000-0000-000000000005',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-24', 'COD-IT-MA', 'confirmed',   8,
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  ('cc000000-0000-0000-0000-000000000006',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-24', null, 'deaths', 37,
   'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  ('cc000000-0000-0000-0000-000000000007',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-10', null, 'suspected', 134,
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  ('cc000000-0000-0000-0000-000000000008',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-15', null, 'suspected', 312,
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  ('cc000000-0000-0000-0000-000000000009',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-22', null, 'suspected', 347,
   'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  ('cc000000-0000-0000-0000-00000000000a',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-24', null, 'confirmed', 189,
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published')
on conflict (id) do nothing;

-- ─── WP7 e2e seed additions ───────────────────────────────────────────────────
-- Africa CDC document — 24 May 2026 brief with a divergent confirmed count
insert into public.documents (id, source_id, sha256, url, title, full_text, published_at, ingested_at)
select
  'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  s.id,
  sha256(convert_to(
    '172 confirmed cases as of 24 May 2026. Africa CDC Outbreak Brief 4.',
    'UTF8'
  )),
  'https://africacdc.org/briefs/bdbv-drc-2026-04',
  'Africa CDC Outbreak Brief 4 — Bundibugyo Virus Disease, DRC',
  '172 confirmed cases as of 24 May 2026. Africa CDC Outbreak Brief 4.',
  '2026-05-24T10:00:00Z',
  '2026-05-24T11:00:00Z'
from public.sources s where s.slug = 'africa-cdc'
on conflict (sha256) do nothing;

insert into audit.extraction_runs (
  id, document_id, model_id, prompt_version_hash, tool_schema_hash,
  schema_version, rows_extracted, rows_verified, started_at, ended_at
)
values (
  'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'claude-sonnet-4-6',
  'seed-v1-africa-cdc',
  'seed-v1-africa-cdc',
  '1',
  1,
  1,
  '2026-05-24T11:00:00Z',
  '2026-05-24T11:02:00Z'
) on conflict (document_id, prompt_version_hash) do nothing;

insert into public.source_quotes (id, document_id, char_start, char_end, quote_text)
values (
  'a5eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  0, 19,
  '172 confirmed cases'
) on conflict (id) do nothing;

insert into public.case_counts (
  id, outbreak_id, as_of, admin2_code, metric, value,
  source_quote_id, extraction_run_id, model_id, prompt_version_hash,
  status, superseded_by
)
values (
  'cc000000-0000-0000-0000-000000000010',
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  '2026-05-24',
  null,
  'confirmed',
  172,
  'a5eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'claude-sonnet-4-6',
  'seed-v1-africa-cdc',
  'published',
  'cc000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

insert into public.incidents (id, class, outbreak_id, status, detail)
values (
  '11111111-1111-1111-1111-111111111111',
  'anomaly',
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'open',
  '{"metric": "confirmed", "z_score": 3.4}'::jsonb
) on conflict (id) do nothing;
