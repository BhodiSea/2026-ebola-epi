# ituri-sitrep v1 — Implementation Roadmap

## Mission

ituri-sitrep is a public situational-awareness companion for ongoing infectious-disease outbreaks. It ingests publicly released sitreps (WHO DON, WHO AFRO, Africa CDC, ECDC, ReliefWeb, MoH press releases, ACLED, HDX, Pathoplexus/Nextstrain), extracts structured signals with LLM assistance, anchors every figure to the verbatim source sentence, and renders a health-zone-level map with provenance-first UI. Every number the platform publishes can be traced to the exact sentence in the exact document that supports it.

---

## How to use this directory

Each phase doc is **executable**, not aspirational. The sequence for each phase is:

```
/spec <phase-slug>   →   /plan <phase-slug>   →   /tdd <phase-slug>   →   /ship
```

Do not start coding a phase without a `/spec` and `/plan`. Do not advance to the next phase without the current phase's exit gate passing. The exit gates are observable, not subjective — each is a single sentence describing a concrete, verifiable state.

---

## Phase sequence

```
Weeks  1   2   3   4   5   6   7   8   9   10
       ├───────────────────────────────────────────────────────────►
P0     ███                                       Monorepo + CI/CD
P1         ████                                  Schema + provenance
P2             ████                              Orchestration + first extract
P3                 ████                          Design system + provenance UI
P4                     ████                      Editorial surfaces + map stub
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ★ Milestone 1: provenance round-trip live (end P3)
P5                         ████                  Map command center
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ★ Milestone 2: full command center (end P5)
P6                             ████              Multi-source + reconciliation
P7                                 ████          Evals + autonomy + cost control
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ★ Milestone 3: autonomous ops (end P7)
P8                                     ████     Mobile + internal + a11y
```

**Three shipping milestones:**
1. End of Phase 3 — provenance round-trip works end-to-end on `/methods`
2. End of Phase 5 — full command center live with one real outbreak
3. End of Phase 7 — 7 consecutive days of autonomous operation, F1 ≥ 0.95

---

## Phase dependency table

| Phase | Title | Primary research source(s) | Exit gate (condensed) | Week budget | Depends on |
|---|---|---|---|---|---|
| 0 | Monorepo + CI/CD | [architecture.md](../../.claude/references/architecture.md) | No-op PR passes 6 workflows + deploys preview + creates Supabase branch | 1 | — |
| 1 | Schema + provenance | [backend.md §1, §5](../../research/backend.md) | pgTAP green; types.gen.ts diff empty; substring-verify rejects bad insert; `license_tier` column present on `public.sources` | 1 | P0 |
| 2 | Orchestration + extract | [agent-automation.md §1–§7](../../research/agent-automation.md), [backend.md §4](../../research/backend.md) | One WHO DON doc round-trips fetch→extract→store→verify; extraction_runs row non-null hashes | 1.5 | P1 |
| 3 | Design system + provenance UI | [ux.md §2–§6, §9–§10](../../research/ux.md), [ui.md §3](../../research/ui.md) | Hover any `<Figure>` on `/methods` → SourceQuoteCard; click → SourceQuoteDrawer at 60 fps | 1 | P2 |
| 4 | Editorial surfaces + map stub | [ui.md §2–§5](../../research/ui.md), [ux.md §3](../../research/ux.md) | Unprimed journalist answers "where and how many?" in < 10 s on cold `/today` load | 1.5 | P3 |
| 5 | Map command center | [backend.md §6](../../research/backend.md), [ux.md §4](../../research/ux.md), [ui.md §2.0–§2.3](../../research/ui.md) | Three-pane `/map` live; backup/restore drill passes; `?view=table` works | 1.5 | P4 |
| 6 | Multi-source + reconciliation | [agent-automation.md §8–§9](../../research/agent-automation.md), [backend.md §4](../../research/backend.md) | Synthetic WHO/ECDC disagreement detected, reconciled, surfaced with strikethrough | 1.5 | P5 |
| 7 | Evals + autonomy | [agent-automation.md §11–§15](../../research/agent-automation.md), [backend.md §10](../../research/backend.md) | 7 consecutive autonomous days; F1 ≥ 0.95; cache-read ratio ≥ 60% | 1.5 | P6 |
| 8 | Mobile + internal + a11y | [ui.md §2.4, §6, §9](../../research/ui.md), [ux.md §13–§14](../../research/ux.md) | Lighthouse 95+ on iPhone SE; external screen-reader pass; OG card renders | 1 | P7 |

