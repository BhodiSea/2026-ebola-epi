# UI ↔ Backend Wiring Audit — ituri-sitrep

## Context

The user asked for a thorough audit of every UI surface and feature in the codebase to confirm everything is wired to the backend and that there are zero stubs, mocks, hardcoded values where data should be fetched, or anything else blocking the application's functionality.

Scope confirmed with the user:

- **Outcome**: report only — no code changes.
- **Phase 6/7 scaffolding** (intentionally-deferred items called out in source comments): noted in a separate section, excluded from severity counts.
- **Audit breadth**: production runtime code (`apps/web/**`, `packages/**/src/**`, `apps/web/inngest/**`, `supabase/functions/**`) **and** the test/eval/build layer (`evals/**`, `**/__tests__/**`, `apps/web/e2e/**`, `supabase/tests/**`, `.claude/hooks/**`, all `package.json` scripts, `turbo.json`, `biome.json`, `eslint.config.ts`, `vitest.config.ts`, `lefthook.yml`).

## Methodology

Four parallel Explore agents mapped (a) every UI route + component, (b) every stub/mock/hardcoded value in production code, (c) every backend integration point (server actions, route handlers, Inngest, edge functions, Drizzle, Supabase clients, Anthropic call sites), and (d) the test/eval/CI layer. Findings were then spot-verified by direct reads of the highest-impact files ([synthetic-monitor.ts](apps/web/inngest/functions/synthetic-monitor.ts), [layers.ts](apps/web/lib/map/layers.ts), [choropleth-stub.tsx](apps/web/components/outbreak/choropleth-stub.tsx)).

## Inventory at a glance

**UI surfaces present and rendering:** 24 public routes, 8 internal admin routes, 7 auth routes, 7 route handlers, ~70 components across `apps/web/components/**` (layout, map, outbreak, provenance, internal admin, auth, shadcn primitives). Full inventory captured in the agent runs; not duplicated here.

**Backend wiring present:** 3 `next-safe-action` server actions ([ack](apps/web/app/internal/escalations/actions.ts), [retry](apps/web/app/internal/pipeline/actions.ts), [pause](apps/web/app/internal/sources/actions.ts)) all reachable from their buttons. 7 route handlers all query real Supabase. 15 Inngest functions registered, 8 ingest adapters present. Anthropic SDK is server-only in 5 modules under `apps/web/inngest/`. `@supabase/ssr` everywhere; no `auth-helpers-nextjs`; no `SUPABASE_SERVICE_ROLE_KEY` in runtime code.

**Headline takeaway:** Production *runtime* code is genuinely clean — no `mockData`/`fakeData`/`sampleData`, no hardcoded UUIDs, no empty `onClick={() => {}}`, no route handlers returning literal fixtures, no `throw new Error("Not implemented")`. The blocking confidence gaps are concentrated in the **test/eval layer** and in **two known-incomplete plumbing surfaces** (synthetic monitor, back-fill enqueue).

---

## BLOCKER — items affecting production confidence

