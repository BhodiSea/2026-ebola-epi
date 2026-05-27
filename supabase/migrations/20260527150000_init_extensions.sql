begin;
create extension if not exists postgis;
create extension if not exists vector;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pg_trgm;
create extension if not exists plpgsql_check;
commit;
