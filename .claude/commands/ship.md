---
description: Final preflight before merge. Sequential. Stops at the first failure.
allowed-tools: Bash(pnpm:*), Bash(npm:*), Bash(npx:*), Bash(supabase:*), Bash(git:*), Bash(gh:*)
---

Run the full quality gate sequentially. **Stop at the first failure** and
report exactly which gate failed. Do NOT push or open a PR if any gate
fails.

## Gates (in order)

1. `git status --porcelain` — there must be no untracked migration files
   under `supabase/migrations/`. If there are, fail with the list.
2. **Lint.**
   - `pnpm lint` if defined, else `npm run lint`. (Today: ESLint via Next;
     after migration: Biome 2 + eslint-plugin-react-hooks.)
3. **Typecheck.**
   - `pnpm typecheck` if defined, else `npx tsc --noEmit`.
4. **Unit / component tests.**
   - `pnpm test --run` / `npx vitest --run` / `npm test -- --run`.
5. **pgTAP RLS suite** (when wired):
   - `pnpm pgtap` or `supabase test db`.
6. **Playwright E2E** (skip if user passed `--fast`):
   - `pnpm exec playwright test` or `npx playwright test`.
7. **Dead-code / unused deps:**
   - `pnpm exec knip` if installed.
8. **Secret scan:**
   - `pnpm exec gitleaks detect --no-banner` or `gitleaks detect --no-banner`.
9. **Dep audit:**
   - `pnpm audit --prod --audit-level=high` or `npm audit --omit=dev --audit-level=high`.
10. **LLM eval regression** (when wired):
    - `pnpm eval -- --check-regressions` — gold-set F1 must not regress.

For each gate, print `[ship] ✓ <name>` on pass or `[ship] ✗ <name>` on fail.

## On success

Only after every gate passes:

1. `git push` to the current branch.
2. If no PR yet: `gh pr create --fill --draft`.
3. Print the PR URL and stop.

## Hard rules

- Never `git push --force`. Never bypass hooks (`--no-verify`).
- If a gate skips because the tool isn't installed, mark it explicitly
  (`[ship] – <name> (skipped: tool not installed)`) so the user knows.
- Never silently downgrade — if a gate fails, the run fails.
