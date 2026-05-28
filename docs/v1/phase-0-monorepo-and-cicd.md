# Phase 0 — Monorepo migration & CI/CD scaffold

## Goal

Move the `with-supabase` Next.js template from the repo root into `apps/web/`, establish the target monorepo layout with stub packages, fix tooling inconsistencies that accumulated before the domain layer was touched, wire all six GitHub Actions workflows, configure Vercel preview deploys and Supabase Branching, and author ADR-0009. At the end of this phase, a no-op PR proves the full CI/CD loop works before a single line of domain code is written.

---

## Entry preconditions

- Git repo initialized at `/Users/thomasnicklin/Desktop/2026-ebola-epi` (already true).
- [ADR-0007](../adr/0007-pnpm-monorepo-staging.md) committed (already true).
- Vercel account with a project connected to the GitHub repo.
- Supabase project created; `SUPABASE_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN` available in shell / `.env.local`.
- GitHub repository has branch protection on `main`; status checks can be added.

---

## Deliverables

### Monorepo restructure

Move the following from repo root into `apps/web/`:

```
app/          →  apps/web/app/
components/   →  apps/web/components/
lib/          →  apps/web/lib/
next.config.ts →  apps/web/next.config.ts
tailwind.config.ts → apps/web/tailwind.config.ts
tsconfig.json →  apps/web/tsconfig.json
vitest.config.ts → apps/web/vitest.config.ts
vitest.setup.ts  → apps/web/vitest.setup.ts
public/       →  apps/web/public/
```

Root files that stay at root: `pnpm-workspace.yaml`, `turbo.json`, `biome.json`, `eslint.config.ts`, `lefthook.yml`, `knip.config.ts`, `tsconfig.base.json`, `.github/`, `supabase/`.

**`supabase/config.toml` scaffolding requirement:** set `[api] schemas = ["public"]`. Remove `graphql_public` from the schemas list — it is not used and widens the attack surface. This is a Phase 0 hardening step that must be done before the first Supabase branch is created.

Update `pnpm-workspace.yaml` to include `apps/*` and `packages/*`.

Update `turbo.json` pipeline to reference `apps/web` build/lint/test tasks.

### Stub packages

Scaffold these with minimal `package.json` + `src/index.ts` stubs only — no domain code yet:

```
packages/db/        package.json + drizzle.config.ts stub + src/index.ts
packages/shared/    package.json + src/index.ts
packages/extract/   package.json + src/index.ts
packages/ingest/    package.json + src/index.ts
packages/ui/        package.json + src/index.ts
```

### Tooling fixes

- `knip.config.ts`: update all paths that currently reference non-existent monorepo paths to reflect the new layout.
- Remove `|| true` from the `db:lint` script in `package.json` so pglast failures are fatal.
- `lefthook.yml`: add a `pre-commit` hook that runs `pnpm --filter apps/web biome:check` on staged TS files and `pglast-validate` on staged `.sql` files.
- Pin `next` in `apps/web/package.json` to the latest patched release that closes CVE-2025-29927 (≥ 15.3.0). Verify with `pnpm audit`.

### GitHub Actions (`.github/workflows/`)

Six workflow files:

**`ci.yml`** — triggers on `push` and `pull_request` to `main`:
```yaml
steps:
  - pnpm install --frozen-lockfile
  - pnpm biome check
  - pnpm typecheck   # tsc --noEmit across all packages
  - pnpm test        # vitest run across all packages
  - pnpm build       # turbo build
```

**`e2e.yml`** — triggers after Vercel preview deploy completes (via `deployment_status` event, `state: success`):
```yaml
steps:
  - name: Get Vercel preview URL
    id: vercel-url
    run: echo "url=${{ github.event.deployment_status.target_url }}" >> $GITHUB_OUTPUT
  - pnpm playwright install --with-deps chromium
  - pnpm playwright test --shard=${{ matrix.shard }}/4
    env:
      PLAYWRIGHT_BASE_URL: ${{ steps.vercel-url.outputs.url }}
# matrix: shard [1,2,3,4]
```

**`db-test.yml`** — triggers on `push` and `pull_request`:
```yaml
steps:
  - supabase start
  - pglast-validate supabase/migrations/
  - pg_prove -h localhost -p 54322 -U postgres supabase/tests/
  - supabase stop
```

**`llm-eval.yml`** — triggers on `schedule: '0 4 * * *'` (nightly only; NOT on `pull_request` — gold set does not exist until Phase 7):
```yaml
steps:
  - name: Check eval config exists
    run: test -f evals/promptfoo.config.yaml || (echo "No eval config yet — skipping" && exit 0)
  - pnpm promptfoo eval --config evals/promptfoo.config.yaml
  - # fails if F1 drops >2 points on any source vs trailing 7-day median
```

**`release.yml`** — triggers on `push` to `main`:
```yaml
steps:
  - uses: changesets/action@v1
    with:
      publish: pnpm changeset publish
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**`ingest-once.yml`** — manual `workflow_dispatch` with `adapter` input:
```yaml
inputs:
  adapter: { type: choice, options: [who-don, who-afro, ecdc-cdtr, ...] }
steps:
  - pnpm --filter packages/ingest run backfill -- --adapter ${{ inputs.adapter }}
