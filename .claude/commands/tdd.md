---
argument-hint: <feature-slug>
description: Strict red→green→refactor TDD loop. Delegates RED to @test-writer (isolated context).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm test:*), Bash(pnpm typecheck:*), Bash(npm test:*), Bash(npx vitest:*)
---

You are running the TDD loop for `$ARGUMENTS`.

## Preconditions

Read these in order. Stop if any is missing:

1. `.claude/specs/$ARGUMENTS.md`
2. `.claude/plans/$ARGUMENTS.md`

If the plan is missing, tell the user to run `/plan $ARGUMENTS` first.

## Phase 1 — RED (delegate)

Use the `@test-writer` sub-agent (isolated context window). Pass it:

- The feature slug.
- The smallest remaining acceptance criterion from the plan.
- Any branded-id types or existing helpers it should use.

The sub-agent returns:

- the test file path,
- the failing output from a real test run,
- a 1-line summary of what the test verifies.

**Do NOT proceed until you have observed a real failure.** A syntax error
or import typo is NOT a real failure. A failure because the function under
test does not exist yet IS a real failure.

## Phase 2 — GREEN

Write the minimum implementation to make the failing test pass. No extra
features. No gold-plating. No "while I'm here" cleanups.

If you find yourself adding code not required by the test, STOP and either
(a) add a new failing test first, or (b) defer the work to a follow-up plan.

Run the related test and typecheck:

```bash
pnpm test -- --related <test-file> --run   # or: npx vitest --related <test-file> --run
pnpm typecheck                             # or: npx tsc --noEmit
```

Both must pass before continuing.

## Phase 3 — REFACTOR

Now (and only now), improve the implementation. After every non-trivial
change, re-run the related tests. The PostToolUse `biome-check.sh` hook
will also enforce this.

## Stop conditions

All true:

- Every acceptance criterion from the plan has a green test.
- `pnpm lint && pnpm typecheck && pnpm test --run` is green.
- No file > 400 LoC, no function > 75 LoC, cyclomatic ≤ 12, depth ≤ 4.

When done, suggest `/ship` for the full preflight gate.

## When the tdd-guard hook blocks you

It means no test file has been edited recently in this session. Either
the sub-agent didn't actually write a test (re-invoke `@test-writer`), or
you're trying to refactor without a test in the change set — annotate
the relevant test file with a clarifying comment to register intent.
