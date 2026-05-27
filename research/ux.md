# ituri-sitrep — UX & Design Blueprint

## A delivery-grade brief for a solo developer

## TL;DR

- **Build a "Calm Command Center": Linear's spatial discipline and keyboard physics + FT/Reuters editorial restraint + Sentry's severity grammar + Anthropic-style typographic humility**, rendered light-first (with parity dark), built on Geist Sans + Geist Mono with shadcn/Radix primitives, MapLibre + deck.gl, and Tailwind v4 OKLCH tokens.
- **Source-quote-on-hover is the project's signature interaction** and must be implemented as a first-class component (`<Figure>`), never as a tooltip afterthought; every number, pill, and chart annotation carries `source_quote_id` and exposes a three-state provenance affordance (inline marker → hover quote card → click evidence drawer).
- **Three-pane hybrid command center** (left nav → center map/detail → right inspector) with a multi-track timeline pinned below the map, Linear-style `g`-prefix navigation + ⌘K palette, progressive-disclosure narrative summaries at the top of every entity page, and an Okabe-Ito categorical palette + ColorBrewer Reds sequential for misinformation-resistant outbreak visualization.

## Key Findings

1. **No single exemplar fits.** Linear's keyboard density would alienate journalists; pure OWID would underserve epidemiologists; Johns Hopkins-style ArcGIS dashboards now read as dated and have documented misinformation pitfalls (the "Null Island" red dot incident).
2. **The Linear motion vocabulary is short ease-out tweens, not springs.** Emil Kowalski (Linear design engineer) publishes the actual recipe in "The Easing Blueprint" on animations.dev: 150 ms ease-out for press, exactly 300 ms ease-out for entering panels and dropdowns. That, plus Linear's "speed is a feature" stance, gives a defensible motion baseline without inventing physics.
3. **Sentry's severity tokens are public and citable.** From `getsentry/sentry`'s `theme.tsx`: `red400 #CF2126`, `red300 #F55459`, and (per Sentry's "Building Dark Mode" engineering post) `yellow300 #FFC227`, with 100/200 alpha variants as row backgrounds. Sentry intentionally does _not_ hue-code "info" — it is neutral surface.
4. **Geist's typography system is a four-axis (Heading / Button / Label / Copy) ramp, not H1–H6.** Adopt Geist Sans + Geist Mono as the only families; reserve Mono for numerics, identifiers, and timestamps.
5. **Provenance-first UX has no off-the-shelf precedent.** No exemplar (Linear, Stripe, Sentry, NYT, OWID, BlueDot, HealthMap) implements "every figure shows its source sentence on hover." This is the platform's distinguishing affordance.
6. **Public health dashboards consistently fail in three ways**: truncated y-axes, red-only choropleths that misread to colorblind users, and absent provenance. The platform turns each into a feature: zero-baseline lock, Okabe-Ito + ColorBrewer Reds, and `<Figure>` provenance everywhere.

## Details

### 1. North Star — what to borrow, what to refuse

| Exemplar                          | Borrow                                                                                                                                                                                                              | Refuse                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Linear**                        | `g`-prefix nav, ⌘K palette, dense list-inspector, 150/300 ms ease-out motion, focus-visible discipline, keyboard help overlay                                                                                       | Dark-only default; purple-heavy chrome; aggressive triage colors                                 |
| **Vercel / Geist**                | Geist Sans + Geist Mono, four-axis type system, monochrome chrome + single accent, generous negative space, dynamic OG cards via `@vercel/og`                                                                       | Marketing-page motion flourishes; pixel-font novelty                                             |
| **Stripe**                        | Calm payment-grade trust signaling, sparklines next to KPIs, error copy as a design problem, progressive disclosure on details                                                                                      | Stripe purple (#635BFF); commerce-flavored microcopy                                             |
| **Sentry**                        | Severity grammar (`red400 / red300 / yellow300 / neutral-info`), status pills, sparkline density, "writing is hard" content discipline                                                                              | Pink-purple chrome; dark-only aesthetic                                                          |
| **GitHub**                        | Status pills, timeline-of-events for sitreps, scoped accent                                                                                                                                                         | Glassmorphism in github.com's recent redesign                                                    |
| **Plaid / Cloudflare**            | Hierarchical entity drill-down (country → admin1 → admin2), live-data pulse on last-updated                                                                                                                         | Globe metaphor (wrong scale for a focused outbreak; flat admin1 choropleth is more honest)       |
| **Anthropic / Claude.ai**         | Editorial restraint, generous prose breathing room, serif-for-narrative + sans-for-UI pairing (Claude pairs Commercial Type's Styrene B with Klim's Tiempos Text — we approximate with Geist Sans + Source Serif 4) | Centered single-column app shell (wrong for a command center)                                    |
| **Notion / Figma**                | Inline definitions on hover; multi-cursor as a design signal on the internal/admin surface                                                                                                                          | Multiplayer ornamentation on the public surface                                                  |
| **FT / Reuters / NYT graphics**   | FT Visual Vocabulary chart-selection logic, annotated peaks, scrollytelling for explainers, direct labeling over legends                                                                                            | Scrollytelling as primary navigation — for a live dashboard it would be infantilizing to experts |
| **Our World in Data / IHME**      | Methodology link from every chart, zero-baseline lock, source line under every figure, small multiples                                                                                                              | Single-explorer-fits-all dropdown UX; overwhelms novices                                         |
| **Johns Hopkins COVID dashboard** | Spatial granularity at admin1, GitHub-published raw data alongside the UI                                                                                                                                           | Auto-zoom to a single red dot, "Null Island" pitfall, ArcGIS chrome                              |
| **CDC / ECDC ERVISS**             | Multi-track virological/syndromic stacking, week-numbered axes, weekly-update cadence                                                                                                                               | PDF-as-deliverable aesthetic                                                                     |
| **BlueDot / HealthMap / EIOS**    | Event-based surveillance feed pattern, airline-corridor overlay (future layer)                                                                                                                                      | Proprietary black-box framing; their alert UIs lack provenance                                   |
| **DHIS2 / Go.Data / SORMAS**      | **Nothing visual** — these exist to remind us what NOT to copy: form-heavy, table-heavy, hierarchically-named menus                                                                                                 | The whole aesthetic                                                                              |

### 2. The Synthesis — a single named design language

**"Calm Command Center"** — a light-first, monochrome-with-one-accent surface that feels like Linear if Linear had been built by an FT graphics editor working with the Sentry triage team and an Anthropic content designer.

- **Theme:** Light-first. For public health, dark-only would feel exclusionary to a casual reader on a phone in daylight. Full dark-mode parity on day one. System preference respected; explicit toggle in header.
- **Type stack:**
  - UI / chrome / numerics → **Geist Sans** + **Geist Mono** (variable, weight 100–900).
  - Long-form (Methodology, About, AI-generated brief) → **Source Serif 4** (open, transitional; the open-source analogue to Anthropic's Tiempos).
  - System fallbacks: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Type ramp (Geist's four-axis system, taken from `vercel.com/geist/typography`):**
  - Heading (px): 72 / 64 / 56 / 48 / 40 / 32 / 24 / 20 / 16 / 14
  - Copy (multi-line, generous leading): 24 / 20 / 18 / **16** / **14** / 13
  - Label (single-line, tight): 20 / 18 / 16 / **14** / 13 / 12 (mono variants at 14/13/12)
  - Button: 16 / 14 / 12
  - Default body = 14 px Copy; default chip/pill = 14 px Label. Hero numbers use 48 px Heading with `font-variant-numeric: tabular-nums slashed-zero`.
- **Spacing:** 4 px micro-grid, 8 px macro-grid. Component padding scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- **Radius:** `--radius-sm 4px` (pills, inputs), `--radius-md 6px` (cards, popovers), `--radius-lg 10px` (drawers, modals), `--radius-pill 999px`. Never larger than 10 px on data surfaces — past that, radii read as playful.
- **Shadow:** Two elevations only. `--shadow-1` for hover/raised; `--shadow-2` for drawers and popovers. No glow, no glass.
- **Iconography:** **Lucide** (24 px nominal, 1.5 px stroke). One library, no mixing.
- **Motion language:** CSS transitions + Framer Motion only for layout transitions.
  - **150 ms ease-out** for active/press (scale 0.97 on `:active`, per "The Easing Blueprint" on animations.dev: _"A scale of `0.97` on the `:active` pseudo-class with a `150ms` transition should do the job."_).
  - **Exactly 300 ms ease-out** for drawer/panel/dropdown entry (same source: _"The animation duration of both of these dropdowns is exactly the same, `300ms` (you can inspect the code to verify this)."_); **220 ms ease-in** for exit.
  - **400 ms cubic-bezier(0.32, 0.72, 0, 1)** for map camera moves.
  - **Spring** reserved for drag-dismiss bottom sheets on mobile (mass 1, stiffness 260, damping 32).
  - No bounce on UI surfaces. Linear's "speed is a feature" principle as North Star.

### 3. Information Architecture

**Top-level surfaces (left rail, in order):**

1. `/` — **Today** (LLM daily brief + headline numbers + map snapshot)
2. `/outbreaks` — **Outbreaks** list (active + historical, filterable)
3. `/map` — **Map** (the full command center, the dominant surface)
4. `/sitreps` — **Sitreps** chronological feed
5. `/sources` — **Sources** library (WHO, AFRO, ECDC, ReliefWeb, MoH press releases, ACLED, HDX, Pathoplexus, Nextstrain)
6. `/methods` — **Methods** (editorial / About / methodology; set in Source Serif 4)
7. `/search` — global search (also reachable via `⌘K`)
8. `/internal/*` — admin (auth-gated)

**URL strategy:**

- `/outbreaks/[pathogen-slug]/[country-iso]/[onset-yyyymmdd]` → `/outbreaks/bundibugyo/CD/2026-04-24`
- `/sitreps/[source-slug]/[publication-date]/[slug]` → `/sitreps/who-don/2026-05-17/ebola-bvd-drc-uganda`
- `/sources/[source-slug]` → `/sources/who-don`, `/sources/ecdc-cdtr`
- `/map?outbreak=...&t=2026-05-20&layer=cases,acled` — every map view permalinks with state.

**"Outbreak as a verb" — Discover → Understand → Drill → Cite:**

- **Discover:** Today or Outbreaks list. LLM brief on top.
- **Understand:** Outbreak detail page — narrative header → headline StatCards → multi-track timeline → annotated map → transmission/lineage → comparison small multiples.
- **Drill:** Sources panel + raw data table + per-figure provenance drawer.
- **Cite:** Every figure has "Copy citation" (BibTeX, APA, `?cite=quote-id` permalink).

**Sitreps surface** in two places: chronologically at `/sitreps`, and embedded as a "Sources timeline" track on each outbreak page.

**LLM-generated daily brief** lives at `/` and at the top of each outbreak page as a collapsible "Brief" section with `<AIGeneratedLabel>`. Below the brief: a "Show me the data" toggle.

**Onboarding for novices — the 5-second answer:** On first visit (no localStorage), a single dismissible band under the header reads: _"ituri-sitrep is a public situational-awareness companion for ongoing infectious-disease outbreaks. Every number you see links to its source. Currently tracking: Bundibugyo Ebola, Ituri Province, DRC + Uganda. → Show me the outbreak."_ One button. No multi-step tour.

### 4. The Hybrid Command Center — primary surface

**Choice: three-pane (Linear-style), NOT canvas-first (Figma-style).** Canvas-first works when users create artifacts; here, users _receive_ situational data. Three-pane gives expert epidemiologists list density, novices a guided center stage, and journalists a focused inspector that screenshots well.

**Layout at ≥ 1280 px:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Top bar: logo · search ⌘K · ? · last-updated pulse · theme · ⚙ │
├────────────┬─────────────────────────────────────┬───────────────┤
│ Left rail  │   Center stage                      │  Inspector    │
│ 240 px     │   (map OR outbreak detail)          │  360 px       │
│ Outbreaks  │   ┌──────────────────────────────┐  │  Tabs:        │
│ Pathogens  │   │      MapLibre + deck.gl      │  │  Overview     │
│ Countries  │   └──────────────────────────────┘  │  Sources      │
│ Sources    │   ┌──────────────────────────────┐  │  Timeline     │
│ Sitreps    │   │  Multi-track timeline brush  │  │  Methods      │
│ Methods    │   └──────────────────────────────┘  │               │
└────────────┴─────────────────────────────────────┴───────────────┘
```

**Map layer**

- **Base style:** custom MapLibre style derived from Carto Positron (light) / Carto Dark Matter (dark). Hosted vector tiles via Protomaps/PMTiles for portability.
- **Layers (toggleable, with `[` `]` keyboard cycling):**
  - Admin1/admin2 choropleth — confirmed cases per 100 k (**ColorBrewer Reds 5-class**, lowest class as a tinted surface, never pure white — white reads as "no data" and creates false-binary perception).
  - Admin1 outline always (deck.gl `PolygonLayer`).
  - Sitrep points clustered natively.
  - ACLED conflict events (toggle off by default; amber dots, sized by fatalities).
  - Health facility points (toggle).
  - Vaccination ring coverage (toggle; lime stroke at admin2 perimeter, no fill).
  - "No-data" overlay: hatched diagonal SVG pattern (NOT gray — gray reads as "low value"). FT/NYT no-data convention.
- **Color discipline:**
  - Categorical (pathogens, source authorities): **Okabe-Ito 8-color palette** (`#000000 #E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7`), as recommended by Wong (2011, _Nature Methods_) and Wilke's _Fundamentals of Data Visualization_.
  - Sequential (case density): **ColorBrewer Reds 5-class** (`#FEE5D9 #FCAE91 #FB6A4A #DE2D26 #A50F15`).
  - Diverging (week-over-week change): **RdBu 7-class**, white at zero.
  - Severity (operational status): Sentry tokens — `red400 #CF2126` (emergency/PHEIC), `red300 #F55459` (alert), `yellow300 #FFC227` (warn), neutral `--surface-2` (info).
  - All palettes tested in Sim Daltonism for protan, deutan, tritan.
- **Tooltip pattern:** Provenance-first.
  ```
  Ituri Province · 105 confirmed, 906 suspected
  WHO DON · 25 May 2026 · "a total of 105 confirmed cases…"
  ```
- **Time scrubber:** pinned to the bottom of the map pane; ticks at WHO publication dates. Scrub updates the map state in < 16 ms via memoized vector-tile filters.
- **Performance:** vector tiles via `ST_AsMVT()` from PostGIS through a Supabase Edge Function; flat projection (outbreak is regional; globe is theater); deck.gl `MapboxOverlay` in `interleaved: true` mode so choropleth and conflict points respect map-label z-order.

**Timeline (multi-track, pinned below map)**

- Four default tracks, top to bottom:
  1. Confirmed cases (filled area, Reds-300)
  2. Deaths (filled area, dark slate; _never red_ — red is for active disease, not the dead)
  3. Sitrep publications (rule marks, one per source, color = Okabe-Ito category)
  4. ACLED conflict events (rule marks, amber)
- Brush selection on the bottom track filters the map; ⌘+scroll zooms time. ~600 px wide, 24 px per track.
- **Y-axis discipline: zero-baseline locked.** Log scale only via explicit toggle, labeled with a tooltip explaining the implications.
- Annotation layer: peak markers (auto-detected), intervention markers (vaccination start, PHEIC declaration), and ACLED-correlated event markers (NYT graphics style — short serif label with a thin rule).

**Inspector pane (360 px right)**

- Tabs: **Overview · Sources · Timeline · Methods**. Tab nav keyboard: `1 2 3 4`.
- Every figure visible is a `<Figure>`.

**Command bar (⌘K)** opens centered, 640 px wide, 8 result groups: Outbreaks · Pathogens · Countries · Sources · Sitreps · Layers · Time windows · Definitions. Quoted verbs: `Open outbreak…`, `Filter to pathogen…`, `Jump to source…`, `Set time window…`, `Toggle layer…`, `Go to definition…`.

### 5. Progressive Disclosure — novice ↔ expert

| Layer        | Novice gets                                                                                             | Expert gets                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Top of page  | LLM 3-sentence summary in 18 px Copy with `<AIGeneratedLabel>`                                          | Same; collapsible. "Show the data" pill toggles to raw            |
| Map tooltip  | "Ituri: 105 confirmed cases as of 25 May"                                                               | + source quote + publication time + lineage button                |
| Number       | Number with tiny ⓘ                                                                                      | Number + sparkline + delta + source-quote-on-hover                |
| Glossary     | Dotted-underline on technical terms (CFR, R₀, ETU, MVA-BN, attack rate, admin1, ICD-11) → hover popover | Click → full Methods entry with primary refs                      |
| Disagreement | Single number, badged "WHO + AFRO"                                                                      | "Show per-source breakdown" → table with each source, value, date |
| Stale data   | "Updated 18 h ago" pill, neutral                                                                        | Pill yellow (`#FFC227`) at >24 h, red (`#CF2126`) at >72 h        |

Editorial annotations on the map (NYT graphics style) fade out at zoom ≥ 8 — by then the expert has zoomed in and doesn't need "Mongbwalu: where the outbreak likely began."

### 6. Provenance-First UX — the signature pattern

**Inline marker:** every figure rendered through `<Figure>` carries a dotted-underline (1 px, 60% opacity, accent color) under the number itself — _not_ a superscript number (looks academic), _not_ a ⓘ floater (separates affordance from value). The number itself is the affordance.

**Hover state (80 ms delay, 300 ms ease-out fade-in):** floating quote card, 320 px max width, Radix Popover:

```
┌─────────────────────────────────────────┐
│ WHO Disease Outbreak News               │
│ 25 May 2026 · 14:00 UTC                 │
│                                         │
│ "a total of 105 confirmed cases         │
│  (including 10 deaths) and 906          │
│  suspected cases (including 223 deaths) │
│  have been reported in Ituri, North     │
│  Kivu, and South Kivu provinces."       │
│                                         │
│ → Open evidence drawer                  │
└─────────────────────────────────────────┘
```

13 px Mono for source name, 14 px Copy serif (Source Serif 4) for the quote itself — the serif signals "this is the original document, not our prose."

**Click state:** `<SourceQuoteDrawer>` slides in on the right, 480 px wide. Contents:

- Source authority header (WHO / ECDC / MoH).
- Citation in three formats (plain, BibTeX, APA) with copy buttons.
- The surrounding paragraph (~5 sentences) with the cited sentence highlighted in `--accent-quote` (a desaturated paper-yellow).
- "Open original (PDF/HTML) at exact location" — uses `#page=` and text-fragment anchors.
- Chain of custody: extraction agent, model version, extraction timestamp, human-review status.
- "Report a problem with this extraction" link routing to internal escalation.

**Multi-source disagreement UI:** the headline shows the most-authoritative + most-recent value, with a small "+1 disagreement" pill. Hover → mini-table of all sources, their values, dates. Never silently pick a winner.

**Stale/superseded data UI:** historical values dim and gain a strikethrough; the current value sits next to a "revised" badge that reveals revision history on click.

**Evidence Locker:** every visible number has a permalink `/evidence/[quote-id]` showing the complete chain: original PDF → extracted sentence → LLM prompt → extracted value → which figures cite it. This is the platform's "Stripe-style trust signal" — radical transparency.

### 7. Charts, Maps, Data Vis Discipline

- **Reading order:** cases on the left, deaths on the right. Time always x-axis ascending left-to-right. Magnitude on y. No rotated labels.
- **Y-axis: never truncated. Always anchored at zero.** Logarithmic only via explicit toggle.
- **Chart selection** follows the FT Visual Vocabulary's nine families (deviation / correlation / ranking / distribution / change-over-time / magnitude / part-to-whole / spatial / flow). Default cases timeline = filled area. Default cross-country = small multiples. Default age-sex breakdown = back-to-back bars. **Avoid pie charts entirely.**
- **Annotation patterns:** peak markers ("Peak weekly incidence: week 22"), intervention markers (vertical rule + label "Ring vaccination begins"), and ACLED-correlated overlays (faint amber band when conflict events spike in the same week).
- **Small multiples:** 3 columns × N rows on desktop, single column on mobile, fixed y-scale per row by default with an explicit "free scales" toggle for experts.
- **Sparklines** in all StatCards, inspector rows, and Outbreaks list rows. 96 × 24 px, 1.5 px stroke, last-point dot, no axis, hover reveals crosshair + value.
- **Live-data signal:** a 4 px disc next to "Last updated 6 min ago" in the top bar, gently pulsing (1.6 s ease-in-out scale 1.0→1.15→1.0, `prefers-reduced-motion: reduce` → static). Never a flashing red badge.
- **Skeleton/loading:** SkeletonChart and SkeletonMap match the real-component dimensions; a subtle 1.2 s gradient sweep at 4% opacity, not a fast strobe.
- **Empty states:** "No outbreaks match your filters yet — try widening the time window." Respectful copy. Never "Oops!" Never a sad-robot illustration.
- **Citation discipline on every chart:** axis caption (units, time grain), source line ("Source: WHO DON, 25 May 2026"), methodology link.

### 8. Typography & Numerics

- **Tabular numerals everywhere a number appears in a column or compared row.** Set `font-variant-numeric: tabular-nums slashed-zero` on `:root` for `[data-numeric]` attributes; opt out only for prose paragraphs.
- **Mono for identifiers** (case IDs, ISO codes, timestamps, source-quote-ids) — Geist Mono at 12 or 13 px.
- **Headline-number treatment (StatCard hero):** Geist Sans, 40–48 px, weight 600, `font-feature-settings: "ss01"` (Geist's stylistic-set-1 disambiguates 0/O/o, 1/l/I), tabular nums, line-height 1.05, letter-spacing −0.02 em.
- **Numeric formatting rules:**
  - Thousands grouping with a non-breaking thin space: `1 243` (cleaner than commas at small sizes).
  - Percent vs percentage-points spelled out: "12 %" (case fatality rate) vs "up 3 pp from last week" (change).
  - Abbreviation scale: 1 000 → `1.0k`, 1 000 000 → `1.0M`, with exact value in tooltip.
  - Always show units. Never "234" without "deaths" or "cases."
- **Date and time formatting:**
  - Tooltips & data tables: full ISO 8601 — `2026-05-27T06:00Z`.
  - Feed and lists: relative — "2 days ago" (absolute on hover).
  - Page headers and editorial context: human — "27 May 2026 · 06:00 UTC".
- **Localization:** English as primary. French and Swahili content tags are extracted but rendered behind a `?lang=` toggle in v1; full localization is v2. LTR throughout; RTL infrastructure (logical CSS properties: `inset-inline-start`, `padding-inline`) wired from day one for future Arabic.

### 9. Color System — semantic and accessible

**Light-mode tokens (Tailwind v4 `@theme`):**

```css
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

  /* Accent — single, restrained */
  --color-accent: oklch(48% 0.18 240);
  --color-accent-fg: oklch(99% 0.003 247);

  /* Severity (Sentry-derived, OKLCH-tuned) */
  --color-emergency: oklch(50% 0.22 25); /* ≈ #CF2126 */
  --color-alert: oklch(64% 0.2 25); /* ≈ #F55459 */
  --color-warn: oklch(83% 0.16 92); /* ≈ #FFC227 */
  --color-info: var(--color-fg-muted); /* intentionally neutral */

  /* Provenance highlight */
  --color-quote-bg: oklch(96% 0.06 95);
  --color-quote-fg: oklch(28% 0.05 95);
}
```

**Dark mode** inverts surfaces (bg `oklch(14% 0.010 260)`), keeps the accent hue, lowers chroma 10% on severity tokens to avoid neon, and uses Sentry's dark-mode reds (`#F98A8F`, `#E12D33`) directly.

**Pathogen color encoding:** _do not_ assign a permanent color per pathogen — overloads the visual system and breaks when many outbreaks coexist. Use **single accent for the currently focused outbreak**, neutral for all others on multi-outbreak views. If a categorical legend is unavoidable (e.g. pathogen comparison chart), use **Okabe-Ito** in declared order, never a rainbow.

**Refused patterns:**

- Green-for-good — misreads disastrously on outbreak data.
- Red-only severity ramp — fails colorblind users and conflates "case density" with "danger." Use Reds for density and Sentry-severity tokens for editorial status, never the same scale for both.

**Contrast targets:**

- Body text on surface: ≥ 7:1 (AAA).
- Headline numbers (the things that get screenshotted and shared): ≥ 7:1.
- Status pills on their tinted background: ≥ 4.5:1 (AA).
- Map labels: tested with the actual basemap underneath at zoom 4 / 7 / 10.

### 10. Interaction & Motion

| Surface                            | Motion                               | Duration               | Easing                       |
| ---------------------------------- | ------------------------------------ | ---------------------- | ---------------------------- |
| Page transition                    | Cross-fade, no slide                 | 180 ms                 | linear                       |
| Button press                       | Scale 0.97                           | 150 ms                 | ease-out                     |
| Drawer slide (inspector, evidence) | Translate X, opacity 0→1             | 300 ms in / 220 ms out | ease-out / ease-in           |
| Cmd-K open                         | Scale 0.96→1, opacity, blur backdrop | 220 ms                 | ease-out                     |
| Map camera                         | Pan/zoom                             | 400 ms                 | cubic-bezier(.32, .72, 0, 1) |
| Sparkline crosshair                | Position only                        | 80 ms                  | linear                       |
| Tooltip / Popover                  | Opacity, 4 px translate              | 120 ms                 | ease-out                     |
| Severity pill change               | Background color tween               | 200 ms                 | ease-out                     |
| Last-updated pulse                 | Scale 1.0↔1.15                       | 1 600 ms               | ease-in-out, infinite        |

`prefers-reduced-motion: reduce` removes: the pulse, the map camera tween (becomes instant), the drawer slide (becomes a fade), and the cross-fade. Opacity transitions are kept (they don't induce vestibular discomfort).

**Sound:** No. Public-health platforms that ping are perceived as alarmist. The only audio consideration is `aria-live="polite"` announcing material changes.

### 11. Keyboard-Native Operation

| Keys            | Action                                      |
| --------------- | ------------------------------------------- |
| `g t`           | Go to Today                                 |
| `g o`           | Go to Outbreaks                             |
| `g m`           | Go to Map                                   |
| `g s`           | Go to Sitreps                               |
| `g r`           | Go to Sources (refs)                        |
| `g d`           | Go to Methods (docs)                        |
| `g i`           | Go to Internal (auth)                       |
| `⌘K` / `Ctrl K` | Command palette                             |
| `/`             | Focus search                                |
| `?`             | Keyboard help overlay                       |
| `Esc`           | Close drawer / popover / palette            |
| `j` / `k`       | Next / previous in list                     |
| `[` / `]`       | Previous / next outbreak                    |
| `1`–`4`         | Switch inspector tab                        |
| `L`             | Cycle map layer                             |
| `T`             | Cycle time window (7 d / 30 d / 90 d / all) |
| `.`             | Toggle theme                                |
| `c` then `q`    | Copy current quote-id citation              |

Help overlay is a Radix Dialog at 720 px, two-column key map with search input at top (filter by action name). Same shape as Linear's keyboard shortcuts help screen.

### 12. Content Design — voice and tone

**Voice:** authoritative but humble. Precise. Never sensational. Never dehumanizing. Plain English first, technical terms glossed.

**Headlines (factual, never editorial):**

- ✅ "Ituri Province: 105 confirmed Bundibugyo cases, 906 suspected (WHO, 25 May 2026)"
- ❌ "Ebola explodes in DRC!"

**Sensitive-data microcopy (death counts):**

- ✅ "10 confirmed deaths" / "223 suspected deaths" — neutral, specific.
- ❌ "Death toll mounts" / "Killer virus claims…" — never.

**AI transparency label:** every LLM-generated paragraph displays an `<AIGeneratedLabel>`:

> "Drafted by Claude on 27 May 2026 from 4 sources (WHO DON, ECDC threat-assessment brief, CDC HAN, MSF briefing). Verify against source before citing."

The label is not buried — it sits inline above the generated text in 12 px Label Mono, color `--color-fg-muted`, with a small ⚠ glyph.

**Error states (extraction failure):**

> "We couldn't extract this figure cleanly. A human reviewer has been notified. The most recent verified value (3 days ago) is shown below."

**Footer disclosure (every page):**

> "ituri-sitrep aggregates publicly available outbreak data from WHO, ECDC, Africa CDC, ministries of health, ACLED, and partner sources. No personal health information is collected or displayed. Every figure links to the source sentence that supports it. This is an independent project and not affiliated with WHO or any government agency."

**Methodology page:** written in first person plural, Source Serif 4, generous leading. Bring the reader into the room — explain the extraction pipeline, the disagreement-resolution heuristics, the LLM's role and its limits, and the human-review thresholds. This page is the platform's credibility.

### 13. Accessibility (WCAG 2.2 AA target, AAA on critical numbers)

- **Map alternative:** every map has a paired tabular view at `?view=table`. The same data, same provenance, screen-reader friendly. The map control bar exposes a "Show as table" toggle (required, not optional).
- **ARIA live regions:**
  - `role="status"` for "Last updated N min ago."
  - `role="alert"` reserved for staleness > 72 h, never for new sitreps (which would be noisy and patronizing).
  - The time scrubber announces "Showing week 22 of 2026" on commit.
- **Color-blind safety:** Okabe-Ito as the categorical default; every choropleth direct-labels admin1 names so color is never the sole carrier of meaning. Simulated in Sim Daltonism for protan/deutan/tritan before each release.
- **Keyboard parity for the map:** arrow keys pan, `+` / `-` zoom, `[` `]` cycle features, `Enter` opens the entity drawer for the focused feature. Focus ring on the selected feature at 7:1 contrast.
- **Focus-visible:** 2 px ring at `--color-accent`, 2 px offset, on every interactive element. Custom `:focus-visible` override only — never remove the ring on `:focus`.
- **Contrast tokens** (above) target AAA on body text and hero numbers.
- **Text resize:** every container uses CSS logical units (`rem`, `ch`) and `clamp()`; UI remains usable at 200% zoom and 400% text-only zoom per WCAG 2.2 SC 1.4.4 and 1.4.10.
- **Reduced motion:** see §10.
- **Form labels:** every input has an explicit `<label>` (never placeholder-only). Errors associated via `aria-describedby`.
- **Touch targets:** minimum 44 × 44 px per WCAG 2.2 SC 2.5.8.
- **Skip links** at the top of every page: "Skip to map", "Skip to inspector", "Skip to methods."

This is non-negotiable. A public-health platform that fails screen readers fails its mission.

### 14. Responsive & Mobile

**Breakpoints:** 375 / 768 / 1024 / 1280 / 1536 px.

- **≥ 1280 px:** full three-pane command center.
- **1024–1279 px:** inspector collapses to an overlay drawer (toggle in top bar). Left rail collapses to icon-only.
- **768–1023 px (tablet):** stack vertically — top bar, map full-width with a sticky scrubber, inspector becomes a bottom sheet with three snap points (peek 88 px, half 50%, full 90%).
- **< 768 px (mobile):** **Feed-first, not map-first.** The mobile audience is overwhelmingly read-only journalists and researchers — operating a map on 375 px is hostile. Home becomes the Today feed; map is one tap away; outbreak detail is a card stack with horizontal swipeable charts.
- **Bottom sheet (iOS-style)** uses Vaul (React port of the iOS sheet primitive) for momentum-based dismiss with a spring (mass 1, stiffness 260, damping 32).
- **Tablet (iPad)** feels native: hover affordances on click+hold (Apple's 0.5 s gesture), large keyboard-help overlay when a hardware keyboard is paired.

### 15. Empty & Edge States

| State                        | Copy + design                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| First visit, no localStorage | Single dismissible band: "ituri-sitrep is a public situational-awareness companion. Every number links to its source. → Show me the outbreak" |
| No outbreaks match filters   | "No outbreaks match. Try widening the time window or clearing the pathogen filter."                                                           |
| Outbreak with no data yet    | "We're tracking this outbreak. WHO/MoH have not yet published structured numbers. Latest qualitative report: [sitrep]."                       |
| Source unavailable           | "ECDC's CDTR didn't respond on this fetch. Showing the last known good values from 18 h ago."                                                 |
| Pipeline lag > 24 h          | Yellow pill in header: "Last extraction 26 h ago — we're investigating." Link to `/internal/pipeline` for the admin.                          |
| LLM extraction failed        | "Automatic extraction failed for this figure. Flagged for manual review (queued 3 h ago)." Number falls back to last verified.                |
| Anomaly flagged              | A small `⚠ verifying` badge on the figure; tooltip: "This value jumped 4× over the prior period — verifying against the source."              |
| No WebGL                     | Map is replaced with a static SVG (server-rendered admin1 choropleth, same color scale) + the tabular alternative is promoted to default.     |
| Slow / offline               | PWA shell loads from cache; latest cached daily brief is shown with a "You're offline — last refreshed [time]" band.                          |

### 16. Admin / Internal surfaces

Auth-gated under `/internal/*`. Visual identity: **dimmer, denser, Linear-Settings-like**. Same Geist + tokens; surface tone steps darker by one stop; no accent color on the chrome (only on data).

- `/internal/cost` — Anthropic spend per agent / per source / per day; sparklines + table; week-over-week delta. Hero number: `$XX.YY today` with a 30-day sparkline.
- `/internal/pipeline` — Inngest run viewer: last 100 runs as a horizontal Gantt-like strip, click expands to the run's prompt + completion + duration + cost. Success rate as a Sentry-style severity pill.
- `/internal/escalations` — Four classes from the agentic spec, kanban-style columns: Multi-source disagreement · Extraction failure · Anomaly flagged · Manual review requested. `j` / `k` / `c` keyboard.
- `/internal/quality` — Eval scores, gold-set deltas over time, a small Methods-page-style narrative for each eval run.

### 17. Specific Component Specs (shadcn-based)

**`<Figure value source quoteId variant>`** — the core provenance primitive.

- Purpose: render any number/string/pill that carries a source.
- Props: `value: ReactNode`, `quoteId: string`, `variant: "inline" | "stat" | "pill" | "axis"`, `srLabel?: string` (overrides default screen-reader announcement).
- Interaction: 80 ms hover delay → Radix Popover with the quote card; click → `<SourceQuoteDrawer>` opens.
- Visual: 1 px dotted underline at 60% accent; `cursor: help`.
- Accessibility: `aria-describedby` references a hidden `<span>` with "Source: {authority}, {date}. Click to view evidence." Keyboard: focusable, Enter opens drawer, Esc closes popover.
- Implementation: Server Component renders the value + a Client subtree for the popover/drawer.

**`<StatCard label value delta sparklineSeries source>`** — the headline metric.

- Visual: 16 px Label muted top; 40 px Geist Sans value (tabular nums); 14 px delta with up/down chevron and `--color-emergency / --color-info`; 96 × 24 px sparkline; 12 px Mono source line.
- Hover: full sparkline tooltip with crosshair.
- Click: scrolls to the corresponding chart on the page.

**`<OutbreakHeader pathogen country status onset lastUpdate>`** — page title region.

- Visual: pathogen name in 32 px Heading; country/admin1 below in 18 px Copy muted; `<SeverityPill>` (PHEIC = emergency); two dates in Mono at 13 px.

**`<TimelineMulti tracks brush onCommit>`** — multi-track timeline component.

- Built on Visx `XYChart` for SSR-friendly D3 (Airbnb-originated, per the Airbnb Engineering "Introducing visx" post: _"After 3 years of development, 2.5 years of production use at Airbnb … we created a new project that brings together the power of D3 with the joy of React."_) Brush via `@visx/brush`. Each track is a stacked subplot sharing the same x scale.

**`<MapPane layers overlays controls>`** — MapLibre wrapper.

- Children: `<MapLayerControl>`, `<TimeScrubber>`, `<MapLegend>`, `<TabularViewToggle>`. Imperative API via a `useMapRef` hook.

**`<InspectorTabs entity defaultTab>`** — right-pane tabbed panel with scroll lock per tab.

**`<CommandBar groups>`** — cmdk-based palette (Radix-compatible). Lazy-loaded.

**`<SourceQuoteDrawer quoteId>`** — Radix Dialog, side="right", width 480 px. Contents per §6.

**`<GlossaryTerm term>`** — dotted-underline wrapper; Radix HoverCard with one-sentence def + link to Methods.

**`<SeverityPill level>`** — `info | warn | alert | emergency`. Background uses 100/200 alpha of severity token; text uses 400. Dot prefix at the left, matching Sentry's issue indicator.

**`<ProvenanceBadge authority>`** — small chip showing WHO / ECDC / AFRO / MoH / ACLED / Nextstrain with an authority weight (gov't > intergovernmental > NGO > academic > media). Authority weighting documented in Methods.

**`<LastUpdatedIndicator timestamp>`** — pulsing 4 px disc + relative time; tooltip shows the exact ISO timestamp.

**`<AIGeneratedLabel modelVersion sources generatedAt>`** — see §12.

**`<SkeletonChart h w>` / `<SkeletonMap>` / `<SkeletonText lines>`** — match real-component dimensions exactly; subtle gradient sweep.

### 18. Performance Budgets

- **LCP < 2.5 s on 4G**, including the map's first meaningful tile render (use a server-rendered static SVG choropleth as LCP element; vector tiles upgrade in place).
- **INP < 200 ms.** Aggressively memoize the map's filter expressions; debounce the time scrubber commit to 50 ms.
- **CLS < 0.1.** Reserve fixed dimensions for every chart and the map.
- **Tile prefetch:** prefetch the next adjacent zoom level on hover of the scrubber's near-future ticks.
- **Images:** no decorative imagery. Only data viz (SVG/Canvas). Source logos as inline SVG sprites.
- **Fonts:** subset Geist Sans and Mono to Latin-1 + the small set of math glyphs needed; self-host via `next/font/local`. System fallback with identical metrics where possible.
- **React Compiler enabled**; default to Server Components, mark only map/timeline/palette as `"use client"`. Avoid hydration cascades by moving the inspector tabs to RSC with a thin Client overlay.

### 19. Social / Shareability

- **OG cards via `@vercel/og`** (edge runtime, Satori). Per-outbreak templates, 1200 × 630 PNG:
  - Black `--color-fg` on cream `--color-bg`.
  - Pathogen + country in 64 px Geist Sans Heading; PHEIC pill; the headline number (e.g., "105 confirmed · 906 suspected") in 96 px tabular nums; ituri-sitrep wordmark at bottom-right; tiny "Source: WHO DON, 25 May 2026" footer.
  - Per-chart OG: render the chart as Satori-compatible SVG (flexbox-only CSS, no grid) with the same axis caption.
- **Embed cards:** every chart has a `<iframe src="/embed/[chart-id]?theme=light">` that respects the parent's theme via `postMessage`. Includes the source line by default; you cannot disable provenance on embed.
- **RSS / Atom feed** at `/feed.xml` of curated updates (one entry per major sitrep extraction or status change). `application/atom+xml`.
- **Permalinks** carry full state: `/map?outbreak=bundibugyo-ituri-2026&t=2026-05-25&layer=cases,acled&zoom=7&center=29.6,1.7`.

### 20. The "Feels Like Linear / Stripe / FT" Polish Checklist

1. `font-variant-numeric: tabular-nums slashed-zero` on every `<td>` and every `[data-numeric]` element.
2. `font-feature-settings: "ss01", "cv11"` on Geist for unambiguous 0/O and l/1.
3. `:focus-visible` ring respects the design system (`--color-accent`, 2 px, 2 px offset) — never the browser default.
4. Drawer entry uses 300 ms ease-out, exit uses 220 ms ease-in (asymmetric is the Linear secret).
5. Hover affordances delay 80 ms before firing — eliminates flicker on cursor passes.
6. Optical sizing on hero numbers (`font-optical-sizing: auto`) — Geist responds well.
7. `cursor: help` on every `<Figure>`, `cursor: pointer` only on buttons/links, default cursor on text.
8. Custom selection color: `::selection { background: var(--color-accent); color: var(--color-accent-fg); }`.
9. Top-of-page progress bar (NProgress-style, 2 px, `--color-accent`) during route transitions.
10. Skeleton states match the exact real-content layout — same heights, same number of rows.
11. Tooltips use CSS anchor positioning where supported, Floating UI fallback elsewhere.
12. Keyboard help overlay is searchable (Linear shipped this in 2021 and it's still the gold standard).
13. ⌘K palette opens with a 220 ms scale + opacity, backdrop blur at 8 px.
14. Every chart caption ends with the source AND publication date — no exceptions.
15. Empty states have personality but never humor on death-count surfaces.
16. The last-updated pulse is the only motion that loops on the page.
17. Severity pills have a 4 px colored dot prefix (Sentry pattern).
18. The AI-generated label uses a serif quote glyph (") in front, signaling editorial care.
19. Number-delta arrows are chevrons, not triangles — chevrons read calmer.
20. Sparkline last-point dot is filled, not stroked — focal-point convention.
21. Map labels use `text-halo` at 2 px to remain legible over any choropleth class.
22. The basemap is muted enough that the data layer is unambiguously primary.
23. Mobile bottom-sheet has a 4 × 36 px drag handle at the top, centered.
24. Cmd-K result rows have a 12 px Mono date on the right — instantly readable as recency.
25. The Methods page is set in a serif and is intentionally narrower (640 px) than the rest of the app — it reads as editorial.
26. Inline citations underline the _number_, not a superscript — the number is the affordance.
27. Stale data dims to `--color-fg-muted` and gains a strikethrough — never a red banner.
28. The favicon is a single-glyph wordmark "i·s" — visible in a Chrome tab strip with 20 other tabs.
29. The `<title>` of every outbreak page is `{pathogen} · {admin1}, {country} · {confirmed} confirmed · ituri-sitrep` — share-friendly.
30. The footer disclosure (no PHI, public data only, every figure cited) is in the same 14 px Copy as the body — not buried at 11 px gray.
31. Settings, profile, and theme controls all live inside ⌘K — no buried gear icon.
32. Touch targets ≥ 44 × 44 px even on desktop; users with motor differences appreciate it.
33. `prefers-color-scheme` respected on first paint via a tiny inline script before hydration — no theme flash.
34. The map's "no data" pattern is hatched, not gray — gray reads as a low value.
35. Y-axes are never truncated. The y-axis label says "Confirmed cases (zero baseline)" — defensive but honest.
36. Sources panel lists every source even when only one was used for the headline — radical transparency.

## Recommendations

**Stage 0 — ship the spine (week 1–2).** Get the three-pane shell + Geist tokens + Tailwind v4 `@theme` + shadcn primitives + a single static outbreak page rendering. Wire the `<Figure>` component end-to-end against one hardcoded `source_quote_id`. **Threshold to advance:** `<Figure>` hover and click both feel right at 60 fps on a $300 Chromebook.

**Stage 1 — the surface (week 3–4).** Map + multi-track timeline + inspector. Layers limited to admin1 choropleth + sitrep clusters + ACLED toggle. Real Supabase data. **Threshold:** an unprimed journalist can answer "where is this outbreak, and how many people have it?" in < 10 s.

**Stage 2 — the LLM brief and source library (week 5).** Daily brief at `/`, `/sources` browser, `<SourceQuoteDrawer>` with chain-of-custody. **Threshold:** a field epidemiologist can audit any figure on the front page in ≤ 3 clicks.

**Stage 3 — polish and admin (week 6).** ⌘K, keyboard help, OG cards, internal dashboards, RSS feed, embed support. Polish checklist top-to-bottom.

**Stage 4 — accessibility audit and pre-release (week 7).** WCAG 2.2 AA self-audit with axe-core + Lighthouse + manual NVDA pass + Sim Daltonism on every chart. Reduced-motion pass. **Threshold:** Lighthouse 95+ across the board; zero serious axe violations; a blind colleague reports the platform is navigable.

**When to revisit decisions:**

- If a second concurrent outbreak ships before v2, the "single accent on focused outbreak" assumption breaks — re-spec the pathogen color encoding using Okabe-Ito at that point.
- If mobile traffic exceeds 40% of MAU, the desktop-command-center bias is wrong — promote the feed to be feature-equal across breakpoints.
- If LLM extraction failure rate exceeds 5% per week, the `<AIGeneratedLabel>` needs to become a more aggressive warning, not a passive credit.

## Caveats

- **The Linear motion system is not publicly published with named springs.** The 150/300 ms ease-out recipe is sourced from Emil Kowalski (a current Linear design engineer) writing in "The Easing Blueprint" on animations.dev, not from an official Linear motion spec. Treat as best-available proxy.
- **Sentry's design tokens are public but the dashboard aesthetic is dark-only**, which directly conflicts with the public-health accessibility imperative. We borrow the severity grammar and abandon the visual chrome. Note also that the dashboard `theme.tsx` token `yellow300` was recently `#FFC227` per Sentry's "Building Dark Mode" engineering post; track the file in `getsentry/sentry` directly if exact parity matters.
- **Anthropic's brand fonts (Commercial Type's Styrene B, Klim's Tiempos) are commercially licensed.** The blueprint substitutes Geist Sans + Source Serif 4 (both open) as the closest defensible analog. If budget allows, license Styrene/Tiempos for the Methods page — it would be a noticeable upgrade.
- **"Linear Orbiter" surfaces in third-party writeups as Linear's internal design system; Linear itself has not published documentation under that name.** Don't claim parity with a system that isn't public.
- **Provenance-first UX has no production exemplar.** This blueprint invents the pattern from first principles informed by Stripe/Sentry trust-signal practice. Expect to iterate after the first 1 000 hover events have been instrumented.
- **All-public-data ≠ all-safe-to-display.** Even with no PHI, displaying admin2-level case counts in an active conflict zone risks inferential identification of communities. IOM's DTM 13th Round (June–July 2025) put Ituri at 903 282 IDPs (≈ 13% of the province's population); the UN Secretary-General's Spokesperson Stéphane Dujarric reported on 30 April 2026 that Ituri "already hosts more than 920 000 displaced people." The Methods page must explicitly address the platform's stance on aggregation thresholds and small-cell suppression.
- **The 2026 Ituri Bundibugyo outbreak is active.** All numbers in this brief (105 confirmed, 906 suspected, 10 deaths confirmed, 223 deaths suspected per WHO/ECDC as of 25–26 May 2026) are situational and will be wrong by the time the platform ships. Treat them as design fixtures, not facts.
