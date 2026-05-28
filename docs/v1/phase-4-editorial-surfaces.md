# Phase 4 — Editorial surfaces + read-only map stub

## Goal

Build the five public editorial routes (`/today`, `/outbreaks`, `/outbreaks/[pathogen]/[country]/[onset]`, `/sitreps`, `/sources`) plus the auth route (`/about/data-sources`) that publicly enumerates each source's terms-of-use posture. Embed a server-rendered SVG choropleth stub on `/today` and the Geography tab of outbreak detail — so a journalist can answer "where is the outbreak and how many people have it?" on a cold load without waiting for the full map command center in Phase 5. Every rendered figure must carry `source_quote_id` via `<Figure>`.

---

## Entry preconditions

- Phase 3 exit gate met: `<Figure>`, `<SourceQuoteCard>`, and `<SourceQuoteDrawer>` all work end-to-end on `/methods`.
- At least one `outbreaks` row and several `case_counts` rows (with non-null `source_quote_id`) exist in the database from Phase 2 extraction.
- `geo.admin2` table exists (schema created in Phase 1), even if geometry data is sparse or from seed. `case_counts` references `geo.admin2(code)` — DRC health zones are admin2.
- The Phase 3 global chrome (TopBar, NavRail, CommandBar) is in place.

---

## Deliverables

### Code — `/today`

**`apps/web/app/page.tsx`** (Server Component — calls `redirect("/today")` from `next/navigation`):

**`apps/web/app/today/page.tsx`** (Server Component):

Sections in order:
1. `<ActiveOutbreakBanner>` — fetches the most-severe active outbreak. Severity coloring via `<SeverityPill>`. "Day N" counter, `[Open command center]` link to `/map`.
2. Four `<StatCard>` components — confirmed / deaths / CFR / health zones affected. Each `value` prop wrapped in `<Figure quoteId={...}>`. Sparkline from last 14 days of `case_counts`.
3. Daily brief collapsible — Source Serif 4 17/1.55, hand-written for Phase 4 (LLM generation lands in Phase 7). `<AIGeneratedLabel>` marks it as hand-written until then. "Show me the data" toggle flips to raw figures table.
4. Read-only choropleth stub (see below).
5. Recent sitreps list — last 5 documents from `public.documents` ordered by `published_at desc`, each row with source name, title, age, link.
6. All active outbreaks list — sparkline row per outbreak (`<OutbreakRow>`).

Data fetching pattern: single RSC data-fetch function using the cookie-bound server client from `lib/supabase/server.ts`. No client-side fetching on authoritative data.

**Read-only choropleth stub** (the critical Phase 4 addition from design review):

A server-rendered SVG of `case_counts` joined to `geo.admin1` for the active outbreak. Rendered at build-time via RSC using PostGIS `ST_AsSVG` via Supabase RPC. No tile pipeline, no scrubber, no interactive inspector — just "where is this."

```ts
// apps/web/lib/server/choropleth.ts
// Pipeline:
// 1. Fetch admin2 geometries via `SELECT ST_AsSVG(ST_Transform(geom, 4326), 5) as path, code, name FROM geo.admin2 WHERE admin1_code IN (SELECT code FROM geo.admin1 WHERE country_iso3 = $1)`
//    ST_AsSVG returns SVG path data in geographic coordinates (lon/lat).
// 2. Fetch current case counts: SELECT admin2_code, SUM(value) as total FROM public.case_counts WHERE outbreak_id=$1 AND metric='confirmed' AND superseded_by IS NULL AND status='published' GROUP BY admin2_code
// 3. Normalize geographic coordinates to SVG viewport: compute bounding box of all admin1 geometries, then apply a linear scale transform (translate + scale) so the paths fit a 640×480 viewBox.
//    Use a simple Mercator projection: x = (lon - minLon) / (maxLon - minLon) * viewWidth, y = (maxLat - lat) / (maxLat - minLat) * viewHeight
// 4. Classify case counts into 5 Jenks natural breaks (or quantile if <5 non-null values). Assign ColorBrewer Reds 5-class: ['#fee5d9','#fcae91','#fb6a4a','#de2d26','#a50f15']. Zones with no data: 'none' fill with diagonal hatching pattern.
// 5. Compose as <svg viewBox="0 0 640 480"> with <defs><pattern> for no-data hatching, one <path> per admin1.
```

Embedded into:
- `/today` between the StatCards and the recent sitreps list.
- The "Geography" tab of `/outbreaks/[...]/` detail page.

Accessibility: the SVG includes `<title>` and `<desc>` elements; admin1 names are `<text>` overlays; `?view=table` query parameter swaps to a tabular view.

### Code — `/outbreaks`

