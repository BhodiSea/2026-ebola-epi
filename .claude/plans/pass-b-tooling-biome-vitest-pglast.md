# Plan: Pass B — install Biome 2, Vitest 3, pglast

**Spec:** N/A (toolchain bring-up, not a product feature)
**ADRs:** [0001](../../docs/adr/0001-adopt-biome-2.md), [0002](../../docs/adr/0002-adopt-vitest-3.md), [0003](../../docs/adr/0003-use-pglast-for-sql-validation.md)
**Status:** draft
**Date:** 2026-05-27

## Context

Phase 1 wired the `.claude/` apparatus and made every hook *defensive*
about missing tooling — they no-op cleanly today. Pass B installs the
three tools the hooks expect so the enforcement actually fires:

- `biome-check.sh` PostToolUse activates Biome (lint+format) and Vitest
  (`--related --run`) on every TS edit, and pglast on every SQL edit.
- `ship-gate.sh` Stop hook starts running `lint`, `typecheck`, `test`.
- `tdd-guard.sh` PreToolUse becomes meaningful (test runner exists).

No new product behaviour. No monorepo move (Pass C). After this, the
repo lints, types, tests, and validates SQL on every commit.

## Approach

Three small, independently-revertible commits, in order. Each commit lands
in isolation so a failure in one does not block the others.

1. **Biome 2** — `biome.json`, install `@biomejs/biome`, trim
   `eslint.config.mjs` to just `eslint-plugin-react-hooks`, add `lint`,
   `lint:fix`, `format`, `typecheck` scripts. First run rewrites template
   files; that mechanical reformat is its own commit.
2. **Vitest 3** — `vitest.config.ts`, `vitest.setup.ts`, install
   `vitest`+RTL deps, add a smoke test `lib/utils.test.ts`, add `test`,
   `test:watch`, `test:coverage` scripts, add Vitest globals + jest-dom
   matchers to `tsconfig.json`.
3. **pglast** — `requirements.txt`, README contributor note, `db:lint`
   script. No Node deps.

We stay on npm here. The pnpm migration is Pass C; doing it now would
conflate two ADRs (tooling vs package manager) and triple the diff size.

## Migrations

None. (No SQL migrations exist yet.)

## Code changes in order

### Step 1 — Biome 2

1. **Add config** — write `biome.json` at root:
   ```json
   {
     "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
     "files": { "ignore": [".next", "node_modules", "coverage", "supabase/migrations"] },
     "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
     "javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "all", "semicolons": "always" } },
     "linter": {
       "enabled": true,
       "rules": {
         "recommended": true,
         "correctness": {
           "useExhaustiveDependencies": "off",
           "useHookAtTopLevel": "off"
         },
         "suspicious": { "noExplicitAny": "error" },
         "style": { "noNonNullAssertion": "error" }
       }
     }
   }
   ```
   `useExhaustiveDependencies` / `useHookAtTopLevel` are intentionally
   off — `eslint-plugin-react-hooks` owns them.
2. **Install** — `npm install --save-dev @biomejs/biome@^2`.
3. **Trim** `eslint.config.mjs` to just `next/core-web-vitals` +
   `eslint-plugin-react-hooks` rules. Remove everything Biome now handles.
4. **Scripts** — update `package.json`:
   ```json
   "lint":      "biome check . && eslint .",
   "lint:fix":  "biome check --write . && eslint . --fix",
   "format":    "biome format --write .",
   "typecheck": "tsc --noEmit"
   ```
5. **Mechanical reformat commit** — `npm run lint:fix`, commit the diff
   separately ("style: biome reformat template files"). Behavioural
   changes go after.
6. **Verify** — `npm run lint`, `npm run typecheck`, `npm run build` all
   pass.

### Step 2 — Vitest 3

1. **Install** — `npm install --save-dev vitest@^3 @vitest/coverage-v8@^3 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14`.
2. **Config** — write `vitest.config.ts`:
   ```ts
   import { defineConfig } from 'vitest/config';
   import path from 'node:path';

   export default defineConfig({
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./vitest.setup.ts'],
       exclude: ['node_modules', '.next', 'e2e/**', 'dist'],
       coverage: { provider: 'v8', reporter: ['text', 'html'] },
     },
     resolve: {
       alias: { '@': path.resolve(__dirname, '.') },
     },
   });
   ```
