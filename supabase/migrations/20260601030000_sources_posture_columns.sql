-- ─── sources posture columns ─────────────────────────────────────────────────
--
-- Adds posture_terms (text NOT NULL) and posture_attribution (text NOT NULL) to
-- public.sources, then backfills all 21 seeded rows (from
-- 20260529170400_phase6_sources_seed.sql). Previously this prose lived in
-- apps/web/lib/copy/data-sources.ts, covering only 6 of the 21 slugs.
-- Moving it here makes the constraint schema-enforced and eliminates the
-- per-page fallback string "Licence posture not yet documented."

begin;

-- ─── add columns nullable first so we can backfill before enforcing NOT NULL ─

alter table public.sources
  add column if not exists posture_terms        text,
  add column if not exists posture_attribution  text;

-- ─── backfill: WHO DON ────────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'WHO DON reports are published under the WHO Copyright Policy, which allows free reproduction with attribution for non-commercial purposes. Full text, case counts, and derived aggregates may be displayed.',
  posture_attribution = '© World Health Organization'
where slug = 'who-don';

-- ─── backfill: WHO AFRO ───────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'WHO AFRO situation reports are released as public documents. Reproduction with attribution is permitted for educational and public-health purposes.',
  posture_attribution = '© WHO Regional Office for Africa'
where slug = 'who-afro';

-- ─── backfill: ECDC CDTR (renamed from ecdc at seed time) ────────────────────

update public.sources
set
  posture_terms       = 'ECDC publications are released under a custom open licence permitting reproduction with attribution. Derived statistics and quoted figures may be displayed.',
  posture_attribution = '© European Centre for Disease Prevention and Control'
where slug = 'ecdc-cdtr';

-- ─── backfill: Africa CDC ─────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'Africa CDC bulletins are publicly released but the licence restricts redistribution for commercial purposes. Aggregated figures are displayed for situational awareness; full-text redistribution is excluded.',
  posture_attribution = '© Africa Centres for Disease Control and Prevention'
where slug = 'africa-cdc';

-- ─── backfill: MoH DRC ───────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'DRC Ministry of Public Health press releases are official government communications published for public awareness. Quotation of reported figures with attribution is standard practice for public-health reporting; full-text redistribution should link to the originating press release.',
  posture_attribution = '© Ministère de la Santé Publique, Hygiène et Prévention, République Démocratique du Congo'
where slug = 'moh-drc';

-- ─── backfill: Uganda MoH ────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'Uganda Ministry of Health public statements and situation reports are official government communications released for public awareness. Quoted figures may be cited with attribution; full-text redistribution should reference the originating release.',
  posture_attribution = '© Ministry of Health, Republic of Uganda'
where slug = 'uganda-moh';

-- ─── backfill: ReliefWeb ─────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'ReliefWeb content is sourced from multiple organisations with varying licences. ituri-sitrep displays aggregated metadata only and links to the original document. Full text and extracts are not redistributed.',
  posture_attribution = '© respective originating organisations via ReliefWeb'
where slug = 'reliefweb';

-- ─── backfill: ACLED ─────────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'ACLED data is released under CC BY-NC-SA 4.0. Aggregated figures and derived statistics are displayed for situational-awareness purposes with required attribution. Commercial redistribution and sublicensing are not permitted.',
  posture_attribution = '© Armed Conflict Location & Event Data Project (ACLED)'
where slug = 'acled';

-- ─── backfill: EC MediSys ────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'EC JRC MediSys content is produced by the European Commission Joint Research Centre and is available for reproduction with attribution under the Commission''s standard reuse policy. Aggregated extracted figures and quoted passages may be displayed.',
  posture_attribution = '© European Commission Joint Research Centre (JRC MediSys)'
where slug = 'ec-medisys';

-- ─── backfill: NCBI Virus ─────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'NCBI Virus sequence data is a US government work in the public domain. Sequence records and derived aggregate statistics may be freely used and redistributed; citation of the NCBI Virus database and the submitting authors is requested.',
  posture_attribution = '© National Center for Biotechnology Information, US National Library of Medicine (public domain)'
where slug = 'ncbi-virus';

-- ─── backfill: Pathoplexus ────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'Pathoplexus sequence records are submitted under individual Creative Commons licences, defaulting to CC BY 4.0. Only open-licence records are ingested; the per-record licence and submitting institution are preserved on every extracted figure.',
  posture_attribution = '© Pathoplexus contributors (per-record CC BY 4.0 or CC0)'
where slug = 'pathoplexus';

