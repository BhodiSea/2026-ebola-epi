# ADR-0002: Adopt Vitest 3 as the test runner

- **Status:** Proposed
- **Date:** 2026-05-27
- **Deciders:** @BhodiSea
- **Consulted:** `.claude/hooks/tdd-guard.sh`, `.claude/hooks/biome-check.sh`,
  `.claude/hooks/ship-gate.sh`, `.claude/agents/test-writer.md`
- **Tags:** tooling, testing, top-level-dep

## Context and Problem Statement

There is no test runner today. `AGENTS.md` declares Vitest 3 + Playwright
+ pgTAP as the testing stack and rule 8 makes TDD the default. The
TDD-guard PreToolUse hook is in place but can never fire green —
nothing reads or runs tests yet. The PostToolUse hook is wired to run
`./node_modules/.bin/vitest --related --run` on edited TS files but
skips silently because the binary is absent.

Adding `vitest` is a top-level dep → ADR per rule 11.

## Decision Drivers

- Native ESM + TS transpile (no Babel/SWC ceremony).
- Vite-style HMR for `test:watch` — fast feedback loop.
- `--related` flag is what the PostToolUse hook already calls.
- React 19 / Next 15 compatibility for component tests.
- Coverage backend (v8) without an extra runtime.
- Playwright handles E2E separately (Phase 3); Vitest is unit + integration.

## Considered Options

1. **Vitest 3** with `jsdom`, RTL, jest-dom matchers.
2. **Jest 30** — slower, dual TS config story (`ts-jest` or SWC),
   heavier deps. Not in AGENTS.md.
3. **Node's built-in test runner** — too thin for component tests, no
   ecosystem of matchers/snapshot helpers we need.
4. **Bun test** — runner lock-in to Bun; we target Node 22 LTS in
   production.

## Decision Outcome

**Chosen: Option 1 — Vitest 3.**

Devdeps to add:
- `vitest@^3`
- `@vitest/coverage-v8@^3`
- `jsdom@^25`
- `@testing-library/react@^16`
- `@testing-library/jest-dom@^6`
- `@testing-library/user-event@^14`

Files to add:
- `vitest.config.ts` — `environment: 'jsdom'`, `globals: true`,
  `setupFiles: ['./vitest.setup.ts']`, alias mirror of `tsconfig.json`
  paths (`@/*` → `./`), `coverage.provider: 'v8'`, exclude `.next`,
  `node_modules`, `e2e/**` (Playwright lives there later).
- `vitest.setup.ts` — `import '@testing-library/jest-dom/vitest'`.
- `tsconfig.json` — add `"types": ["vitest/globals", "@testing-library/jest-dom"]`
  under `compilerOptions`.
- A smoke test, e.g. `lib/utils.test.ts`, with one trivial assertion so
  `vitest --run` exits 0 instead of "no test files."

`package.json` scripts:
- `test`: `vitest --run`
- `test:watch`: `vitest`
- `test:coverage`: `vitest --run --coverage`

## Consequences

**Positive:**
- `tdd-guard.sh` becomes meaningful (there is somewhere to write tests
  to and a runner that will execute them).
- PostToolUse `vitest --related --run` lights up — instant per-file
  regression on every edit Claude makes.
- Ship-gate's `test` arm starts running.

**Negative:**
- `jsdom` is heavy (~10 MB).
- One more config file at root.

**Neutral:**
- Coverage thresholds left unconfigured initially — set them in a
  follow-up ADR once the suite has shape.

## Validation

```bash
npm test                # exits 0 with 1 passing smoke test
npm run test:watch      # interactive
npm run test:coverage   # exits 0; coverage report under coverage/
npm run build           # still succeeds
```

Plus: edit any `.tsx`; the PostToolUse hook should run
`vitest --related --run` and report PASS or FAIL (not skip).