---

## ADR cross-references

| ADR | Decision | Relevant to |
|---|---|---|
| [ADR-0001](../adr/0001-adopt-biome-2.md) | Biome 2 as lint+format | All phases |
| [ADR-0002](../adr/0002-adopt-vitest-3.md) | Vitest 3 + happy-dom | All phases |
| [ADR-0003](../adr/0003-use-pglast-for-sql-validation.md) | pglast for SQL validation | P0, P1, P5 |
| [ADR-0004](../adr/0004-adopt-zod-and-t3-env.md) | zod 4 + @t3-oss/env-nextjs | P1, P2, P3 |
| [ADR-0005](../adr/0005-eslint-hybrid-typescript-eslint.md) | ESLint hybrid | All phases |
| [ADR-0006](../adr/0006-hard-caps-lint.md) | Hard lint caps | All phases |
| [ADR-0007](../adr/0007-pnpm-monorepo-staging.md) | pnpm monorepo | P0 |
| [ADR-0008](../adr/0008-env-validation-t3-env.md) | @t3-oss/env-nextjs | P0, P2 |
| ADR-0009 *(to be authored in P0)* | EpiNow2/Modal deferred to v2 | P0 |

---

## Notes on implementation choices

- **Anthropic SDK used directly** (not AI SDK Gateway) to preserve `cache_control` semantics. The AI SDK Gateway strips `cache_control` blocks, breaking prompt-cache TTL control.
- **Inngest `throttle` with `scope: "account"`** — Pro plan required by Phase 6 when concurrent function instances exceed Hobby limits. The `throttle` primitive coordinates across all instances server-side; in-process `p-throttle` is forbidden (AGENTS.md rule 15). Concurrency cap on the Pro plan is per function, not per execution count.

---

## What is NOT in v1

The following are explicit deferrals. They are not forgotten — they are v2 or post-launch work.

- **EpiNow2 / Modal Rt nowcasting** — Bayesian Rt estimates via `rpy2`/`epinowcast` on Modal. Deferred in ADR-0009. Triggers when ≥1 active outbreak has ≥14 days of observation.
- **Multi-tenant agent surfaces** — researchers issuing queries to the system interactively. Requires Mastra as the spine; not warranted at solo-dev scale.
- **Mastra v1 orchestration spine** — the Mastra-on-Inngest pattern is the right upgrade when multi-user agent surfaces ship.
- **Trigger.dev v4 secondary executor** — needed when Chromium-required PDF processing exceeds ~50 jobs/day consistently.
- **Qdrant vector store** — pgvector HNSW is sufficient through ~5M source-quote embeddings. Qdrant replaces it above that.
- **Full WCAG AAA** — Phase 8 targets WCAG 2.2 AA throughout; AAA on body text and hero numbers. Full AAA is a post-launch audit.
- **Multi-language UI** — French and Swahili content tags are extracted from Phase 2 onward but rendered only behind a `?lang=` toggle in Phase 8. Full localization (translated chrome, translated methods page) is v2.
- **Pathoplexus / Nextstrain genomic lineage tab** — the outbreak detail page reserves a "Lineage" tab stub in Phase 4; live Nextstrain data requires Phase 6+ adapter work.
- **Inbound email ProMED-mail subscriptions** — the webhook handler is planned in Phase 2 architecture but the Postmark inbound subscription is a Phase 6 addition alongside other sources.
