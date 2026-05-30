# ADR-0018 — promptfoo as extraction eval harness

Date: 2026-05-29
Status: Accepted
Deciders: @BhodiSea

## Context

Phase 7 requires a reproducible F1-gated evaluation harness for the extraction
prompt (`packages/extract/src/prompt.ts`). The harness must run offline against
pre-recorded fixtures (deterministic, no token spend in CI) and optionally
against the live Anthropic API (nightly job). The evaluation metric is F1 over
`(pathogen, country, metric, value, as_of_date)` tuples.

Two approaches were considered:

1. **Custom Vitest runner** — write fixture loading, model invocation, and F1
   scoring by hand. Full control; no new dependency.
2. **promptfoo** — open-source LLM evaluation framework. Handles fixture
   loading, provider calls, parallel execution, and HTML/JSON reports. F1 logic
   is a custom assert function (`evals/lib/f1.ts`).

## Decision

Use **`promptfoo`** as a `devDependency` in the monorepo root (not in
`apps/web`, so it never ships to production). It provides:

- Declarative YAML config (`evals/promptfoo.config.yaml`) mapping gold-set
  fixtures to provider + assert functions.
- `--batch` flag for running the full gold set in parallel without interactive
  prompts (CI-safe).
- Provider config for `anthropic:messages:claude-sonnet-4-6` with
  `cache: true` to reuse prompt-cache hits during the live run.
- Offline mode via pre-recorded `tool_use` response fixtures (deterministic).

The custom Vitest test (`evals/__tests__/gold-set.test.ts`) runs offline
fixtures through the F1 scorer directly — no `promptfoo` invocation, no token
spend on PR CI. `promptfoo eval` is the nightly live-API gate.

## Consequences

- **+** Declarative config makes it easy to add new gold-set fixtures without
  touching test code.
- **+** HTML diff reports help curators identify regression patterns.
- **+** Zero production bundle impact (`devDependencies` only).
- **−** One new supply-chain entry in the monorepo root.
- **−** `promptfoo` config syntax may diverge between major versions; pin the
  minor version in `package.json`.
- **−** The full 50-example gold set is a separate curation task; Phase 7
  ships 2–3 runnable fixtures as a scaffold.
