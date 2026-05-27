# Anti-patterns — refuse these

Each entry: **what** is banned, **why** (the failure mode), **instead** (the right shape).

## TypeScript

- **`any`**
  - Why: erases all type safety, hides bugs that would have been caught at compile.
  - Instead: `unknown` + a zod parse, or write a real type.
- **Non-boolean `!!` and `Boolean(x)` for type narrowing**
  - Why: hides nullability bugs in a "looks deliberate" sigil.
  - Instead: explicit `x !== null && x !== undefined`, or a type guard.
- **`@ts-ignore`**
  - Why: silent suppression with no breadcrumb.
  - Instead: `@ts-expect-error: <one-line reason>` so future readers know why and the compiler complains when it's no longer needed.
- **`as Foo` without a runtime check**
  - Why: lies to the compiler.
  - Instead: parse via zod, then the type is real.

## Next.js 15 / React 19

- **`getServerSideProps`, `getStaticProps`, `pages/` Router**
  - Why: App Router has been default since Next 13.4; using Pages in a 2026 greenfield is a tell.
  - Instead: App Router. Server Components by default; `'use client'` only for interactivity.
- **`useEffect(() => { fetch(…) }, [])` for initial data**
  - Why: that's a Server Component now. The hook adds a waterfall and a flicker.
  - Instead: async RSC, or `use(fetcher)` in a Client Component if you must.
- **Calling `supabase.from(...).select(...)` in a Client Component for authoritative data**
  - Why: exposes data shape via the network panel, bypasses RLS-aware caching, leaks anon key usage.
  - Instead: fetch in an RSC parent, pass the data as a serialisable prop.
- **`useEffect` to read cookies / headers / `searchParams`**
  - Why: these are server-side. Reading them client-side means accepting a flash of stale UI.
  - Instead: `await cookies()` / `await headers()` / `await searchParams` in a Server Component.
- **Class instances or non-serialisable values passed across Server/Client boundary**
  - Why: the RSC payload only carries plain values; classes become opaque shells.
  - Instead: pass plain objects; reconstruct on the client if needed.

## Supabase / Auth

- **`@supabase/auth-helpers-nextjs`**
  - Why: deprecated.
  - Instead: `@supabase/ssr` with `createBrowserClient` / `createServerClient`.
- **Mixing `auth-helpers-nextjs` and `@supabase/ssr` in the same app**
  - Why: silent auth bugs (Supabase troubleshooting confirms).
  - Instead: pick `@supabase/ssr`, delete every `auth-helpers` reference.
- **Anon/publishable key in a Server Component**
  - Why: Server Components should use the cookie-bound server client; using the anon client bypasses session handling.
  - Instead: `lib/supabase/server.ts` (cookie-bound).
- **Service-role / `sb_secret_*` in `app/**`, `components/**`, `lib/**` outside `server-only`**
  - Why: bypasses RLS; if shipped to the browser, total compromise.
  - Instead: Supabase Edge Function, or `lib/supabase/server.ts` marked `'server-only'`.
- **Trusting `getSession()` for authoritative identity**
  - Why: reads the cookie without revalidating; tamperable.
  - Instead: `getUser()` — round-trips to the Auth server and revalidates.

## RLS

- **Bare `auth.uid()` in a USING / WITH CHECK clause**
  - Why: function is called once per row; Supabase reports > 100× regression on large tables.
  - Instead: `(select auth.uid())` — Postgres runs an InitPlan once per statement.
- **Omitting `to authenticated`**
  - Why: implicitly applies to `anon` + `public`. Security hole; also wastes plan time for guests.
  - Instead: always specify the role list, even when only `authenticated`.
- **`for all` policies**
  - Why: auditability is opaque; harder to reason about per-action behaviour.
  - Instead: four separate policies (`select | insert | update | delete`).
- **Joining through another table in a USING clause without a helper**
  - Why: recursive RLS evaluation, slow + leaky plans.
  - Instead: `STABLE SECURITY DEFINER` helper returning the visible-id set; policy reads `id = ANY (select my_helper())`.
- **`SECURITY DEFINER` function in `public` when `public` is exposed via PostgREST**
  - Why: callable from PostgREST, bypasses RLS.
  - Instead: put helpers in a non-exposed schema (e.g. `private`).

## Migrations

- **`drizzle-kit push` / Drizzle as migration source of truth in a PostGIS + pgvector repo**
  - Why: Drizzle doesn't auto-create extensions; limited PostGIS DDL coverage; harder reviews.
  - Instead: raw SQL in `supabase/migrations/`, Drizzle as a typed query layer only.
- **Editing past migrations**
  - Why: breaks reproducibility on every branch / environment past the edit.
  - Instead: write a new migration that fixes the issue.
- **Reusing a migration timestamp across branches**
  - Why: `supabase db push` breaks.
  - Instead: regenerate the timestamp when rebasing.
- **Migration without `begin; … commit;`**
  - Why: partial application on error leaves a wedged schema.
  - Instead: always wrap; let Postgres do the heavy lifting.

## LLM extraction

- **Hand-written JSON Schema for an Anthropic tool**
  - Why: drifts from the zod schema; runtime validation no longer matches tool spec.
  - Instead: `zodToJsonSchema(schema)` is the only source.
- **`JSON.parse(msg.content)` instead of `tool_use` blocks**
  - Why: fragile, depends on the model emitting valid JSON in prose.
  - Instead: `tool_choice: { type: 'tool', name: '<exact>' }` + read `tool_use.input`.
- **Inline-stringing a JSON Schema into the prompt**
  - Why: balloons cached prefix, invalidates cache every time the schema shifts.
  - Instead: tools array; schema goes there once.
- **`set -e` + retry loops over Anthropic calls without idempotency**
  - Why: re-extracts the same sitrep multiple times; spend + provenance noise.
  - Instead: idempotency key keyed on `(prompt_version_hash, sitrep_id)`; retry only `FunctionsRelayError` / `FunctionsFetchError`.
- **Omitting `prompt_version_hash` on `extraction_runs`**
  - Why: re-running the same prompt vs a newer one becomes impossible to distinguish.
  - Instead: hash `system + few_shot + JSON.stringify(tool)` and store.

## Caching

- **`unstable_cache` without a stable key derivation**
  - Why: cache poisoning between users.
  - Instead: key includes the user / tenant id, or the data isn't user-specific.
- **`revalidatePath` / `revalidateTag` skipped after mutation**
  - Why: UI shows stale data; you blame React.
  - Instead: every Server Action that mutates calls one.

## Process

- **`git push --force` to a shared branch**
  - Why: overwrites teammate (or future-you) commits.
  - Instead: `--force-with-lease`; or rebase, fix conflicts, normal push.
- **`--no-verify` on commits**
  - Why: skips hooks that are there to catch real bugs.
  - Instead: fix the failing hook.
- **One giant `00000000_init.sql`**
  - Why: reviewers can't tell what changed.
  - Instead: small reviewable diffs per migration.
- **`process.env.X!` non-null assertions everywhere**
  - Why: silent crashes at runtime when an env var is missing.
  - Instead: `@t3-oss/env-nextjs` validates at startup.
