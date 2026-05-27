# Phase 3 — Design system + provenance UI primitives

## Goal

Stand up the "Calm Command Center" design system — Tailwind v4 OKLCH tokens, Geist Sans + Geist Mono + Source Serif 4, shadcn/Radix primitive initialization, the global chrome (TopBar + NavRail + CommandBar) — and build the three provenance-UI primitives that every subsequent phase depends on: `<Figure>`, `<SourceQuoteCard>`, and `<SourceQuoteDrawer>`. Prove them end-to-end against real Phase 2 `source_quotes` data on the `/methods` and `/evidence/[quote-id]` routes. At the end of this phase, hovering a `<Figure>` on `/methods` opens a real quote from the database in a 320 px card, and clicking opens a 480 px drawer with the full chain of custody.

---

## Entry preconditions

- Phase 2 exit gate met: at least one real `source_quotes` row with a verified `quote_text` exists in the database.
- `apps/web/` is the active Next.js 15 App Router app in the monorepo.
- Tailwind v4 is installed in `apps/web/`.
- shadcn CLI is available (`pnpm dlx shadcn@latest`).

---

## Deliverables

### Code — design tokens

**`apps/web/app/globals.css`** — Tailwind v4 `@theme` block with OKLCH semantic tokens:

```css
@import "tailwindcss";

@theme {
  /* Surfaces */
  --color-bg: oklch(99% 0.003 247);
  --color-surface-1: oklch(98% 0.005 247);
  --color-surface-2: oklch(96% 0.006 247);
  --color-surface-3: oklch(93% 0.008 247);
  --color-border: oklch(89% 0.01 247);
  --color-border-strong: oklch(80% 0.012 247);

  /* Text */
  --color-fg: oklch(18% 0.02 260);
  --color-fg-muted: oklch(45% 0.015 260);
  --color-fg-subtle: oklch(60% 0.012 260);

  /* Accent */
  --color-accent: oklch(48% 0.18 240);
  --color-accent-fg: oklch(99% 0.003 247);

  /* Severity — Sentry-derived */
  --color-emergency: oklch(50% 0.22 25);   /* ≈ #CF2126 */
  --color-alert:     oklch(64% 0.2 25);    /* ≈ #F55459 */
  --color-warn:      oklch(83% 0.16 92);   /* ≈ #FFC227 */
  --color-info:      var(--color-fg-muted);

  /* Provenance quote highlight */
  --color-quote-bg:  oklch(96% 0.06 95);
  --color-quote-fg:  oklch(28% 0.05 95);

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-pill: 9999px;
}

/* Dark mode — use :root selector, NOT @theme, inside @media.
   @theme is a build-time Tailwind directive and cannot be nested in @media. */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: oklch(14% 0.010 260);
    --color-surface-1: oklch(18% 0.010 260);
    --color-surface-2: oklch(22% 0.010 260);
    --color-surface-3: oklch(26% 0.012 260);
    --color-border: oklch(32% 0.015 260);
    --color-border-strong: oklch(40% 0.015 260);
    --color-fg: oklch(95% 0.005 247);
    --color-fg-muted: oklch(65% 0.010 260);
    --color-fg-subtle: oklch(50% 0.010 260);
  }
}
/* [data-theme="dark"] selector for JS-controlled theme toggle */
[data-theme="dark"] {
  --color-bg: oklch(14% 0.010 260);
  --color-surface-1: oklch(18% 0.010 260);
  --color-surface-2: oklch(22% 0.010 260);
  --color-surface-3: oklch(26% 0.012 260);
  --color-border: oklch(32% 0.015 260);
  --color-border-strong: oklch(40% 0.015 260);
  --color-fg: oklch(95% 0.005 247);
  --color-fg-muted: oklch(65% 0.010 260);
  --color-fg-subtle: oklch(50% 0.010 260);
}

/* Pre-hydration theme script prevents flash */
```

**Theme pre-hydration script** (inline in `apps/web/app/layout.tsx` `<head>`): reads `localStorage.theme` or `prefers-color-scheme`, sets `data-theme` on `<html>` before React hydrates.

**`apps/web/tailwind.config.ts`** — extend with ColorBrewer Reds 5-class and Okabe-Ito categorical palette as named utilities.

### Code — fonts

In `apps/web/app/layout.tsx`, configure fonts via `next/font/google`:

```ts
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif-4",
});
```

Note: if the existing `with-supabase` template uses `next/font/local` for Geist, keep that pattern and add Source Serif 4 as a `next/font/google` import alongside it. Do not mix both patterns for the same font.

Apply `font-feature-settings: "ss01", "cv11"` on Geist for unambiguous `0/O` and `l/1`. Set `font-variant-numeric: tabular-nums slashed-zero` on `[data-numeric]`.

### Code — shadcn init

```bash
pnpm dlx shadcn@latest init
# Choose: TypeScript, Tailwind v4, App Router, no src/ dir
# Install primitives used in Phase 3:
pnpm dlx shadcn@latest add button input label badge card sheet hover-card
```

### Code — global chrome

