begin;

-- Zones de santé (health zones) for Ituri Province, DRC.
-- All 36 zones across 5 territoires + Bunia city area.
-- Source: DRC MSP Zone de Santé registry; IOM DTM Ituri mobility reports (2025).
-- Polygons not available at zone de santé granularity from geoBoundaries ADM2;
-- approximate bounding envelopes derived from known centroids and humanitarian
-- reports. Zones with precise shapefiles should be updated via a follow-on
-- migration when OCHA/HDX Health Zone dataset (CC BY 4.0) is downloaded.
-- License: CC BY 4.0 (OCHA/MSP public data) per docs/adr/0021-geo-license.md.
-- Parent: geo.admin1 COD-IT (Ituri, already seeded).

-- ── Bunia city area ───────────────────────────────────────────────────────────

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-RW', 'Rwampara', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.98, 1.32, 30.26, 1.60, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-NK', 'Nyakasanza', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.15, 1.50, 30.42, 1.72, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-KT', 'Katanga', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.20, 1.55, 30.45, 1.80, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

-- ── Djugu territoire ──────────────────────────────────────────────────────────

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-MG', 'Mongbwalu', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.88, 1.82, 30.12, 2.02, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-FA', 'Fataki', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.10, 1.95, 30.38, 2.22, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-DR', 'Drodro', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.28, 1.82, 30.58, 2.10, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-LI', 'Linga', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.78, 1.62, 30.05, 1.90, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-NI', 'Nizi', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.88, 1.88, 30.18, 2.12, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-TC', 'Tchomia', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.42, 1.72, 30.68, 2.00, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-RE', 'Rethy', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.08, 2.00, 30.38, 2.28, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-LG', 'Logo', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.18, 2.12, 30.48, 2.42, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

-- ── Irumu territoire ──────────────────────────────────────────────────────────
-- COD-IT-KO (Komanda) already seeded with approximate envelope in prior migration.

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-NY', 'Nyankunde', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.18, 1.18, 30.45, 1.45, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-GE', 'Gety', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.68, 1.28, 29.98, 1.58, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-BK', 'Bukiringi', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.85, 1.42, 30.15, 1.68, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-IU', 'Irumu', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.78, 1.10, 30.08, 1.38, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-LL', 'Lalo', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.58, 0.98, 29.88, 1.28, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-LB', 'Libi', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.65, 0.82, 29.95, 1.10, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-MV', 'Muvumba', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.45, 0.68, 29.75, 0.98, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

-- ── Mahagi territoire ─────────────────────────────────────────────────────────

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-MH', 'Mahagi', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.82, 2.18, 31.10, 2.42, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-KB', 'Kambala', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.72, 2.46, 31.02, 2.72, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-RM', 'Rimba', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.55, 2.98, 30.85, 3.28, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-AG', 'Angumu', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.65, 2.48, 30.95, 2.78, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-SO', 'Sota', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.78, 2.82, 31.08, 3.12, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

-- ── Aru territoire ────────────────────────────────────────────────────────────

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-AU', 'Aru', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.68, 2.88, 30.98, 3.18, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-AW', 'Ariwara', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.52, 3.00, 30.82, 3.30, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-AD', 'Adja', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.28, 2.88, 30.58, 3.18, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-AI', 'Adi', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.92, 3.22, 30.22, 3.52, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-BI', 'Biringi', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.28, 2.68, 30.58, 2.98, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-LY', 'Laybo', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(30.12, 3.32, 30.42, 3.62, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

-- ── Mambasa territoire ────────────────────────────────────────────────────────

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-NN', 'Nia-Nia', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(27.42, 1.18, 27.72, 1.48, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-LW', 'Lolwa', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(28.02, 1.28, 28.32, 1.58, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-MD', 'Mandima', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(28.12, 0.68, 28.42, 0.98, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-MM', 'Mambasa', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(28.28, 1.18, 28.58, 1.48, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-BF', 'Bafwaboli', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(27.68, 1.42, 27.98, 1.72, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

-- ── Additional outbreak-relevant zones ───────────────────────────────────────
-- Bambu and Kilo mentioned in WHO situation reports for this outbreak.

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-BM', 'Bambu', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.95, 1.72, 30.25, 2.02, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

insert into geo.admin2 (code, name, admin1_code, geom)
  values ('COD-IT-KL', 'Kilo', 'COD-IT',
    ST_Multi(ST_MakeEnvelope(29.68, 1.75, 29.98, 2.05, 4326)))
  on conflict (code) do update set name = excluded.name, geom = excluded.geom;

refresh materialized view geo.zone_geom_z6;
refresh materialized view geo.zone_geom_z10;

commit;
