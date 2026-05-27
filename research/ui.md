# ituri-sitrep — UI Wireframe Blueprint v1.0

**TL;DR**
- **Keep the three-pane hybrid, but make it adaptive, not uniform.** `/map` is a true three-pane command center (left rail / canvas / right inspector); `/today`, `/outbreaks`, `/sitreps`, `/sources`, `/methods` are an app-shell + slide-over inspector (Stripe/Sentry pattern, validated by Sentry's own 2024 redesign cite: *"We started to redesign the page with two main design principles in mind: a strong information hierarchy and progressive disclosure"*). The dominant surface is `/map`; the dominant *grammar* is "rail + canvas + drawer."
- **Mobile is its own product, not a small laptop.** Bottom-rail navigation + vaul snap-point sheet (0.12 / 0.5 / 0.92) on `/map`; pure vertical scroll everywhere else. This mirrors Vercel's Feb 26 2026 default rollout of a *"floating bottom bar optimized for one-handed use"* and Apple's `[.height(120), .medium, .large]` detent recipe used by Apple Maps.
- **The Figure is the atom; the SourceQuoteDrawer is the soul.** Every rendered number must carry a `source_quote_id`. Dotted underline on hover → 240×160 SourceQuoteCard popover → click opens a 480px right drawer with verbatim quote, chain-of-custody, multi-source disagreement, BibTeX/APA citation copier. This is the one interaction the entire product is built around; do not compromise it for visual density.

---

## Key Findings (Layout Re-Test)

After re-testing the three-pane decision against 22+ precedents, the verdict is **adaptive, not uniform**:

| Precedent | Lesson taken | Applied to |
|---|---|---|
| **Linear (2024 redesign)** — *"inverted L-shape … global chrome of the application that controls the content in the main view"* | Inverted-L is the right global chrome; meta-property side panels appear conditionally | Global app shell across all routes |
| **Sentry Issue Details (2024)** — *"strong information hierarchy and progressive disclosure … Sections are collapsible, while tags, breadcrumbs, and activity can expand into drawers"* | Drawers expand from content, don't co-exist permanently | SourceQuoteDrawer, evidence drawer |
| **Stripe Workbench** — *"available on every Dashboard surface with a single keystroke"* (~ key); inspector pane is dockable, minimizable | A single-keystroke inspector that's persistent-but-collapsible beats a permanent third pane | ⌘K palette; Inspector on `/map` |
| **Vercel (Feb 26 2026)** — *"resizable sidebar that can be hidden when not needed … floating bottom bar optimized for one-handed use"* | Sidebars must collapse to icon-only; mobile gets a different chrome | NavRail collapse; mobile bottom-tab |
| **Grafana 12 (May 7 2025)** — Scenes-powered *"Dynamic Dashboards … tabs, conditional rendering, and auto-grid panel layouts"* | Tabs > nested sidebars for context-switching within a heavy dashboard | OutbreakDetail page tabs |
| **OWID topic pages** — *"overview first, zoom and filter, then details-on-demand"* (Shneiderman) | This IS the dual-audience progressive-disclosure mandate | `/today` and `/outbreaks/[...]` structure |
| **CDC respiratory dashboard (2025 update)** | KPI strip + map + state-level drill is the "calm" public-health vernacular; do not invent something users can't read | `/today` upper section |
| **ECDC threat report** | Threat-by-threat list with severity dots is the literal model for `/outbreaks` | List page chrome |
| **Datadog dashboards** — *"12-column grid"*, *"High Density Mode … duplicates the layout into a 2 x 12 column grid"* | 12-col grid at desktop; only enable HDM at ≥1920px | Tailwind grid + 1920 breakpoint |
| **Mapbox Studio** — left layer panel + center canvas + right inspector | This is *the* three-pane reference for map editing | `/map` exactly |
| **TradingView** — magnet/snap, collapsible panes, sync drawings across layouts | Snap is for power tools; everything must be collapsible | TimeScrubber, layer toggles |
| **ACLED Ukraine Monitor** — *"box in the bottom right-hand corner displays event counts … disaggregated by event type"*; date filters as time-scrubber | A floating stats card on the map is a viable alternative to a permanent right pane | `/map` mobile + secondary on desktop |
| **Apple Maps + vaul** — peek/medium/large detents, drag handle 40% alpha, 48dp min touch | The mobile inspector is a bottom sheet, not a sidebar | `/map` mobile |
| **NYT/FT/Reuters live trackers** — single-column scroll, sticky KPI bar, footnoted sources | The *editorial* surfaces (`/today`, `/sitreps`, outbreak detail) borrow this voice, NOT the command-center chrome | `/today`, `/sitreps`, daily brief |
| **cmdk (Paco Coursey, 2019/2022)** — *"Used for the Vercel command menu and autocomplete by Rauno (@raunofreiberg) in 2020"* | ⌘K is the cross-surface bridge; same pattern Vercel uses | Global CommandBar |

**Final layout call: E (Adaptive) — three-pane on `/map`, app-shell + slide-over on everything else, unified by NavRail + ⌘K + Figure/Drawer.**

Why not pure three-pane (option A): editorial surfaces (`/today`, `/sitreps`, `/methods`) read as articles; a permanent right pane is hostile to long-form reading and to "screenshot for a paper" use cases. Why not canvas-first (option B): public-health audiences need the KPI strip — *what's happening right now in numbers* — before they want to navigate the map. Why not bento (option D): bento dashboards age badly when an active PHEIC needs a hero. Why E wins: it lets `/map` be Bloomberg-dense for the epidemiologist while `/today` reads like FT for the worried parent — at zero extra design vocabulary, because the rail, palette, drawer, and severity pills are the same primitives everywhere.

---

## Details

### Notation
- `┌─┐ │ └─┘` = panel borders. `▓` = filled. `░` = skeleton. `●` = severity dot. `◐` = pulse. `─` = horizontal rule.
- `[ComponentName]` = component reference. `[ComponentName:state]` = state variant.
- Widths annotated as `←240px→`. Type tokens: `H1/32`, `H2/20`, `Body/14`, `Mono/12`, `Serif-quote/16`.

### 1.0 Global Chrome (every route)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐ 1px border-b
│ ╔══╗ ituri-sitrep    Today  Map  Outbreaks  Sitreps  Sources  Methods       ⌘K ┃ ◐ Live ┃ ◑ Theme│ 56px top bar
│ ║is║                                                                                            │ Geist Sans 13
└────────────────────────────────────────────────────────────────────────────────────────────────┘
┌────┬───────────────────────────────────────────────────────────────────────────────────────────┐
│    │                                                                                            │
│ N  │                                                                                            │
│ A  │                    [content region — route-dependent]                                      │
│ V  │                                                                                            │
│    │                                                                                            │
│ ←60px (collapsed) / ←240px (expanded), toggle with [ to collapse                                 │
└────┴───────────────────────────────────────────────────────────────────────────────────────────┘
```

NavRail icons (top to bottom): `Today ⌂ · Map ⊕ · Outbreaks ☰ · Sitreps ⌖ · Sources § · Methods ¶ ··· Internal ⚙ (auth-gated)`. Collapsed = icon only with tooltip on hover. Active item gets a 2px left bar in `red400`.

---

### 2.0 `/` (Today) — desktop ≥1280px

```
┌─[NavRail]─┬───────────────────────────────────────────────────────────────────────────────┐
│           │ Today · Wednesday, May 27, 2026 · Updated 4 min ago ◐                          │
│ ⌂ Today ●│                                                                                 │
│ ⊕ Map    │ ┌─[ActiveOutbreakBanner severity=ALERT]──────────────────────────────────────┐ │
│ ☰ Out    │ │ ● PHEIC  Ebola (Bundibugyo) · DRC + Uganda · Day 38   [Open command center]│ │
│ ⌖ Sit    │ │   142 confirmed · 47 deaths · CFR 33% · 6 admin1 affected                  │ │
│ § Src    │ │   ⓘ Hover any number to see source. Click to open evidence.                │ │
│ ¶ Met    │ └────────────────────────────────────────────────────────────────────────────┘ │
│           │                                                                                 │
│           │ ┌──[StatCard]────┐ ┌──[StatCard]────┐ ┌──[StatCard]────┐ ┌──[StatCard]──────┐│
│           │ │ Confirmed      │ │ Deaths         │ │ Case-fatality  │ │ Health zones      ││
│           │ │  142           │ │  47            │ │  33.1%         │ │  6 / 12 affected  ││
│           │ │  ▁▂▃▅▇ +18 7d  │ │  ▁▁▂▃▄ +6 7d   │ │  ━━━─── −0.4pp │ │  ▁▁▂▂▃ +1 7d      ││
│           │ │  WHO · 4h ago  │ │  WHO · 4h ago  │ │  derived       │ │  MoH · 18h ago    ││
│           │ └────────────────┘ └────────────────┘ └────────────────┘ └───────────────────┘│
│           │                                                                                 │
│           │ ─── Daily brief ──────────────────────────────────[expand ▾]──[show data ⇄]── │
│           │ ┌────────────────────────────────────────────────────────────────────────────┐│
│           │ │ Source Serif 4 / 17px / 1.55                                               ││
│           │ │                                                                            ││
│           │ │ Outbreak transmission remains concentrated in Bunia Health Zone, with 12  ││
│           │ │ new confirmed cases reported in the past 24 hours by WHO. Vaccination of  ││
│           │ │ 1,847 ring contacts is ongoing; no cases yet reported in Uganda since the ││
│           │ │ May 22 declaration.                                                        ││
│           │ │                                                                            ││
│           │ │ — generated by Claude 3.7 from 14 sources · [AIGeneratedLabel]            ││
│           │ └────────────────────────────────────────────────────────────────────────────┘│
│           │                                                                                 │
│           │ ─── Mini-map preview ─────────────────────────────────────[Open on /map ⇗]── │
│           │ ┌────────────────────────────────────────────────────────────────────────────┐│
│           │ │                       [static admin1 choropleth, deck.gl]                  ││
│           │ │                                                                  +/− zoom  ││
│           │ │                                                              ↳ legend Reds ││
│           │ └────────────────────────────────────────────────────────────────────────────┘│
│           │                                                                                 │
│           │ ─── Recent sitreps ──────────────────────────────────────────[All sitreps →]─ │
│           │ ┌────────────────────────────────────────────────────────────────────────────┐│
│           │ │ ● WHO Disease Outbreak News  May 26 · 18h    Ebola DRC Sit Rep #14    →   ││
│           │ │ ● MoH DRC press release      May 26 · 22h    12 nouveaux cas confirmés →   ││
│           │ │ ◐ ECDC Threat Brief          May 25 · 1d     Bundibugyo virus EU/EEA  →   ││
│           │ └────────────────────────────────────────────────────────────────────────────┘│
│           │                                                                                 │
│           │ ─── All active outbreaks ────────────────────────────────────────────────────  │
│           │ ┌────────────────────────────────────────────────────────────────────────────┐│
│           │ │ ● Ebola Bundibugyo · DRC/UGA       142 cases  ▁▂▃▅▇   PHEIC  Day 38   →  ││
│           │ │ ● Marburg              · Ethiopia       16 cases  ▁▂▃▄     active  Day 13  →  ││
│           │ │ ◐ Cholera              · Sudan          12.4k    ▃▄▃▄▃    active  Day 421  →  ││
│           │ │ ◑ Mpox clade Ib       · Multi          864      ▂▃▄▄▃    PHEIC  Day 287  →  ││
│           │ └────────────────────────────────────────────────────────────────────────────┘│
└───────────┴────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 `/` first-visit empty state

```
┌──────────────────────────────────────────────────────────────────────┐
│ Welcome to ituri-sitrep                                            ✕ │ 64px dismissable band
│ A public situational-awareness companion for outbreaks. Every number │ Source Serif 4
│ on this site can be traced to its source — hover any figure to see   │
│ the quote, click to open the evidence locker.                        │
│ [Take a 30-second tour]   [Skip · I know what I'm doing]             │
└──────────────────────────────────────────────────────────────────────┘
… then the normal /today layout renders below.
```

### 1.2 `/` with active outbreak banner — same as 1.0 but banner is `severity=PHEIC` with red400 background, white text, pulsing dot.

---

### 2.0 `/map` — the command center, desktop ≥1280px

```
┌─[NavRail 60]─┬─[LayerRail 280]──────────────────┬─[CANVAS 780]────────────────┬─[Inspector 380]─┐
│ ⌂ Today      │ Layers                            │ ┌──────────────────────────┐│ — empty —       │
│ ⊕ Map ●     │ ─── Base ─────────────────────── │ │                          ││                 │
│ ☰ Outbreaks │ ☑ Admin0 borders                  │ │   MapLibre + deck.gl     ││ Click a region  │
│ ⌖ Sitreps   │ ☑ Admin1 borders                  │ │   center: 1.5°N 30°E     ││ to inspect      │
│ § Sources   │ ☐ Admin2 borders                  │ │   zoom: 6.2              ││                 │
│ ¶ Methods   │ ─── Epi data ─────────────────── │ │                          ││ [keyboard help] │
│              │ ☑ Confirmed cases (choropleth)    │ │  Reds: 0  1-9  10-49     ││                 │
│ ────────    │ ☐ Deaths                          │ │       50-99  100+         ││                 │
│ ⚙ Internal  │ ☐ Attack rate                     │ │                          ││                 │
│              │ ─── Operational ──────────────── │ │  [+] [−] [⌖ recenter]    ││                 │
│              │ ☐ ETU locations (point)           │ │  [▦ tabular ?view=table] ││                 │
│              │ ☐ Vaccination sites               │ │                          ││                 │
│              │ ☐ ACLED security events           │ │  ↳ Legend (collapsible)  ││                 │
│              │ ─── Context ─────────────────── │ │  Reds 5-class sequential ││                 │
│              │ ☐ Population density (HDX)        │ │  0 ▁ 1-9 ▂ 10-49 ▃        ││                 │
│              │ ☐ Health facilities (HDX)         │ │  50-99 ▅ 100+ ▇         ││                 │
│              │ ☐ Travel time to care             │ └──────────────────────────┘│                 │
│              │                                   │ ┌─[TimeScrubber]──────────┐│                 │
│              │ Outbreak: [Ebola Bundibugyo ▾]   │ │ Apr 20 ━━━━●═════ May 27 ││                 │
│              │                                   │ │ ◀◀  ◀  ⏸  ▶  ▶▶   1d/s ││                 │
│              │                                   │ │ Day 38 of 38 · live ◐   ││                 │
│              │                                   │ └─────────────────────────┘│                 │
└──────────────┴───────────────────────────────────┴────────────────────────────┴─────────────────┘
```

### 2.1 `/map` with inspector open on Bunia (admin1)

Right pane (380px) replaces "Click a region" with:

```
┌─[Inspector]────────────────────────────────────┐
│ Bunia · Ituri Province · DRC               [✕] │
│ [OutbreakHeader compact]                       │
│ ●● PHEIC · Bundibugyo · Day 38                 │
│ ──────────────────────────────────────────── │
│ [Tabs: Overview · Timeline · Sources · Raw]    │
│ ─── Overview ───────────────────────────────  │
│                                                │
│ Confirmed         87    ▁▂▃▅▇  +9 7d           │
│   ⓘ WHO sit rep #14, 26 May 2026               │
│ Deaths            29    ▁▁▂▃▄  +3 7d           │
│ CFR               33.3% ━━━─── −1.2pp          │
│ Population        ~150k (UN OCHA 2024)         │
│ Attack rate       58 / 100k                    │
│                                                │
│ ── First detected ─────────────────────────── │
│ April 20, 2026 · 37 days ago                   │
│ Index case: 34F, HCW, Bunia General Hospital   │
│ [Open full outbreak detail →]                  │
│                                                │
│ ── Multi-source agreement ─────────────────── │
│ WHO 87 · MoH 87 · ECDC 85   [+1 disagreement] │
│ Click to see per-source values.                │
└────────────────────────────────────────────────┘
```

### 2.2 `/map` with TimeScrubber engaged

Below canvas, scrubber expands to 120px showing a stacked-area chart of confirmed cases over time with a draggable `●` head. As you drag, choropleth and inspector reflow live. ARIA-live `polite` announces "Day 22 of 38, 41 confirmed cases."

### 2.3 `/map` with multiple layers toggled

Layer rail shows ETU, vaccination sites, and population density all on. Canvas now shows: choropleth (base layer) + circle markers (ETU) + heatmap overlay (pop density at 40% opacity). Legend stacks vertically in bottom-left, each entry collapsible.

### 2.4 `/map` mobile (375px)

```
┌─────────────────────────────────────┐
│ ≡  ituri-sitrep             ⌘  ◑   │ 48px
├─────────────────────────────────────┤
│                                     │
│        [MAP — full bleed]           │
│                                     │
│  [+] [−]                            │ floating
│                                     │
│  ┌─[FloatingStats peek 120px]────┐ │
│  │ ════ drag handle ════         │ │ 4×36 handle
│  │ ● Ebola Bundibugyo            │ │ vaul snap
│  │ 142 cases · 47 deaths         │ │ 0.12/0.5/0.92
│  │ Day 38 · ◐ live               │ │
│  └───────────────────────────────┘ │
├─────────────────────────────────────┤
│  ⌂      ⊕●      ☰      ⌖      §    │ 56px bottom tabs
│ Today  Map   Outbrk  Sitreps Srcs   │
└─────────────────────────────────────┘
```

Drag handle: 4×36px, 40% alpha (Material 3 spec). Snap points per vaul: `[0.12, 0.5, 0.92]`. Tap handle to cycle, double-tap to dismiss. `modal={false}` so the map is still pannable behind. `largestUndimmedDetentIdentifier = .medium` analog.

---

### 3.0 `/outbreaks` — list view

```
┌─[NavRail]─┬──────────────────────────────────────────────────────────────────────┐
│           │ Outbreaks · 14 active                                                  │
│           │ [Search outbreaks…]   [Pathogen ▾] [Region ▾] [Status ▾] [Sort: New ▾]│
│           │ ──────────────────────────────────────────────────────────────────── │
│           │ ┌──────────────────────────────────────────────────────────────────┐ │
│           │ │ ● Ebola Bundibugyo · DRC + Uganda                                │ │
│           │ │   142 confirmed · 47 deaths · CFR 33.1% · Day 38                 │ │
│           │ │   ▁▂▃▅▇  WHO + MoH + ECDC · last update 4h ago                   │ │
│           │ │   [PHEIC] [Filovirus] [BDBV]                                  → │ │
│           │ └──────────────────────────────────────────────────────────────────┘ │
│           │ ┌──────────────────────────────────────────────────────────────────┐ │
│           │ │ ● Marburg · Ethiopia                                              │ │
│           │ │   16 confirmed · 8 deaths · CFR 50.0% · Day 13                   │ │
│           │ │   ▁▂▃  WHO + EPHI · last update 18h ago                          │ │
│           │ │   [Active] [Filovirus]                                        → │ │
│           │ └──────────────────────────────────────────────────────────────────┘ │
│           │ … (12 more) …                                                          │
└───────────┴────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Filtered by pathogen — pathogen pill becomes solid, count updates, filter chip "Pathogen: Filovirus ✕" appears under the search bar.

### 3.2 Empty state

```
┌───────────────────────────────────────────────────────┐
│              No active outbreaks                        │
│              ────────────────────                      │
│   We aren't currently tracking any active outbreaks   │
│   matching these filters. Check /sitreps for the      │
│   chronological feed, or adjust your filters above.    │
│                                                        │
│   [Clear filters]   [Browse historical outbreaks →]   │
└───────────────────────────────────────────────────────┘
```

---

### 4.0 `/outbreaks/ebola-bundibugyo/cod/2026-04-20` — outbreak detail

```
┌─[NavRail]─┬──────────────────────────────────────────────────────────────────────┐
│           │ ‹ Outbreaks › Ebola Bundibugyo › DRC › 2026-04-20                    │
│           │                                                                        │
│           │ [OutbreakHeader]                                                       │
│           │ ●●●● PHEIC                                                             │
│           │ Ebola virus disease (Bundibugyo virus)                                 │
│           │ Democratic Republic of the Congo + Uganda · Onset April 20, 2026     │
│           │ Day 38 · 142 cases · 47 deaths · CFR 33.1%                            │
│           │ [Open on /map ⇗] [Copy citation ⧉] [RSS] [Share]                      │
│           │ ──────────────────────────────────────────────────────────────────── │
│           │ [Tabs: 1 Brief · 2 Epi curve · 3 Geography · 4 Sources · 5 Methods]   │
│           │                                                                        │
│           │ ┌── Daily brief ────────────────────────[show me the data ⇄]──────┐ │
│           │ │ Source Serif 4 17/1.55                                          │ │
│           │ │                                                                  │ │
│           │ │ The Bundibugyo virus outbreak declared in Bunia Health Zone on  │ │
│           │ │ April 20 has now spread to 6 of Ituri Province's 36 health      │ │
│           │ │ zones, with 142 confirmed cases and 47 deaths as of WHO's       │ │
│           │ │ May 26 situation report. Case-fatality is 33.1%, consistent     │ │
│           │ │ with the 25–40% historical range for BDBV.                      │ │
│           │ │                                                                  │ │
│           │ │ Two confirmed cases reported in Bwera, Kasese District, Uganda  │ │
│           │ │ on May 22 triggered Uganda's declaration; both had documented   │ │
│           │ │ travel from Bunia within the incubation window.                 │ │
│           │ │                                                                  │ │
│           │ │ [continue reading ▾]                                            │ │
│           │ │                                                                  │ │
│           │ │ — generated · 14 sources · Claude 3.7 · reviewed 4h ago         │ │
│           │ └─────────────────────────────────────────────────────────────────┘ │
│           │                                                                        │
│           │ ┌── Key figures ─────────────────────────────────────────────────┐  │
│           │ │ [StatCard ×4 row, as on /today but outbreak-scoped]            │  │
│           │ └─────────────────────────────────────────────────────────────────┘ │
│           │                                                                        │
│           │ ┌── Epi curve (TimelineMulti) ─────────────────────────────────┐    │
│           │ │ Cases by date of onset, 3-day moving avg                      │    │
│           │ │     ▇                                                          │    │
│           │ │    ▇▇▇      ▇                                                 │    │
│           │ │   ▇▇▇▇▇   ▇▇▇▇                                                │    │
│           │ │  ▂▂▃▃▅▇▇▇▇▇▇▇▇▇▇▇▇                                            │    │
│           │ │ Apr 20      May 6        May 27                               │    │
│           │ │ Track: confirmed · deaths · suspected (toggleable)            │    │
│           │ └─────────────────────────────────────────────────────────────────┘ │
└───────────┴────────────────────────────────────────────────────────────────────────┘
```

### 4.2 "Show me the data" expert mode

Toggle flips the brief region into a data table:

```
┌── Raw figures table ──────────────────────────────────────────────────────────┐
│ Date       │ Confirmed │ Probable │ Suspected │ Deaths │ Source        │ Quote │
│ 2026-04-20 │ 1         │ 0        │ 3         │ 0      │ MoH press     │ ⓘ    │
│ 2026-04-22 │ 4         │ 1        │ 7         │ 1      │ MoH bulletin  │ ⓘ    │
│ 2026-04-25 │ 9         │ 2        │ 14        │ 3      │ WHO DON       │ ⓘ    │
│ …          │           │          │           │        │               │       │
│ 2026-05-26 │ 142       │ 8        │ 47        │ 47     │ WHO sit rep#14│ ⓘ    │
│                                                                                │
│ [Download CSV] [Download JSON] [BibTeX] [APA]                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.0 `/sitreps` — chronological feed

```
┌─[NavRail]─┬─────────────────────────────────────────────────────────────┐
│           │ Sitreps · all sources · reverse chronological               │
│           │ [Filter chips: Source ▾ Pathogen ▾ Country ▾ Trust ▾]      │
│           │ ─────────────────────────────────────────────────────────  │
│           │ ── Today · May 27 ──────────────────────────────────────  │
│           │ ┌───────────────────────────────────────────────────────┐ │
│           │ │ 14:32  ● WHO DON  Ebola BDBV update — DRC/UGA      → │ │
│           │ │ 11:18  ● MoH DRC  Daily bulletin #38                → │ │
│           │ │ 09:04  ◐ ACLED   Security events Ituri 24h         → │ │
│           │ └───────────────────────────────────────────────────────┘ │
│           │ ── Yesterday · May 26 ─────────────────────────────────  │
│           │ … (paginated, infinite scroll triggers at 80% scrolled) … │
└───────────┴──────────────────────────────────────────────────────────────┘
```

### 5.2 Single sitrep expanded — inline expansion (not modal), shows full extracted quote, key figures pulled from this sitrep, link to original PDF/source, "View in evidence locker."

---

### 6.0 `/sources` — source library

```
│ Sources · 47 tracked · 12 active for current outbreaks                │
│ [Search] [Trust: All ▾] [Type: All ▾]                                 │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ WHO Disease Outbreak News           tier-1 · 4h ago · ✓ healthy │ │
│ │ Africa CDC                          tier-1 · 6h ago · ✓ healthy │ │
│ │ ECDC Threat Assessment              tier-1 · 1d ago · ✓ healthy │ │
│ │ MoH DRC bulletin                    tier-2 · 22h ago · ✓ healthy│ │
│ │ ReliefWeb                           tier-2 · 2h ago · ✓ healthy │ │
│ │ ACLED                               tier-2 · 4h ago · ✓ healthy │ │
│ │ Pathoplexus                         tier-1 · live · ✓ healthy   │ │
│ │ NewsAPI aggregator                  tier-3 · 30m ago · ⚠ slow   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
```

### 6.1 `/sources/who-don` — single source: parser version, fetch interval, last fetch, recent extracted figures, full chain-of-custody, evaluation score.

---

### 7.0 `/methods` — editorial methodology (Source Serif 4, single column max-width 680px, FT/NYT voice)

```
│                                                                 │
│      How we report on outbreaks                                 │
│      ─────────────────────────────                              │
│                                                                 │
│   Every figure on this site can be traced to a primary source. │
│   This page describes our sourcing hierarchy, our extraction   │
│   pipeline, and the human reviews that gate publication.       │
│                                                                 │
│   1. Tier-1 sources                                            │
│   2. Tier-2 sources                                            │
│   3. Tier-3 sources                                            │
│   4. The extraction pipeline                                   │
│   5. Anomaly detection and the four escalation classes         │
│   6. What we do not publish                                    │
│   7. Corrections policy                                        │
│                                                                 │
│   … long-form Source Serif 4 prose with FootnoteMarkers …      │
```

---

### 8.0 `/search` results

Two-column: left = results list (results carry pathogen pill, country, date, source, snippet with hit highlighted), right = preview pane (loads on hover or focus).

### 8.1 ⌘K command palette overlay

```
┌─[overlay, dimmed backdrop, modal=true]────────────────────────┐
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ⌕  ebola_                                              ⌘K │ │  640×480 max
│ │ ──────────────────────────────────────────────────────── │ │
│ │ ── Outbreaks ────────────────────────────────────────── │ │
│ │ ▸ ● Ebola Bundibugyo · DRC/UGA · active   [⏎ Go]        │ │
│ │   ● Ebola Sudan · Closed · 2025                          │ │
│ │ ── Sources ─────────────────────────────────────────── │ │
│ │   WHO DON — Ebola DRC                                    │ │
│ │ ── Actions ────────────────────────────────────────── │ │
│ │   Open /map  · g m                                       │ │
│ │   Toggle theme · ⌘⇧L                                     │ │
│ │   Show keyboard help · ?                                 │ │
│ │ ──────────────────────────────────────────────────────── │ │
│ │ ↑↓ navigate · ⏎ select · esc close                       │ │
│ └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

Built on cmdk (`Written in 2019 by Paco (@pacocoursey) … Used for the Vercel command menu and autocomplete by Rauno (@raunofreiberg) in 2020`).

---

### 9.x `/internal/*` (auth-gated, Linear settings aesthetic — calm gray, dense, no severity colors except where it's the data)

```
/internal/cost — header KPIs: $/day Anthropic, $/extraction, $/figure-published; stacked area by model; outliers table.
/internal/pipeline — Inngest run viewer: function · status · duration · trace ID · retry button.
/internal/escalations — kanban with 4 columns: AnomalyDetected · LowConfidence · DisagreementGT15% · UnreviewedAge>24h. Cards drag between columns; resolution writes audit log.
/internal/quality — eval scores over time: line chart for extraction accuracy, citation correctness, anomaly precision/recall.
/internal/sources — table: source · last fetch · parser version · failures 7d · status pill.
/internal/audit — append-only log of agent actions, filter by agent/action/figure.
```

### 10.0 `/evidence/[quote-id]` — permalink

```
│ [SourceQuoteCard expanded to full page]                          │
│ Quote ID: q_7a9f3c2e · permalink                                │
│ ─────────────────────────────────────────────────────────────  │
│ Source: WHO Disease Outbreak News, May 26 2026, sit rep #14    │
│ Published: 2026-05-26 18:34 UTC                                 │
│ Fetched: 2026-05-27 04:12 UTC                                   │
│ ─────────────────────────────────────────────────────────────  │
│ "As of 26 May 2026, a total of 142 confirmed cases of Ebola    │  Source Serif 4 italic
│  virus disease, including 47 deaths (case-fatality ratio       │  16/1.6
│  33.1%), have been reported from Ituri Province."              │
│ ─────────────────────────────────────────────────────────────  │
│ Used in 8 figures across this site →                            │
│ [Open original ⇗] [Copy permalink ⧉] [BibTeX] [APA]            │
│ Chain of custody:                                               │
│   Fetched by parser:who-don@v3.2 → extracted by claude-3-7-…   │
│   → reviewed by:human@2026-05-27 → approved                    │
```

### 11.0 keyboard help overlay — opens with `?`, modal, two-column grid of all shortcuts grouped by Navigation / Map / Inspector / Search / Theme.

### 12.0 settings — accessed via ⌘K → "Settings" or `g s`. NOT its own route. Sections: Theme, Density, Reduced motion, Color-blind palette, Default landing page.

---

## §3 — Component wireframes (every primary state)

### StatCard

```
DEFAULT (180×136, p-16, bg-card, border-1, rounded-12)
┌──────────────────────────────────┐
│ Confirmed                  [ⓘ]   │  Mono 11 muted
│                                  │
│ 142                              │  Geist 32/600
│                                  │
│ ▁▂▃▅▇  +18 over 7 days           │  sparkline 64×16 + Mono 11
│                                  │
│ WHO · 4h ago                     │  ProvenanceBadge + LastUpdated
└──────────────────────────────────┘

HOVER (border tints to ring/30, cursor pointer)
┌══════════════════════════════════┐
│ Confirmed                  [ⓘ]   │
│ 142          ← dotted underline  │  cursor: help on the number
│ ▁▂▃▅▇  +18 over 7 days           │
│ WHO · 4h ago                     │
└══════════════════════════════════┘

FOCUS-VISIBLE
┌──────────────────────────────────┐  outline: 2px solid red400 offset:2
│ … (default content) …            │
└──────────────────────────────────┘

LOADING (skeleton)
┌──────────────────────────────────┐
│ ░░░░░░░░░░░░                     │  shimmer 1.2s
│ ░░░░░                            │
│ ░░░░░░░░░░░░░░░░░░               │
│ ░░░░░░░░░░░░                     │
└──────────────────────────────────┘

STALE (>24h)
┌──────────────────────────────────┐
│ Confirmed                  [ⓘ]   │
│ 142                              │
│ ▁▂▃▅▇  +18 over 7 days           │
│ WHO · 3d ago   ⚠ stale           │  yellow300 pill
└──────────────────────────────────┘

ERROR (extraction failed)
┌──────────────────────────────────┐
│ Confirmed                  [ⓘ]   │
│ —                                │  em-dash, no number
│ Awaiting verification            │  Mono 11 muted
│ [Open escalation ↗]              │  link to /internal/escalations
└──────────────────────────────────┘

ANOMALY
┌──────────────────────────────────┐
│ Confirmed              ◑ verifying│  pulse + AnomalyBadge
│ 142                              │
│ ▁▂▃▅▇  +18 7d  ↑ 3× baseline     │  anomaly note
│ WHO · 4h ago                     │
└──────────────────────────────────┘

DISAGREEMENT (multi-source)
┌──────────────────────────────────┐
│ Confirmed                  [ⓘ]   │
│ 142                  [+1 disagrees]│ small pill
│ WHO 142 · MoH 140 · ECDC 138     │
│ ▁▂▃▅▇  +18 7d                    │
│ multi-source · 4h ago            │
└──────────────────────────────────┘
```

Spacing: padding 16, gap 8, sparkline mt-12. Keyboard: focusable, ⏎ opens evidence drawer of the headline figure.

### Figure (inline provenance primitive)

```
DEFAULT (inline)        → 142
HOVER                   → 142   ←  dotted-underline appears, cursor: help
                                   SourceQuoteCard popover renders after 150ms

FOCUS-VISIBLE           → 142   ←  outline ring 2px
                                   popover opens via keyboard (no delay)

ACTIVE / CLICKED        → 142   ←  brief flash bg-red300/20 over 120ms
                                   SourceQuoteDrawer slides in from right

ANOMALY                 → 142◑  ← 6px pulse to right
LOW-CONFIDENCE          → 142?  ← AIGeneratedLabel + 30% muted
DISAGREEMENT            → 142⁺¹ ← superscript count
```

### SourceQuoteCard (hover popover, 320×220, shadow-xl, rounded-12)

```
┌───────────────────────────────────────────┐
│ ▷ WHO Disease Outbreak News               │  ProvenanceBadge
│   tier-1 · published May 26 2026          │
│ ───────────────────────────────────────── │
│ "…142 confirmed cases of Ebola virus      │  Source Serif 4 italic 14/1.5
│  disease, including 47 deaths (case-      │
│  fatality ratio 33.1%)…"                  │
│ ───────────────────────────────────────── │
│ Fetched 4h ago · sit rep #14              │  Mono 11
│ Click for full evidence →                 │  link affordance
└───────────────────────────────────────────┘
```

States: default / loading (skeleton) / error (`Source unreachable — last known quote 26 May`) / disagreement (mini-table of per-source values).

### SourceQuoteDrawer (480px right slide-over, 320ms ease-out)

```
┌─────────────────────────────────────────────────────┐
│ Evidence · q_7a9f3c2e                          [✕] │  56 header
│ ─────────────────────────────────────────────────── │
│ ▷ WHO DON · tier-1 · 4h ago  [Open original ⇗]     │  ProvenanceBadge
│                                                     │
│ "As of 26 May 2026, a total of 142 confirmed cases  │  Source Serif 4
│  of Ebola virus disease, including 47 deaths        │  16/1.6 italic
│  (case-fatality ratio 33.1%), have been reported    │
│  from Ituri Province."                              │
│                                                     │
│ ─── Used in 8 figures ────────────────────────────  │
│ • /today  · Confirmed StatCard                       │
│ • /map · Bunia inspector                             │
│ • /outbreaks/ebola-bundibugyo/cod/2026-04-20         │
│ … (5 more) …                                         │
│                                                     │
│ ─── Chain of custody ─────────────────────────────  │
│ Fetched  who-don@v3.2  2026-05-27 04:12 UTC          │
│ Extracted claude-3-7  2026-05-27 04:14 UTC           │
│ Reviewed human         2026-05-27 04:31 UTC          │
│ Anomaly  none                                        │
│ Confidence  0.98                                     │
│                                                     │
│ ─── Citation ────────────────────────────────────── │
│ [Plain] [BibTeX] [APA]   [Copy ⧉]                   │
│                                                     │
│ ─── Multi-source comparison ────────────────────── │
│ Confirmed: WHO 142 · MoH 140 · ECDC 138              │
│ Δ across sources: 4 (2.8%)                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Keyboard: `esc` close · `c` copy citation · `o` open original · `e` go to /evidence/[id] permalink.

### SeverityPill — four levels

```
PHEIC      ●●●● red400  white text  uppercase  Geist Mono 11/600
ACTIVE     ●●●  red300  white text
WATCH      ●●   yellow300  black text
CLOSED     ●    neutral  muted text
```

### ProvenanceBadge

```
▷ WHO         tier-1   solid red400 dot
▷ Africa CDC  tier-1
▷ MoH DRC     tier-2   open red300 dot
▷ ReliefWeb   tier-2
▷ Aggregator  tier-3   gray dot
```

### LastUpdatedIndicator
- `< 6h` → "4h ago" + green dot
- `6–24h` → "18h ago" + neutral
- `24–72h` → "2d ago" + ⚠ yellow
- `>72h` → "5d ago" + ⚠⚠ red300

### AIGeneratedLabel — 12px Mono, leading sparkle glyph `✦`, muted color, hover tooltip "Auto-generated by Claude — reviewed by [name] [time]."

### GlossaryTerm — inline term with dotted underline (different color from Figure: blue300 vs red300). Hover → 280×160 popover with definition + "Read more in /methods → glossary."

### TimelineMulti

```
┌───────────────────────────────────────────────────────────┐
│ Cases by date of onset                                    │
│ ──────────                                                 │
│ Tracks: ☑ confirmed  ☑ deaths  ☐ suspected   3-day MA ▾   │
│                                                            │
│      ▇                                                     │
│     ▇▇▇      ▇                                            │
│    ▇▇▇▇▇   ▇▇▇▇                                          │
│   ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇                                       │
│  ▂▂▃▃▅▇▇▇▇▇▇▇▇▇▇▇▇▇▇                                     │
│ ─────────────────────────────────────                     │
│ Apr 20 · · · May 6 · · · May 27                           │
│                                                            │
│ Source: WHO DON · MoH DRC                       Hover  ⓘ  │
└───────────────────────────────────────────────────────────┘
```

### TimeScrubber — see §2.2.

### MapPane controls — see §2.0.

### InspectorTabs — `[Overview · Timeline · Sources · Raw]` with active underline 2px red400; Tab key cycles; `1 2 3 4` direct.

### CommandBar (⌘K) — see §8.1.

### FilterChip
```
DEFAULT          Pathogen: Ebola   [✕]   border-1 rounded-full
HOVER            tinted bg, ring/20
FOCUS            outline ring
REMOVED          fade-out 120ms
```

### DataTable row — see §4.2.

### Skeletons
- SkeletonChart: 400×240 placeholder with shimmer
- SkeletonMap: 600×400, neutral background + grid pattern
- SkeletonStatCard: 4 bars (see StatCard:loading)

### Toast — appears top-right 12px from corner, 320×64, ease-out, auto-dismiss 5s.

### EmptyState — see /outbreaks 3.2.

### ErrorState — same shape as empty, with `⚠` and CTA to retry / open /internal/pipeline.

### Modal/Dialog — center-screen, max-width 480, focus-trap, esc closes.

### Dropdown — Radix, 8px padding items, ⏎ activates.

### Breadcrumbs — `‹ Outbreaks › Ebola Bundibugyo › DRC › 2026-04-20`.

### NavRail — see §1.0.

### Mobile bottom sheet — see §2.4. Snap points 0.12/0.5/0.92 (vaul: *"Array of numbers from 0 to 1 that corresponds to % of the screen a given snap point should take up"*). Drag handle 4×36, alpha 0.4 (Material 3: *"BottomSheetDragHandleView has a default min width and height of 48dp to conform to the minimum touch target requirement"*).

### AnomalyBadge — small `◑ verifying` pill, yellow300, click opens escalation context drawer.

### PulseIndicator — 4px filled circle in red400; animates opacity 1→0.3→1 over 1.6s; reduced-motion: static.

### CitationCopier — popover with three tabs `Plain · BibTeX · APA`, each with a code block + Copy button.

### CopyButton — 28×28, ⧉ icon; on click → ✓ for 1.2s.

### ExternalLinkIcon — ↗ 12px, color inherits.

### FootnoteMarker — superscript `¹` `²` … links to bottom-of-page reference list AND opens SourceQuoteDrawer on click.

### KeyboardKeycap — `⌘` `K` styled as 22×22 mono in rounded-4 border, Mono 11.

### TabBar, Accordion, Toggle, RadioGroup, Checkbox, Slider, Tooltip, HoverCard, ContextMenu — all shadcn/Radix defaults, themed via OKLCH tokens; focus rings 2px red400; reduced-motion respected throughout.

---

## §4 — Interaction choreography

### Opening ⌘K → navigating to an outbreak (6 frames)

```
F1  Idle                  cursor anywhere
F2  ⌘+K pressed           backdrop fades in 80ms, palette scales 0.96→1 over 120ms
F3  Palette focused       cursor in input, recent items list
F4  User types "ebol"     list filters live, top match highlighted
F5  ↓ once                second item highlighted
F6  ⏎                     palette dismisses 80ms, route push to /outbreaks/ebola-…
```

### Hover Figure → SourceQuoteCard → SourceQuoteDrawer (6 frames)

```
F1  142                                       idle
F2  142  ← cursor near                        cursor: help, no dotted yet
F3  142̲   (dotted underline appears)         150ms after hover-in
F4  142̲   [card 320×220 popover above]       250ms after F3, opacity 0→1
F5  click                                     bg flash red300/20 120ms
F6  drawer slides in from right 320ms         backdrop dims 30%
```

### Scrubbing timeline (4 frames)

```
F1  scrubber at May 27 (live)                 map shows current state
F2  cursor on scrubber thumb, mousedown       thumb scales 1→1.2
F3  drag to May 12                            map choropleth re-renders 60fps
                                              ARIA-live: "May 12, 2026, 32 confirmed"
F4  release                                   thumb returns 1; pulse halts (paused)
```

### Toggling map layers via keyboard (4 frames)

```
F1  /map focus on canvas                      keyboard help shows L for layers
F2  press L                                   layer rail flashes, focus moves
F3  ↓↓ then space                             "Deaths" layer toggle flips on
F4  esc                                       focus returns to canvas
```

### Inspector on admin1 click (5 frames)

```
F1  hover Bunia polygon                       polygon stroke 2px red400
F2  click                                     polygon fills red300/30, 120ms
F3  inspector slides in from right 320ms      backdrop dim 20%
F4  inspector tab 1 (Overview) renders        StatCards stream in 80ms each
F5  esc or ✕                                 inspector retracts 240ms
```

### Multi-source disagreement expansion (5 frames)

```
F1  StatCard shows "142  [+1 disagrees]"
F2  click pill                                pill rotates ◓
F3  expansion panel slides down 200ms         shows per-source mini-table
F4                                            WHO 142 · MoH 140 · ECDC 138
                                              [Open evidence drawer →]
F5  collapse                                  ↑ returns to compact form
```

### Anomaly flag appearance (4 frames)

```
F1  Figure renders 380                        Idle
F2  background extraction flags 3× baseline   AnomalyBadge ◑ verifying appears
F3  click ◑                                   escalation drawer opens
F4  context: baseline 124, reported 380       [Open /internal/escalations →]
                                              [Approve override] [Reject]
```

### First-visit onboarding band (4 frames)

```
F1  band visible at top of /today             slide down 200ms on first paint
F2  user reads + clicks "Take a 30-second tour" coachmarks light up Figure, NavRail, ⌘K
F3  tour completes                            band shrinks to 0 height 240ms
F4  /today renders with normal chrome
```

### Mobile bottom-sheet drag (5 frames)

```
F1  sheet at peek 0.12                        stats line visible
F2  user drags up                             snap-zone hints appear at 0.5 and 0.92
F3  release mid-drag                          velocity-based snap to nearest
F4  sheet at 0.5                              StatCard row + epi curve visible
F5  drag down past 0.12 + closeThreshold      sheet dismisses, peek hidden
```

### AI brief → show data toggle (4 frames)

```
F1  Brief paragraph visible
F2  click [show me the data ⇄]                paragraph fades 120ms
F3  RawDataTable scales in 200ms              skeleton briefly visible
F4  toggle persists in localStorage           ?view=data added to URL
```

### Keyboard nav `g o → j j → ⏎ → 1 2 3 4`

```
F1  g  vim leader hint appears
F2  o  navigates to /outbreaks
F3  j  highlight first row → second row
F4  j  third row
F5  ⏎  open detail
F6  2  switch to Epi curve tab
F7  3  Geography tab
F8  4  Sources tab
```

### Stale data attention flow (5 frames)

```
F1  Figure shows "3d ago ⚠"
F2  PulseIndicator in global header pulses yellow
F3  user notices, clicks pulse                small popover: "12 figures stale · WHO source 72h+"
F4  click "Open pipeline →"                   navigate /internal/pipeline
F5  pipeline shows failed who-don fetch job   user can retry
```

---

## §5 — State permutations grid (manifestation by component)

| Outbreak × Freshness × Completeness | Global header | OutbreakHeader | StatCard | Figure |
|---|---|---|---|---|
| PHEIC + fresh (<6h) + complete | ◐ Live red pulse | `●●●● PHEIC` red banner | All cards default | Default dotted |
| PHEIC + stale (24-72h) | ⚠ yellow pulse | `●●●● PHEIC · ⚠ data 2d stale` | LastUpdated yellow pill | Tooltip notes staleness |
| PHEIC + very stale (>72h) | ⚠⚠ red pulse + link to /internal/pipeline | banner adds `Data unverified >72h` red300 | "Awaiting verification" or em-dash if doctrine says hide | Figure muted 50%, `?` suffix |
| Active + fresh + partial | ◐ green | `●●● Active` | Missing fields render `—` not `0` | OK figures default; missing show `[no data]` |
| Active + fresh + extraction-fail-pending | ◐ green | banner: `1 figure under review` link | Affected card: error state | Affected figure: `?` + escalation link |
| Historical (closed) | static dot | `● Closed YYYY-MM-DD` neutral | All cards readonly tone | Default but tooltip notes archival |
| New + no published numbers | ◐ green | `●●● Active · figures pending` | StatCards show "—" + "Awaiting first official figures" | n/a |

| Source × Trust × Reliability | SourceQuoteCard | Drawer chain-of-custody |
|---|---|---|
| WHO + verified + cached | `▷ WHO tier-1` solid · "cached 4h" | green check |
| WHO + verified + live | `▷ WHO tier-1` solid · "live ◐" | green check + live badge |
| ECDC + verified + disagrees-with-WHO | `▷ ECDC tier-1` + `+1 disagreement` pill | extra "compare-with-WHO" section |
| MoH + unverified + sole | `▷ MoH tier-2` + ⚠ "sole source" | flag in custody log |
| Aggregator + low-trust + corroborating | `▷ Aggregator tier-3` muted · "+ 2 corroborating sources" | shows corroborator IDs |

| LLM extraction state | Figure styling | StatCard styling |
|---|---|---|
| Auto, high-conf | default dotted | default |
| Auto, low-conf | `?` glyph + muted 30% | "⚠ low confidence" yellow pill |
| Auto, anomaly | `◑ verifying` | AnomalyBadge in header |
| Manual approved | small ✓ in popover header | "human-reviewed" in metadata |
| Manual rejected | figure not rendered; `[no data]` placeholder + reason on hover | "value withheld" state with link to methodology |

---

## §6 — Responsive breakpoints

```
1920px HD desktop
  ┌NavRail 60┬LayerRail 320┬─CANVAS flexes──┬Inspector 420┬OptionalRight 240┐
  Datadog-style High Density Mode: KPI row gets 12 cards instead of 4.

1440px standard laptop (DEFAULT design target)
  ┌NavRail 60┬LayerRail 280┬─CANVAS 780────┬Inspector 380┐
  /today: 4-up KPI grid, max content width 1240.

1280px small laptop
  ┌NavRail 60 (icon-only by default)┬LayerRail 240┬CANVAS 600┬Inspector 360┐
  /today: 4-up KPI grid still fits.

1024px tablet landscape
  NavRail collapses to icon-only permanently.
  /map: Inspector becomes overlay (not co-resident) — opens over canvas at 360.
  /today: KPI grid 4→2 columns, brief still single-column.

834px iPad portrait
  Top nav becomes tab bar at top with overflow into ≡.
  /map: LayerRail collapses into a left-edge button → opens as overlay sheet.
  Inspector → bottom sheet (snap 0.4 / 0.85).
  /today: KPI grid 2-up. Brief width fixed 680.

600px large phone
  Bottom-tab navigation (Vercel 2026 pattern).
  /map: full-bleed canvas + bottom sheet 0.12/0.5/0.92.
  /today, /sitreps, /outbreaks: single column, max-width 100vw, StatCards stack 1-up with sparkline inline.

375px iPhone SE
  Same as 600 but: StatCard height collapses (number + delta only, sparkline below number); tab bar truncates to 4 icons + "More."
  Daily brief: Source Serif 4 stays 17px (don't shrink prose).
```

The Linear lesson applied: mobile is not "1440 scaled down." Mobile has its own information hierarchy — peek-the-stats-then-decide. Per Vercel's 2026 rollout: *"floating bottom bar optimized for one-handed use."*

---

## §7 — Print and share

```
OG card 1200×630
┌────────────────────────────────────────────────────────────────┐
│ ●●●● PHEIC                                                     │
│ Ebola Bundibugyo · DRC + Uganda                                │  H1 56 white on red400
│                                                                │
│ 142 confirmed · 47 deaths · CFR 33.1%                          │  H2 36
│ Day 38 · updated May 27                                        │  Mono 24
│                                                                │
│                                            ituri-sitrep ↗      │
└────────────────────────────────────────────────────────────────┘

Twitter 1200×600: same minus footer, slightly tighter type.

Embedded chart iframe sizes:
  320×240  KPI single-stat with sparkline
  480×320  StatCard + small TimelineMulti
  720×480  Full TimelineMulti with controls

RSS entry (text):
  <title>WHO sit rep #14 — Ebola Bundibugyo</title>
  <pubDate>Tue, 27 May 2026 14:32:00 UTC</pubDate>
  <description>142 confirmed cases (+12 in 24h), 47 deaths (CFR 33.1%). 
    Six health zones affected; vaccination of 1,847 ring contacts ongoing.
    Source: WHO Disease Outbreak News, https://who.int/...</description>
  <link>https://ituri-sitrep.org/sitreps/2026-05-26-who-don-…</link>

Print PDF of outbreak detail:
  Letter or A4. Single column 680px. NavRail hidden. Each Figure becomes a
  numbered footnote with full source citation appended after Methods.
  Page header: outbreak name + date + ituri-sitrep · permalink.
  Page footer: page X of Y · generated YYYY-MM-DD HH:MM.
```

---

## §8 — Micro-interaction annotations

| Trigger | Visual change | Motion | Sound | Keyboard | Touch | a11y |
|---|---|---|---|---|---|---|
| Hover Figure | dotted underline + card after 150ms | 150ms fade-in opacity, 80ms scale 0.98→1 | none | focus → instant | n/a (use long-press 400ms) | aria-describedby on number; role="button" |
| Click Figure | flash + drawer slides | flash 120ms, drawer 320ms ease-out | none | ⏎ on focus | tap | drawer focus-traps; "Evidence drawer opened" |
| Open ⌘K | overlay + scale | 80ms fade, 120ms scale 0.96→1 | none | ⌘K / ctrl-K | from `⌕` icon | role="dialog" aria-label="Command palette" |
| Map pan | canvas translate | 60fps, no animation overhead | none | arrows pan 32px | drag | live-region announces lat/lng change every 500ms |
| Map zoom | scale | 200ms ease | none | + / − or ⌘+ / ⌘− | pinch | announce zoom level |
| Click admin1 | polygon fill + inspector | 120ms fill, 320ms drawer | none | enter on focused polygon | tap | "Bunia inspector opened" |
| Arrow pan keyboard | canvas translate | 80ms ease | none | ←↑→↓ | n/a | announce direction + new center |
| Timeline brush | thumb drag + chart reflow | 16ms per frame | none | ←/→ steps 1 day, shift = 7 | drag | announce date + value |
| Timeline tick click | jump | 200ms tween | none | n/a | tap | announce |
| Inspector tab switch | content cross-fade | 120ms | none | 1 2 3 4 / Tab | tap | aria-selected updated |
| Drawer open | slide right 320 | 320ms ease-out | none | ⏎ on Figure | n/a | focus moves to drawer; aria-modal |
| Drawer close | slide right 240 | 240ms | none | esc | swipe-right or × | focus returns to opener |
| Drawer drag-dismiss (mobile) | vaul handle | spring 500ms | none | n/a | drag below closeThreshold 0.5 | announce |
| Toast appear | slide-in top-right | 200ms ease-out | none | n/a | n/a | role="status" |
| Toast dismiss | slide out | 120ms | none | esc focuses if visible | swipe | n/a |
| Filter chip add | scale-in | 120ms | none | ⏎ on filter dropdown item | n/a | announce "Filter Pathogen Ebola added" |
| Filter chip remove | fade-out | 120ms | none | backspace on focused chip | tap ✕ | announce removed |
| Pagination | route push | n/a | none | →/← page | n/a | announce page n of m |
| Infinite scroll trigger | load skeleton + append | skeleton 200ms | none | enter on "load more" if shown | scroll | "Loading more sitreps" |
| Copy citation | ✓ confirmation 1.2s | scale + checkmark | none | c on drawer | tap | announce "Citation copied" |
| Theme toggle | bg/text crossfade | 160ms | none | ⌘⇧L | tap | announce theme |
| Layer toggle | checkbox flip + canvas re-render | 80ms checkbox, 200ms layer | none | space on focused row | tap | announce on/off |
| Time-window cycle | scrubber range shift | 240ms | none | 7/30/90/all numbers | tap chips | announce range |

---

## §9 — Error / edge state wireframes

```
404 outbreak not found
┌─────────────────────────────────────────┐
│            404 · not found              │
│  We don't have an outbreak at that URL. │
│  It may have been merged or renamed.    │
│  [Browse outbreaks]  [Search ⌘K]        │
└─────────────────────────────────────────┘

500 server error
┌─────────────────────────────────────────┐
│  Something failed on our side.          │
│  Incident ID: ix_…  [Retry]             │
│  Status: status.ituri-sitrep.org ↗      │
└─────────────────────────────────────────┘

Offline (PWA)
┌─────────────────────────────────────────┐
│  ⚡ Offline · showing cached data       │
│  Last sync: 2h ago                      │
│  Some figures may be stale.             │
└─────────────────────────────────────────┘

No-JS shell
┌─────────────────────────────────────────┐
│  This experience is interactive.        │
│  Below is a static snapshot from        │
│  the last server build.                 │
│  […statically-rendered StatCards + sitreps list…] │
└─────────────────────────────────────────┘

No-WebGL → static PNG choropleth + ?view=table link.

/internal/* anonymous
┌─────────────────────────────────────────┐
│  Internal area — sign in required.      │
│  [Sign in with email]                   │
└─────────────────────────────────────────┘

Rate-limited (Arcjet)
┌─────────────────────────────────────────┐
│  You're moving fast. Slow down ~10s.    │
│  Retry available at HH:MM:SS.           │
└─────────────────────────────────────────┘

Slow network sub-skeleton
  Skeletons render immediately, then progressively replaced
  card-by-card as data arrives. No spinner.

Source unavailable >24h
  Banner across /today: "WHO DON last fetched 3d ago — see status."

Extraction queue backed up
  Toast: "12 figures pending review · expected catch-up in 2h. [Open /internal]"
```

---

## §10 — Accessibility visual states

```
Focus-visible ring: outline 2px solid red400, offset 2px on all interactives.

Skip-to-content link: hidden until focus, then renders fixed top-left,
  text "Skip to main content", links to <main>.

High contrast (Windows ForcedColors):
  All borders forced to CanvasText, severity dots become CanvasText with
  text label appended ("PHEIC alert" instead of just dot).

Screen reader landmarks (annotated):
  <header role="banner" aria-label="Site header">
  <nav role="navigation" aria-label="Primary">
  <main role="main">
    <section aria-label="Active outbreak banner">
    <section aria-label="Key figures">
    <section aria-label="Daily brief">
    <section aria-label="Map preview">
  <aside role="complementary" aria-label="Inspector">
  <footer role="contentinfo">

Reduced-motion variant of TimeScrubber:
  No autoplay. Slider has no animation; chart re-renders without tween.
  Pulse indicators become static dots.

?view=table tabular alternative:
  Identical KPI data presented as a sortable HTML table with caption,
  thead/tbody/tfoot. Every Figure becomes a <th scope> + cell with the same
  popover behavior but keyboard-accessible only.

Keyboard help overlay (?): see §11.0.
```

---

## §11 — Internal admin wireframes

```
/internal/cost (Linear-settings aesthetic)
┌──────────────────────────────────────────────────────────────────┐
│ Anthropic spend · last 30 days                                   │
│ ───────────────                                                  │
│ [StatCard] Total       $284.12                                   │
│ [StatCard] Per day avg $9.47                                     │
│ [StatCard] Per figure  $0.018                                    │
│ [StatCard] Per extract $0.043                                    │
│                                                                  │
│ Stacked area by model · last 30 days                            │
│ ▇ claude-3-7  ▅ haiku  ▂ sonnet-4                               │
│ [chart]                                                          │
│                                                                  │
│ Outliers · cost > 5× median                                     │
│ Date       Job                       Tokens     Cost            │
│ 2026-05-19 reconciliation-batch-217  4.2M       $3.17           │
│ 2026-05-21 deep-summary-ETU         1.8M       $1.42           │
└──────────────────────────────────────────────────────────────────┘

/internal/pipeline
┌──────────────────────────────────────────────────────────────────┐
│ Inngest run viewer · filter: [function ▾] [status ▾] [since 24h] │
│ ────────────────                                                 │
│ Function                Status  Started      Dur    Trace        │
│ extract-who-don         ✓ ok    2 min ago    8.4s   ⧉           │
│ extract-moh-bulletin    ✓ ok    14 min ago   6.1s   ⧉           │
│ reconcile-cross-source  ⚠ retry 22 min ago   —      ⧉ [retry]   │
│ refresh-acled-events    ✓ ok    32 min ago   12.0s  ⧉           │
│ refresh-pathoplexus     ✗ fail  41 min ago   2.1s   ⧉ [retry]   │
└──────────────────────────────────────────────────────────────────┘

/internal/escalations (kanban)
┌──────────────────────────┬──────────────────┬─────────────────┬──────────────┐
│ Anomaly Detected (3)     │ Low Confidence(7)│ Disagreement(2) │ Unreviewed(4)│
│ ────                     │ ────             │ ────            │ ────         │
│ [card] Confirmed 380     │ [card] CFR 0.62  │ [card] Deaths Δ │ [card] q_… 26h│
│   baseline 124 (3×)      │   conf 0.41      │ WHO 47/MoH 51   │ awaiting human│
│   q_8a2…                 │   q_3c4…         │   q_7a9…        │              │
│ [card] …                 │ [card] …         │                 │              │
└──────────────────────────┴──────────────────┴─────────────────┴──────────────┘

/internal/quality
  Line chart: extraction accuracy (target 0.95), citation correctness, 
  anomaly precision/recall — last 90 days. Threshold lines red300 dashed.

/internal/sources
  Table: source · parser version · last successful fetch · failures (7d) · 
  trust tier · status pill · [actions: edit · disable · re-run].

/internal/audit
  Append-only log. Columns: timestamp · agent · action · figure/quote · diff.
  Filter by agent / action type / date. Permalink each row.
```

---

## §12 — World-class polish details

```
Custom selection color
  ::selection { background: oklch(red400/30); color: var(--fg); }

Top-of-page route progress bar
  2px red400, anchored top-0, animates from 0→80% during navigation start,
  jumps to 100% on done; fades 200ms.

⌘K palette opening — see §4 frames 1-6.

Inspector slide-in: 320ms ease-out cubic-bezier(0.2,0.8,0.2,1).

Mobile bottom-sheet drag handle: 4×36px, rounded-full, alpha 0.4 (Material 3 spec).

Pulsing live-data dot
  4px filled circle, animation: pulse 1.6s infinite 
  { 0%: opacity 1; 50%: opacity 0.3; 100%: opacity 1 }
  Reduced-motion: static.

Dotted underline on Figure: text-decoration: underline dotted 1.5px from-font, 
  text-underline-offset: 3px; appears on hover/focus only.

Dotted underline on GlossaryTerm: same style, color blue300 to distinguish 
  from Figure (red300).

Source Serif 4 for quotes: only used inside SourceQuoteCard, Drawer body, 
  /methods page, and daily brief. Italic for direct quotes; roman for prose.

Chain-of-custody section: monospaced 12px, label-value pairs separated by 
  thin 1px neutral dividers; "Fetched · Extracted · Reviewed · Anomaly · 
  Confidence" — exactly five rows.

Copy citation menu (three-tab popover, 360×220)
  ┌───────────────────────────────┐
  │ [Plain] [BibTeX] [APA]        │
  │ ─────                         │
  │ World Health Organization.    │
  │ (2026). Disease Outbreak News │
  │ — Ebola virus disease …       │
  │ [Copy ⧉]                      │
  └───────────────────────────────┘

Favicon — "i·s" wordmark
  32×32: lowercase "i" + middle dot + lowercase "s", Geist Mono semibold, 
  red400 on transparent. Also: monochrome variant for system tray + 
  PWA maskable icon with 64px safe-area.
```

---

## §13 — THE ULTIMATE WIREFRAME: `/map` at 1440px, fully annotated

```
═══════════════════════════════════════════════════════════════════════════════════════════════════
║ ╔══╗ ituri-sitrep   Today  Map●  Outbreaks  Sitreps  Sources  Methods    ⌘K   ◐ Live   ◑ Theme ║  TopBar 56  [Z=50, bg-background/80 backdrop-blur]
║ ║is║                                                       │aria-label="Primary navigation"     ║  [GlobalCommandBar trigger ⌘K]
═══════════════════════════════════════════════════════════════════════════════════════════════════
┌─[NavRail 60]──┬─[LayerRail 280]──────────────────┬─[CANVAS flex]──────────────────────┬─[Inspector 380]──────┐
│               │ Layers                        ⌘L │                                    │ Bunia               ✕ │
│ ⌂ Today       │ ─── Outbreak ─────────────────── │                                    │ Ituri · DRC          │
│               │ [Ebola Bundibugyo ▾]              │                                    │ ─── ●●●● PHEIC ───  │
│ ⊕ Map ●       │   selected outbreak governs the   │                                    │                       │
│ active        │   choropleth and time axis        │                                    │ [Tabs 1·2·3·4]        │
│ red400 bar    │                                   │                                    │ ─── Overview ──────  │
│               │ ─── Base maps ──────────────────  │                                    │                       │
│ ☰ Outbreaks   │ ⦿ Light (default)                 │                                    │ Confirmed       87    │
│ ⌖ Sitreps     │ ○ Dark (auto-flip with theme)     │                                    │ ▁▂▃▅▇  +9 7d         │
│ § Sources     │ ☐ Satellite                       │                                    │   WHO sit rep #14    │
│ ¶ Methods     │                                   │                                    │   [hover ⓘ]          │
│               │ ─── Borders ────────────────────  │                                    │                       │
│ ──────        │ ☑ Admin0                          │       MapLibre + deck.gl           │ Deaths          29    │
│ ⚙ Internal    │ ☑ Admin1                          │       OpenMapTiles style           │ ▁▁▂▃▄  +3 7d         │
│ (auth only)   │ ☐ Admin2                          │       Bounded 28°E-32°E,           │                       │
│               │                                   │              −2°N−4°N              │ CFR             33.3% │
│ keyboard      │ ─── Epi layers ─────────────────  │       Zoom 6.2, pitch 0            │ ━━━─── −1.2pp 7d     │
│ [ to collapse │ ☑ Confirmed cases choropleth      │                                    │                       │
│ rail to icons │   ColorBrewer Reds 5-class        │  ┌─[Legend]──────────┐             │ Pop          ~150k    │
│               │   ↳ Quantile binning              │  │ Confirmed         │             │   UN OCHA 2024       │
│               │ ☐ Cumulative deaths               │  │ ▁ 0                │             │                       │
│               │ ☐ Attack rate / 100k              │  │ ▂ 1–9              │             │ Attack    58/100k     │
│               │ ☐ Rt estimate (when modeled)      │  │ ▃ 10–49            │             │                       │
│               │                                   │  │ ▅ 50–99            │             │ ── First detected ── │
│               │ ─── Operational ────────────────  │  │ ▇ 100+             │             │ April 20, 2026       │
│               │ ☐ ETU locations                   │  │ Source: WHO+MoH     │             │ 37 days ago          │
│               │ ☐ Vaccination sites                │  └────────────────────┘             │ Index: 34F HCW,      │
│               │ ☐ ACLED events 7d                 │                                    │ Bunia General Hosp   │
│               │                                   │  ┌─[MapControls top-right]──┐      │ [Open detail →]      │
│               │ ─── Context ────────────────────  │  │ [+] [−]                  │      │                       │
│               │ ☐ Population density              │  │ [⌖ recenter]             │      │ ── Multi-source ──── │
│               │ ☐ Health facilities (HDX)         │  │ [▦ tabular view]         │      │ WHO 87 · MoH 87      │
│               │ ☐ Travel time to care             │  │ [⛶ fullscreen]           │      │ ECDC 85 [+1 disag]   │
│               │                                   │  │ [⇣ screenshot PNG]       │      │                       │
│               │ ─── Annotations ────────────────  │  └──────────────────────────┘      │ ── Provenance ─────  │
│               │ ☐ Show outbreak label             │                                    │ ▷ WHO  tier-1 4h     │
│               │ ☐ Show case-fatality              │                                    │ ▷ MoH  tier-2 22h    │
│               │                                   │  ┌─[TimeScrubber 120px tall]─┐    │ ▷ ECDC tier-1 1d     │
│               │ Saved views                       │  │ Apr 20 ━━━━●═════ May 27 │    │                       │
│               │ • DRC zoom (default)              │  │ ◀◀ ◀ ⏸ ▶ ▶▶  speed 1d/s│    │ ── Actions ────────  │
│               │ • Full Africa                     │  │ Day 38 of 38 ◐ live      │    │ [Open on detail ⇗]   │
│               │ • DRC + UGA + RWA                 │  │ Track: confirmed  deaths │    │ [Copy permalink ⧉]   │
│               │ + new view                        │  │ Hover ticks for snapshot │    │ [BibTeX] [APA]       │
│               │                                   │  └───────────────────────────┘    │                       │
└───────────────┴───────────────────────────────────┴────────────────────────────────────┴───────────────────────┘

Footer rail (32px, bottom-fixed):
  status.ituri-sitrep.org  ·  Data updated 4 min ago  ·  Sources: 7 active  ·  cmdk by Paco Coursey  ·  v0.1
  ⓘ All figures sourced. Hover for quote. Click for evidence.

Annotations (developer-facing):
  [A] NavRail: width 60 collapsed (default ≥1280px ≤1439px) / 240 expanded; keyboard [ toggles.
  [B] LayerRail: width 280 default, draggable resize 240–360; collapse via L.
  [C] Canvas: MapLibre instance with deck.gl overlay; coordinates announced via aria-live polite every 500ms during pan.
  [D] Legend: lives inside canvas bottom-left; collapsible via [⌃] caret; tied to active choropleth layer.
  [E] MapControls: floats top-right of canvas; 12px from canvas edge; z-index 30.
  [F] TimeScrubber: fixed to bottom of canvas region; height 120; collapsible via T.
  [G] Inspector: 380 default; resizable 320–480; closes via ✕ or esc; preserves last-opened entity in URL ?inspect=…
  [H] All numeric figures inside Inspector are <Figure source_quote_id=…> primitives — same hover/click behavior as anywhere else.
  [I] Severity coloring on banner uses red400 background with white text for PHEIC; never use red for non-severity decorative elements.
  [J] Layer rail items are <Checkbox> with explicit aria-label and an info popover ⓘ for "what is this layer?"
  [K] "Saved views" persist to localStorage and (when signed in) to user profile.
  [L] Keyboard help (?) overlay lists: [ ] L T I 1 2 3 4 ⌘K g+letter j k ⏎ esc + − arrows.
```

This is the wireframe a developer can implement in a single sitting: every region has known dimensions, every control has a known keyboard equivalent, every number is a Figure primitive with a `source_quote_id`, and the Inspector / LayerRail can each collapse independently to reach the canvas-first or app-shell modes on smaller breakpoints.

---

## Recommendations (staged build order)

**Phase 1 — Foundation (week 1–2).** Lock the OKLCH token system, NavRail, ⌘K palette (cmdk), Figure + SourceQuoteCard + SourceQuoteDrawer. Build `/methods` first because it requires nothing more than Source Serif 4 + Figure primitives, and it forces you to commit to the citation grammar. **Threshold to advance:** hovering any number on `/methods` opens the right drawer with a real quote pulled from Supabase.

**Phase 2 — Editorial surfaces (week 3–4).** `/today`, `/sitreps`, `/outbreaks` list, `/outbreaks/[detail]`. Reuse the app-shell + slide-over pattern; no map yet. Get the dual-audience progressive disclosure right: brief expands, "show me the data" toggles to table. **Threshold:** the daily brief feels like FT prose AND can flip to a CSV-exportable table in one click.

**Phase 3 — Command center (week 5–7).** `/map` with three-pane chrome. Start with the LayerRail + Canvas; add Inspector last. TimeScrubber is week 7. **Threshold:** scrubbing back to Day 1 of the outbreak re-renders the choropleth at 60fps and ARIA-announces the active date.

**Phase 4 — Mobile (week 8).** Re-do `/map` as full-bleed + vaul bottom sheet; bottom-tab nav. Don't try to make `/map` desktop mobile-responsive; build mobile as its own surface. **Threshold:** the iPhone SE experience scores ≥95 on Lighthouse mobile and the bottom sheet's three snap points feel like Apple Maps.

**Phase 5 — Internal / polish (week 9–10).** All `/internal/*` routes, evidence permalinks, OG cards, RSS, print stylesheet. **Threshold:** you can ship a tweet-card link to a `q_…` evidence quote that renders a 1200×630 card with the right severity pill.

**Phase 6 — Generalization (post-launch).** Refactor outbreak-specific copy into a generic schema so the same chrome serves Marburg / Mpox / Cholera without redesign.

**Benchmarks that would change the plan:**
- If user testing on `/today` shows the daily brief is ignored by epidemiologists → demote brief, promote epi curve to hero.
- If the right-pane Inspector is opened <10% of map sessions → move admin1 detail to a bottom-of-canvas drawer (canvas-first option B) instead.
- If mobile sessions exceed 60% of traffic → invest more in the bottom-sheet inspector (rich epi curve embedded, not just KPIs).
- If `source_quote_id` coverage drops below 100% (any Figure renders without a quote) → halt feature work; coverage is the product.

---

## Caveats

- **Mobile dashboard precedents are weak.** Most of the named precedents (Linear, Vercel, Sentry, Datadog, Stripe) re-flow rather than re-architect on mobile. Outbreak dashboards historically degrade badly on phones. The bottom-sheet snap-point pattern is borrowed from Apple Maps / vaul, not from any peer epidemiology dashboard — treat the mobile spec as a strong hypothesis to validate, not a copy of a known-good pattern.
- **The three-pane decision is conditional on `/map` being the dominant surface.** If telemetry post-launch shows users spending more time on `/today` and `/sitreps` than `/map`, demote `/map`'s permanent right-pane to a slide-over (option C everywhere). The Stripe Workbench model — a single-keystroke dockable inspector — would replace it.
- **FT / NYT / Reuters layout claims rely on secondary descriptions.** The subagent could not directly inspect paywalled tracker DOMs; the "single-column scroll with sticky KPI" claim is reconstructed from Fast Company, Reuters Institute, Poynter, and Reuters Graphics' open-source repos. Verify against the live FT covid tracker before locking the `/today` template.
- **vaul is unmaintained as of this writing** (`"This repo is unmaintained. I might come back to it at some point, but not in the near future."`). It is still the canonical reference used by shadcn, but plan a 6–12 month review checkpoint to either fork it or migrate to a successor.
- **Anthropic's Claude Design (April 2026) is an interesting reference for the *editor* aesthetic** but not for the dashboard chrome — its chat-left/canvas-right model is for design tooling, not surveillance. Do not let it pollute the `/map` layout decision.
- **WHO/AFRO publication cadence does not match dashboard expectations.** A "live" surveillance site built on Tier-1 sources that update every 24–72h will look stale to users conditioned by COVID-era real-time dashboards. The LastUpdatedIndicator + AnomalyBadge grammar is partial mitigation, but expect ongoing user-education work via /methods and onboarding.
- **One important wireframe omission to be aware of:** the print PDF stylesheet of `/outbreaks/[detail]` is sketched but not laid out frame-by-frame; this is the screenshot-for-a-paper use case the project explicitly wants. Reserve a day in Phase 5 to nail it.
- **The 1920px High Density Mode is borrowed from Datadog** (*"This mode displays group widgets in a dashboard side-by-side for increased widget density"*). Do not auto-enable on every >1920 screen; offer it as a user toggle, since most outbreak audiences will be on 1440 laptops and the extra density would harm scannability.