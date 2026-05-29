begin;

-- ─── Phase 6 source roster ────────────────────────────────────────────────────
-- Adds the per-document columns that inherit from sources.license_tier at ingest
-- time, then upserts trust_score + license_tier + license_url for every source
-- in the Phase 6 roster. Sources that were already seeded (who-don, who-afro)
-- are updated; all others are inserted. The on conflict clause is idempotent so
-- this migration is safe to re-run.

-- ─── Rename legacy 'ecdc' slug to 'ecdc-cdtr' ─────────────────────────────────
-- The seed.sql originally used 'ecdc'; the canonical Phase 6 slug is 'ecdc-cdtr'.
-- UPDATE is a no-op on fresh installs where the row doesn't exist yet.
update public.sources
  set slug = 'ecdc-cdtr',
      name = 'ECDC Communicable Disease Threats Report',
      trust_score = 0.90,
      license_tier = 'open',
      license_url = 'https://www.ecdc.europa.eu/en/legal-notice',
      attribution_required = true
  where slug = 'ecdc';

-- ─── Upsert full Phase 6 roster ───────────────────────────────────────────────
insert into public.sources (slug, name, url, trust_score, license_tier, license_url, attribution_required, metadata)
values
  -- ── Tier 1: Primary epidemiological (keyless, open) ──────────────────────
  ('who-don',
   'WHO Disease Outbreak News',
   'https://www.who.int/emergencies/disease-outbreak-news',
   1.00, 'open',
   'https://www.who.int/about/policies/publishing/copyright',
   true,
   '{"poll_interval":"*/30 * * * *","throttle_key":"who.int","archetype":"rss_html"}'::jsonb),

  ('who-afro',
   'WHO AFRO Situation Reports',
   'https://www.afro.who.int/health-topics/disease-outbreaks/outbreaks-and-other-emergencies-updates',
   0.95, 'open',
   'https://www.who.int/about/policies/publishing/copyright',
   true,
   '{"poll_interval":"0 6 * * *","throttle_key":"afro.who.int","archetype":"html_pdf"}'::jsonb),

  ('ecdc-cdtr',
   'ECDC Communicable Disease Threats Report',
   'https://www.ecdc.europa.eu/en/publications-data/communicable-disease-threats-report',
   0.90, 'open',
   'https://www.ecdc.europa.eu/en/legal-notice',
   true,
   '{"poll_interval":"0 9 * * 5","throttle_key":"ecdc.europa.eu","archetype":"html"}'::jsonb),

  ('africa-cdc',
   'Africa CDC',
   'https://africacdc.org/news/',
   0.85, 'open',
   'https://africacdc.org/privacy-policy/',
   true,
   '{"poll_interval":"0 8 * * *","throttle_key":"africacdc.org","archetype":"rss_html","chromium_required_fallback":true}'::jsonb),

  ('moh-drc',
   'MoH DRC Bulletin',
   'https://sante.gouv.cd/epidemie',
   0.90, 'open',
   null,
   true,
   '{"poll_interval":"0 10 * * *","throttle_key":"sante.gouv.cd","archetype":"html","language":"fr"}'::jsonb),

  ('uganda-moh',
   'Uganda Ministry of Health Press Releases',
   'https://www.health.go.ug',
   0.90, 'open',
   null,
   true,
   '{"poll_interval":"0 10 * * *","throttle_key":"health.go.ug","archetype":"html"}'::jsonb),

  -- ── Tier 2: Contextual humanitarian (API or RSS) ───────────────────────
  ('reliefweb',
   'ReliefWeb',
   'https://api.reliefweb.int/v1/reports',
   0.70, 'open',
   'https://reliefweb.int/terms-conditions',
   true,
   '{"poll_interval":"0 12 * * *","throttle_key":"api.reliefweb.int","archetype":"json_api","requires_env":"RELIEFWEB_APPNAME"}'::jsonb),

  ('acled',
   'ACLED Conflict Events',
   'https://api.acleddata.com/acled/read',
   0.70, 'display_only',
   'https://acleddata.com/terms-of-use/',
   true,
   '{"poll_interval":"0 4 * * *","throttle_key":"api.acleddata.com","archetype":"json_api","requires_env":"ACLED_ACCESS_TOKEN"}'::jsonb),

  ('ec-medisys',
   'EC MediSys (JRC) Public Health RSS',
   'https://medisys.newsbrief.eu/medisys/rss.html',
   0.65, 'open',
   'https://ec.europa.eu/info/legal-notice_en',
   true,
   '{"poll_interval":"0 */4 * * *","throttle_key":"medisys.newsbrief.eu","archetype":"rss"}'::jsonb),

  -- ── Tier 3: Genomic & surveillance feeds ──────────────────────────────
  ('ncbi-virus',
   'NCBI Virus / GenBank (BDBV)',
   'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/',
   0.95, 'open',
   'https://www.ncbi.nlm.nih.gov/home/about/policies/',
   false,
   '{"poll_interval":"0 2 * * *","throttle_key":"eutils.ncbi.nlm.nih.gov","archetype":"json_api"}'::jsonb),

  ('pathoplexus',
   'Pathoplexus (Open records)',
   'https://pathoplexus.org/api',
   0.85, 'open',
   'https://pathoplexus.org/about/governance/data-submission',
   true,
   '{"poll_interval":"0 3 * * *","throttle_key":"pathoplexus.org","archetype":"json_api","filter_open_only":true}'::jsonb),

  -- ── Tier 4: Humanitarian context APIs (low cadence) ───────────────────
  ('hdx-hapi',
   'HDX HAPI (IPC, INFORM, FTS, Population, UNHCR)',
   'https://hapi.humdata.org/api/v1/',
   0.80, 'open',
   'https://creativecommons.org/licenses/by/4.0/',
   true,
   '{"poll_interval":"0 0 * * 1","throttle_key":"hapi.humdata.org","archetype":"json_api","requires_env":"HDX_APP_IDENTIFIER"}'::jsonb),

  ('iom-dtm',
   'IOM Displacement Tracking Matrix v3',
   'https://dtm.iom.int/api',
   0.75, 'display_only',
   'https://dtm.iom.int/terms-conditions',
   true,
   '{"poll_interval":"0 0 1 * *","throttle_key":"dtm.iom.int","archetype":"json_api","requires_env":"IOM_DTM_API_KEY"}'::jsonb),

  ('ucdp-candidate',
   'UCDP Candidate Events (monthly)',
   'https://ucdpapi.pcr.uu.se/api/candidategedevents/',
   0.75, 'open',
   'https://creativecommons.org/licenses/by/4.0/',
   true,
   '{"poll_interval":"0 0 5 * *","throttle_key":"ucdpapi.pcr.uu.se","archetype":"json_api","requires_env":"UCDP_TOKEN"}'::jsonb),

  ('healthsites',
   'healthsites.io Facility Registry (v3)',
   'https://healthsites.io/api/v3/facilities/',
   0.70, 'display_only',
   'https://opendatacommons.org/licenses/odbl/1-0/',
   true,
   '{"poll_interval":"0 0 1 * *","throttle_key":"healthsites.io","archetype":"json_api","requires_env":"HEALTHSITES_TOKEN"}'::jsonb),

  -- ── Tier 5: Static reference datasets (poll()-returns-empty; consumed at build time) ──
  ('grid3-drc',
   'GRID3 DRC Health Zones + Settlement Extents',
   'https://data.grid3.org/datasets/grid3::drc-health-zones/explore',
   0.85, 'open',
   'https://creativecommons.org/licenses/by/4.0/',
   true,
   '{"archetype":"static_reference","reference_url":"https://data.grid3.org/datasets/grid3::drc-health-zones/explore"}'::jsonb),

  ('worldpop',
   'WorldPop 100m Population + Age/Sex Structure',
   'https://hub.worldpop.org/',
   0.90, 'open',
   'https://creativecommons.org/licenses/by/4.0/',
   true,
   '{"archetype":"static_reference","reference_url":"https://hub.worldpop.org/geodata/listing?id=29"}'::jsonb),

  ('ghsl',
   'GHSL Global Human Settlement Layer (Copernicus)',
   'https://human-settlement.emergency.copernicus.eu/',
   0.85, 'open',
   'https://human-settlement.emergency.copernicus.eu/about.php',
   true,
   '{"archetype":"static_reference","reference_url":"https://human-settlement.emergency.copernicus.eu/datasets.php"}'::jsonb),

  ('meta-hrsl',
   'Meta High Resolution Settlement Layer (HDX)',
   'https://data.humdata.org/dataset/highresolutionpopulationdensitymaps-cod',
   0.85, 'open',
   'https://creativecommons.org/licenses/by/4.0/',
   true,
   '{"archetype":"static_reference","note":"stale_2024","reference_url":"https://registry.opendata.aws/dataforgood-fb-hrsl/"}'::jsonb),

  ('nextstrain',
   'Nextstrain Phylogenetic Tree',
   'https://nextstrain.org/',
   0.85, 'open',
   'https://creativecommons.org/licenses/by/4.0/',
   false,
   '{"archetype":"static_reference","reference_url":"https://nextstrain.org/ebola/drc"}'::jsonb),

  -- ── Attribution-only / excluded ───────────────────────────────────────
  ('promed',
   'ProMED-mail',
   'https://promedmail.org/',
   0.00, 'excluded',
   'https://promedmail.org/terms-of-use/',
   true,
   '{"archetype":"excluded","reason":"subscription_required_2025","display_attribution_only":true}'::jsonb)

on conflict (slug) do update set
  name               = excluded.name,
  url                = excluded.url,
  trust_score        = excluded.trust_score,
  license_tier       = excluded.license_tier,
  license_url        = excluded.license_url,
  attribution_required = excluded.attribution_required,
  metadata           = excluded.metadata;

commit;
