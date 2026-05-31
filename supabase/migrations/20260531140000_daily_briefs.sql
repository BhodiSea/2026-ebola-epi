begin;

-- ─── public.daily_briefs ──────────────────────────────────────────────────────
-- Stores editor-authored and AI-generated daily outbreak briefs. Each row is
-- identified by date (one brief per day). review_status gates public visibility.
-- Brief prose may embed figure tokens of the form [metric:zone] (e.g.
-- "[confirmed:irumu]") that the UI replaces server-side with <Figure> components
-- linked to the quote IDs in source_quote_ids.
--
-- model_id = 'editor'  → hand-written by site editor
-- model_id = <claude-*> → AI-generated (requires reviewed status to go public)
--
-- Four-policy RLS: anon and authenticated see only published rows;
-- writes restricted to service_role (Inngest / editor tooling).

create table if not exists public.daily_briefs (
  date              date        primary key,
  headline          text        not null,
  body              text        not null,
  severity          text        check (severity in ('emergency', 'alert', 'warn', 'info')),
  model_id          text        not null,
  review_status     text        not null default 'unreviewed'
                                  check (review_status in ('unreviewed', 'reviewed', 'published')),
  source_quote_ids  uuid[]      not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.daily_briefs enable row level security;

-- SELECT: both anon and authenticated may read published rows.
create policy "daily_briefs_select_anon"
  on public.daily_briefs for select
  to anon
  using (review_status = 'published');

create policy "daily_briefs_select_authenticated"
  on public.daily_briefs for select
  to authenticated
  using (review_status = 'published');

-- INSERT / UPDATE / DELETE: default-deny for anon and authenticated.
-- service_role bypasses RLS for all write operations.

-- Index for date-ordered listing (most-recent first).
create index if not exists daily_briefs_date_desc_idx
  on public.daily_briefs (date desc)
  where review_status = 'published';

-- ─── seed: migrate the Phase 4 hand-written daily brief ──────────────────────
-- Materialises the DAILY_BRIEF constant from apps/web/lib/copy/daily-brief.ts.
-- source_quote_ids contains the WHO DON 603 confirmed+deaths quotes from the
-- Phase 4 seed; these anchor the national figures referenced in the prose.
insert into public.daily_briefs (
  date, headline, body, severity, model_id, review_status, source_quote_ids
)
values (
  '2026-05-28',
  'Bundibugyo virus disease — Ituri Province, DRC',
  E'As of 28 May 2026, the outbreak declared on 20 April continues to be concentrated in five health zones of Ituri Province. Irumu remains the epicentre with [confirmed:irumu] confirmed cases, accounting for approximately [pct_irumu] of the total case burden.\n\nThe case fatality ratio stands at [cfr], which is consistent with historical Bundibugyo virus outbreaks (typically 25–36% for Sudan ebolavirus; lower for Bundibugyo). Ring vaccination with the rVSV-ZEBOV candidate is ongoing under compassionate use protocols.\n\nThe geographic pattern — heavily weighted toward Irumu and Mambasa — reflects the initial zoonotic spillover event near the Ituri Forest margin. Community transmission has not been confirmed in Bunia urban area, though contact tracing is ongoing.\n\nResponse capacity remains stretched. Access to Mambasa health zone requires air transport, limiting rapid response team deployment.',
  'emergency',
  'editor',
  'published',
  array[
    'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'::uuid,
    'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'::uuid
  ]
)
on conflict (date) do nothing;

commit;