**`apps/web/app/outbreaks/page.tsx`** (Server Component):
- Filter chips: Pathogen / Region / Status / Sort (shadcn `<Select>` + URL search params for state).
- List of `<OutbreakRow>` components — each row shows pathogen name, country, confirmed count + sparkline, CFR, day count, severity pill, last update age.
- Outbreak list fetched server-side; filter state in URL (`?pathogen=filovirus&status=active`).
- Empty state: "No outbreaks match your filters yet — try widening the time window."

### Code — `/outbreaks/[pathogen]/[country]/[onset]`

URL pattern: `/outbreaks/[pathogen-slug]/[country-iso3]/[onset-yyyymmdd]`  
Example: `/outbreaks/bundibugyo/cod/2026-04-20`

**`apps/web/app/outbreaks/[pathogen]/[country]/[onset]/page.tsx`** (Server Component):

Sections:
1. `<OutbreakHeader>` — pathogen name 32 px Heading, country / admin1 in 18 px Copy muted, `<SeverityPill>`, onset date and day count in 13 px Geist Mono.
2. Tab navigation: **Brief · Epi curve · Geography · Sources · Methods** (tab state in URL `?tab=epi-curve`).
3. **Brief tab**: LLM-generated brief (hand-written in Phase 4, `<AIGeneratedLabel>`), "Show me the data" toggle to raw figures table.
4. Four `<StatCard>` components (confirmed / deaths / CFR / health zones affected), each wrapping its value in `<Figure>`.
5. **Epi curve tab**: `<TimelineMulti>` component (Visx `XYChart`, confirmed + deaths tracks). Zero-baseline. Direct labels not legend. Source line with WHO publication date.
6. **Geography tab**: server-rendered SVG choropleth stub (same component as `/today`).
7. **Sources tab**: list of all `documents` that contributed to this outbreak's `case_counts`.
8. **Methods tab**: links to `/methods` with the relevant sections highlighted.

After mutations: `revalidatePath("/outbreaks")` over `revalidateTag` (per AGENTS.md).

### Code — `/sitreps`

**`apps/web/app/sitreps/page.tsx`** (Server Component):
- Reverse-chronological feed of `public.documents` joined to `public.sources`.
- Filter chips: Source / Pathogen / Country / Trust tier.
- Grouped by publication date ("Today · May 27", "Yesterday · May 26").
- Each row: time, source pill, title, pathogen (if extracted), link.
- Infinite scroll via URL-based pagination (`?page=2`), not JS scroll listener.

### Code — `/sources` and `/sources/[slug]`

**`apps/web/app/sources/page.tsx`** (Server Component):
- Library of all `public.sources` rows.
- Columns: name, trust tier dot, last fetch age, health indicator (healthy / slow / error).
- Search by source name (client-side filter using Fuse.js or URL param).

**`apps/web/app/sources/[slug]/page.tsx`** (Server Component):
- Source detail: parser version (from `sources.metadata`), fetch interval, last fetch timestamp, recent extracted figures, evaluation score, full chain-of-custody for a sampled quote.

### Code — `/about/data-sources`

**`apps/web/app/about/data-sources/page.tsx`** (Server Component, public):
- Enumerates each source's terms-of-use posture in Source Serif 4 prose:
  - WHO DON: Creative Commons — free public reuse with attribution.
  - WHO AFRO: Public distribution; regional restrictions on derivative commercial products.
  - ECDC CDTR: Free non-commercial reuse with attribution.
  - ReliefWeb: CC BY — free reuse with attribution.
  - ACLED: Non-commercial research clause — not for commercial redistribution.
  - MoH DRC: Public press releases — no explicit license; attributed with source.
- This page is the Phase 6 entry precondition and must exist before multi-source adapters are added.

### Code — shared components (new in Phase 4)

**`apps/web/components/outbreak/stat-card.tsx`** — full `<StatCard>` (Phase 3 had skeleton; Phase 4 wires real data via props). Value prop is always a `<Figure>`.

**`apps/web/components/outbreak/active-outbreak-banner.tsx`** — PHEIC/alert banner with severity coloring.

**`apps/web/components/outbreak/outbreak-row.tsx`** — list row with sparkline, severity pill, last-update indicator.

**`apps/web/components/outbreak/timeline-multi.tsx`** (Client Component — `'use client'`): Visx `XYChart` with confirmed + deaths tracks. Zero-baseline. `prefers-reduced-motion` respected (static fallback).

---

## Tests

### Vitest

**`apps/web/app/today/__tests__/page.test.tsx`** — renders the Today page with mocked Supabase data, asserts `<Figure>` components are present on stat values, asserts `<SeverityPill>` appears in the banner.

**`apps/web/components/outbreak/__tests__/stat-card.test.tsx`** — renders `<StatCard>` with a `quoteId` prop, asserts the value is wrapped in `<Figure>`.

