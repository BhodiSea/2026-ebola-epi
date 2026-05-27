---
name: pglast-migration-validator
description: Validate a Supabase SQL migration file with pglast and the project's convention checks. Use whenever a file under supabase/migrations/ is created or edited, even if not explicitly asked. Triggers on .sql files, migration generation, schema changes, RLS edits.
allowed-tools: Read, Glob, Grep, Bash(pnpm exec pglast:*), Bash(pglast:*), Bash(pnpm db:validate:*)
---

# pglast migration validator

When invoked, validate the most recently changed file under
`supabase/migrations/**.sql` against the parsing layer (`pglast`) AND the
project's convention checks.

## Steps

1. **Identify the target file.** From `$ARGUMENTS` if given; otherwise from
   `git status --porcelain | grep '^.. supabase/migrations/'` (most recent
   first). If multiple, ask which.

2. **Run pglast parse.** Try in this order until one works:
   ```bash
   pnpm db:validate <file>                  # if defined in package.json
   pnpm exec pglast --check <file>          # via local devDep
   pglast --check <file>                    # bare binary
   ```
   If none are installed, surface that fact and skip — don't fabricate a pass.

3. **Apply convention checks** (see `references/conventions.md` for full list).
   The high-value ones:

   - File is wrapped in `begin; … commit;`.
   - Every `create table` is followed by `alter table … enable row level security`.
   - Every `create policy`:
     - specifies `to authenticated` (or another explicit role)
     - wraps `auth.uid()` in `(select auth.uid())`
     - is one of `select | insert | update | delete` — **never `for all`**.
   - Every column referenced in a USING/WITH CHECK clause has an
     accompanying `create index if not exists`.
   - Function bodies are dollar-quoted: `$$ … $$ language plpgsql`.
   - All identifiers lowercase with underscores.
   - `IF NOT EXISTS` on `create`; `IF EXISTS` on `drop`.
   - Fact-bearing tables (anything other than reference data) have
     `source_quote_id uuid not null references public.source_quotes(id)`.
   - File name matches `^[0-9]{14}_[a-z0-9_]+\.sql$`.
   - This migration's timestamp is later than the most recent existing one
     (no out-of-order timestamps).

4. **Report.** Structured output:
   ```
   File: supabase/migrations/<file>.sql

   ✓ pglast parse OK (N statements)
   ✗ convention: outbreaks missing `enable row level security`
   ✗ convention: policy outbreaks_select_authenticated does not wrap auth.uid()
   …
   ```

5. **Exit code semantics.** If any check fails, exit non-zero so the
   wrapping hook / command can block. The hook reports the same diagnostics.

## Forbidden suggestions

- Do NOT suggest editing past migrations — propose a new migration instead.
- Do NOT suggest disabling RLS to "fix" a policy problem.
- Do NOT suggest `for all` policies as a shortcut.

## References

- `references/conventions.md` — full convention list with examples.
- `references/common-gotchas.md` — dollar-quoting subtleties, function
  `search_path`, `SECURITY DEFINER` in exposed schemas, timestamp collisions.
