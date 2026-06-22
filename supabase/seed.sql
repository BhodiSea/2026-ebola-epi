-- ─── Production seed ──────────────────────────────────────────────────────────
-- Sources, zones, and the canonical outbreak row. Safe to apply in any env.
-- Synthetic document/case_counts data lives in supabase/fixtures/dev-seed.sql.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.sources (id, slug, name, url, trust_score, license_tier, license_url, attribution_required, posture_terms, posture_attribution)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'who-don',
  'WHO Disease Outbreak News',
  'https://www.who.int/emergencies/disease-outbreak-news',
  1.00,
  'open',
  'https://www.who.int/about/policies/publishing/copyright',
  true,
  'WHO DON reports are published under the WHO Copyright Policy, which allows free reproduction with attribution for non-commercial purposes. Full text, case counts, and derived aggregates may be displayed.',
  '© World Health Organization'
) on conflict (slug) do nothing;

insert into public.sources (id, slug, name, url, trust_score, license_tier, license_url, attribution_required, posture_terms, posture_attribution)
values
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'who-afro',
   'WHO AFRO Situation Report',
   'https://www.afro.who.int/health-topics/disease-outbreaks',
   1.00,
   'open',
   'https://www.who.int/about/policies/publishing/copyright',
   true,
   'WHO AFRO situation reports are released as public documents. Reproduction with attribution is permitted for educational and public-health purposes.',
   '© WHO Regional Office for Africa'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'ecdc-cdtr',
   'ECDC Communicable Disease Threats Report',
   'https://www.ecdc.europa.eu/en/publications-data/communicable-disease-threats-report',
   0.90,
   'open',
   'https://www.ecdc.europa.eu/en/legal-notice',
   true,
   'ECDC publications are released under a custom open licence permitting reproduction with attribution. Derived statistics and quoted figures may be displayed.',
   '© European Centre for Disease Prevention and Control'),
  ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
   'africa-cdc',
   'Africa CDC Outbreak Brief',
   'https://africacdc.org/disease-outbreaks/',
   0.90,
   'open',
   'https://africacdc.org/terms-of-use',
   true,
   'Africa CDC outbreak briefs are released as public documents. Reproduction with attribution is permitted for public-health purposes.',
   '© Africa Centres for Disease Control and Prevention')
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
-- ICD-11 coded entity 1D60.2 (Bundibugyo virus disease at the disease level).
-- The MMS taxon code XN0AT must NOT be used here; 1D60.00 is also wrong.
insert into public.outbreaks (id, pathogen_icd11, pathogen_slug, country_iso3, onset_date, name, status, severity_level)
values (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  '1D60.2',
  'bundibugyo',
  'COD',
  '2026-04-20',
  'Bundibugyo virus disease — Ituri Province, DRC',
  'active',
  'emergency'
) on conflict (pathogen_icd11, country_iso3) do nothing;