**`apps/web/app/outbreaks/__tests__/page.test.tsx`** — renders the list with mocked outbreak data, asserts filter chips render, asserts empty state for no matches.

### Playwright

**`apps/web/e2e/today.spec.ts`**:
```ts
test("Today page answers 'where and how many' within 10 seconds", async ({ page }) => {
  const start = Date.now();
  await page.goto("/today");
  await expect(page.locator("[data-stat-card='confirmed']")).toBeVisible();
  await expect(page.locator("[data-choropleth-stub]")).toBeVisible();
  expect(Date.now() - start).toBeLessThan(10_000);
});

test("Every StatCard figure has a source quote popover", async ({ page }) => {
  await page.goto("/today");
  const figure = page.locator("[data-figure]").first();
  await figure.hover();
  await page.waitForTimeout(200);
  await expect(page.locator("[data-source-quote-card]")).toBeVisible();
});
```

**`apps/web/e2e/outbreak-detail.spec.ts`** — navigates to an outbreak detail page, clicks the "Geography" tab, asserts the SVG choropleth renders (`[data-choropleth-stub]`).

---

## Tooling

- `@visx/xychart` and `@visx/brush` — `<TimelineMulti>` component.
- `fuse.js` — client-side source search (or URL param pattern with server filtering).
- `revalidatePath` calls after any mutation (no mutations in Phase 4; preparation for Phase 5+).

---

## Verification

```bash
# 1. Type check
pnpm --filter apps/web typecheck
# Expected: zero errors.

# 2. Unit tests
pnpm --filter apps/web test
# Expected: all green.

# 3. Dev server — /today cold load
pnpm dev
# Open /today in a new incognito window.
# Stopwatch: page becomes useful (stat cards + choropleth visible) in < 10 s.
# Hover the "Confirmed" StatCard number.
# Expected: SourceQuoteCard appears with real WHO DON quote.

# 4. Outbreak detail
# Navigate to /outbreaks/[pathogen]/[country]/[onset]
# Expected: Brief tab renders; click "Show me the data" → raw figures table with ⓘ per row.
# Click "Geography" tab: SVG choropleth renders.

# 5. Sitreps feed
# Navigate to /sitreps
# Expected: chronological feed grouped by date; filter chips work.

# 6. Data sources page
# Navigate to /about/data-sources
# Expected: all sources listed with terms-of-use posture.

# 7. Accessibility
pnpm playwright test apps/web/e2e/today.spec.ts
# Expected: all green.
npx axe-core apps/web --run accessibility
# Expected: zero critical violations.
```

If choropleth SVG is empty: check that `geo.admin2` has geometry data (seed at least one health-zone polygon for DRC Ituri Province in `supabase/seed.sql`).

**License invariant:** all figures rendered on public routes derive from `sources` rows with `license_tier IN ('open', 'display_only')`. The researcher-tier CSV export (Phase 6+) filters `WHERE license_tier = 'open'`. Phase 4 routes do not export data, but the `license_tier` column is already present (Phase 1 migration) and must be populated on every `sources` row before ingestion.  
If `<TimelineMulti>` throws: Visx requires a client-side rendering context; ensure `'use client'` is present and that the component is wrapped in a Suspense boundary.

---

## Exit gate

An unprimed journalist can answer "where is the outbreak and how many people have it?" in < 10 seconds on a cold load of `/today`; every figure on every page exposes provenance via `<Figure>` (no plain numbers without `source_quote_id`); the `/about/data-sources` page is public and enumerates each source's terms of use.

---

## Research cross-references

