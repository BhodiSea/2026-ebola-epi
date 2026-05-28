insert into public.sources (id, slug, name, url, trust_score, license_tier, license_url, attribution_required)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'who-don',
  'WHO Disease Outbreak News',
  'https://www.who.int/emergencies/disease-outbreak-news',
  1.00,
  'open',
  'https://www.who.int/about/policies/publishing/copyright',
  true
) on conflict (slug) do nothing;

-- ─── Phase 4 seed data ────────────────────────────────────────────────────────
-- Seed a realistic Bundibugyo outbreak in DRC Ituri Province for Phase 4 editorial
-- surfaces. All values are synthetic but consistent with the 2026 outbreak
-- scenario described in research/copy.md.

-- Additional sources
insert into public.sources (id, slug, name, url, trust_score, license_tier, license_url, attribution_required)
values
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'who-afro',
   'WHO AFRO Situation Report',
   'https://www.afro.who.int/health-topics/disease-outbreaks',
   1.00,
   'open',
   'https://www.who.int/about/policies/publishing/copyright',
   true),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'ecdc',
   'ECDC Communicable Disease Threats Report',
   'https://www.ecdc.europa.eu/en/publications-data/communicable-disease-threats-report',
   0.95,
   'open',
   'https://www.ecdc.europa.eu/en/legal-notice',
   true)
on conflict (slug) do nothing;

-- geo.admin1 — Ituri Province, DRC (simplified bbox polygon)
insert into geo.admin1 (code, name, country_iso3, geom)
values (
  'COD-IT',
  'Ituri',
  'COD',
  ST_GeomFromText(
    'MULTIPOLYGON(((27.5 0.5, 31.5 0.5, 31.5 3.0, 27.5 3.0, 27.5 0.5)))',
    4326
  )
) on conflict (code) do nothing;

-- geo.admin2 — five health zones in Ituri (simplified bbox polygons)
insert into geo.admin2 (code, name, admin1_code, geom)
values
  ('COD-IT-IR',
   'Irumu',
   'COD-IT',
   ST_GeomFromText(
     'MULTIPOLYGON(((29.5 1.2, 30.0 1.2, 30.0 1.7, 29.5 1.7, 29.5 1.2)))',
     4326
   )),
  ('COD-IT-MB',
   'Mambasa',
   'COD-IT',
   ST_GeomFromText(
     'MULTIPOLYGON(((28.2 1.1, 29.0 1.1, 29.0 1.6, 28.2 1.6, 28.2 1.1)))',
     4326
   )),
  ('COD-IT-BU',
   'Bunia',
   'COD-IT',
   ST_GeomFromText(
     'MULTIPOLYGON(((30.0 1.4, 30.5 1.4, 30.5 1.8, 30.0 1.8, 30.0 1.4)))',
     4326
   )),
  ('COD-IT-KO',
   'Komanda',
   'COD-IT',
   ST_GeomFromText(
     'MULTIPOLYGON(((29.4 1.7, 30.0 1.7, 30.0 2.2, 29.4 2.2, 29.4 1.7)))',
     4326
   )),
  ('COD-IT-MA',
   'Mahagi',
   'COD-IT',
   ST_GeomFromText(
     'MULTIPOLYGON(((30.7 2.0, 31.1 2.0, 31.1 2.5, 30.7 2.5, 30.7 2.0)))',
     4326
   ))
on conflict (code) do nothing;

-- public.outbreaks — Bundibugyo virus disease, 2026, DRC Ituri
insert into public.outbreaks (id, pathogen_icd11, pathogen_slug, country_iso3, onset_date, name, status, severity_level)
values (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  '1D60.00',
  'bundibugyo',
  'COD',
  '2026-04-20',
  'Bundibugyo virus disease — Ituri Province, DRC',
  'active',
  'emergency'
) on conflict (pathogen_icd11, country_iso3, onset_date) do nothing;