**`apps/web/components/layout/top-bar.tsx`** (Server Component):
- 56 px height, 1px `border-b --color-border`.
- Logo "is" wordmark (left), nav links (Today / Map / Outbreaks / Sitreps / Sources / Methods), ⌘K trigger button, live pulse indicator, theme toggle.

**`apps/web/components/layout/nav-rail.tsx`** (Client Component — needs `useState` for collapse):
- 60 px collapsed / 240 px expanded, toggled with `[` key.
- Icons: Lucide, 24 px nominal, 1.5 px stroke.
- Active item: 2 px left bar in `--color-emergency`.

**`apps/web/components/command-bar.tsx`** (Client Component — `'use client'`):
- Built on `cmdk` library.
- Opens on `⌘K` / `Ctrl+K`.
- 640 px wide, 8 result groups: Outbreaks · Pathogens · Countries · Sources · Sitreps · Layers · Time windows · Definitions.
- Opens with 220 ms scale + opacity, backdrop blur 8 px.
- Lazy-loaded (`dynamic(() => import(...), { ssr: false })`).

### Code — provenance primitives

**`apps/web/components/provenance/figure.tsx`** — the atom:

```tsx
// Server Component renders the value + a Client subtree for interaction
interface FigureProps {
  value: React.ReactNode;
  quoteId: string;
  variant?: "inline" | "stat" | "pill" | "axis";
  srLabel?: string;
}
```

Visual: 1 px dotted underline at 60% opacity `--color-accent` on the number itself. `cursor: help`. 80 ms hover delay → `<SourceQuoteCard>`. Click → `<SourceQuoteDrawer>`. `aria-describedby` references a hidden `<span>` with "Source: {authority}, {date}. Click to view evidence."

**`apps/web/components/provenance/source-quote-card.tsx`** (Client Component — shadcn `HoverCard`):
- 320 × 220 px, `--shadow-2`, `--radius-md`.
- Built on `@radix-ui/react-hover-card` via shadcn. Use `HoverCard.Root openDelay={80} closeDelay={100}` — Radix `HoverCard` (not `Popover`) supports delay-based hover open/close. `Popover` is click-triggered only.
- 80 ms hover delay, 300 ms ease-out fade-in (per ux.md §10 motion table).
- Source name in 13 px Geist Mono `--color-fg-muted`.
- Quote body in Source Serif 4 italic 14/1.5.
- "Click for full evidence →" link at bottom.

**`apps/web/components/provenance/source-quote-drawer.tsx`** (Client Component — shadcn `<Sheet side="right">`):
- `side="right"`, 480 px width.
- 300 ms ease-out entry / 220 ms ease-in exit.
- Sections: source authority header (ProvenanceBadge), verbatim quote (Source Serif 4 16/1.6 italic), "Used in N figures" list, chain of custody table, citation copier (Plain / BibTeX / APA tabs), multi-source comparison mini-table.
- Keyboard: `Esc` close, `c` copy citation, `o` open original, `e` go to `/evidence/[id]`.

**`apps/web/components/provenance/severity-pill.tsx`** — four levels (`info | warn | alert | emergency`). 4 px colored dot prefix (Sentry pattern). Background uses 100/200 alpha of severity token; text uses 400.

**`apps/web/components/provenance/ai-generated-label.tsx`** — 12 px Geist Mono `--color-fg-muted`, `✦` prefix glyph, hover tooltip with model version + review status.

**`apps/web/components/provenance/provenance-badge.tsx`** — source authority chip with tier dot.

**`apps/web/components/provenance/last-updated-indicator.tsx`** — pulsing 4 px disc + relative time. Pulse animation: `scale(1.0) → scale(1.15)` over 1.6 s ease-in-out infinite. `prefers-reduced-motion: reduce` → static.

**`apps/web/components/provenance/skeleton-chart.tsx`** and **`skeleton-map.tsx`** — match real-component dimensions; 1.2 s gradient sweep at 4% opacity.

**`apps/web/components/provenance/glossary-term.tsx`** — dotted underline in `--color-accent` (different shade from `<Figure>`). Radix HoverCard with definition + `/methods` link.

### Code — routes

**`apps/web/app/methods/page.tsx`** (Server Component):
- Source Serif 4 long-form, 640 px `max-w` column, FT/NYT editorial voice.
- Seven sections: Tier-1 sources / Tier-2 sources / Tier-3 sources / The extraction pipeline / Anomaly detection / What we do not publish / Corrections policy.
- Embeds real `<Figure>` components against actual `source_quotes` rows fetched from Supabase server client. This is the first page that proves the provenance round-trip.
- Example: "As of Phase 2's WHO DON test extraction, we confirmed <Figure value={105} quoteId={realQuoteId} /> confirmed cases..."

**`apps/web/app/evidence/[quote-id]/page.tsx`** (Server Component):
- Permalink page for a `source_quotes` row.
- Fetches the row + parent `documents` row + `extraction_runs` rows that reference it.
- Renders: source header, verbatim quote (Source Serif 4 italic 16/1.6), "Used in N figures" list, chain of custody, citation copier.
- OG metadata: `title: "Evidence: {quoteId} — ituri-sitrep"`.

