---
argument-hint: <feature-slug>
description: Author a technical plan under .claude/plans/ from an existing spec. Plan mode only.
allowed-tools: Read, Write, Glob, Grep, Bash(git status:*), Bash(git diff:*), Bash(git log:*)
---

You are entering **plan mode** for `$ARGUMENTS`. Do NOT write application code.

## Preconditions

- `.claude/specs/$ARGUMENTS.md` MUST exist. If not, stop and tell the user
  to run `/spec $ARGUMENTS` first.

## Steps

1. Read the spec at `.claude/specs/$ARGUMENTS.md` carefully.
2. Read `.claude/plans/_template.md`.
3. Survey the relevant code paths so the plan is grounded in reality:
   - `app/**` for any route work
   - `lib/supabase/**` for DB client patterns
   - `supabase/migrations/**` (if any) for migration timestamping
   - `packages/**` (future) for shared modules
4. Read `.claude/references/architecture.md`, `rls-performance.md`, and/or
   `prompt-caching.md` depending on what the spec touches.
5. Write `.claude/plans/$ARGUMENTS.md` with these sections:

   - **Approach** — 2–4 paragraphs. Trade-offs considered. Why this approach.
   - **Migrations** — ordered list of `YYYYMMDDHHMMSS_<slug>.sql` files with
     a one-line description each.
   - **Code changes in TDD order** — for each acceptance criterion:
     1. RED test (path + what it asserts)
     2. GREEN implementation (path)
     3. REFACTOR (if any)
   - **Risks & rollback** — what can go wrong, how to undo.
   - **Estimate** — S/M/L; rough hours.

6. List the existing functions / utilities to reuse (with file paths). Do
   NOT propose new abstractions if a suitable one already exists.

7. Stop after writing the plan. Ask the user to review, then suggest:
   `/tdd $ARGUMENTS` once the plan is approved.

## Rules

- Recommend ONE approach. Mention alternatives in 1 sentence only if a
  decision is genuinely tight.
- Never propose work the spec doesn't authorize. If the plan grows beyond
  the spec, update the spec first.
- Always include a verification block describing how to test end-to-end.