-- Documents:
-- doc1 — WHO DON 603 (24 May 2026)
-- full_text designed so that quote offsets work with tg_verify_quote_substring:
--   "189 confirmed and 37 deaths" starts at char 0 (char_start=0, char_end=27)
--   "37 deaths" starts at char 18 (char_start=18, char_end=27)
insert into public.documents (id, source_id, sha256, url, title, full_text, published_at, ingested_at)
values (
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  sha256(convert_to(
    '189 confirmed and 37 deaths as of 24 May 2026. WHO Disease Outbreak News 603.',
    'UTF8'
  )),
  'https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON603',
  'WHO DON 603 — Bundibugyo virus disease in the Democratic Republic of the Congo',
  '189 confirmed and 37 deaths as of 24 May 2026. WHO Disease Outbreak News 603.',
  '2026-05-24T12:00:00Z',
  '2026-05-24T13:00:00Z'
) on conflict (sha256) do nothing;

-- doc2 — AFRO Sitrep 11 (15 May 2026)
-- "312 suspected cases" starts at char 0 (char_start=0, char_end=19)
insert into public.documents (id, source_id, sha256, url, title, full_text, published_at, ingested_at)
values (
  'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  sha256(convert_to(
    '312 suspected cases as of 15 May 2026. AFRO Sitrep 11. Five health zones affected in Ituri Province.',
    'UTF8'
  )),
  'https://www.afro.who.int/publications/sitrep-bvd-drc-11',
  'AFRO Situation Report 11 — Bundibugyo Virus Disease, DRC',
  '312 suspected cases as of 15 May 2026. AFRO Sitrep 11. Five health zones affected in Ituri Province.',
  '2026-05-15T08:00:00Z',
  '2026-05-15T09:00:00Z'
) on conflict (sha256) do nothing;

-- doc3 — AFRO Sitrep 12 (22 May 2026)
-- "347 suspected cases" starts at char 0 (char_start=0, char_end=19)
insert into public.documents (id, source_id, sha256, url, title, full_text, published_at, ingested_at)
values (
  'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  sha256(convert_to(
    '347 suspected cases as of 22 May 2026. AFRO Sitrep 12. Mambasa health zone newly reported.',
    'UTF8'
  )),
  'https://www.afro.who.int/publications/sitrep-bvd-drc-12',
  'AFRO Situation Report 12 — Bundibugyo Virus Disease, DRC',
  '347 suspected cases as of 22 May 2026. AFRO Sitrep 12. Mambasa health zone newly reported.',
  '2026-05-22T08:00:00Z',
  '2026-05-22T09:00:00Z'
) on conflict (sha256) do nothing;

-- audit.extraction_runs — one run referenced by all case_counts
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
  '2026-05-24T13:00:00Z',
  '2026-05-24T13:05:00Z'
) on conflict (document_id, prompt_version_hash) do nothing;

-- public.source_quotes — quotes for provenance chain.
-- Trigger tg_verify_quote_substring checks: substring(full_text from char_start+1 for char_end-char_start) = quote_text.
-- doc1 char positions:
--   pos 0-26 (0-indexed, inclusive): "189 confirmed and 37 deaths"  → char_start=0, char_end=27
--   pos 18-26:                        "37 deaths"                    → char_start=18, char_end=27
-- doc2 pos 0-18: "312 suspected cases"  → char_start=0, char_end=19
-- doc3 pos 0-18: "347 suspected cases"  → char_start=0, char_end=19
insert into public.source_quotes (id, document_id, char_start, char_end, quote_text)
values
  -- quote1: confirmed+deaths total from WHO DON 603
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   0, 27,
   '189 confirmed and 37 deaths'),
  -- quote2: deaths total from WHO DON 603
  ('a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   18, 27,
   '37 deaths'),
  -- quote3: suspected total from AFRO Sitrep 11
  ('a3eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   0, 19,
   '312 suspected cases'),
  -- quote4: suspected total from AFRO Sitrep 12
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
  -- confirmed per zone, 2026-05-24 (current state for choropleth + StatCard)
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
  -- deaths (national aggregate, no admin2_code) — quote2
  ('cc000000-0000-0000-0000-000000000006',
   'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '2026-05-24', null, 'deaths', 37,
   'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published'),
  -- suspected totals for sparkline (historical dates, no admin2 breakdown)
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
   'claude-sonnet-4-6', 'seed-v1-phase4', 'published')
on conflict (id) do nothing;
