# 0006 — Hard numeric caps in lint config

Date: 2026-05-27
Status: Accepted
Deciders: Thomas Nicklin

## Context and Problem Statement

LLM-generated code tends to produce large, deeply nested functions with many parameters. The question is whether to enforce numeric complexity caps in lint and, if so, at what thresholds.

## Decision Drivers

- AI code generation frequently produces functions > 100 lines, complexity > 20, and 5+ positional parameters.
- No major public config (Vercel/next-forge, Shopify/web-configs, google/gts, getsentry/sentry-javascript, typescript-eslint itself) enforces numeric caps. We are intentionally stricter.
- The `source_quote_id` provenance requirement means extraction code must be decomposable and auditable — long functions with high complexity are a review risk.

## Considered Options

1. **No caps** — match industry baseline (Vercel, Shopify, Google).
2. **Conservative caps** — match SonarSource defaults (cognitive 15, no file/function length).
3. **Strict caps** (chosen) — McConnell/McCabe/SonarSource thresholds applied consistently.

## Decision Outcome

Chosen option **3 — strict caps**:

| Rule | Value | Reference |
| --- | --- | --- |
| `max-lines` | 400 (tests: 600) | McConnell, *Code Complete* |
| `max-lines-per-function` | 75 (packages/shared: 30, tests: 200) | Google C++ Style Guide ≤40; Linux kernel 48 |
| `max-params` | 3 | Martin, *Clean Code* |
| `complexity` (cyclomatic) | 12 | McCabe (1976) recommended ≤10; compromise at 12 |
| `sonarjs/cognitive-complexity` | 15 | SonarSource documented default |
| `max-depth` | 4 | McConnell recommends 3; 4 allows one guard-clause |
| `max-nested-callbacks` | 3 | Callback hell defense |
| `max-statements` | 20 | Forces decomposition |

The same cognitive complexity threshold (15) is applied in Biome via `noExcessiveCognitiveComplexity`.

## Consequences

- The first PR will likely have many violations in existing `app/` code. These should be fixed in a follow-up rather than suppressed.
- Thresholds to lower if friction outweighs value after 30 days: `max-lines → 500`, `complexity → 15`, `cognitive → 20`.
- These caps are **not** enforced in the test scope (`max-lines: 600`, `max-lines-per-function: 200`) since test helpers and parameterized suites legitimately grow larger.
