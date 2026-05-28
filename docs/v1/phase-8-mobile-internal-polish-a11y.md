# Phase 8 — Mobile, internal admin, polish, and accessibility audit

## Goal

Ship the mobile experience (vaul bottom-sheet inspector on `/map`, bottom-tab navigation, feed-first home), build the six internal admin dashboards under `/internal/*`, add OG cards via `@vercel/og`, embed iframes, RSS/Atom feed, print stylesheet, and conduct a full WCAG 2.2 AA audit (axe-core + Lighthouse + manual NVDA pass + Sim Daltonism colorblind simulation). At the end of this phase, Lighthouse scores ≥ 95 on iPhone SE across all routes, an external screen-reader contractor reports the platform is navigable, and the tweet-card preview of a `/evidence/q_…` URL renders with the correct severity pill.

---

## Entry preconditions

- Phase 7 exit gate met: 7 days autonomous operation, F1 ≥ 0.95, cache-read ratio ≥ 0.60.
- All six Inngest functions running in production (Phase 6).
- Anthropic usage log and Langfuse receiving spans (Phase 7).
- Inngest Pro plan active (or at minimum Hobby with concurrency cap understood to be 5).

---

## Deliverables

### Code — mobile

**`apps/web/app/map/page.tsx`** — add mobile layout fork at `< 768 px`:

Replace the three-pane layout with:
```
[full-bleed MapPane]
[vaul bottom-sheet inspector]
[bottom-tab navigation 56px]
```

**`apps/web/components/map/mobile-inspector.tsx`** (Client Component — uses `vaul`):

