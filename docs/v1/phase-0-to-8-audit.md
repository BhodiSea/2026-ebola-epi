# Phase 0–8 Implementation Audit

**Date:** 2026-05-30
**Auditor:** Claude Code (Opus 4.7, plan mode)
**Method:** spec-vs-filesystem audit across three parallel `Explore` subagents, with direct verification of all consequential gaps.
**Question:** Are phases 0–8 fully operational and is the project ready for Phase 9?

**TL;DR — NOT YET READY for Phase 9.** Phases 0, 1, 3, 4, 5, and 8 are substantially complete. Phase 2 is complete in substance but its end-to-end "single document round-trip" exit gate is structurally distributed into the Phase 6 pipeline and cannot be re-verified in isolation. Phase 6 is materially incomplete (5 of 8 v0 source adapters missing, all 5 priority adapters missing, no statistical anomaly module). Phase 7 has all scaffolding but cannot prove its quantitative exit gate (F1 ≥ 0.95) because 5 of 7 gold-set contexts have no source fixture. Two smaller cross-cutting gaps (`packages/db/src/types.gen.ts` missing; Vercel function region pinning) also need attention. The Phase 7 spec's `vercel.ts` firewall snippet is **not applicable** — Vercel WAF / firewall rules are configured in the Vercel dashboard, not in `vercel.ts`. See [§ Phase 9 readiness](#phase-9-readiness-verdict) for the ordered punch list.

---

## Rubric

- ✅ Implemented — file exists and matches the spec
- ⚠️ Partial — present but incomplete
- ❌ Missing — absent
- 🟡 Diverges from spec — functionally equivalent at a different path or via a different mechanism

---

## Phase 0 — Monorepo + CI/CD

**Exit gate (spec):** "A no-op PR runs all six GitHub Actions workflows to green, deploys a Vercel preview URL, and creates an ephemeral Supabase preview branch."

### Implemented
- Monorepo layout: [apps/web/](apps/web/) and all five packages ([packages/db/](packages/db/), [shared/](packages/shared/), [extract/](packages/extract/), [ingest/](packages/ingest/), [ui/](packages/ui/))
- Root tooling: `pnpm-workspace.yaml`, `turbo.json`, `biome.json`, `lefthook.yml`, `knip.config.ts`, `tsconfig.base.json`
- [supabase/config.toml](supabase/config.toml) — `[api] schemas = ["public"]` (graphql_public removed per spec)
- [apps/web/proxy.ts](apps/web/proxy.ts) — Next.js 16 `proxy()` shape, plain-string matchers (no `String.raw`)
- All six workflows present: [ci.yml](.github/workflows/ci.yml), [e2e.yml](.github/workflows/e2e.yml), [db-test.yml](.github/workflows/db-test.yml), [llm-eval.yml](.github/workflows/llm-eval.yml), [release.yml](.github/workflows/release.yml), [ingest-once.yml](.github/workflows/ingest-once.yml)
- `ci.yml` includes biome, typecheck, test, build, audit, types-drift gate (`supabase gen types typescript --linked` diff vs `packages/db/src/types.gen.ts`)
- [docs/adr/0009-defer-modal-epinow2-to-v2.md](docs/adr/0009-defer-modal-epinow2-to-v2.md) present (plus ADRs 0010–0019 from later phases)
- [apps/web/e2e/home.spec.ts](apps/web/e2e/home.spec.ts) and [apps/web/__tests__/env.test.ts](apps/web/__tests__/env.test.ts) present

### Diverges from spec (acceptable)
- 🟡 `apps/web/vercel.ts` is minimal (build + install + framework only). The CSP-nonce header is implemented in `proxy.ts` + `lib/csp.ts` + `lib/nonce.ts` (the canonical Next.js 16 pattern), not in `vercel.ts`. Firewall rules are configured in the Vercel dashboard, not in `vercel.ts` — the Phase 7 spec snippet that shows `firewall.rules` inline is inaccurate to current Vercel platform conventions.
- 🟡 `apps/web/lib/env.ts` (not `apps/web/env.ts`) is the t3-env file
- 🟡 `pnpm-workspace.yaml` includes `evals` alongside `apps/*` and `packages/*` (helpful for shared tooling)

### Exit-gate verdict
**✅ Substantively met.** All workflows exist; structural ingredients for a green no-op PR are in place. The gate is "the PR passes" — I cannot run CI from the filesystem, but every named workflow file is present and structurally correct.

---

## Phase 1 — Schema, RLS, Provenance

