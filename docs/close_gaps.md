# Plan — close all gaps from `docs/wiring_audit.md`

## Context

`docs/wiring_audit.md` audited every UI surface and feature in the ituri-sitrep repo and concluded that **production runtime code is genuinely clean** (no mocks, fakes, or hardcoded data blocking functionality) but identified 6 BLOCKERs (B1–B6), 11 PARTIALs (P1–P11), and 3 TODOs (T1–T3), most of which sit in the test/eval/CI confidence layer rather than user-facing code.

This plan closes **all 20 flagged items** (BLOCKER + PARTIAL + TODO). It is split into 7 PR-sized work packages so each can ship independently behind its own review. The Phase 6/7 scaffolding noted in the audit (synthetic-monitor body, map layer rail empty groups, `supabase/functions/`, `packages/ui/`, back-fill UI enqueue) is in scope where it overlaps with a flagged item (B5, P7) and otherwise out of scope.

Design decisions confirmed with the user:
- **Live gold-set eval (B1)** runs as a PR-gating CI job that no-ops in forks/Dependabot without `ANTHROPIC_API_KEY`; ship-gate gains an offline static check.
- **Query + page test gap (B2, B3)** closed with a Supabase local-stack integration vitest project, and the App Router page tests are ported to render against the seeded stack instead of mocking every child.
- **Scope**: everything (no items deferred).

---

## Work package 1 — Cosmetic & comment debt (P2, P4, T3)

Trivial fixes that unblock reviewer confidence. Single PR, <50 LoC.

