begin;
create table if not exists geo.admin1 (
  code       text       primary key,
  name       text       not null,
  country_iso3 char(3)  not null,
  geom       geometry(MultiPolygon, 4326)
);
alter table geo.admin1 enable row level security;
create index if not exists admin1_gix on geo.admin1 using gist (geom);

create table if not exists geo.admin2 (
  code       text       primary key,
  name       text       not null,
  admin1_code text      not null references geo.admin1(code),
  geom       geometry(MultiPolygon, 4326)
);
alter table geo.admin2 enable row level security;
create index if not exists admin2_gix on geo.admin2 using gist (geom);

-- Zone choropleth views — admin1 granularity to match case_counts.admin1_code FK
create materialized view if not exists geo.zone_geom_z6 as
  select code, name, st_simplifypreservetopology(geom, 0.05) as geom
  from geo.admin1;
create index if not exists zone_geom_z6_gix on geo.zone_geom_z6 using gist (geom);

create materialized view if not exists geo.zone_geom_z10 as
  select code, name, st_simplifypreservetopology(geom, 0.005) as geom
  from geo.admin1;
create index if not exists zone_geom_z10_gix on geo.zone_geom_z10 using gist (geom);
commit;