```

### Vercel configuration

- Add `apps/web/vercel.ts` (the modern Vercel project config format, via `@vercel/config`) specifying build command, rewrite/header rules, and a **CSP nonce header**. Generate a per-request nonce in `proxy.ts` using `crypto.randomUUID()`, set it in `x-nonce` response header, and reference it in the `Content-Security-Policy` header. Phase 3 components consume this nonce for inline scripts (theme pre-hydration). Plain string literals must be used in the `proxy.ts` matcher — never `String.raw` tagged template literals (see anti-patterns.md).
- In Vercel project settings: set **Root Directory** to `.` (repo root — Turbo must run from the root where `turbo.json` lives), **Build Command** to `turbo build --filter=apps/web`, **Install Command** to `pnpm install --frozen-lockfile`, **Output Directory** to `apps/web/.next`.
- Add `@vercel/config` to `apps/web/package.json` devDependencies.
- Enable **Deployment Protection** on Production only. Previews are public so Supabase branch QA links work.
- Scope env vars: Production gets live Supabase; Preview gets `SUPABASE_DB_PASSWORD` via the Supabase-Vercel integration (auto-populated per-preview).

### Supabase Branching

- Enable Supabase GitHub integration on the repo (Settings → Integrations).
- Working directory: repo root.
- Every PR → ephemeral Postgres branch (Micro tier).
- Add "Supabase" as a **required status check** in branch protection rules for `main`.

### ADR-0009

Author `docs/adr/0009-defer-modal-epinow2-to-v2.md` using MADR 4.0 template:

- **Decision:** Defer EpiNow2 Rt nowcasting (via Modal + rpy2/epinowcast) to v2.
- **Context:** The 2026 Ituri outbreak does not yet have 14 days of daily case-count observations. Modal cold-start + R runtime overhead is not warranted until that threshold is met. The data architecture (rolling z-scores in Phase 6, `audit.agent_actions` for all compute) accommodates adding Rt columns to `case_counts` without schema migration.
- **Consequences:** No Rt estimates in v1. The `/map` inspector reserves a "Rt nowcast" placeholder in the Timeline tab; clicking it shows "Coming in v2."

---

## Tests

### Vitest

- `apps/web/lib/utils.test.ts` — keep the existing baseline passing (smoke test for the test harness).
- Add `apps/web/__tests__/env.test.ts` — asserts `@t3-oss/env-nextjs` throws on missing required vars in a test env with vars stripped.

### Playwright

- A single smoke spec `apps/web/e2e/home.spec.ts` that navigates to `/` and asserts the page title contains `ituri-sitrep`.

### pglast

- `pglast-validate supabase/migrations/` must pass on the existing scaffold migration.

---

## Tooling

- `lefthook.yml` `pre-commit.biome-check` — runs `pnpm biome check --staged`.
- `lefthook.yml` `pre-commit.pglast-sql` — runs `pglast-validate` on any staged `.sql` files.
- `.github/workflows/ci.yml` `pnpm audit` step — fails on high-severity vulnerabilities.

---

## Verification

```bash
# 1. Monorepo builds
pnpm install --frozen-lockfile
pnpm build
# Expected: Turbo cache shows all tasks completed without errors.

# 2. Lint and typecheck
pnpm biome check
pnpm typecheck
# Expected: zero errors.

# 3. Tests pass
pnpm test
# Expected: all vitest suites green.

# 4. pglast validates migrations
pnpm pglast-validate supabase/migrations/
# Expected: "All migrations valid."

# 5. Supabase local start
supabase start
supabase db reset
# Expected: migrations apply cleanly; no SQL errors.

# 6. Open a no-op PR (e.g., add a blank line to README.md)
# Expected: all 6 workflows appear in GitHub Checks and turn green.
# Expected: Vercel bot posts a preview URL comment.
# Expected: Supabase bot posts a branch URL comment.
```

If `pnpm biome check` fails: run `pnpm biome check --write` to auto-fix, inspect any remaining errors.  
If `pnpm typecheck` fails: check that all `tsconfig.json` `paths` aliases resolve to the new `apps/web/` locations.  
If Supabase branch check stays "pending": confirm the Supabase GitHub app has `Checks: write` permission on the repo.

Add a types-drift CI gate to `ci.yml`:
```yaml
- name: Assert types in sync
  run: |
    supabase gen types typescript --linked > /tmp/types.gen.ts
    diff /tmp/types.gen.ts packages/db/src/types.gen.ts
```
Fails if a schema change was not followed by a committed type regeneration.

---

## Exit gate

A no-op PR (whitespace change only) runs all six GitHub Actions workflows to green, deploys a Vercel preview URL, and creates an ephemeral Supabase preview branch — all visible in the PR's Checks panel before merge.

---

## Research cross-references

- [architecture.md — Target monorepo layout](../../.claude/references/architecture.md#target-monorepo-layout-post-migration)
- [backend.md §7 — CI/CD](../../research/backend.md#7-deployment-cicd-and-infrastructure)
- [backend.md §7 — Supabase Branching](../../research/backend.md#2-supabase-configuration)
- [ADR-0007](../adr/0007-pnpm-monorepo-staging.md) — pnpm monorepo decision

---

## Out of scope

- Any domain tables or RLS policies (Phase 1).
- Inngest, Anthropic SDK, or any LLM-related packages (Phase 2).
- Design tokens, Tailwind customization, shadcn init (Phase 3).
- Geospatial extensions or PostGIS setup (Phase 1).
- The `/docs/v1/` roadmap files themselves (already done by the planning tool).