- **P2 — choropleth filename**: rename [apps/web/components/outbreak/choropleth-stub.tsx](apps/web/components/outbreak/choropleth-stub.tsx) → `outbreak-choropleth.tsx`, delete the `ChoroplethStub` alias on the final line, update the 6 imports already enumerated by the audit (3 page files + 3 test files), and fix the stale `"renders ChoroplethStub"` test description in [apps/web/app/today/__tests__/page.test.tsx:122](apps/web/app/today/__tests__/page.test.tsx#L122).
- **P4 — kill-switch comment vs reality**: in [apps/web/lib/kill-switch.ts:24-34](apps/web/lib/kill-switch.ts#L24), delete the `reduced` tier from `ExtractionCapacity` and from `getExtractionCapacity()`'s branching. Then drop the unread `concurrencyHalved` field from [apps/web/inngest/lib/capacity-guard.ts](apps/web/inngest/lib/capacity-guard.ts) — no caller reads it. (We choose deletion over wiring because automatic concurrency throttling is a non-trivial design change and the throttling already happens via `paused`.)
- **T3 — turbo outputs**: in [turbo.json](turbo.json), add an explicit `"outputs": []` to the `test` task to match the rest of the file.

---

## Work package 2 — Env consolidation for site URL (P1)

One PR. Centralises the inconsistent `localhost:3000` vs `ituri-epi.com` vs `VERCEL_URL` fallbacks behind `lib/env.ts`.

- Add `NEXT_PUBLIC_SITE_URL: z.string().url()` (required, no fallback) to the `client` block of [apps/web/lib/env.ts](apps/web/lib/env.ts). Also export a derived `siteUrl()` helper in [apps/web/lib/env.ts](apps/web/lib/env.ts) that returns `env.NEXT_PUBLIC_SITE_URL` (the build fails loudly if unset, per the rule in [apps/web/lib/CLAUDE.md](apps/web/lib/CLAUDE.md)).
- Add `NEXT_PUBLIC_SITE_URL` to `.env.example` and to the Vercel project env config (Production + Preview + Development).
- Replace every `process.env.NEXT_PUBLIC_SITE_URL ?? "..."` / `process.env.VERCEL_URL` site-URL fallback with `siteUrl()` from `lib/env`. Sites to update (all enumerated in the audit + Explore inventory):
  - 5 OG image files: [today](apps/web/app/today/opengraph-image.tsx), [outbreak detail](apps/web/app/outbreaks/[pathogen]/[country]/[onset]/opengraph-image.tsx), [brief](apps/web/app/brief/[date]/opengraph-image.tsx), [zone](apps/web/app/zone/[code]/opengraph-image.tsx), [evidence](apps/web/app/evidence/[quote-id]/opengraph-image.tsx)
  - [apps/web/app/layout.tsx:17](apps/web/app/layout.tsx#L17) (`metadataBase`)
  - [robots.ts](apps/web/app/robots.ts), [sitemap.ts](apps/web/app/sitemap.ts), [feed.xml/route.ts](apps/web/app/feed.xml/route.ts), [document/[id]/page.tsx](apps/web/app/document/[id]/page.tsx), [brief/[date]/page.tsx](apps/web/app/brief/[date]/page.tsx), [embed-shell.tsx](apps/web/app/embed/[chart-id]/embed-shell.tsx), [lib/seo/breadcrumbs.ts](apps/web/lib/seo/breadcrumbs.ts) (the `ituri-epi.com` family)
- Leave [apps/web/playwright.config.ts:10](apps/web/playwright.config.ts#L10) using `PLAYWRIGHT_BASE_URL` — that's a separate concern (server location, not canonical site URL).

---

## Work package 3 — Source roster ↔ posture copy parity (P3)

One PR. Fixes the 14 missing posture entries silently rendering "Licence posture not yet documented."

- Move the prose into the database. Add `posture_terms text` and `posture_attribution text` columns to `public.sources` via a new migration `supabase/migrations/<ts>_sources_posture_columns.sql`. Backfill the 6 known entries from [apps/web/lib/copy/data-sources.ts](apps/web/lib/copy/data-sources.ts) and write straightforward defaults for the remaining 14 seeded slugs (slugs enumerated in [supabase/migrations/20260529170400_phase6_sources_seed.sql](supabase/migrations/20260529170400_phase6_sources_seed.sql)). Don't allow `null` — `NOT NULL` after backfill.
- Update [packages/db/src/schema.ts:60-75](packages/db/src/schema.ts#L60) to reflect the new columns.
- Refactor [apps/web/app/about/data-sources/page.tsx:67-95](apps/web/app/about/data-sources/page.tsx#L67) to render `source.postureTerms` / `source.postureAttribution` directly from the row.
- Delete [apps/web/lib/copy/data-sources.ts](apps/web/lib/copy/data-sources.ts) and its imports (single consumer).
- Add a pgTAP test confirming `posture_terms IS NOT NULL` for every seeded row.

---

## Work package 4 — Inngest production fixes (B5, P5, P6, P7)

Single PR (or split into B5/P5 vs P6/P7 if reviewer prefers). All four use established patterns already in the codebase.

### B5 + synthetic monitor fixture replay

Rewrite [apps/web/inngest/functions/synthetic-monitor.ts](apps/web/inngest/functions/synthetic-monitor.ts) to actually exercise the pipeline. Pattern from [research/agent-automation.md:555-578](research/agent-automation.md#L555):

1. Add `evals/synthetic/<slug>/` with a known sitrep HTML + the expected `(pathogen, country, value)` tuple. Reuse the gold-set fixture format.
2. `step.run("load-fixture", () => readFile(...))` — load the sitrep HTML.
3. `step.invoke("triage-document", { event: ..., data: ... })` — push it through the real triage → extract → reconcile chain.
4. `step.run("assert-extracted", () => ...)` — query the resulting `case_counts` row by `prompt_version_hash` + `as_of` and assert the tuple matches.
5. Write `agent_actions` with `action: "synthetic_check_passed" | "synthetic_check_failed"` and the diff. Existing `notifySlack` hook on failure.

Keep `retries: 0` (existing config) so a single failure pages the on-call.

### P5 — split triage starvation

Refactor [apps/web/inngest/functions/triage-document.ts:121-168](apps/web/inngest/functions/triage-document.ts#L121) to move the `step.waitForEvent("escalation.confirmed", 7d)` into a **separate Inngest function** `await-escalation.ts`. Triage emits `escalation.created`, the new function consumes it and does the long wait. Triage returns immediately, freeing its `concurrency.limit = 5` slot. Mirror the `RECONCILE_COUNTS_FN_CONFIG` keyed-concurrency pattern in [pipeline-fn-config.ts](apps/web/inngest/functions/pipeline-fn-config.ts).

### P6 — africa-cdc telemetry

In the inner step of [apps/web/inngest/lib/ingest-runner.ts:48-50](apps/web/inngest/lib/ingest-runner.ts#L48), when `parseResult.skipped === true`, write an `agent_actions` row before `return null`. Mirror the `extract-document.ts:50-58` pattern: `{ agent: "ingest-runner", action: "ingest_skipped", subjectTable: "sources", subjectId: sourceId, payload: { sourceSlug, url, reason } }`. Surface the count in the `/internal/sources` admin view (add a "skipped today" column).

No headless-browser fallback — adding Playwright/`@sparticuz/chromium` to ingest would be a new top-level dep requiring an ADR. Out of scope; telemetry alone resolves the audit finding.

### P7 — backfill enqueue

- Delete the `"backfill"` stub script from [packages/ingest/package.json:18](packages/ingest/package.json#L18).
- Add a `next-safe-action` server action in `apps/web/app/internal/backfill/actions.ts` (mirroring [retryInngestRunAction](apps/web/app/internal/pipeline/actions.ts)) that takes a `documentIds: SitrepId[]` array, validates with zod, and emits `inngest.send({ name: "document.backfill.requested", data: { documentIds } })`.
- Add a multi-select form to [apps/web/app/internal/backfill/page.tsx](apps/web/app/internal/backfill/page.tsx) listing un-extracted documents and a "Enqueue backfill" button wired to the action. `revalidatePath` on success.

---

## Work package 5 — Supabase integration test project (B2, B3, P8)

This is the largest piece. One PR, gated behind reviewer sign-off because it lengthens local test runs.

### New vitest project

Add `apps/web/vitest.integration.config.ts` (or new project in [vitest.config.ts](vitest.config.ts)) targeting `apps/web/lib/queries/__tests__/integration/**/*.test.ts` and `apps/web/app/**/__tests__/integration/*.test.tsx`. `globalSetup` runs `supabase start` (idempotent — checks for running stack), applies migrations, loads [supabase/seed.sql](supabase/seed.sql). `globalTeardown` is a no-op (let the user keep the stack running between iterations).

The integration tests use a **real** `createClient` (cookie-bound or anon as appropriate) against `http://localhost:54321`. Env injection via a `vitest.integration.setup.ts` setting `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the local stack output.

### Query integration tests (B2)

For each of the 14 existing mocked query tests in [apps/web/lib/queries/__tests__/](apps/web/lib/queries/__tests__/), write a sibling integration test in `apps/web/lib/queries/__tests__/integration/` that:
- Inserts the minimum fixture rows it needs (or relies on seed).
- Calls the real query helper with no mocks.
- Asserts on the real Postgres response.

**Keep** the existing unit tests — they verify the chained call shape. Add the integration tests on top. This catches the wrong-column-name / wrong-filter / RLS-empty-array class of bug.

### Page-component integration tests (B3)

Port the 4 App Router page tests (`outbreaks`, `today`, `sitreps`, `zone`) to `apps/web/app/**/__tests__/integration/page.test.tsx`. Each:
- Imports the async page component directly.
- Awaits it with `await Page({ params: ..., searchParams: ... })`.
- Renders the returned JSX with `@testing-library/react`.
- Asserts on actual queried data (not on stubbed strings).

Delete the heavily-mocked siblings once the integration ones pass — keeping both creates ambiguity about which is authoritative.

### Wire into CI and ship-gate

- Add `pnpm test:integration` as a turbo task (no cache — depends on live DB).
- Add a CI job that runs `supabase start` then `pnpm test:integration`. Fast enough to PR-gate.
- ship-gate.sh (work package 7) gains a `--with-db` flag that runs `test:integration` if the local stack is up; otherwise warns and skips.

### P8 — deepen pgTAP RLS coverage

In the same PR (cohesive with B2's RLS-aware integration tests): extend [supabase/tests/002-rls.sql](supabase/tests/002-rls.sql) to assert, for every RLS-enabled table:
- Policy count by command = 4 (SELECT/INSERT/UPDATE/DELETE), not `FOR ALL`.
- Every policy has `roles = '{authenticated}'` (or the documented exception).
- Every policy `qual`/`with_check` containing `auth.uid()` does so as `(SELECT auth.uid())`, not bare. Use `pg_policies.qual::text ~ '\(SELECT auth\.uid\(\)\)'`.

This is a single SQL test loop over `pg_policies` — no per-table boilerplate.

---

## Work package 6 — Live eval + ship-gate parity (B1, B6, T1)

One PR. Closes the highest-impact confidence gap.

### B1 — PR-gating live eval

- Add `.github/workflows/eval-pr.yml` that runs `cd evals && pnpm eval` on `pull_request` events. The job uses `secrets.ANTHROPIC_API_KEY`; if the secret is unavailable (forks, Dependabot), the step `if: env.ANTHROPIC_API_KEY != ''` no-ops with a green skip and a "no API key in this context" log message.
- Bump the gold-set source fixtures from 1–3 lines each to **realistic 200–600 char excerpts** taken from actual public sitreps (the project plan referenced "200 char minimum" via `MIN_READABLE_CHARS`). This is the fix for the secondary B1 finding (F1 ≥ 0.90 is meaningless on 3-line inputs). 7 fixtures to update; keep ground truth aligned.
- Drop the matching `response-fixture.json` files from being the source of truth — leave them in place for the offline `gold-set.test.ts`, but treat them as snapshot test data, not the eval gate.

### T1 — close cache-round-trip ttl assertion

In [packages/extract/src/__tests__/cache-round-trip.test.ts](packages/extract/src/__tests__/cache-round-trip.test.ts) (or a new sibling `params-builder.test.ts`), add a static (no API key required) Vitest assertion that:
- Calls `buildExtractionParams(...)` from [packages/extract/src/run.ts](packages/extract/src/run.ts).
- Inspects the resulting params and asserts `ttl === "1h"` on the long-lived cache breakpoint.
- Asserts the long-TTL block precedes the short-TTL block (AGENTS.md hard rule #13).

This unhides the rule statically, regardless of whether the live round-trip runs.

### B6 — ship-gate.sh parity

Rewrite [.claude/hooks/ship-gate.sh](.claude/hooks/ship-gate.sh) so it actually runs what its stderr message and [AGENTS.md:46](AGENTS.md#L46) promise. Sequential, stops at first failure:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test` (unit only)
4. `pnpm db:test` (pgTAP) — gated on `supabase` CLI being installed locally; warn-skip if not, but fail in CI.
5. `pnpm test:integration` (work package 5) — same gate.
6. `pnpm e2e` (work package 7) — same gate.
7. `pnpm knip`
8. `pnpm gitleaks` (add a wrapper script; install `gitleaks` via mise or document the install)
9. `pnpm audit --prod`
10. `pnpm eval --offline` (the offline gold-set; the live eval gates in CI only)

Add the matching wrapper scripts (`gitleaks`, `eval`, `e2e`, `pgtap`, `test:integration`) to root [package.json](package.json).

---

## Work package 7 — Playwright admin coverage + seeded e2e (B4, P9)

One PR.

### B4 — seed the e2e DB

- Add `webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI }` to [apps/web/playwright.config.ts](apps/web/playwright.config.ts).
- Add `globalSetup: "./e2e/global-setup.ts"` that runs `supabase start`, applies migrations, loads seed, and writes the seeded UUIDs to `process.env.PHASE3_DEMO_QUOTE_ID` (and any other test-needed handles). The methods-provenance spec stops skipping.
- Replace the hardcoded `00000000-0000-0000-0000-000000000001` in [og-card.spec.ts:30](apps/web/e2e/og-card.spec.ts#L30) with a real seeded quote ID from the globalSetup-exported env. Tighten the assertion: status 200 AND `image/png` AND body length ≥ N bytes (so empty fallback no longer passes).
- The disagreement spec's "if seeded" comment becomes a hard requirement once globalSetup runs.

### P9 — admin & authenticated coverage

Add new specs to [apps/web/e2e/](apps/web/e2e/):
- `internal-escalations.spec.ts` — login as a seeded admin user, ack an escalation, assert revalidation.
- `internal-pipeline.spec.ts` — retry a failed Inngest run.
- `internal-sources.spec.ts` — pause/unpause a source.
- `internal-backfill.spec.ts` — enqueue a backfill (work package 4).
- `sitreps-index.spec.ts`, `brief-date.spec.ts`, `zone-content.spec.ts` — public surfaces the audit flagged as uncovered.

### Wire e2e into PR CI

Today [.github/workflows/e2e.yml](.github/workflows/e2e.yml) only fires on Vercel `deployment_status` events. Either:
- Keep that workflow for preview-URL runs, AND
- Add an `e2e-pr.yml` that boots `supabase start` + `pnpm dev` and runs against `localhost:3000` on every PR.

The local-stack path is canonical; the preview-URL path is supplementary.

---

## Work package 8 — Hook & lint config tightening (P10, P11, T2)

One PR, low-impact.

- **P10 — tdd-guard escape hatch**: in [.claude/hooks/tdd-guard.sh:50-70](.claude/hooks/tdd-guard.sh#L50), shorten the touch-file window from 600 s → 120 s, AND additionally require that the touched test file matches the same package as the source edit (compare top-level path: `apps/web/`, `packages/extract/`, etc.). Two lines of awk.
- **P11 — lefthook full-workspace typecheck**: in [lefthook.yml:13-14](lefthook.yml#L13), change `3_typecheck` from `tsc -p apps/web/tsconfig.json` to `pnpm typecheck` (which spans the whole workspace per the root `package.json`).
- **T2 — review test-file lint relaxations**: leave most as-is (`noConsole`, `noNonNullAssertion` are pragmatic for test code), but re-enable `noExplicitAny` in [biome.json:177-185](biome.json#L177) and the matching `no-unsafe-*` family in [eslint.config.ts:570-600](eslint.config.ts#L570). When a test legitimately needs `any` for a fixture mock, force the author to opt out with a one-line `// biome-ignore` / `// eslint-disable-next-line` and a reason. Predictably surfaces 10–30 sites; the cleanup is part of this PR.

---

## Suggested sequencing

| Order | PR | Why |
| ----- | -- | --- |
| 1 | WP1 + WP2 | Quick polish; zero behavior risk. Unblocks the reviewer-trust narrative. |
| 2 | WP3 | Independent, small. |
| 3 | WP4 | Production Inngest fixes; smaller blast radius than the test infra change. |
| 4 | WP5 | Big infra add — best done before WP6 so ship-gate can rely on it. |
| 5 | WP6 | Closes the most impactful confidence gap. Depends on WP5 for `test:integration` wiring. |
| 6 | WP7 | Depends on WP5's seeding pattern. |
| 7 | WP8 | Final tightening — best last so earlier PRs don't fight the stricter lint rules. |

WP1–WP4 are independent and can land in any order; WP5–WP8 have the dependency chain above.

---

## Out of scope (explicit non-goals)

- **Africa CDC headless-browser fallback** — would require Playwright as a runtime dep + an ADR. Telemetry-only fix per WP4.
- **Map layer rail Phase 6 backing data** ([apps/web/lib/map/layers.ts:30-38](apps/web/lib/map/layers.ts#L30)) — intentional Phase 6/7 scaffolding, excluded from severity counts in the audit. Plan unchanged.
- **`packages/ui/` extraction** — intentional scaffolding. Out of scope.
- **`supabase/functions/` edge-function migration** — intentional scaffolding. Out of scope.

---

## Verification

After each work package:

- **WP1**: `pnpm typecheck && pnpm test` green; visual confirmation in `/today` and `/outbreaks/[…]` that the choropleth still renders.
- **WP2**: `pnpm build` fails when `NEXT_PUBLIC_SITE_URL` is unset; `rg "localhost:3000" apps/web/app` returns zero hits.
- **WP3**: Visit `/about/data-sources` locally — confirm zero "Licence posture not yet documented." strings. `pnpm db:test` green.
- **WP4**: Inngest dev server (`npx inngest-cli dev`) shows the synthetic monitor function emitting `synthetic_check_passed`. `/internal/backfill` form enqueues an event visible in the Inngest UI. Trigger an `africa-cdc` SPA URL and confirm an `agent_actions` row appears.
- **WP5**: `supabase start && pnpm test:integration` green from a cold start. Intentionally break a query (rename a column), confirm an integration test fails with a useful diff.
- **WP6**: `bash .claude/hooks/ship-gate.sh < /dev/null` runs all 10 steps and exits non-zero when any fails. Open a draft PR; confirm the `eval-pr` workflow runs against Anthropic and gates merge.
- **WP7**: `pnpm e2e` from a cold start (no manual seeding) passes. Confirm `methods-provenance.spec.ts` no longer skips.
- **WP8**: `pnpm typecheck` runs across all 6 workspaces on commit. `pnpm lint` flags new test-file `any` usage.

End-to-end smoke after all WPs: re-run the four Explore queries from the audit's "Verification" section ([docs/wiring_audit.md:166-181](docs/wiring_audit.md#L166)) and confirm each spot-check now returns the expected post-fix state.
