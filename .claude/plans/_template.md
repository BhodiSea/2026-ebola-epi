# Plan: <feature-name>

**Spec:** `.claude/specs/<feature-name>.md`
**Status:** draft | approved | executed
**Date:** YYYY-MM-DD

## Context

Why this change? What problem or need does it address? Link the spec for
the full mission; this section is for the why-now and the intended outcome.

## Approach

2–4 paragraphs of the technical design. Mention trade-offs considered.
Justify the chosen approach in 1–2 sentences.

## Migrations

1. `YYYYMMDDHHMMSS_<slug>.sql` — <one-line description>
2. …

## Code changes in TDD order

For each acceptance criterion from the spec:

1. **RED** — test path: `<path/to/file.test.ts>` covers `<criterion>`
2. **GREEN** — implementation in `<path/to/file.ts>`
3. **REFACTOR** — what (if anything) to clean up

(repeat for each criterion)

## Existing utilities to reuse

List functions / helpers / hooks already in the repo that this work should
build on. File paths included.

- `<path:line>` — `<helper-name>` — what it does

## Risks & rollback

What can go wrong. How to undo. Feature flag? Migration reversibility?

## Verification

Concrete commands to run end-to-end:

```bash
pnpm test --run                 # or npx vitest --run
pnpm pgtap                      # if RLS changed
pnpm exec playwright test       # if UI changed
pnpm eval -- --extract <slug>   # if extraction changed
```

Plus a manual check: open <route>, perform <action>, verify <observation>.

## Estimate

S (≤ 2h) / M (~ half-day) / L (≥ 1 day). Rough hours: <N>.
