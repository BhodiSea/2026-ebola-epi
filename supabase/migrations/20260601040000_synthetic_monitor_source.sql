-- ─── synthetic-monitor source seed ───────────────────────────────────────────
--
-- Inserts the sentinel source row consumed by the synthetic-monitor Inngest
-- function (apps/web/inngest/functions/synthetic-monitor.ts).
-- license_tier = 'excluded' so it never surfaces in any export or overlay.

begin;

insert into public.sources (
  slug,
  name,
  url,
  trust_score,
  license_tier,
  attribution_required,
  extraction_paused,
  posture_terms,
  posture_attribution
)
values (
  'synthetic-monitor',
  'Synthetic Monitor (internal)',
  'internal://synthetic-monitor',
  '1.00',
  'excluded',
  false,
  false,
  'Internal use only — not a public data source.',
  'N/A'
)
on conflict (slug) do nothing;

commit;