```tsx
import { Drawer } from "vaul";

// Snap points: 0.12 (peek, shows outbreak name + headline numbers)
//              0.5  (half, shows Overview tab)
//              0.92 (full, shows all four inspector tabs)
<Drawer.Root snapPoints={[0.12, 0.5, 0.92]} modal={false}>
  <Drawer.Portal>
    {/* Drawer.Overlay is intentionally omitted: modal={false} means no backdrop.
        The map must remain pannable behind the sheet. */}
    <Drawer.Content>
      {/* 4×36px drag handle at 40% alpha — Material 3 spec */}
      <div className="drag-handle" aria-hidden="true" />
      <InspectorTabs entity={selectedEntity} />
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

`modal={false}` so the map stays pannable behind the sheet. Animation: vaul uses CSS transitions internally (not spring physics). Override the default ease with `--vaul-drawer-transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1)` via CSS custom property on the drawer root. (The spring physics parameters mass=1, stiffness=260, damping=32 are Framer Motion values and are not directly applicable to vaul; the cubic-bezier above approximates the same feel.) `prefers-reduced-motion: reduce` → set `--vaul-drawer-transition: transform 0ms` via `@media (prefers-reduced-motion: reduce)`.

**`apps/web/components/layout/bottom-tab-nav.tsx`** (Client Component — `< 768 px` only):

```
⌂ Today  ⊕ Map (active ●)  ☰ Outbreaks  ⌖ Sitreps  § Sources
```

56 px height. Active item with `--color-emergency` dot. Touch targets 44 × 44 px minimum. ⌘K triggers the CommandBar (opens over the bottom nav).

**Feed-first mobile home**: on `< 768 px`, the `/today` page becomes a single-column scroll: ActiveOutbreakBanner → StatCards (2-column grid) → Daily brief → Recent sitreps (chronological, swipeable). The `/map` route is one tap away but is not the default home on phones.

**Tablet (768–1023 px) layout**: inspector collapses to a bottom sheet with three snap points (peek 88 px, half 50%, full 90%). Left rail collapses to icon-only.

### Code — `/internal/*` admin routes

All routes under `apps/web/app/internal/` are auth-gated via middleware. Visual identity: one step darker surface, no accent on chrome, higher information density. Linear Settings aesthetic.

Add Arcjet `shield + detectBot + tokenBucket` on `/internal/*` Server Actions:

```ts
import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/next";
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: [] }), // block all bots on internal routes
    tokenBucket({ mode: "LIVE", refillRate: 10, interval: 60, capacity: 30 }), // 30 req/min burst
  ],
});
```

Apply to all Server Actions under `internal/` that mutate state (escalation ack, source pause toggle, extraction retry). Read-only Server Components on internal routes use `shield + detectBot` only.

**No-PHI CI gate**: the `no-phi.sh` hook ships in Phase 2 as a PreToolUse hook on Write/Edit. Phase 8 lifts the identifier-pattern regex (`\bDOB\b`, `\bMRN\b`, `\bSSN\b`, `\bPatient [A-Z]\b`) into a CI workflow step so it runs on every PR diff, not just on file writes during a Claude Code session:

```yaml
# .github/workflows/ci.yml (add to existing steps)
- name: No-PHI scan
  run: |
    git diff origin/main...HEAD -- '*.ts' '*.tsx' '*.sql' | grep -iE '\b(DOB|MRN|SSN|Patient [A-Z])\b' && exit 1 || exit 0
```

**`apps/web/app/internal/layout.tsx`** — checks auth via `supabase.auth.getUser()` (never `getSession()`); redirects to `/auth/login` on unauthenticated.

**`apps/web/app/internal/cost/page.tsx`** (Server Component):
- Header KPIs: `$XX.YY today` (30-day sparkline) / `$/extraction` / `$/figure-published`.
- Stacked area chart: Anthropic spend by model per day (Sonnet / Haiku / Opus).
- Outliers table: top 10 most expensive extraction runs with links to their `extraction_runs` rows.
- Data source: `audit.anthropic_usage_log` grouped by `(logged_at::date, model_id)`.

**`apps/web/app/internal/pipeline/page.tsx`** (Server Component + Client refresh):
- Inngest run viewer: last 100 runs as a horizontal Gantt-like strip.
- Each row: function name · status pill (`succeeded | failed | running`) · duration · trace ID · retry button (Server Action).
- Success rate as a Sentry-style severity pill.
- Data via Inngest REST API (requires `INNGEST_SIGNING_KEY`).

**`apps/web/app/internal/escalations/page.tsx`** (Client Component for drag-and-drop):
- Four kanban columns: AnomalyDetected · LowConfidence · DisagreementGT25% · SubstringVerifyFail.
- Cards are `incidents` rows. `j`/`k`/`c` keyboard shortcuts for navigate/ack.
- Dragging a card to "Resolved" sets `incidents.status = 'acked'` via Server Action.

**`apps/web/app/internal/quality/page.tsx`** (Server Component):
- Eval scores over time: line charts for extraction F1, citation correctness, hallucination rate.
- Per-source breakdown table.
- Data from Langfuse API (`/api/public/metrics` or direct Postgres query on Langfuse DB).

**`apps/web/app/internal/sources/page.tsx`** (Server Component):
- Parser health table: source slug · last fetch · parser version · failures (7d) · status pill.
- "Pause extraction" toggle (Server Action: sets `sources.extraction_paused = true`).

**`apps/web/app/internal/audit/page.tsx`** (Server Component):
- Paginated append-only log viewer for `audit.agent_actions`.
- Filter by agent / action / figure.
- No edit/delete controls — read-only.

### Code — OG cards

**`apps/web/app/outbreaks/[pathogen]/[country]/[onset]/opengraph-image.tsx`** — `@vercel/og` dynamic OG image:
- 1200 × 630 px.
- Black `--color-fg` on cream `--color-bg`.
- Pathogen + country in 64 px Geist Sans Heading.
- PHEIC/severity pill (Sentry red).
- Headline numbers in 96 px tabular nums: "142 confirmed · 47 deaths".
- ituri-sitrep wordmark bottom-right.
- "Source: WHO DON, 26 May 2026" footer in 14 px Geist Mono.

**`apps/web/app/evidence/[quote-id]/opengraph-image.tsx`** — per-evidence permalink OG:
- Quote body excerpt (Source Serif 4 italic, clamped to 3 lines).
- Severity pill for the associated outbreak.
- "View evidence on ituri-sitrep" CTA.

### Code — embed iframes

**`apps/web/app/embed/[chart-id]/page.tsx`** — embeddable chart page:
- `?theme=light|dark` query param.
- Listens for `postMessage` from parent to sync theme.
- Source line always visible; cannot be disabled.
- `X-Frame-Options: SAMEORIGIN` removed; `Content-Security-Policy: frame-ancestors *` set.

### Code — RSS / Atom feed

**`apps/web/app/feed.xml/route.ts`** (Route Handler):
- Returns Atom 1.0 feed with `application/atom+xml`.
- One entry per major sitrep extraction or status change (query `public.documents` ordered by `published_at desc`, limit 50).
- Each entry includes: title, link to `/sitreps/...`, source name, summary (first 200 chars of `full_text`), `updated` timestamp.

### Code — print stylesheet

**`apps/web/app/outbreaks/[...]/print.css`** (imported via `@media print`):
- Letter / A4, single 680 px column.
- NavRail hidden (`display: none`).
- Each `<Figure>` becomes a numbered footnote (`counter(footnote)`) with the source citation at page bottom.
- `<StatCard>` sparklines replaced with static text values.
- No color fills — grayscale only for printer friendliness.

### Accessibility audit

Full WCAG 2.2 AA audit. Four passes:

**1. axe-core automated scan** — run against all routes in CI:
```bash
npx @axe-core/cli http://localhost:3000/today --stdout | jq '.violations'
# Target: zero violations with impact "critical" or "serious"
```

**2. Lighthouse CI** — `lhci autorun` in `ci.yml`:
```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      http://localhost:3000/today
      http://localhost:3000/outbreaks
      http://localhost:3000/map
      http://localhost:3000/methods
    budgetPath: ./lighthouse-budget.json
    uploadArtifacts: true
```

`lighthouse-budget.json`:
```json
[{ "resourceSizes": [], "scores": [
  { "id": "performance", "minScore": 0.95 },
  { "id": "accessibility", "minScore": 0.95 },
  { "id": "best-practices", "minScore": 0.95 }
]}]
```

**3. Manual NVDA pass** (contracted external reviewer):
- Reviewer navigates `/today`, `/outbreaks`, `/map?view=table`, `/evidence/[id]` using NVDA + Chrome on Windows.
- Checklist: all `<Figure>` values announced with source; `<SeverityPill>` status announced; map tabular view navigable; CommandBar accessible; drawer close is announced; focus trapping correct in drawers/modals.

**4. Sim Daltonism colorblind simulation**:
- Run every chart and map through Sim Daltonism for protan, deutan, tritan.
- All ColorBrewer Reds choropleth classes must be distinguishable in all simulations.
- All `<SeverityPill>` levels must be distinguishable (shape + label + color — never color alone).

**Contrast targets**:
- Body text on surface: ≥ 7:1 (AAA).
- Headline numbers (the things that get screenshotted): ≥ 7:1.
- Status pills on their tinted background: ≥ 4.5:1 (AA).

**Reduced-motion pass**: `prefers-reduced-motion: reduce` removes the last-updated pulse, map camera tween (instant), drawer slide (fade only), page cross-fade. Verify no motion loops remain.

---

## Tests

### Vitest

**`apps/web/components/map/__tests__/mobile-inspector.test.tsx`** — renders `<MobileInspector>` with mock entity, asserts vaul `snapPoints` are set to `[0.12, 0.5, 0.92]`, asserts drag handle is present with `aria-hidden="true"`.

**`apps/web/app/internal/__tests__/auth.test.tsx`** — mocks `supabase.auth.getUser()` returning `{ data: { user: null } }`, asserts the layout redirects to `/auth/login`.

**`apps/web/app/feed.xml/__tests__/route.test.ts`** — asserts the response `Content-Type` is `application/atom+xml`, asserts the XML parses, asserts each entry has a `<link>` element.

### Playwright

**`apps/web/e2e/mobile.spec.ts`**:
```ts
test("mobile /map shows vaul bottom sheet at peek snap", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/map");
  await expect(page.locator("[data-vaul-drawer]")).toBeVisible();
  // Snap point 0.12 = 80px height approx
  const box = await page.locator("[data-vaul-drawer]").boundingBox();
  expect(box?.height).toBeLessThan(120);
});

test("mobile bottom-tab navigation is visible", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/today");
  await expect(page.locator("[data-bottom-tab-nav]")).toBeVisible();
});
```

**`apps/web/e2e/og-card.spec.ts`**:
```ts
test("/evidence/[id] OG image renders with severity pill", async ({ page }) => {
  // Use a real evidence ID from the test DB
  await page.goto("/evidence/[test-quote-id]/opengraph-image");
  await expect(page.locator("body")).not.toBeEmpty();
  // Check that the image response is 200 and content-type is image/png
});
```

**`apps/web/e2e/accessibility.spec.ts`** — axe-core assertions for each major route:
```ts
import { checkA11y } from "axe-playwright";
for (const route of ["/today", "/outbreaks", "/map?view=table", "/methods"]) {
  test(`${route} has zero critical a11y violations`, async ({ page }) => {
    await page.goto(route);
    await checkA11y(page, undefined, { runOnly: ["wcag2aa"] });
  });
}
```

---

## Tooling

- `vaul` — mobile bottom-sheet.
- `@vercel/og` — OG card generation.
- `axe-playwright` / `@axe-core/cli` — automated accessibility testing.
- `lighthouse-ci` (`@lhci/cli`, treosh/lighthouse-ci-action) — Lighthouse CI integration.
- `lhci autorun` — automated Lighthouse runs in CI.

---

## Verification

```bash
# 1. Mobile layout test
pnpm playwright test e2e/mobile.spec.ts
# Expected: all green on 375px viewport.

# 2. Lighthouse CI
npx lhci autorun
# Expected: performance 95+, accessibility 95+, best-practices 95+ on all routes.

# 3. axe-core scan
npx @axe-core/cli http://localhost:3000/today --stdout | jq '[.violations[] | select(.impact == "critical" or .impact == "serious")] | length'
# Expected: 0

# 4. RSS feed
curl http://localhost:3000/feed.xml | xmllint --noout -
# Expected: valid Atom XML (no parse errors).

# 5. OG card
curl -I http://localhost:3000/outbreaks/bundibugyo/cod/2026-04-20/opengraph-image
# Expected: 200 OK, Content-Type: image/png

# 6. Print stylesheet
pnpm playwright test e2e/print.spec.ts --project=chromium
# Expected: NavRail not present in print layout; Figure footnotes render.

# 7. External screen-reader pass (manual, contracted)
# Reviewer completes NVDA checklist.
# Expected: all items pass.

# 8. Colorblind simulation (manual)
# Run Sim Daltonism on /today, /map screenshots.
# Expected: all choropleth classes distinguishable; severity pills distinguishable by shape + label.
```

---

## Exit gate

Lighthouse ≥ 95 across performance / accessibility / best-practices on iPhone SE viewport (375 × 667 px); a contracted external screen-reader reviewer (NVDA + Chrome) reports the platform is navigable end-to-end; the tweet-card preview of a `/evidence/q_…` URL renders with the correct severity pill at 1200 × 630 px; zero critical axe-core violations on all major routes.

---

## Research cross-references

- [ui.md §2.4 — /map mobile wireframe](../../research/ui.md#24-map-mobile-375px)
- [ui.md §9 — /internal/* wireframes](../../research/ui.md#9x-internal-auth-gated-linear-settings-aesthetic)
- [ui.md §10.0 — /evidence permalink](../../research/ui.md#100-evidencequote-id--permalink)
- [ux.md §13 — Accessibility](../../research/ux.md#13-accessibility-wcag-22-aa-target-aaa-on-critical-numbers)
- [ux.md §14 — Responsive & mobile](../../research/ux.md#14-responsive--mobile)
- [ux.md §19 — Social / shareability](../../research/ux.md#19-social--shareability)
- [ux.md §20 — Polish checklist](../../research/ux.md#20-the-feels-like-linear--stripe--ft-polish-checklist)

---

## Structured data — JSON-LD

*Source: [`research/copy.md`](../../research/copy.md) §4.3.*

### Implementation

Add a `<JsonLd>` Server Component to [`apps/web/components/seo/json-ld.tsx`](../../apps/web/components/seo/json-ld.tsx) that renders a `<script type="application/ld+json">` tag. Import in the relevant `page.tsx` files below.

### `WebSite` + `Person` — `apps/web/app/layout.tsx`

```ts
const WebSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ituri-sitrep",
  url: "https://ituri-sitrep.org",
  author: {
    "@type": "Person",
    name: "Thomas Nicklin",
    affiliation: { "@type": "Organization", name: "University of Western Australia" },
    sameAs: [
      "https://orcid.org/[ORCID]",
      "https://github.com/BhodiSea",
    ],
  },
  description:
    "A situational-awareness companion for the 2026 Ituri Bundibugyo virus outbreak. Extracts structured signals from public WHO, AFRO, ECDC, and Africa CDC documents with LLM assistance; anchors every figure to its source sentence.",
};
```

### `Dataset` — `apps/web/app/methods/page.tsx`

```ts
const DatasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "ituri-sitrep outbreak data",
  description: "Structured epidemiological figures extracted from WHO, AFRO, ECDC, and Africa CDC documents. Every figure is linked to its verbatim source sentence.",
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: { "@type": "Person", name: "Thomas Nicklin" },
  dateModified: new Date().toISOString(),
  spatialCoverage: "Democratic Republic of the Congo",
  temporalCoverage: "2026/..",
  isBasedOn: [
    "https://www.who.int/emergencies/disease-outbreak-news",
    "https://www.afro.who.int/",
    "https://www.ecdc.europa.eu/en/threats-and-outbreaks",
  ],
};
```

Powers **Google Dataset Search** (datasetsearch.research.google.com) — the primary target audience (researchers) uses Dataset Search actively.

### `MedicalCondition` — outbreak detail page

```ts
const MedicalConditionSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalCondition",
  name: "Bundibugyo virus disease",
  alternateName: ["BDBV", "Bundibugyo Ebola"],
  code: { "@type": "MedicalCode", code: "1D60.00", codingSystem: "ICD-11" },
  relevantSpecialty: "Infectious disease",
};
```

### `NewsArticle` — daily brief pages

```ts
// apps/web/app/brief/[date]/page.tsx
const NewsArticleSchema = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: `Bundibugyo Outbreak — What Changed (${date})`,
  datePublished: date,
  dateModified: date,
  author: { "@type": "Person", name: "Claude Sonnet 4.6", description: "AI summarisation" },
  publisher: { "@type": "Person", name: "Thomas Nicklin" },
  about: { "@type": "MedicalCondition", name: "Bundibugyo virus disease", "code": "1D60.00" },
};
```

`NewsArticle` replaces the deprecated `SpecialAnnouncement` schema type (deprecated by Google July 31, 2025).

### `BreadcrumbList` — every page

```ts
// util: buildBreadcrumbs(segments: Array<{name: string, url: string}>)
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: segments.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: s.name,
    item: s.url,
  })),
}
```

---

## SEO & GEO — Generative Engine Optimization

*Source: [`research/copy.md`](../../research/copy.md) §4.*

### YMYL and E-E-A-T

ituri-sitrep publishes health information about an active disease outbreak — this is YMYL content (Google September 11, 2025 update expanded YMYL to include "Government, Civics & Society" content affecting trust in public institutions). Google's raters look for: author credentials, editorial process transparency, citations to authoritative sources, clear provenance, and accurate current information. All of these are natively satisfied by the existing architecture if the copy surfaces them correctly.

**E-E-A-T signals to embed:**
- **Experience + Expertise:** author bio on Methods page with UWA affiliation, ORCID, field relief experience in Dominica.
- **Authoritativeness:** every page links upstream to WHO/AFRO/ECDC/MoH. The site positions itself as a convenience layer, not a competing authority.
- **Trustworthiness:** provenance tooltips, source-sentence linking, explicit limitation disclosure, HTTPS, no paywalls, no ads.

### Dynamic `robots.ts` and `sitemap.ts`

```ts
// apps/web/app/robots.ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://ituri-sitrep.org/sitemap.xml",
  };
}
```

```ts
// apps/web/app/sitemap.ts
import type { MetadataRoute } from "next";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const zones  = await fetchAllZoneCodes();   // geo.admin1.code
  const briefs = await fetchRecentBriefs(30); // last 30 daily briefs
  return [
    { url: "/",        changeFrequency: "daily",   priority: 1.0 },
    { url: "/today",   changeFrequency: "daily",   priority: 0.9 },
    { url: "/methods", changeFrequency: "monthly", priority: 0.8 },
    ...zones.map(c  => ({ url: `/zone/${c}`,       changeFrequency: "daily" as const, priority: 0.7 })),
    ...briefs.map(d => ({ url: `/brief/${d}`,      changeFrequency: "never" as const, priority: 0.6 })),
  ];
}
```

### URL structure (canonical)

| Path | Content |
|------|---------|
| `/` | redirect to `/today` |
| `/today` | live landing — choropleth + stats |
| `/outbreaks/[pathogen]/[country]/[onset]` | outbreak detail |
| `/zone/[code]` | health-zone drill-down (re-scoped from Phase 4) |
| `/document/[id]` | source document explorer |
| `/brief/[date]` | daily "What Changed" brief |
| `/methods` | methods, sources, limitations, author |
| `/about/data-sources` | source terms-of-use posture (Phase 4) |
| `/feed.xml` | RSS/Atom (Phase 8 above) |

### Per-page `<title>` and `<meta description>` templates

```ts
// apps/web/app/today/page.tsx — metadata export
export const metadata = {
  title: "Bundibugyo Virus Outbreak 2026 — Ituri, DRC | Live Map & Source-Linked Data",
  description: "Hover any figure to see the exact WHO or AFRO source sentence it came from. Updated within hours of source publication.",
};

// Zone drill-down
title: `${zoneName} — BDBV Case Data | ituri-sitrep`

// Document explorer
title: `${source} ${date} — Extracted Data & Source Quotes | ituri-sitrep`

// Daily brief
title: `What Changed — ${date} | Bundibugyo Outbreak Daily Update`

// Methods
title: "Methods & Data Sources — How ituri-sitrep Tracks the 2026 Bundibugyo Outbreak"
```

### GEO — LLM-discoverability patterns

AI search systems (Google AI Overviews, ChatGPT, Perplexity, Claude) increasingly mediate between queries and content. Ahrefs reported AI Overviews on 48% of U.S. searches in March 2026 (up 58% YoY). Structure content for extraction:

- **Front-load the answer** in the first 200 words of every page. Never start with a methodology preamble.
- **≤2–3 sentences per paragraph.** Long blocks are not extractable.
- **Precise epidemiological terminology:** "suspected cases," "confirmed cases," "case fatality rate," "health zone" — not vague synonyms. AI systems prefer the exact terminology that matches their training data for infectious disease.
- **Structured summary block** at the top of every outbreak page (≤200 words): date, total suspected/confirmed, active health zones, CFR, key recent change. This block is the AI citation target.
- **`llms.txt`** for AI crawlers: add `apps/web/public/llms.txt` listing the site's authoritative pages, purpose, and citation policy.
- **Original, timestamped data** — Yext's analysis of 17.2M AI citations (Q4 2025) found first-party websites generate 4.31× more citation occurrences per URL than third-party directory listings. The daily brief + zone drill-down are primary data.

### Dynamic OG images via `@vercel/og`

Replace the static `opengraph-image.png` with dynamic `ImageResponse` generators per page type (Phase 8 already scopes this for outbreak detail and evidence pages — extend to landing and brief pages):

- **Landing card:** simplified choropleth thumbnail + "N confirmed · M deaths as of {date}."
- **Zone card:** zone name + latest case count + severity pill.
- **Brief card:** date + headline change (first bullet of the daily brief).
- **Evidence card:** quote excerpt + source + severity pill.

---

## A11y refinements

*Source: [`research/copy.md`](../../research/copy.md) §6.*

### Alt-text pattern for maps and charts

Every `<svg>`, `<canvas>`, and raster image requires an `alt` (or `aria-label`) following this pattern:

```
[Element type] of [geographic scope] [coloured/visualising] by [variable] as of [date].
[Named entity] shows the [superlative] at [value].
```

Example: "Choropleth map of DRC health zones in Ituri Province, coloured by suspected Bundibugyo virus case count as of 22 May 2026. Irumu health zone shows the highest count at 142 suspected cases."

Add this pattern to the `<MapPane>` and all Visx chart components as a required `aria-label` prop.

### Language target

- **Flesch-Kincaid Grade 10–12.** Comparable to Scientific American and The Lancet's news/comment section (research articles in those publications score Grade 14+; target is the accessible explainer layer).
- **Preserve epidemiological terms.** "Case fatality rate" is the correct term; "death rate" means something different in epidemiology. Define terms on first use via `<GlossaryTerm>` (already in Phase 3 deliverables).
- **Do not simplify at the expense of accuracy.** Abbreviate verbosely only when the spelled-out form appears above on the same page.

### French translation — Stage 3 goal block

Explicitly scope for Phase 8: add `hreflang="fr"` `<link>` elements to all page `<head>` elements as a placeholder for Stage 3. Do not block the Phase 8 exit gate on translations. When French ships:
- `/methods` and `/brief/[date]` are the highest-impact pages for DRC/Francophone public health community.
- `next-intl` or `paraglide-js` for the translation layer.
- `hreflang` pair: `en` (primary) ↔ `fr` (Stage 3).

---

## ICD-11 reference table

*Source: [`research/copy.md`](../../research/copy.md) Appendix A. Verified against WHO ICD-11 browser (icd.who.int).*

These codes must appear correctly in all JSON-LD, extraction schema, and rendered copy. Add this table to the `/methods` page as a named section.

| Entity | ICD-11 Code | Notes |
|--------|-------------|-------|
| Bundibugyo virus disease | **1D60.00** | Under 1D60.0 Ebola disease. **Not 1D64.0 (invalid).** |
| Ebola virus disease (Zaire) | 1D60.01 | The "classic" EBOV species. |
| Sudan virus disease | 1D60.02 | |
| Marburg virus disease | **1D60.10** | Under 1D60.1 Marburg disease. |

Verification gate: `grep -r "1D64\|1D24\.0" apps/` must return zero matches before Phase 8 exit.

---

## Out of scope

- Full WCAG AAA audit (post-launch; Phase 8 targets AA with AAA on body text and headline numbers).
- Multi-language FR/Swahili full localization (v2; `?lang=` toggle is Phase 8 but full localization deferred).
- Pathoplexus / Nextstrain genomic lineage tab (v2).
- Multi-tenant agent surfaces (v2).
- EpiNow2 / Modal Rt nowcasting (v2; ADR-0009).
