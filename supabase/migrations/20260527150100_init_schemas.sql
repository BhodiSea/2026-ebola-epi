begin;
create schema if not exists geo;
create schema if not exists audit;
create schema if not exists internal;

-- public is already present; restrict all non-public schemas
grant usage on schema public to authenticated, anon;
revoke usage on schema geo, audit, internal from anon, authenticated;
commit;
