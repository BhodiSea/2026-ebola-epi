# app/ — Next.js 15 App Router

@../.claude/references/architecture.md
@../.claude/references/anti-patterns.md

These are deltas on top of root `CLAUDE.md` / `AGENTS.md`. The repo will move
to `apps/web/` when the monorepo migration lands; rules transfer unchanged.

## Rendering rules

- **Server Component by default.** A file is a Client Component **only** if it
  has `'use client'` at the top, and `'use client'` is allowed only when the
  component needs hooks, browser APIs, or interactivity.
- Map components (MapLibre / deck.gl, when added) live under
  `app/components/map/**` or `components/map/**` as leaf clients. They are
  the **only** place MapLibre runs. Never wrap a map component around server
  data fetching — fetch in the RSC parent and pass props down.
- Next 15 made these async: `cookies()`, `headers()`, `searchParams`,
  `params`. Always `await` them.

## Data fetching

- RSC fetches via `lib/supabase/server.ts` (uses `@supabase/ssr` server client).
  **Never** the browser client in an RSC.
- Client Components fetch via `lib/supabase/client.ts` (anon/publishable key
  only). Prefer passing server-fetched data as props.
- `SUPABASE_SERVICE_ROLE_KEY` is **never** in this app. Use a Supabase Edge
  Function or an internal Route Handler tagged `server-only` for service-role
  work. The `no-service-role.sh` hook will block writes that violate this.
- Every component that renders a numeric or factual figure receives
  `sourceQuoteId: SourceQuoteId` as a required prop. Once shipped, use the
  `<FigureWithSource>` wrapper from `components/figures/` — do not render
  numbers without it.

## Server actions (when next-safe-action is installed)

- All mutations go through `next-safe-action`. Define `actionClient` in
  `lib/actions/client.ts` with auth middleware:

  ```ts
  export const authedAction = createSafeActionClient().use(async ({ next }) => {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ActionError("UNAUTHENTICATED");
    return next({ ctx: { user, supabase } });
  });
  ```

- Every action has `.inputSchema(z.object(…))`. Never trust types at runtime.
- After a mutation: `revalidatePath` over `revalidateTag` unless the data
  appears behind ≥3 URLs (then tag).
- AuthZ (permission) is mandatory in addition to AuthN. Check that the user
  owns / has rights to the specific resource — IDOR is the most common
  Server Action vulnerability.

## Route handlers

- Only when something can't be a Server Action: webhooks, file streams,
  third-party callbacks, MVT tiles.
- Same zod-validation discipline as actions.
- Webhook handlers MUST verify signatures.

## Auth flows (current `with-supabase` template)

The starter already wires `app/auth/**` (sign-in, sign-up, callback,
password reset). When extending:

- Read `lib/supabase/middleware.ts` to understand cookie refresh; don't
  bypass it.
- `getUser()` (not `getSession()`) when authoritative identity is needed —
  it round-trips to the Auth server and revalidates.

## Middleware (`middleware.ts` at repo root)

- Cookie refresh for Supabase Auth lives here.
- When CSP is added: nonce-based with `strict-dynamic`; this disables static
  optimization and ISR — fine for the dashboard, do marketing pages without
  a nonce.

## Forbidden in this app

- `process.env.SUPABASE_SERVICE_ROLE_KEY` — hook blocks the write.
- `import … from '@anthropic-ai/sdk'` — hook blocks the write.
- Storing PHI — there should be no PHI to store; refuse if encountered.
- `useEffect(() => { fetch(…) }, [])` for initial data — that's an async RSC.
- `@supabase/auth-helpers-nextjs` — deprecated; use `@supabase/ssr`.
- Pages Router (`pages/`), `getServerSideProps`, `getStaticProps`.

## Migration to `apps/web/`

When the monorepo lands, this file moves to `apps/web/CLAUDE.md`. The
`@`-imports become `@../../.claude/references/…`. Hard rules unchanged.