**Exit gate (spec):** "`supabase test db` reports all pgTAP tests as `ok`; `supabase gen types typescript --linked` diff against the committed `packages/db/src/types.gen.ts` is empty; a direct SQL `INSERT` into `source_quotes` with a fabricated `quote_text` is rejected."

### Implemented
- Schemas + grants: [supabase/migrations/20260527150100_init_schemas.sql](supabase/migrations/20260527150100_init_schemas.sql)
- Core tables, `tg_verify_quote_substring` trigger, all indexes (HNSW, GIN trgm, GIN tsvector): [20260527150300_init_core_tables.sql](supabase/migrations/20260527150300_init_core_tables.sql)
- Geo schema with PostGIS gist indexes: [20260527150200_init_geo_schema.sql](supabase/migrations/20260527150200_init_geo_schema.sql)
- Matviews `geo.zone_geom_z6` / `z10`: [20260528210100_zone_matviews_to_admin2.sql](supabase/migrations/20260528210100_zone_matviews_to_admin2.sql), [20260529130100_zone_matviews_3857.sql](supabase/migrations/20260529130100_zone_matviews_3857.sql)
- `license_tier` column on `public.sources`: [20260528200000_add_license_tier.sql](supabase/migrations/20260528200000_add_license_tier.sql)
- Four-policy RLS split: [20260528220000_rls_four_policy_split.sql](supabase/migrations/20260528220000_rls_four_policy_split.sql)
- Drizzle mirror covering all seven core tables + later additions: [packages/db/src/schema.ts](packages/db/src/schema.ts)
- Branded IDs: [packages/shared/src/ids.ts](packages/shared/src/ids.ts)
- pgTAP suite — [000-setup.sql](supabase/tests/000-setup.sql), [001-substring-verify.sql](supabase/tests/001-substring-verify.sql), [002-rls.sql](supabase/tests/002-rls.sql), [003-provenance-not-null.sql](supabase/tests/003-provenance-not-null.sql) (plus many later-phase tests)
- [supabase/seed.sql](supabase/seed.sql) seeds the `who-don` source

### Missing
- ❌ **`packages/db/src/types.gen.ts` does not exist.** Confirmed — only `index.ts` and `schema.ts` are in `packages/db/src/`. The `types-drift` CI job in `ci.yml` will **fail on every PR** until this file is generated (`supabase gen types typescript --linked > packages/db/src/types.gen.ts`) and committed. **Blocking gap.**

