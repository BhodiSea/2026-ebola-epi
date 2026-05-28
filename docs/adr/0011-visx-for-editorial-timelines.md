# ADR-0011 — Visx for Editorial Timelines

**Status:** Accepted  
**Date:** 2026-05-28  
**Deciders:** Thomas Nicklin

## Context and Problem Statement

Phase 4 requires a `<TimelineMulti>` component that renders confirmed + deaths daily case series on outbreak detail pages. The component must: support two overlaid line series, render a direct-label (no legend), respect `prefers-reduced-motion`, and be isolated to the outbreak-detail bundle (not ship on `/today` which has a < 10 s journalist cold-load gate).

## Decision Drivers

* Bundle must be code-split from the `/today` route
* React 19 + concurrent-mode compatible
* Composable enough to extend to a `<TimeScrubber>` brush overlay (Phase 5)
* Minimal in-house SVG math — we already pay the D3 cost for PostGIS geo

## Considered Options

1. **Visx (`@visx/xychart` + `@visx/brush`)**
2. Recharts
3. Bare D3 (react-d3 bindings)

## Decision Outcome

**Chosen option: Visx**, because it is React-first (no imperative D3 mutations), composable at the primitive level (XYChart → LineSeries), and `@visx/brush` is a first-class addon for Phase 5's scrubber with no additional library swap.

### Positive Consequences

* `XYChart` declarative API matches RSC/client-island pattern: `<TimelineMulti>` is `'use client'` wrapped in `<Suspense>`, no RSC leakage.
* `@visx/brush` reuses the same scale context as `XYChart` — Phase 5 scrubber needs no refactor.
* Tree-shaking: importing `@visx/xychart` and `@visx/brush` alone adds ~40 kb gz to the outbreak-detail bundle, not to the root bundle.

### Negative Consequences

* ~40 kb gz bundle added to outbreak-detail routes (mitigated: Suspense boundary keeps it off `/today`).
* Visx requires more boilerplate than Recharts for scale configuration.

## Alternatives Considered

**Recharts:** Heavier bundle (~70 kb gz), less composable for custom overlays, no direct brush integration. Rejected.

**Bare D3:** No React integration layer — requires manual `useEffect` imperative rendering. Adds cognitive complexity and breaks concurrent-mode compatibility. Rejected.

## Links

* Phase 4 spec: `docs/v1/phase-4-editorial-surfaces.md` §Timeline
* Phase 5 scope: `docs/v1/phase-5-interactive-map.md` (forthcoming) — scrubber reuse