- [ui.md §2.0 — /today wireframe](../../research/ui.md#20--today--desktop-1280px)
- [ui.md §3.0 — /outbreaks list](../../research/ui.md#30-outbreaks--list-view)
- [ui.md §4.0 — outbreak detail](../../research/ui.md#40-outbreaksebola-bundibugyocod2026-04-20--outbreak-detail)
- [ui.md §5.0 — /sitreps feed](../../research/ui.md#50-sitreps--chronological-feed)
- [ui.md §6.0 — /sources library](../../research/ui.md#60-sources--source-library)
- [ux.md §3 — Information architecture](../../research/ux.md#3-information-architecture)
- [ux.md §5 — Progressive disclosure](../../research/ux.md#5-progressive-disclosure--novice--expert)
- [ux.md §15 — Empty & edge states](../../research/ux.md#15-empty--edge-states)

---

## Page copy templates

*Source: [`research/copy.md`](../../research/copy.md) §3.*

### Landing — `/today`

**Above the fold.** The map is the introduction — no introductory paragraph. A single context line sits above (or overlaid on) the map:

> **Bundibugyo virus disease (ICD-11: 1D60.00) — Ituri Province, DRC**
> {n} suspected cases across {m} health zones as of {date} ({source link}).
> Hover any figure for its source sentence.

**Below the fold — three content blocks, ≤3 sentences each:**

1. **What this shows.** "This map displays suspected case totals by DRC health zone, drawn from the most recent WHO AFRO situation report. Colour intensity reflects cumulative suspected cases. Toggle the ACLED conflict overlay to see armed-group activity that may affect health-zone access and reporting."
2. **What this doesn't show.** "Confirmed cases are reported separately when available. Case counts from different sources (WHO DON, AFRO sitrep, ECDC, DRC MoH) often disagree by days and tens of cases. This map uses the AFRO sitrep as the default because it provides the most granular health-zone breakdown. All sources are visible in the zone drill-down."
3. **Who this is for.** "Journalists, public health trainees, and members of the public seeking a fast, sourced overview of the current outbreak. This is not an operational response tool."

### Outbreak detail Brief tab

Multi-source framing pattern — never pick a winner:

> WHO AFRO Sitrep 12 (22 May): 347 suspected. WHO AFRO Sitrep 11 (15 May): 312 suspected. Δ = +35 in 7 days. [Source sentence → ] [Source sentence → ]
>
> ECDC TAB (20 May): 298 suspected (reporting lag noted; different case inclusion criteria from WHO AFRO). [Source sentence → ]

Below that: "WHO DON 603 (24 May 2026) reported 14 new suspected cases in Irumu health zone since DON 602 (17 May)." Never: "The situation continues to evolve rapidly."

### Document card structure

Re-scope the inter-document diff feature here (previously dropped from v1 editorial surfaces — it is now required):

- Title, source, date, document type (DON, AFRO sitrep, ECDC TAB, etc.)
- **Extracted summary** — LLM-generated, labelled with `<AIGeneratedLabel>` ("Summary generated by Claude Sonnet 4.6. Extracted numbers are linked to their source sentences below.").
- **Key numbers** — each with its `sourceQuoteId` link.
- **Diff vs previous document from the same source** — what changed? New zones mentioned? Case count deltas? Implement as a simple set-diff of extracted metrics vs the prior document's `case_counts` rows for this source. Render as: "+ Mambasa health zone added (first mention in this source)" or "↑ Irumu suspected: 98 → 112 (+14)". Use `<del>` + `<ins>` semantics.

### Daily brief format

```
Bundibugyo Outbreak — What Changed (22 May 2026)

• WHO AFRO Sitrep 12 (22 May) added Mambasa health zone to the affected zone list for the first time. [Source sentence →]
• ECDC updated its threat assessment to "moderate" for EU/EEA, up from "low" in the 15 May brief. [Source sentence →]
• No new genomic sequences released on Pathoplexus or Virological.org since 18 May.

Generated by Claude Sonnet 4.6 from changes detected across all ingested sources in the past 24 hours. Every claim links to its source sentence.
```

Max 5 bullets. Each bullet: claim + source link. Never source-less claims. If the LLM cannot cite a claim, the claim does not appear.

### Copy test (apply before publishing any text)

Before publishing any public-facing text, apply this three-part test from `research/copy.md` §7:

1. **Would an LSHTM DTM&H student find this useful?** If yes, the content level is right.
2. **Can every factual claim be traced to a source sentence via the UI?** If not, add provenance or rewrite as a methodological statement.
3. **Would a WHO communications officer be comfortable sharing the link?** The copy must never put WHO in a position where linking could be read as endorsing an inaccurate or sensationalist source.

---

## ICD-11 reference table

*Source: [`research/copy.md`](../../research/copy.md) Appendix A. Verified against WHO ICD-11 browser (icd.who.int).*

| Entity | ICD-11 Code | Notes |
|--------|-------------|-------|
| Bundibugyo virus disease | **1D60.00** | Under 1D60.0 Ebola disease. **Not 1D64.0 (invalid).** |
| Ebola virus disease (Zaire) | 1D60.01 | The "classic" EBOV species. |
| Sudan virus disease | 1D60.02 | |
| Marburg virus disease | **1D60.10** | Under 1D60.1 Marburg disease. **Not 1D24.0 (invalid).** |

All Phase 4 page titles, JSON-LD metadata (Phase 8), and extraction schema fields referencing ICD-11 codes must use these values. Grep for `1D64` and `1D24` before shipping — must return zero matches in the live app.

---

## Out of scope

- MapLibre, deck.gl, or the interactive `/map` command center (Phase 5).
- The TimeScrubber with brush interaction (Phase 5).
- The full three-pane layout for `/map` (Phase 5).
- LLM-generated daily brief (Phase 7 — hand-written in Phase 4).
- Multi-source reconciliation UI (Phase 6 — the `+1 disagreement` pill on StatCard).
- Internal admin routes `/internal/*` (Phase 8).
