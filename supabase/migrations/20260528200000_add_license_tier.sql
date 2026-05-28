begin;

-- ─── public.sources: license metadata (AGENTS.md Rule 14) ────────────────────
-- license_tier drives CSV export filtering: only 'open' sources appear in
-- researcher-tier exports. 'display_only' sources may render as aggregated
-- overlays but never appear in any export or derived redistributable raster.
alter table public.sources
  add column if not exists license_tier text not null default 'open'
    check (license_tier in ('open', 'display_only', 'noncommercial_verified', 'excluded'));

alter table public.sources
  add column if not exists license_url text;

alter table public.sources
  add column if not exists attribution_required boolean not null default false;

commit;