---

## Tests

### Vitest

**`apps/web/components/provenance/__tests__/figure.test.tsx`** — renders `<Figure value={42} quoteId="test-id" />`, asserts dotted-underline class is present, asserts `aria-describedby` points to a hidden span with "Source:".

**`apps/web/components/provenance/__tests__/source-quote-card.test.tsx`** — simulates hover after 80 ms delay, asserts Radix Popover content is visible.

**`apps/web/components/provenance/__tests__/severity-pill.test.tsx`** — asserts each of the four levels renders the correct dot color class.

**`apps/web/components/provenance/__tests__/ai-generated-label.test.tsx`** — asserts `✦` prefix is present and text includes "Auto-generated".

### Playwright

**`apps/web/e2e/methods-provenance.spec.ts`**:
```ts
test("Figure on /methods opens SourceQuoteCard on hover", async ({ page }) => {
  await page.goto("/methods");
  const figure = page.locator("[data-figure]").first();
  await figure.hover();
  await page.waitForTimeout(200); // wait for 80ms delay + 300ms animation
  await expect(page.locator("[data-source-quote-card]")).toBeVisible();
});

test("click SourceQuoteCard opens SourceQuoteDrawer", async ({ page }) => {
  await page.goto("/methods");
  const figure = page.locator("[data-figure]").first();
  await figure.click();
  await expect(page.locator("[data-source-quote-drawer]")).toBeVisible();
  await expect(page.locator("[data-source-quote-drawer]")).toContainText("Chain of custody");
});
```

---

## Tooling

- `cmdk` — command bar.
- shadcn `hover-card` — provenance hover card (`pnpm dlx shadcn@latest add hover-card`). Uses `@radix-ui/react-hover-card` which supports `openDelay`/`closeDelay`. Do NOT import `@radix-ui/react-popover` directly — use the shadcn wrapper to avoid version conflicts with other shadcn components.
- shadcn `sheet` — provenance drawer (shadcn wraps Radix Dialog with directional slide animation).
- `lucide-react` — icon library.
- `next/font/google` — Geist Sans, Geist Mono, Source Serif 4.

---

## Verification

```bash
# 1. Type check
pnpm --filter apps/web typecheck
# Expected: zero errors.

# 2. Unit tests
pnpm --filter apps/web test
# Expected: all green, including provenance component tests.

# 3. Dev server
pnpm --filter apps/web dev
# Navigate to /methods
# Expected: Source Serif 4 prose renders; <Figure> components present.
# Hover a <Figure>: SourceQuoteCard appears after ~380ms with real quote text (80ms hover delay + 300ms fade-in).
# Click: SourceQuoteDrawer slides in from right with chain of custody.

# 4. Performance (manual)
# On a throttled 4× CPU browser devtools, hover→click the Figure chain.
# Expected: no jank; Drawer opens within 300ms.

# 5. Reduced motion
# In OS: enable "Reduce motion".
# Expected: Drawer appears without slide animation (immediate opacity change).

# 6. Keyboard navigation
# Tab to a <Figure>, press Enter.
# Expected: SourceQuoteDrawer opens; Esc closes it.
```

If HoverCard flickers on hover: ensure `openDelay={80}` is on `HoverCard.Root`, not `HoverCard.Trigger`. If the card appears instantly with no delay, check that the trigger is not wrapped in a `Tooltip` or other Radix primitive that short-circuits hover state.  
If dark mode flash: confirm the pre-hydration inline script runs before React hydrates (add to `<head>` with `dangerouslySetInnerHTML`, no `defer`).

---

## Exit gate

Hovering any `<Figure>` on `/methods` opens the `<SourceQuoteCard>` with a real quote from `public.source_quotes`; clicking it opens the `<SourceQuoteDrawer>` with the full chain of custody; both transitions feel right at 60 fps on a $300 Chromebook (no dropped frames in Chrome DevTools Performance recording).

---

## Research cross-references

- [ux.md §2 — Design language synthesis](../../research/ux.md#2-the-synthesis--a-single-named-design-language)
- [ux.md §6 — Provenance-first UX](../../research/ux.md#6-provenance-first-ux--the-signature-pattern)
- [ux.md §9 — Color system](../../research/ux.md#9-color-system--semantic-and-accessible)
- [ux.md §10 — Interaction & Motion](../../research/ux.md#10-interaction--motion)
- [ui.md §3 — Component wireframes](../../research/ui.md#3--component-wireframes-every-primary-state)
- [ui.md §1.0 — Global chrome](../../research/ui.md#10-global-chrome-every-route)

---

## Out of scope

- `/today`, `/outbreaks`, `/sitreps`, `/sources` routes (Phase 4).
- MapLibre, deck.gl, or any map components (Phase 5, with stub in Phase 4).
- TimeScrubber or Visx chart components (Phase 5).
- The full `<StatCard>` component (Phase 4 — needs real case_counts data).
- Internal admin routes `/internal/*` (Phase 8).
- OG cards (Phase 8).
- Mobile bottom-sheet (Phase 8).
