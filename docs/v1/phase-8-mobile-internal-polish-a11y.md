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

## Out of scope

- Full WCAG AAA audit (post-launch; Phase 8 targets AA with AAA on body text and headline numbers).
- Multi-language FR/Swahili full localization (v2; `?lang=` toggle is Phase 8 but full localization deferred).
- Pathoplexus / Nextstrain genomic lineage tab (v2).
- Multi-tenant agent surfaces (v2).
- EpiNow2 / Modal Rt nowcasting (v2; ADR-0009).
