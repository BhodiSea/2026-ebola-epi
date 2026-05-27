---
argument-hint: <slug>
description: Scaffold a new Supabase SQL migration with pglast validation, RLS template, and pgTAP stub.
allowed-tools: Read, Write, Glob, Grep, Bash(date:*), Bash(pnpm db:validate:*), Bash(pnpm exec pglast:*), Bash(pglast:*), Bash(supabase db reset:*)
---

Create a new raw SQL migration at
`supabase/migrations/$(date +%Y%m%d%H%M%S)_$ARGUMENTS.sql`.

## Template (mandatory shape — adapt the body, keep the structure)

```sql
-- migration: $ARGUMENTS
-- description: <one-line summary of what this migration does and why>
begin;

-- create your tables / views / functions here. Examples:
--
-- create table if not exists public.<name> (
--   id uuid primary key default gen_random_uuid(),
--   source_quote_id uuid not null references public.source_quotes(id),
--   created_at timestamptz not null default now()
-- );
--
-- alter table public.<name> enable row level security;

-- RLS: four separate policies, never `for all`.
-- All `auth.uid()` calls wrapped in `(select auth.uid())`.
-- Every policy specifies `to authenticated`.
--
-- create policy "<name>_select_authenticated"
--   on public.<name>
--   for select
--   to authenticated
--   using ((select auth.uid()) is not null);
--
-- (… and three more: insert, update, delete)

-- Index every column referenced in USING / WITH CHECK.
-- create index if not exists <name>_<col>_idx on public.<name>(<col>);

commit;
```

## Rules

- Always wrap in `begin; … commit;`.
- Always `IF NOT EXISTS` / `IF EXISTS` on creates/drops.
- Always dollar-quote PL/pgSQL function bodies: `$$ … $$ language plpgsql`.
- Every new fact-bearing table has `source_quote_id uuid not null
  references public.source_quotes(id)`.
- Every table with user-facing data has RLS enabled and at least one policy.
- Never edit a past migration — create a new migration that fixes it.

## After writing

1. Validate with `pglast`:
   ```bash
   pnpm db:validate                # if defined in package.json
   pnpm exec pglast --check supabase/migrations/<file>.sql
   pglast --check supabase/migrations/<file>.sql       # bare binary fallback
   ```
   This calls the `pglast-migration-validator` skill — read its `SKILL.md`
   if a check is failing and you don't know why.

2. Apply locally:
   ```bash
   supabase db reset
   ```
   This applies all migrations from scratch + runs `seed.sql`. Idempotent.

3. If RLS changed, scaffold a pgTAP test:
   `supabase/tests/<table>_rls.test.sql` exercising owner-can-select,
   non-owner-cannot, anon-empty, insert-with-check.

4. Regenerate types: `pnpm db:types` (once wired).

5. Show the diff. Do NOT push to main without human review.

## Forbidden

- Editing past migrations (create a new one instead).
- Skipping `pglast`.
- Adding a table without RLS + at least one policy.
- `for all` policies — split into four.
- Bare `auth.uid()` in a USING clause — always `(select auth.uid())`.
