---
argument-hint: <table-name>
description: Generate four-policy RLS for a table following project conventions; delegates verification to @rls-auditor.
allowed-tools: Read, Write, Edit, Glob, Grep
---

Generate RLS for `public.$ARGUMENTS`.

## Read first

- `.claude/references/rls-performance.md` — the Supabase RLS playbook
- `app/CLAUDE.md` (if relevant) and the existing migration for this table

## Hard rules (Supabase official + project)

1. Four separate policies — one each for `select`, `insert`, `update`,
   `delete`. **Never** `for all`. Auditability + performance both improve.
2. Every policy: `to authenticated`. Omitting `to` implicitly applies to
   `anon` and `public`, which is a security bug.
3. Wrap every `auth.uid()` / `auth.jwt()` / `security definer` call in
   `(select …)`. This causes Postgres to run an initPlan once per
   statement (Supabase reports >100× improvement on large tables when
   combined with an index).
4. The column referenced in the USING/WITH CHECK clause MUST be indexed.
   If it isn't, emit a `create index if not exists` statement.
5. For cross-table joins in policies, prefer a `STABLE SECURITY DEFINER`
   helper function that returns the visible-id set, then
   `id = ANY (select my_helper())` in the USING clause.

## Emit

Append to the most recent migration for this table (or to a new migration
if the table was created earlier). Pattern:

```sql
alter table public.$ARGUMENTS enable row level security;

create policy "$(ARGUMENTS)_select_authenticated"
  on public.$ARGUMENTS for select to authenticated
  using ((select auth.uid()) is not null);   -- adjust predicate

create policy "$(ARGUMENTS)_insert_authenticated"
  on public.$ARGUMENTS for insert to authenticated
  with check ((select auth.uid()) is not null);

create policy "$(ARGUMENTS)_update_authenticated"
  on public.$ARGUMENTS for update to authenticated
  using   ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "$(ARGUMENTS)_delete_authenticated"
  on public.$ARGUMENTS for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists $(ARGUMENTS)_user_id_idx on public.$ARGUMENTS(user_id);
```

## Then add pgTAP

Write `supabase/tests/$(ARGUMENTS)_rls.test.sql` (or
`tests/pgtap/$(ARGUMENTS)_rls.test.sql` once the test layout exists) that
exercises each policy through the client SDK perspective:

- authenticated user A can SELECT own rows
- authenticated user B cannot SELECT user A's rows
- anon role gets an empty result
- INSERT with WITH CHECK passes for own user_id, fails for someone else's
- service_role bypasses RLS (sanity)

Test policies through the SDK, never the SQL Editor — the Editor bypasses RLS.

## Verify

Delegate to `@rls-auditor`:

> @rls-auditor — please audit the RLS changes on `public.$ARGUMENTS`.
> Generate a 10k-row seed, run EXPLAIN (ANALYZE, BUFFERS) for a
> representative query, and confirm:
>   - `(select auth.uid())` shows as an InitPlan, not a per-row call
>   - the policy column is indexed (Index Scan, not Seq Scan)
>   - p95 query time on 10k rows < 25 ms
> Run pgTAP and report 🔴 / 🟡 / 🟢.