### B1. Gold-set eval cannot catch extraction regressions
- [evals/gold-set/bundibugyo-ituri-2026-04-20/source.txt](evals/gold-set/bundibugyo-ituri-2026-04-20/source.txt) — 3 lines. All 7 gold-set source files are similarly trivial (21 lines total).
- [evals/__tests__/gold-set.test.ts:69-125](evals/__tests__/gold-set.test.ts#L69) does **not** call the model. It loads a hand-crafted `response-fixture.json` that already contains the expected answer, then runs `parseExtractionResponse` + `computeF1` over a 1–3 row tuple set. F1 ≥ 0.90 is guaranteed by construction.
- The actual model-vs-gold run lives in [evals/promptfoo.config.yaml](evals/promptfoo.config.yaml) and is invoked by `pnpm eval` — which is not in `turbo test`, not in [.claude/hooks/ship-gate.sh:55-86](.claude/hooks/ship-gate.sh#L55), and not in any CI workflow visible in the repo.
- Impact: a prompt regression that breaks production extraction will pass all gates green. This directly undermines AGENTS.md hard rule #7 (zod → tool → prompt chain stability) and rule #13 (cache TTL ordering).

### B2. Web query helpers have no integration test path
- Every file under [apps/web/lib/queries/__tests__/](apps/web/lib/queries/__tests__/) (14 files) mocks `@/lib/supabase/server` wholesale — e.g. [case-counts.test.ts:9-11](apps/web/lib/queries/__tests__/case-counts.test.ts#L9). Roughly 78 `vi.mock` call sites across `apps/web` stub Supabase responses to whatever shape the test author asserts.
- There is no `testcontainers`, no `pg-mem`, no Supabase local-stack integration job, and no `SUPABASE_URL=http://localhost:54321` workflow. pgTAP covers SQL-level behaviour but not the TypeScript query layer.
- Impact: a wrong column name, a wrong filter, an RLS-blocked select returning `[]`, or a schema drift will pass `pnpm test` and surface as empty UI in production. Combined with B3, this is the single largest hole in the test pyramid.

### B3. App Router page tests mock every child component
- Pattern in [apps/web/app/outbreaks/__tests__/page.test.tsx:11-60](apps/web/app/outbreaks/__tests__/page.test.tsx#L11) (and `today/`, `sitreps/`, `zone/`): mocks 14+ modules including Supabase, every query helper, every child component, SEO, a11y. The assertion is "did the page render the strings I told it to render" — useful for prop wiring, blind to anything else.
- Impact: page tests will stay green through a broken query, a missing RLS row, or a layout regression. Same root cause as B2.

### B4. e2e harness exists but has no DB-seeding strategy and skips its key flow
- [apps/web/playwright.config.ts](apps/web/playwright.config.ts) — 23 lines, no `webServer`, no `globalSetup`, no fixture-loading.
- [apps/web/e2e/disagreement.spec.ts:11-12](apps/web/e2e/disagreement.spec.ts#L11): comment says "If disagreements are seeded in the test DB" — there is no mechanism to seed them. Test is implicitly environment-dependent.
- [apps/web/e2e/methods-provenance.spec.ts:29](apps/web/e2e/methods-provenance.spec.ts#L29): the only spec that visits `/evidence/[quote-id]` calls `test.skip(DEMO_QUOTE_ID === undefined, …)`, so it skips by default.
- [apps/web/e2e/og-card.spec.ts:30](apps/web/e2e/og-card.spec.ts#L30) hits a known-fake UUID and asserts only HTTP 200 — accepts the "gracefully handles missing quote" empty render as a pass.
- `e2e` is in [turbo.json](turbo.json) with `dependsOn: ["build"]` but is not invoked from any CI step visible in the repo.
- Impact: the e2e suite cannot fail on data or auth regressions — it pings URLs.

### B5. Synthetic monitor is a no-op skeleton (also tracked in P1 below)
- [apps/web/inngest/functions/synthetic-monitor.ts:9-19](apps/web/inngest/functions/synthetic-monitor.ts#L9): the function inserts a single `agent_actions` "ping" row with `note: "skeleton; full fixture replay lands Phase 7"`. No fixture replay. No pipeline assertion.
- Impact: any alert or SLA built on this function reports "healthy" regardless of whether the real pipeline works. Cross-listed under intentional Phase 7 scaffolding below — flagged here because the function ships *and writes audit telemetry* today.

### B6. `ship-gate.sh` promises a preflight it does not run
- [.claude/hooks/ship-gate.sh:55-86](.claude/hooks/ship-gate.sh#L55) only runs `lint` + `typecheck` + `test`. The stderr message and [AGENTS.md:46](AGENTS.md#L46) promise the full preflight `lint, typecheck, test, pgtap, e2e, knip, gitleaks, audit, eval`. None of `pgtap`/`e2e`/`knip`/`gitleaks`/`audit`/`eval` run from the Stop hook.
- Impact: the user believes a stronger gate is enforced than actually runs. Compounds B1–B4 because the items they would catch are exactly the items the missing gates would surface.

---

## PARTIAL — real partial implementations in production paths

### P1. `localhost:3000` fallback in production-rendered OG images
Five OG image generators fall back to `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL` is unset, while every other SEO surface (sitemap, robots, feed, breadcrumbs) falls back to `https://ituri-epi.com`:
- [apps/web/app/today/opengraph-image.tsx:19](apps/web/app/today/opengraph-image.tsx#L19)
- [apps/web/app/outbreaks/[pathogen]/[country]/[onset]/opengraph-image.tsx:16](apps/web/app/outbreaks/[pathogen]/[country]/[onset]/opengraph-image.tsx#L16)
- [apps/web/app/brief/[date]/opengraph-image.tsx:23](apps/web/app/brief/[date]/opengraph-image.tsx#L23)
- [apps/web/app/zone/[code]/opengraph-image.tsx:26](apps/web/app/zone/[code]/opengraph-image.tsx#L26)
- [apps/web/app/evidence/[quote-id]/opengraph-image.tsx:34](apps/web/app/evidence/[quote-id]/opengraph-image.tsx#L34)
- [apps/web/app/layout.tsx:17](apps/web/app/layout.tsx#L17) uses the same anti-pattern for `metadataBase`, gated on `VERCEL_URL` instead.
- Impact: any environment without those env vars (e.g. self-hosted preview, CI build) renders metadata pointing at localhost. The fallbacks are *inconsistent* — fix by routing through `lib/env.ts` (`@t3-oss/env-nextjs`) so the build fails loudly when a required URL is missing, per the rule in [apps/web/lib/CLAUDE.md](apps/web/lib/CLAUDE.md).

### P2. `choropleth-stub.tsx` filename is legacy, the implementation is real
- [apps/web/components/outbreak/choropleth-stub.tsx:124](apps/web/components/outbreak/choropleth-stub.tsx#L124) exports both `OutbreakChoropleth` and `ChoroplethStub` (alias). The component queries `getOutbreakZoneSvg` and renders a real SVG quantile choropleth.
- Imported by [today/page.tsx:7](apps/web/app/today/page.tsx#L7), [outbreak detail page:8](apps/web/app/outbreaks/[pathogen]/[country]/[onset]/page.tsx#L8), [embed/page.tsx:4](apps/web/app/embed/[chart-id]/page.tsx#L4).
- Impact: cosmetic — but the filename signals "not real" to a reviewer. Rename to `outbreak-choropleth.tsx` and drop the `ChoroplethStub` alias once imports are updated.

### P3. About → Data Sources renders "Licence posture not yet documented" silently
- [apps/web/app/about/data-sources/page.tsx:87-89](apps/web/app/about/data-sources/page.tsx#L87) falls back to that string for any source whose slug is missing from the hardcoded `DATA_SOURCE_POSTURES` map in `apps/web/lib/copy/data-sources.ts`.
- Impact: copy lives in TS code, not in the `sources` table. New rows seeded via migration but missing from the copy file render the fallback verbatim on a public page. Worth either moving the posture text into the table or adding a CI check that every `sources.slug` has a matching entry.

### P4. `kill-switch.ts` documents an auto-throttle that doesn't exist
- [apps/web/lib/kill-switch.ts:29](apps/web/lib/kill-switch.ts#L29): comment says `≥ 0.80 → reduced  (informational; concurrency not yet auto-throttled)`. The "reduced" tier is computed but only `paused` actually gates anything.
- Impact: anyone reading the docstring will assume throttling kicks in at 80 % spend. It does not. Either delete the tier or wire it into the Inngest function configs.

### P5. `triage-document` known concurrency-starvation edge case
- [apps/web/inngest/functions/triage-document.ts:121+](apps/web/inngest/functions/triage-document.ts#L121): novel-pair `waitForEvent('escalation.confirmed', 7d)` combined with `concurrency.limit = 5` can starve new documents. Self-documented WARNING comment.
- Impact: under sustained novel-pair load the pipeline silently stalls. Refactor candidate.

### P6. `africa-cdc` ingest silently drops JS-rendered pages
- [packages/ingest/src/sources/africa-cdc.ts:28](packages/ingest/src/sources/africa-cdc.ts#L28) and [:77](packages/ingest/src/sources/africa-cdc.ts#L77): pages too short after Readability parse are skipped as JS-rendered stubs. No headless-browser fallback, no telemetry emission for what was skipped.
- Impact: real Africa CDC sitreps that ship as SPAs disappear from ingest with no UI signal.

### P7. `packages/ingest` `backfill` npm script is a stub
- [packages/ingest/package.json:18](packages/ingest/package.json#L18): `"backfill": "echo 'backfill adapter not yet implemented' && exit 0"`.
- The Inngest function [back-fill.ts](apps/web/inngest/functions/back-fill.ts) is real but has no UI enqueue path, so the npm script was presumably the surface for kicking it off.
- Impact: anything in CI/cron expecting `pnpm --filter @ituri/ingest backfill` to do work silently succeeds with nothing happening. Only stub script in the entire repo — every other `package.json` is clean.

### P8. pgTAP RLS coverage is shallow
- [supabase/tests/002-rls.sql](supabase/tests/002-rls.sql) only asserts `relrowsecurity = true`. Real enforcement is tested for `case_counts` ([004](supabase/tests/004-case-counts-rls.sql)) and `incidents` ([008](supabase/tests/008-incidents-rls.sql)) only. The 4-policy split rule from AGENTS.md §5 is not pgTAP-verified anywhere.
- Impact: a regression that swaps `(select auth.uid())` back to bare `auth.uid()`, or drops `TO authenticated`, or replaces four policies with `FOR ALL`, passes the suite.

### P9. e2e covers public surfaces only
- 13 specs cover home/today/outbreak-detail/map/mobile/accessibility/autonomy/data-sources/disagreement/methods-provenance/og-card/print/reduced-motion. Missing: `/sitreps`, `/sources` index, all `/internal/*` admin flows, `/brief/[date]`, `/zone/[code]` content (only OG variants), and any authenticated flow.
- Impact: the entire admin surface — including the three server actions and the kanban — has zero e2e coverage.

### P10. `tdd-guard.sh` has a wide escape hatch
- [.claude/hooks/tdd-guard.sh:58-66](.claude/hooks/tdd-guard.sh#L58): editing any `.test.ts` unlocks all source edits for 10 minutes. Easy to game without intent.

### P11. `lefthook.yml` typecheck only spans `@ituri/web`
- [lefthook.yml:13-14](lefthook.yml#L13): `3_typecheck` filters to `@ituri/web`. A type break in `packages/extract`, `packages/ingest`, `packages/db` etc. is not caught at pre-commit. `pnpm typecheck` (which spans all workspaces) is not in the hook.

---

## TODO — explicit comments without visible fakery

- T1. [evals/__tests__/gold-set.test.ts](evals/__tests__/gold-set.test.ts) "live API" round-trip — [packages/extract/src/__tests__/cache-round-trip.test.ts:20](packages/extract/src/__tests__/cache-round-trip.test.ts#L20) `describe.skipIf(apiKey === undefined)` means AGENTS.md hard rule #13 (`ttl: "1h"` ordering) is only verified statically when `ANTHROPIC_API_KEY` is absent in CI.
- T2. [biome.json:177-185](biome.json#L177) / [eslint.config.ts:580-583](eslint.config.ts#L580) disable `noConsole`, `noExplicitAny`, `noNonNullAssertion`, `no-unsafe-*` in test files. Common pattern but means `any`-typed mocks can hide unsafe assumptions in the mocks themselves.
- T3. [turbo.json:50-52](turbo.json#L50) — `test` task has `dependsOn: ["^build"]` but no `outputs` declaration. Acceptable but inconsistent with the rest of the file.

---

## Intentionally-deferred Phase 6/7 scaffolding (excluded from severity counts)

The following are *known* gaps with self-identifying source comments. They are dead UI / no-op handlers today; the project plan has them landing in later phases.

- **Synthetic monitor** — [apps/web/inngest/functions/synthetic-monitor.ts:16](apps/web/inngest/functions/synthetic-monitor.ts#L16) — "skeleton; full fixture replay lands Phase 7". Also surfaces as B5 because it ships audit telemetry today.
- **Map layer rail empty groups** — [apps/web/lib/map/layers.ts:30-38](apps/web/lib/map/layers.ts#L30) — 9 of 15 layers are `available: false`, including all of "Operational" (ETU, vaccination, ACLED), all of "Context" (popDensity, healthFacilities, travelTime), plus `attackRate`, `annotations`, `savedDefault`. The header comment says: *"Layers without backing data yet (Phase 6) still render a toggle — the spec keeps the control present while the data lands later."* They render as disabled checkboxes with a "no data" pill in [layer-rail.tsx:111-136](apps/web/components/map/layer-rail.tsx#L111).
- **`supabase/functions/`** — directory contains only `tsconfig.json`. No edge functions are deployed from this repo yet. [apps/web/app/CLAUDE.md](apps/web/app/CLAUDE.md) anticipates service-role work migrating there but it hasn't been written.
- **`packages/ui/src/index.ts`** — `export {};`. Intentional scaffolding for a not-yet-extracted component package. The current shared components live in `apps/web/components/**` per the monorepo migration notes.
- **`back-fill` UI enqueue** — the [back-fill.ts](apps/web/inngest/functions/back-fill.ts) Inngest function is real, but no UI enqueues `document.backfill.requested`. The `/internal/backfill` page reads results only; events are presumably emitted from the Inngest dashboard / CLI today.

---

## Items explicitly cleared (reviewed, not flagged)

- All four `apps/web/app/api/*` route handlers query real Supabase/Drizzle — no fake responses.
- All eight `/internal/*` pages use `lib/queries/*` helpers; empty-array returns on auth/env failure are graceful fallbacks with explicit error logging, not fake data.
- All three server actions (`ackIncidentAction`, `retryInngestRunAction`, `toggleSourcePauseAction`) are real, perform real mutations, and `revalidatePath`.
- All four auth forms call the Supabase browser client directly — no stubs.
- All `@anthropic-ai/sdk` constructors are in `import "server-only"` modules and reachable only from the Inngest webhook handler. No Anthropic call sites in `app/**`, `components/**`, or any Client Component.
- No `@supabase/auth-helpers-nextjs` imports anywhere. `@supabase/ssr` is used consistently. `SUPABASE_SERVICE_ROLE_KEY` does not appear in any runtime module.
- No `mockData` / `fakeData` / `sampleData` / `MOCK_` / `FAKE_` / `STUB_` constants anywhere in production code.
- No hardcoded UUIDs, no `throw new Error("Not implemented")`, no empty `onClick={() => {}}`, no commented-out components in production code.
- `placeholder=` attributes on input fields ([login-form](apps/web/components/login-form.tsx), [command-bar](apps/web/components/layout/command-bar.tsx), [source-library-table](apps/web/components/sources/source-library-table.tsx), audit filter bar) are legitimate HTML, not stubs.
- All six hook scripts under [.claude/hooks/](.claude/hooks/) are real — `set -euo pipefail`, parse stdin via `jq`, exit non-zero on real violations.
- Every `package.json` except `packages/ingest` has clean scripts.

---

## Severity summary (excluding intentional Phase 6/7 scaffolding)

| Severity | Count | Where the gaps live |
| -------- | ----- | ------------------- |
| BLOCKER  | 6     | 4 in the test/eval layer (B1–B4), 1 in synthetic monitor (B5), 1 in the ship gate (B6) |
| PARTIAL  | 11    | OG-image localhost fallbacks (P1), choropleth filename (P2), data-sources copy island (P3), kill-switch comment vs reality (P4), triage starvation (P5), africa-cdc silent drops (P6), ingest backfill script stub (P7), pgTAP RLS coverage (P8), e2e admin coverage (P9), TDD-guard escape hatch (P10), lefthook typecheck scope (P11) |
| TODO     | 3     | Live cache-round-trip skip, test-file lint relaxations, turbo outputs declaration |

The headline:

1. **Production runtime code is clean.** No mocks, fakes, or hardcoded values block functionality. Every UI surface is wired to a real backend path.
2. **The test pyramid is the actual risk.** The gold-set eval, query unit tests, page tests, and e2e suite each independently fail to catch the class of bug the others assume someone else catches. Combined with B6 (`ship-gate` doesn't run the gates it promises), the project's confidence story is weaker than the green CI bar suggests.
3. **Two real plumbing gaps** (synthetic monitor B5, back-fill enqueue path in Phase 6/7 list) are self-documented but worth surfacing.

## Verification — how to spot-check each finding

For BLOCKERs:

- **B1**: `cd evals && cat gold-set/*/source.txt | wc -l` → confirm `21`. `rg "createMessage|anthropic\\." __tests__/gold-set.test.ts` → confirm no live API call. `cat package.json | jq '.scripts'` → confirm `eval` is not invoked from `turbo test` or `ship-gate.sh`.
- **B2 / B3**: `rg -l "vi\\.mock\\(.*supabase" apps/web | wc -l` → confirm ~14 files. `rg "testcontainers|pg-mem" .` → confirm zero hits.
- **B4**: `pnpm --filter @ituri/web exec playwright test --list` → inspect which specs run; confirm `methods-provenance.spec.ts` reports `skipped` without `PHASE3_DEMO_QUOTE_ID`.
- **B5**: open [apps/web/inngest/functions/synthetic-monitor.ts](apps/web/inngest/functions/synthetic-monitor.ts) — confirm body is a single `db.insert`.
- **B6**: `bash .claude/hooks/ship-gate.sh < /dev/null; echo $?` after temporarily breaking a pgTAP test or planting a `console.log` — confirm hook still exits zero.

For PARTIALs:

- **P1**: `rg "localhost:3000" apps/web/app` → confirm 6 hits.
- **P2**: `ls apps/web/components/outbreak/ | grep stub` → confirm filename still has `-stub`.
- **P7**: `cat packages/ingest/package.json | jq '.scripts.backfill'` → confirm the echo-and-exit string.
- **P8**: `rg "policies_count|TO authenticated|select auth.uid" supabase/tests/` → confirm no assertions.

For the full UI inventory, the agent runs in this conversation captured every route, component, server action, route handler, Inngest function, and Anthropic call site with clickable paths — re-run them with the same prompts if a deeper inventory is needed.

## Out of scope

This audit produces findings only. No code or config changes were made. If the user wants any of the BLOCKER or PARTIAL items fixed, that is a separate request.
