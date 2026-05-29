begin;

-- Support HTTP conditional GET (ETag/Last-Modified) and per-document license
-- inheritance from the parent source. These columns allow adapters to skip
-- re-extraction when the upstream document has not changed (304 Not Modified),
-- saving LLM tokens on every poll cycle.
--
-- license: inherits from sources.license_tier at ingest time; stored here so
--          downstream consumers (CSV export, derived layers) can filter without
--          joining to sources.
-- etag: the ETag response header value, used in If-None-Match on subsequent GETs.
-- last_modified: the Last-Modified response header value, used in If-Modified-Since.
-- http_status: the HTTP status code of the most recent fetch (200, 304, etc.).

alter table public.documents
  add column if not exists license       text,
  add column if not exists etag          text,
  add column if not exists last_modified timestamptz,
  add column if not exists http_status   integer;

commit;