3. **Setup** — write `vitest.setup.ts`:
   ```ts
   import '@testing-library/jest-dom/vitest';
   ```
4. **TS types** — `tsconfig.json` `compilerOptions`:
   `"types": ["vitest/globals", "@testing-library/jest-dom"]`.
5. **Smoke test** — write `lib/utils.test.ts` exercising the existing
   `cn` helper from `lib/utils.ts` (TDD-guard friendly: the test gets
   written before any source change).
6. **Scripts** — add `test`, `test:watch`, `test:coverage` per ADR-0002.
7. **Verify** — `npm test` exits 0 with 1 passing test; PostToolUse
   `biome-check.sh` now runs `vitest --related --run` and reports PASS
   on edits.

### Step 3 — pglast

1. **Add `requirements.txt`** — `pglast>=6.0`.
2. **README note** — append a short "Python toolchain (SQL validation)"
   section under Contributor Setup.
3. **.gitignore** — confirm `.venv/` is excluded; add a line if not.
4. **Script** — `package.json`: `"db:lint": "find supabase/migrations -name '*.sql' -print0 2>/dev/null | xargs -0 -n1 pglast --parse || true"`
   (the `|| true` keeps it green until any migration exists).
5. **Verify** — `pglast --version` after `pip install -r requirements.txt`.
   The hook already finds PATH `pglast`; no hook change.

## Existing utilities to reuse

- [.claude/hooks/biome-check.sh](../.claude/hooks/biome-check.sh) — already
  prefers `biome`, runs `vitest --related --run`, runs `pglast --check`.
  Activates automatically after install.
- [.claude/hooks/ship-gate.sh](../.claude/hooks/ship-gate.sh) — runs
  `lint`/`typecheck`/`test` scripts via npm or pnpm when present.
- [lib/utils.ts](../../lib/utils.ts) — the `cn` helper. Easy smoke-test target.

## Risks & rollback

- **Biome reformat noise** — one large mechanical commit. Mitigated by
  separating the reformat from any behavioural change. Rollback:
  `git revert` that single commit.
- **`useExhaustiveDependencies` overlap** — Biome and `react-hooks`
  could double-report. We disable Biome's version. Verify on the first
  hook-rules trigger; if double-reporting reappears, the config rule
  drifted.
- **Vitest + jsdom + React 19 alignment** — RTL 16 supports React 19;
  if a peer-dep warning lands, pin overrides in `package.json`'s
  `overrides` field.
- **pglast Python dep** — adds a Python prereq. If a contributor
  cannot install Python, the hook gracefully skips (no fail-closed
  behaviour today; warn-only). Supersede with ADR-0003.5 for the Node
  binding if friction is real.

## Verification

```bash
npm run lint        # biome (and thin eslint) pass
npm run typecheck   # tsc --noEmit clean
npm test            # 1 smoke test passes
npm run build       # next build still passes

# Hook-level
# Touch a .ts file; biome-check.sh should report PASS not skip.
# Touch a deliberately broken .sql; pglast should block with exit 2.
# Run Claude through /spec → /tdd; tdd-guard.sh should permit the
#   source edit after a sibling test edit, block otherwise.
```

Plus a manual check: `git status` shows only the intended files. The
ship-gate is now load-bearing — try ending the session with a deliberately
red `npm run lint`; the Stop hook must exit 2.

## Estimate

**M** (~half-day). Realistic hours: 3–4, mostly spent settling on
`biome.json` rules and writing the smoke test against `lib/utils.ts`.

## What this plan does NOT do

- Monorepo conversion. Pass C, separate ADR.
- Drizzle setup. Lands with the first `packages/db/` work.
- Supabase CLI setup, `supabase/migrations/` directory creation. Lands
  with the first `/migration` invocation.
- Playwright / pgTAP setup. Phase 3 (`/ship` end-to-end gate work).
- CI workflow file. Land after the local pipeline is green; otherwise CI
  fails before the install commit has even merged.