### Diverges from spec (acceptable)
- 🟡 `case_counts.status` defaults to `"published"` in Drizzle ([schema.ts:240](packages/db/src/schema.ts#L240)). Spec called for `"pending_review"` until the Phase 7 autonomy flip. The flip appears to have been pulled forward — consistent with `case_counts_escalation_class.sql` migration shipping early. Verify against the SQL migration intent.
- 🟡 Phase boundaries are blurred — 41+ migrations exist; many are Phase 4–7 features. The Phase 1 "init" set is correct; the boundary noise is benign.

### Exit-gate verdict
**⚠️ Partial.** pgTAP suite and substring trigger are in place. The `types.gen.ts` requirement is unmet — the spec explicitly says "diff against the committed `packages/db/src/types.gen.ts` is empty," but there is no committed file to diff against, so the CI gate currently fails by default.

---

## Phase 2 — Orchestration + First End-to-End Extract

**Exit gate (spec):** "One real WHO DON document round-trips fetch → parse → extract → store → substring-verify, with all asserts passing; the resulting `extraction_runs` row records non-null `prompt_version_hash`, `tool_schema_hash`, and `cache_read_input_tokens > 0` on the second extraction."

### Implemented
- All migrations: [20260528100000_audit_llm_traces.sql](supabase/migrations/20260528100000_audit_llm_traces.sql), [20260528100100_pg_cron_synthetic_monitor.sql](supabase/migrations/20260528100100_pg_cron_synthetic_monitor.sql), [20260528230000_anthropic_usage_log.sql](supabase/migrations/20260528230000_anthropic_usage_log.sql)
- Extract package — [tools.ts](packages/extract/src/tools.ts), [prompt.ts](packages/extract/src/prompt.ts), [verify.ts](packages/extract/src/verify.ts), [hash.ts](packages/extract/src/hash.ts), [run.ts](packages/extract/src/run.ts)
- Tests: [verify.test.ts](packages/extract/src/__tests__/verify.test.ts), [tools.test.ts](packages/extract/src/__tests__/tools.test.ts), [run.test.ts](packages/extract/src/__tests__/run.test.ts) — `run.test.ts` asserts `ttl === "1h"` on the long-lived cache block (lines 51–58, 188–196)
- WHO DON adapter: [packages/ingest/src/sources/who-don.ts](packages/ingest/src/sources/who-don.ts) with `robots-parser` check
- Inngest serve handler [apps/web/app/api/inngest/route.ts](apps/web/app/api/inngest/route.ts) and client [apps/web/inngest/client.ts](apps/web/inngest/client.ts)
- [apps/web/instrumentation.ts](apps/web/instrumentation.ts) (upgraded straight to Phase 7 Langfuse + Sentry, gated by env)
- [apps/web/lib/env.ts](apps/web/lib/env.ts) validates `ANTHROPIC_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- pgTAP: [004-extraction-runs-not-null.sql](supabase/tests/004-extraction-runs-not-null.sql), [004b-extraction-runs-idempotency.sql](supabase/tests/004b-extraction-runs-idempotency.sql), [005-llm-traces-append-only.sql](supabase/tests/005-llm-traces-append-only.sql)

### Diverges from spec (acceptable)
- 🟡 [ingest-who-don.ts](apps/web/inngest/functions/ingest-who-don.ts) now emits `document.triage.requested` events; extraction runs in a separate `extract-document.ts` function. This is the correct Phase 6 pattern (the spec itself anticipates this refactor) but it means the Phase 2 "single round-trip" exit gate can no longer be observed inside a single Inngest function.
- 🟡 `tools.ts` uses `zod/v4`'s built-in `toJSONSchema` instead of the external `zod-to-json-schema` package — valid and preferred in zod 4.
- 🟡 `instrumentation.ts` jumped to real Langfuse/Sentry exporters instead of the spec's NoopSpanExporter skeleton — fine; everything is env-gated.
- 🟡 WHO DON adapter polls the general WHO news feed (`/rss-feeds/news-english.xml`) with keyword filtering because the DON-specific feed was deprecated in 2026 (documented inline).

### Missing
- ❌ `undici` is not in any `package.json` — native `fetch` is used instead. Native `fetch` is fine on Node 22; calling this a "miss" only if the spec is interpreted literally.

### Exit-gate verdict
**⚠️ Met in substance, not directly verifiable in shape.** Every component required to round-trip a WHO DON document is present, but the single-function pipeline the spec assumed has been refactored into Phase 6's multi-function chain. The spec's "Verification §4" curl/inngest demo would now need to chase events through `ingest-who-don → triage-document → extract-document → reconcile-counts`. Recommend a Phase 2-style integration test that asserts the end-to-end chain produces a non-null `prompt_version_hash` and `cache_read_input_tokens > 0` on a re-run.

---

## Phase 3 — Design System + Provenance UI

**Exit gate (spec):** "Hovering any `<Figure>` on `/methods` opens the `<SourceQuoteCard>` with a real quote; clicking opens the `<SourceQuoteDrawer>` with the full chain of custody; both transitions feel right at 60 fps."

### Implemented
- OKLCH `@theme` block with severity tokens + ColorBrewer Reds + Okabe-Ito: [apps/web/app/globals.css](apps/web/app/globals.css) (lines 8–62)
- Dark mode via both `@media (prefers-color-scheme: dark) :root` AND `[data-theme="dark"]` selectors
- Geist Sans / Geist Mono / Source Serif 4 via `next/font/google` in [apps/web/app/layout.tsx](apps/web/app/layout.tsx) (lines 41–58)
- shadcn primitives in [apps/web/components/ui/](apps/web/components/ui/): button, input, label, badge, card, sheet, hover-card, plus checkbox, command, dialog, dropdown-menu, tooltip
- Global chrome: [top-bar.tsx](apps/web/components/layout/top-bar.tsx), [nav-rail.tsx](apps/web/components/layout/nav-rail.tsx), command bar via [components/ui/command.tsx](apps/web/components/ui/command.tsx) (cmdk)
- All provenance primitives present in [apps/web/components/provenance/](apps/web/components/provenance/) — `figure.tsx` (server) + `figure-interactive.tsx` (client split), `source-quote-card.tsx` (Radix HoverCard, openDelay 80 / closeDelay 100), `source-quote-drawer.tsx` (Sheet side=right, w-[480px]), `severity-pill.tsx`, `ai-generated-label.tsx`, `provenance-badge.tsx`, `last-updated-indicator.tsx`, `skeleton-chart.tsx`, `skeleton-map.tsx`, `glossary-term.tsx`, `citation-copier.tsx`
- [apps/web/app/methods/page.tsx](apps/web/app/methods/page.tsx) with real `<Figure>` components
- [apps/web/app/evidence/[quote-id]/page.tsx](apps/web/app/evidence/%5Bquote-id%5D/page.tsx) with Arcjet `shield + detectBot` via [lib/arcjet.ts](apps/web/lib/arcjet.ts)
- Canonical copy module [apps/web/lib/copy.ts](apps/web/lib/copy.ts) with all the required constants
- Vitest coverage for every primitive; Playwright [apps/web/e2e/methods-provenance.spec.ts](apps/web/e2e/methods-provenance.spec.ts)

### Diverges from spec (acceptable)
- 🟡 No standalone `apps/web/tailwind.config.ts` — Tailwind v4 config lives in `globals.css` via `@theme` (the canonical v4 idiom).
- 🟡 Theme pre-hydration uses `next-themes` `<ThemeProvider attribute="data-theme">` with nonce-passthrough, instead of the spec's inline `<script>`. Functionally identical; lower flash risk.

### Exit-gate verdict
**✅ Met.** End-to-end provenance round-trip is structurally complete on `/methods`. Empirical 60 fps verification requires `pnpm dev` and is out of scope for a filesystem audit.

---

## Phase 4 — Editorial Surfaces + Map Stub

**Exit gate (spec):** "An unprimed journalist can answer 'where is the outbreak and how many people have it?' in < 10 seconds on a cold load of `/today`; every figure exposes provenance via `<Figure>`; `/about/data-sources` is public."

### Implemented
- [apps/web/app/page.tsx](apps/web/app/page.tsx) — redirect to `/today`
- [apps/web/app/today/page.tsx](apps/web/app/today/page.tsx) — `ActiveOutbreakBanner`, four `StatCard`s (`<Figure>`-wrapped values), `DailyBriefSection`, `ChoroplethStub`, `RecentDocsSection`, `ActiveOutbreaksSection`
- [apps/web/app/outbreaks/page.tsx](apps/web/app/outbreaks/page.tsx) and detail page [apps/web/app/outbreaks/[pathogen]/[country]/[onset]/page.tsx](apps/web/app/outbreaks/%5Bpathogen%5D/%5Bcountry%5D/%5Bonset%5D/page.tsx) with five tabs (Brief, Epi curve, Geography, Sources, Methods)
- [apps/web/app/sitreps/page.tsx](apps/web/app/sitreps/page.tsx), [apps/web/app/sources/page.tsx](apps/web/app/sources/page.tsx), [apps/web/app/sources/[slug]/page.tsx](apps/web/app/sources/%5Bslug%5D/page.tsx)
- [apps/web/app/about/data-sources/page.tsx](apps/web/app/about/data-sources/page.tsx) enumerates each tier (uses `DATA_SOURCE_POSTURES`)
- Outbreak components: [stat-card.tsx](apps/web/components/outbreak/stat-card.tsx), [active-outbreak-banner.tsx](apps/web/components/outbreak/active-outbreak-banner.tsx), [outbreak-row.tsx](apps/web/components/outbreak/outbreak-row.tsx), [timeline-multi.tsx](apps/web/components/outbreak/timeline-multi.tsx) (Visx)
- Vitest + Playwright suites complete
- Dependencies present: `@visx/xychart`, `@visx/brush`, `fuse.js`
- **ICD-11 invariant upheld** — zero matches for `1D64` or `1D24` across `apps/web/{app,components,lib,e2e}`. The only mentions are in the guard test [apps/web/app/methods/__tests__/icd-11.test.ts](apps/web/app/methods/__tests__/icd-11.test.ts).

### Diverges from spec (acceptable)
- 🟡 Choropleth pipeline lives at [apps/web/lib/queries/choropleth.ts](apps/web/lib/queries/choropleth.ts), not `apps/web/lib/server/choropleth.ts`. Has `"server-only"` import. Functionally identical.

### Exit-gate verdict
**✅ Met (structurally).** Every required surface is wired; the 10-second journalist test must be measured in `pnpm dev` cold-load.

---

## Phase 5 — Map Command Center

**Exit gate (spec):** "Three-pane `/map` is live with a real outbreak choropleth, `<TimeScrubber>` scrubs in real time, `?view=table` renders the tabular alternative, and a Supabase backup/restore drill confirms `case_counts.superseded_by` history survives the restore."

### Implemented
- MVT pipeline: `internal.mvt` + `public.mvt` in [20260529130300_mvt_functions.sql](supabase/migrations/20260529130300_mvt_functions.sql)
- Pre-transformed `geom_3857` generated columns: [20260529130000_geo_geom_3857.sql](supabase/migrations/20260529130000_geo_geom_3857.sql)
- Ituri seed: [20260529130200_geo_seed_ituri_real.sql](supabase/migrations/20260529130200_geo_seed_ituri_real.sql)
- pg_cron CONCURRENTLY refresh: [20260529130400_pg_cron_matview_refresh.sql](supabase/migrations/20260529130400_pg_cron_matview_refresh.sql)
- Versioned MVT route: [apps/web/app/api/mvt/[v]/[z]/[x]/[y]/route.ts](apps/web/app/api/mvt/%5Bv%5D/%5Bz%5D/%5Bx%5D/%5By%5D/route.ts) (validates `v === TILE_VERSION`, clamps z 0–24, bounds-checks x/y)
- Three-pane `/map`: [app/map/page.tsx](apps/web/app/map/page.tsx) + [app/map/layout.tsx](apps/web/app/map/layout.tsx) (overflow-hidden on layout wrapper)
- `?view=table` swap renders `<TabularView>`
- All map components: [layer-rail.tsx](apps/web/components/map/layer-rail.tsx), [map-pane.tsx](apps/web/components/map/map-pane.tsx), [inspector-tabs.tsx](apps/web/components/map/inspector-tabs.tsx), [time-scrubber.tsx](apps/web/components/map/time-scrubber.tsx), plus mobile-inspector, tabular-view
- Vitest + Playwright present
- Dependencies: `maplibre-gl`, `@deck.gl/mapbox`, `@deck.gl/layers`, `@deck.gl/core`, `@visx/brush`

### Diverges from spec (acceptable)
- 🟡 MVT pgTAP test is [supabase/tests/009-mvt-function.sql](supabase/tests/009-mvt-function.sql) (renumbered; `006-license-tier-not-null.sql` took the 006 slot)
- 🟡 No `@types/maplibre-gl` (maplibre-gl v5 ships its own types)

### Missing
- ❌ **Vercel function region is not pinned** in either `vercel.ts` or `vercel.json`. The Phase 5 spec explicitly calls this out as "the single largest latency lever for the map." Set via Vercel project Settings → Functions → Function Region, matched to the Supabase project region.
- ⚠️ **Supabase backup/restore drill** is not auditable from the filesystem. The drill is a manual exit-gate step. No script or doc records the result. Recommend adding `docs/v1/exit-gate-evidence/phase-5-backup-restore.md` with the date and verification.

### Exit-gate verdict
**⚠️ Structurally complete; runtime gates unverified.** The three-pane layout, MVT pipeline, time scrubber, and tabular view are all wired. Two unverified items: (a) Vercel function region pin, (b) backup/restore drill log.

---

## Phase 6 — Multi-Source + Reconciliation

**Exit gate (spec):** "A synthetic disagreement between WHO (142) and ECDC (108) for the same outbreak/metric/date is detected, reconciled by the Reconciliation Agent (Opus 4.7), surfaces in `/today` with the WHO value as the headline and the ECDC value strikethrough-dimmed, and the `superseded_by` FK is set on the ECDC row."

### Implemented
- Migrations: `extraction_paused` flag, `incidents` table, `documents` conditional-GET columns (`etag`, `last_modified`, `http_status`, `license`), `disagreements_rpc`, `case_counts_superseded_self_check`, `case_counts_escalation_class`, `phase6_sources_seed` (sets `trust_score` + `license_tier` + `license_url`)
- Adapter interface: [packages/ingest/src/adapter.ts](packages/ingest/src/adapter.ts)
- [packages/ingest/src/registry.ts](packages/ingest/src/registry.ts) (3 adapters registered: who-don, who-afro, ecdc-cdtr)
- Triage Agent: [packages/extract/src/agents/triage.ts](packages/extract/src/agents/triage.ts) (Haiku, cache_control 1h)
- Reconciliation Agent: [packages/extract/src/agents/reconcile.ts](packages/extract/src/agents/reconcile.ts) (Opus, trust_score / published_at logic)
- Inngest fan-out: [triage-document.ts](apps/web/inngest/functions/triage-document.ts), [extract-document.ts](apps/web/inngest/functions/extract-document.ts), [reconcile-counts.ts](apps/web/inngest/functions/reconcile-counts.ts)
- UI: [stat-card.tsx](apps/web/components/outbreak/stat-card.tsx) accepts `disagreements` prop; [disagreement-pill.tsx](apps/web/components/outbreak/disagreement-pill.tsx) present; [today/page.tsx](apps/web/app/today/page.tsx) wires disagreements through
- pgTAP: [007-superseded-by.sql](supabase/tests/007-superseded-by.sql), [008-incidents-rls.sql](supabase/tests/008-incidents-rls.sql)
- Playwright: [apps/web/e2e/disagreement.spec.ts](apps/web/e2e/disagreement.spec.ts)
- Vitest: `triage.test.ts`, `reconcile.test.ts`, `who-afro.test.ts`, `ecdc-cdtr.test.ts`

### Missing (BLOCKING for Phase 9 unless explicitly deferred)
- ❌ **5 of 8 v0 source adapters not implemented.** Only `who-don.ts`, `who-afro.ts`, `ecdc-cdtr.ts` exist in [packages/ingest/src/sources/](packages/ingest/src/sources/). The spec requires `africa-cdc`, `reliefweb`, `acled`, `moh-drc`, `uganda-moh`.
- ❌ **All 5 Priority adapters missing.** No `hdx-hapi.ts`, `iom-dtm.ts`, `ucdp-candidate.ts`, `grid3-drc.ts`, `hot-osm-healthsites.ts`.
- ❌ **`packages/extract/src/agents/anomaly.ts` does not exist.** Confirmed — `agents/` contains hash, reconcile, shared, triage (+ their prompts/tools) but no anomaly module. The Phase 6 statistical anomaly detector (rolling z-score, spatial spread, CFR thresholds) is unimplemented. As a consequence Phase 7 Escalation Class #4 ("anomaly z > 4 OR CFR ≥ 80 % OR cluster spread > 100 km") cannot fire.
- ❌ Per-source Inngest ingest functions for the missing adapters

### Exit-gate verdict
**❌ Not met.** The synthetic WHO/ECDC disagreement *can* be reconciled (reconcile agent + RPC + UI pill + e2e test are all wired), so the literal exit-gate scenario is achievable. But the broader spec — "expand from one source adapter to eight" and "statistical anomaly detection" — is materially unfinished. A reader of the spec would expect a multi-source, anomaly-detecting pipeline; what exists is a three-source pipeline without anomaly detection.

---

## Phase 7 — Evals, Autonomy, Cost Control

**Exit gate (spec):** "Seven consecutive days of fully autonomous operation with zero non-escalation-class human interventions; nightly batch eval F1 ≥ 0.95 on all active sources; cache-read ratio ≥ 0.60 for every active model."

### Implemented
- Migrations: `anthropic_usage_log_kill_switch_trigger.sql`, `shadow_results.sql`, `shadow_results_unique_rls.sql`, `pg_cron_kill_switch_reset.sql`, `batch_results.sql`, `anthropic_usage_daily_view.sql`
- Evals: [evals/promptfoo.config.yaml](evals/promptfoo.config.yaml) (provider `anthropic:messages:claude-sonnet-4-6` per spec), [evals/__tests__/gold-set.test.ts](evals/__tests__/gold-set.test.ts)
- 7 gold-set context directories (target: 6) — `bundibugyo-ituri-2026-04-20`, `marburg-tz-2026-05-01`, `ebola-zaire-cod-2019`, `ebola-sudan-ssd-2022`, `mpox-cod-2023`, `cholera-cod-2024`, `no-confirmed-figures`
- [infra/docker-compose.langfuse.yml](infra/docker-compose.langfuse.yml) committed
- [apps/web/instrumentation.ts](apps/web/instrumentation.ts) upgraded from Phase 2 NoopSpanExporter to Sentry + `@vercel/otel` `registerOTel({ traceExporter: new LangfuseExporter(...) })`, env-gated
- Kill switch: [apps/web/lib/kill-switch.ts](apps/web/lib/kill-switch.ts) with `assertExtractionEnabled()` AND `getExtractionCapacity()` returning the four-tier model
- Inngest functions: [maintenance.ts](apps/web/inngest/functions/maintenance.ts), [back-fill.ts](apps/web/inngest/functions/back-fill.ts), [shadow-extraction.ts](apps/web/inngest/functions/shadow-extraction.ts) — all with companion tests
- Autonomy: `case_counts_escalation_class.sql` + [apps/web/e2e/autonomy.spec.ts](apps/web/e2e/autonomy.spec.ts)
- L2 rate limiting: [apps/web/proxy.ts](apps/web/proxy.ts) wires `@upstash/ratelimit` with sliding-window + token-bucket per the spec
- pgTAP: [supabase/tests/010-kill-switch-trigger.sql](supabase/tests/010-kill-switch-trigger.sql) (renumbered from spec's `009`)
- Dependencies: `@upstash/ratelimit`, `@upstash/redis`, `@vercel/edge-config`, `@sentry/nextjs`, `langfuse-vercel`, `promptfoo`

### Diverges from spec (correction)
- 🟡 **Phase 7 spec shows `firewall.rules` inside `vercel.ts` — this is not how Vercel WAF works.** Vercel firewall / WAF rules are configured in the Vercel dashboard, not in the project config file. [apps/web/vercel.ts](apps/web/vercel.ts) is correct as-is. L1 rate limiting should be confirmed to be active in the Vercel dashboard. L2 Upstash rate limiting is correctly implemented in `proxy.ts` (sliding-window + token-bucket).

### Missing
- ❌ **Gold-set fixtures are thin.** Confirmed: only `bundibugyo-ituri-2026-04-20/` and `no-confirmed-figures/` contain a `source.txt`. The other 5 contexts contain only `ground-truth.json` + `README.md`. **Promptfoo cannot run an F1 measurement without source fixtures, so the F1 ≥ 0.95 gate is presently unmeasurable.**
- ⚠️ **Anomaly module missing** (cross-cut from Phase 6) means escalation class #4 cannot fire, so "zero non-escalation-class human interventions" is the wrong success metric — there is no anomaly class to escalate from in the first place.

### Exit-gate verdict
**⚠️ Scaffolding complete, quantitative gates unprovable.** The kill switch, four-tier capacity model, shadow extraction, batch back-fill, maintenance cron, Langfuse exporter, and autonomy flip are all wired. But: (a) F1 ≥ 0.95 cannot be measured against a 2-source-fixture gold set, (b) the 7-day autonomy run is empirical and cannot be audited from the filesystem.

---

## Phase 8 — Mobile, Internal, Polish, A11y

**Exit gate (spec):** "Lighthouse ≥ 95 across performance / accessibility / best-practices on iPhone SE viewport; contracted NVDA reviewer reports the platform is navigable; tweet-card preview of a `/evidence/q_...` URL renders with the correct severity pill; zero critical axe-core violations on all major routes."

### Implemented
- Mobile: [components/map/mobile-inspector.tsx](apps/web/components/map/mobile-inspector.tsx) (`SNAP_POINTS = [0.12, 0.5, 0.92]`, `modal={false}`), [components/layout/bottom-tab-nav.tsx](apps/web/components/layout/bottom-tab-nav.tsx)
- All six internal routes under [apps/web/app/internal/](apps/web/app/internal/): `audit`, `cost`, `escalations`, `pipeline`, `quality`, `sources` — plus `layout.tsx` using `supabase.auth.getUser()` (not `getSession`)
- OG cards: [outbreaks/[…]/opengraph-image.tsx](apps/web/app/outbreaks/%5Bpathogen%5D/%5Bcountry%5D/%5Bonset%5D/opengraph-image.tsx), [evidence/[quote-id]/opengraph-image.tsx](apps/web/app/evidence/%5Bquote-id%5D/opengraph-image.tsx)
- Embed: [apps/web/app/embed/[chart-id]/page.tsx](apps/web/app/embed/%5Bchart-id%5D/page.tsx)
- Feed: [apps/web/app/feed.xml/route.ts](apps/web/app/feed.xml/route.ts)
- SEO: [components/seo/json-ld.tsx](apps/web/components/seo/json-ld.tsx), [app/robots.ts](apps/web/app/robots.ts), [app/sitemap.ts](apps/web/app/sitemap.ts), [public/llms.txt](apps/web/public/llms.txt)
- CI budgets: [lighthouse-budget.json](lighthouse-budget.json) (scores 0.95) and `ci.yml` jobs for Lighthouse, axe-core, and No-PHI scan (identifier-pattern regex check on PR diffs)
- All required Vitest + Playwright tests present (`mobile-inspector.test.tsx`, `auth.test.tsx`, `feed.xml/__tests__/`, `e2e/mobile.spec.ts`, `e2e/og-card.spec.ts`, `e2e/accessibility.spec.ts`, `e2e/reduced-motion.spec.ts`)
- Dependencies: `vaul`, `@vercel/og`, `axe-playwright`, `@axe-core/cli`, `@lhci/cli`

### Diverges from spec (acceptable)
- 🟡 Print styles live in `globals.css` under `@media print` (with `[data-print-value]::before` pattern) rather than a dedicated `print.css`. Functional.
- 🟡 Lighthouse CI scans 3 routes (`/today`, `/outbreaks`, `/methods`). Spec also listed `/map` — add it for completeness.

### Exit-gate verdict
**✅ Substantively met (scaffolding).** Empirical exit gates (Lighthouse ≥ 95, NVDA reviewer pass, Sim Daltonism check) are out of scope for a filesystem audit but the structural ingredients are present.

---

## Cross-cutting concerns

### Phase boundaries blurred
The repo has accumulated 41 migrations and many Phase 4–7 features ahead of their nominal phase. Schema-wise this is benign, but two consequences need attention:

1. The Phase 2 "one document round-trip" exit gate is no longer observable in a single Inngest function (split across 4 functions).
2. `case_counts.status` defaults to `"published"` already — the Phase 7 autonomy flip appears to have been pulled forward. Verify this aligns with the desired manual-vs-autonomous mode.

### Verification & observability
There are no recorded results in the repo for the empirical gates:
- Phase 0: no-op PR all-green
- Phase 5: backup/restore drill
- Phase 7: 7-day autonomy run, F1 ≥ 0.95, cache-read ratio ≥ 0.60
- Phase 8: NVDA reviewer pass, Sim Daltonism review

Recommend a `docs/v1/exit-gate-evidence/` directory with one short file per empirical gate, pointing at logs / dashboards / PR URLs / reviewer reports.

---

## Phase 9 readiness verdict

**Not yet ready.** Phase 9 ("Computed geospatial layers") depends on the Phase 6/7 pipeline being able to ingest from many sources, detect anomalies, and protect cost. Two gaps are load-bearing:

### Blockers (must fix before Phase 9)

1. **Generate and commit `packages/db/src/types.gen.ts`** — CI types-drift gate currently fails by default; every PR is red until this is fixed. Run: `supabase gen types typescript --linked > packages/db/src/types.gen.ts` and commit.
2. **Implement `packages/extract/src/agents/anomaly.ts`** + tests — Phase 9 layers (e.g., care-access-deficit raster) will produce signals the system needs to anomaly-detect. Escalation Class #4 of the autonomy model (anomaly z > 4 / CFR ≥ 80 % / cluster spread > 100 km) cannot fire without this.

### Should-fix before Phase 9 (or take an explicit deferral)

3. **Backfill 5 of 8 v0 source adapters** (`africa-cdc`, `reliefweb`, `acled`, `moh-drc`, `uganda-moh`) OR write an ADR formally deferring them.
4. **Backfill at least 3 of 5 Priority adapters**, especially **HDX HAPI** (one adapter unlocks five data layers and feeds Phase 9 directly via IPC / INFORM / OCHA FTS / WorldPop) and **HOT OSM healthsites.io** (required for the Phase 9 travel-time-to-ETU layer).
5. **Add `source.txt` fixtures** to the 5 incomplete gold-set contexts so the F1 ≥ 0.95 gate is measurable.
6. **Pin the Vercel function region** to the Supabase project region (Vercel project Settings → Functions → Function Region).
7. **Confirm Vercel WAF / firewall rules are active in the dashboard** for `/api/mvt/*` (token-bucket), `/api/inngest`, `/auth/*`, `/outbreaks/*`. These are dashboard settings, not `vercel.ts` config.

### Nice-to-have

8. Record empirical-gate evidence under `docs/v1/exit-gate-evidence/` (backup/restore drill, 7-day autonomy run, NVDA reviewer report link).
9. Add `/map` to the Lighthouse CI URL list.
10. Add a Phase 2 integration test that asserts the multi-function round-trip produces non-null `prompt_version_hash` and `cache_read_input_tokens > 0` on a re-run.

---

## Phase-by-phase summary table

| Phase | Schema | Code | Tests | Exit gate |
|------:|:------:|:----:|:-----:|:---------:|
| 0 | n/a | ✅ | ✅ | ✅ structurally |
| 1 | ✅ | ✅ | ✅ | ⚠️ blocked by missing `types.gen.ts` |
| 2 | ✅ | ✅ | ✅ | ⚠️ met in substance; refactored into Phase 6 chain |
| 3 | n/a | ✅ | ✅ | ✅ |
| 4 | n/a | ✅ | ✅ | ✅ |
| 5 | ✅ | ✅ | ✅ | ⚠️ region pin + drill log missing |
| 6 | ✅ | ⚠️ (3/8 adapters; no anomaly) | ⚠️ | ❌ adapters + anomaly missing |
| 7 | ✅ | ⚠️ (thin gold set; anomaly missing) | ✅ | ⚠️ quantitative gates unprovable |
| 8 | n/a | ✅ | ✅ | ✅ scaffolded; empirical gates pending |
