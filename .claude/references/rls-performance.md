# RLS performance playbook (Supabase + Postgres)

Distilled from Supabase's official "RLS Performance and Best Practices"
docs (May 2026) plus the GaryAustin1/RLS-Performance benchmarks Supabase
ships. Every rule here has bench evidence behind it.

## The three non-negotiables

### 1. Wrap auth functions in `(select …)`

Wrap every `auth.uid()`, `auth.jwt()`, and `security definer` helper call
in a scalar subquery:

```sql
-- ❌ slow: function called once per row
using (auth.uid() = user_id)

-- ✓ fast: Postgres runs an InitPlan once per statement and caches the result
using ((select auth.uid()) = user_id)
```

Supabase reports **>100× improvement on large tables** from this trick
combined with rule 2 below.

### 2. Index every column referenced in USING / WITH CHECK

```sql
create index if not exists outbreaks_user_id_idx on public.outbreaks(user_id);
```

Without the index Postgres falls back to a sequential scan; the policy is
evaluated for every row. With the index it's a btree lookup.

### 3. Always specify `to authenticated` (or another explicit role)

```sql
-- ❌ implicitly applies to anon + authenticated + public
create policy "outbreaks_select"
  on public.outbreaks for select
  using (…);

-- ✓ explicit role list
create policy "outbreaks_select_authenticated"
  on public.outbreaks for select
  to authenticated
  using (…);
```

Per Supabase: *"this does not improve the query performance for the
signed-in user but it does eliminate anon users without taxing the
database to process the rest of the RLS policy."*

## Four policies, never `for all`

Split into one policy per action:

```sql
create policy "outbreaks_select_authenticated" on public.outbreaks for select to authenticated using (…);
create policy "outbreaks_insert_authenticated" on public.outbreaks for insert to authenticated with check (…);
create policy "outbreaks_update_authenticated" on public.outbreaks for update to authenticated using (…) with check (…);
create policy "outbreaks_delete_authenticated" on public.outbreaks for delete to authenticated using (…);
```

Why:

- Auditability — the intent of each is obvious.
- Performance — Postgres can short-circuit; per-action planning is cheaper.
- Supabase's AI prompt: *"Don't use `FOR ALL`. Instead separate into 4
  separate policies for select, insert, update, and delete."*

## Joined-table policies — use a `SECURITY DEFINER` helper

Don't join inside the USING clause — Postgres re-evaluates the join per
row. Instead, return the visible-id set from a helper function:

```sql
create or replace function private.visible_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select team_id
  from public.team_user
  where user_id = (select auth.uid())
$$;

create policy "projects_select_team_member" on public.projects
  for select to authenticated
  using (team_id = any (select private.visible_team_ids()));
```

Notes:

- Helper lives in a non-exposed schema (`private`), NOT `public` — otherwise
  it becomes callable via PostgREST and bypasses RLS by design. Per
  Supabase: *"Security-definer functions should never be created in a
  schema in the 'Exposed schemas' inside your API settings."*
- Always `set search_path = ''` and fully-qualify references — prevents
  search_path hijacking.
- `stable` lets the optimiser reuse results within a query.

## Test policies via the client SDK, never the SQL Editor

The Editor uses a privileged role that bypasses RLS — your test will pass
even when the policy is broken. Use:

```sql
-- pgTAP, run via `supabase test db` with Basejump helpers
select tests.create_supabase_user('user_a');
select tests.create_supabase_user('user_b');

select tests.authenticate_as('user_a');
select is(
  (select count(*) from public.outbreaks where user_id = tests.get_supabase_uid('user_a')),
  3::bigint,
  'user_a sees their 3 own rows'
);

select tests.authenticate_as('user_b');
select is(
  (select count(*) from public.outbreaks where user_id = tests.get_supabase_uid('user_a')),
  0::bigint,
  'user_b sees zero of user_a''s rows'
);

select tests.clear_authentication();
select is(
  (select count(*) from public.outbreaks),
  0::bigint,
  'anon sees zero rows'
);
```

Cover for every table with RLS:

- owner can SELECT own rows
- non-owner cannot SELECT owner's rows (empty result, not error)
- anon role gets empty result
- INSERT with WITH CHECK passes for own user_id, fails for someone else's
- service_role bypasses (sanity)

## EXPLAIN: what to look for

Run on seeded 10k rows:

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.outbreaks WHERE pathogen = 'BDBV';
```

Pass criteria:

- `(select auth.uid())` shows in an `InitPlan` line, evaluated once.
- The plan uses `Index Scan` / `Bitmap Index Scan` on policy columns,
  not `Seq Scan`.
- p95 < 25 ms on 10k rows.

If the plan has `Filter: (auth.uid() = user_id)` with `Seq Scan` —
you missed both the subquery wrap and the index.

## Explicit filters in addition to RLS

Per Supabase docs: *"explicit filters [in addition to RLS] allow
PostgreSQL to use indexes more effectively."*

```ts
// ❌ relies on RLS alone — worse plan
const rows = await supabase.from('outbreaks').select('*');

// ✓ explicit filter — Postgres can use the index
const userId = (await supabase.auth.getUser()).data.user!.id;
const rows = await supabase.from('outbreaks').select('*').eq('user_id', userId);
```

## Common mistakes (each blocks merge)

- Bare `auth.uid()` without `(select …)`.
- `for all` policies.
- Missing `to authenticated`.
- No index on the policy column.
- `SECURITY DEFINER` helpers in `public` when `public` is an exposed schema.
- Testing via the SQL Editor.
- Joining through another table in USING without a `security definer` helper.