-- ─── backfill: HDX HAPI (renamed from hdx at seed time) ──────────────────────

update public.sources
set
  posture_terms       = 'HDX datasets carry individual Creative Commons licences per dataset — predominantly CC BY 4.0 or CC BY-IGO. Only datasets with open licences are ingested; licence metadata is preserved on every extracted figure.',
  posture_attribution = '© respective data contributors via HDX'
where slug = 'hdx-hapi';

-- ─── backfill: IOM DTM ───────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'IOM Displacement Tracking Matrix (DTM) data is released under IOM''s open data terms, which require attribution and restrict redistribution of assessment reports that include sensitive population information. Only aggregate displacement figures are displayed.',
  posture_attribution = '© International Organization for Migration – Displacement Tracking Matrix (IOM DTM)'
where slug = 'iom-dtm';

-- ─── backfill: UCDP Candidate Events ─────────────────────────────────────────

update public.sources
set
  posture_terms       = 'UCDP Candidate Events Dataset is made available for research and educational use with citation to the Uppsala Conflict Data Program required. Commercial redistribution is not permitted. Aggregated conflict-event counts are displayed with attribution.',
  posture_attribution = '© Uppsala Conflict Data Program (UCDP), Uppsala University'
where slug = 'ucdp-candidate';

-- ─── backfill: Healthsites ────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'Healthsites.io facility data is published under the Open Database License (ODbL). Derived aggregates and display uses are permitted with attribution to the Global Healthsites Mapping Project and OpenStreetMap contributors.',
  posture_attribution = '© Global Healthsites Mapping Project & OpenStreetMap contributors (ODbL)'
where slug = 'healthsites';

-- ─── backfill: GRID3 DRC ─────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'GRID3 DRC data layers are published under Creative Commons Attribution 4.0. Population and administrative boundary aggregates may be freely used and redistributed with attribution.',
  posture_attribution = '© GRID3 (Geo-Referenced Infrastructure and Demographic Data for Development)'
where slug = 'grid3-drc';

-- ─── backfill: WorldPop ───────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'WorldPop population datasets are published under Creative Commons Attribution 4.0. Population count estimates and derived summaries may be freely used and redistributed with attribution.',
  posture_attribution = '© WorldPop, University of Southampton'
where slug = 'worldpop';

-- ─── backfill: GHSL ──────────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'Global Human Settlement Layer (GHSL) data are produced by the European Commission Joint Research Centre and published under Creative Commons Attribution 4.0. Derived settlement and population aggregates may be freely used and redistributed with attribution.',
  posture_attribution = '© European Commission Joint Research Centre (GHSL)'
where slug = 'ghsl';

-- ─── backfill: Meta HRSL ─────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'Meta High Resolution Settlement Layer (HRSL) data are published under Creative Commons Attribution 4.0. Population density estimates and derived aggregates may be freely used and redistributed with attribution.',
  posture_attribution = '© Meta & Columbia University CIESIN, distributed via HDX'
where slug = 'meta-hrsl';

-- ─── backfill: Nextstrain ─────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'Nextstrain phylogenetic builds are openly licensed; individual sequence records carry per-contributor licences (commonly CC BY 4.0 or CC0). Clade assignments and aggregate genomic-surveillance statistics are displayed with attribution to Nextstrain curators and sequence contributors.',
  posture_attribution = '© Nextstrain team & contributing sequence authors'
where slug = 'nextstrain';

-- ─── backfill: ProMED ─────────────────────────────────────────────────────────

update public.sources
set
  posture_terms       = 'ProMED reports are published by the International Society for Infectious Diseases under terms that permit reading and citation for public-health purposes but restrict systematic redistribution and commercial reuse. Quoted excerpts and derived figures are displayed with attribution; full-text redistribution is excluded.',
  posture_attribution = '© International Society for Infectious Diseases (ISID) / ProMED'
where slug = 'promed';

-- ─── enforce NOT NULL once every row is populated ────────────────────────────

alter table public.sources
  alter column posture_terms        set not null,
  alter column posture_attribution  set not null;

-- slugs covered (21 total — diff against 20260529170400_phase6_sources_seed.sql):
-- who-don, who-afro, ecdc-cdtr, africa-cdc, moh-drc, uganda-moh, reliefweb,
-- acled, ec-medisys, ncbi-virus, pathoplexus, hdx-hapi, iom-dtm, ucdp-candidate,
-- healthsites, grid3-drc, worldpop, ghsl, meta-hrsl, nextstrain, promed

commit;
