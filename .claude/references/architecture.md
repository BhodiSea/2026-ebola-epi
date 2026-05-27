# Architecture (condensed reference)

This is the on-demand summary. The full document lives at
`research/architecture.md` — read it when you need the rationale behind a
choice, not just the choice itself.

## Stack (locked-in picks)

| Concern              | Pick                                                | Notes                                                    |
| -------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Runtime              | Node 22 LTS, Deno 2 (edge functions)                | Active LTS. Supabase Edge runs Deno 2.                   |
| Package manager      | pnpm 10                                             | Workspace-native; Vercel + Supabase first-class.         |
| Monorepo orchestrator| Turborepo 2                                         | Free remote cache on Vercel; ~20-line config.            |
| Framework            | Next.js 15.5+ App Router                            | RSC default. React Compiler 1.0 via SWC.                 |
| React                | 19.2                                                | useOptimistic, useActionState production-ready.          |
| Lint+format          | Biome 2                                             | Type-aware lint without `tsc`. One config.               |
| React Hooks lint     | `eslint-plugin-react-hooks@latest`                  | Only ESLint plugin retained. Ships React Compiler rules. |
| Validation           | zod 4                                               | JIT-compiled. `z.brand` for IDs. Best ecosystem.         |
| DB query             | drizzle-orm                                         | Query layer only. PostGIS + pgvector native.             |
| DB migrations        | raw SQL via Supabase CLI + pglast validation        | Source of truth. PostGIS-friendly.                       |
| Auth + DB client     | `@supabase/ssr` + `@supabase/supabase-js` ≥ 2.10    | New publishable / secret keys.                           |
| Server actions       | next-safe-action v9+                                | Standard Schema, middleware, typed hooks.                |
| Forms                | react-hook-form + `@hookform/resolvers/zod`         | useActionState alone for simple cases.                   |
| Map                  | maplibre-gl 5 + deck.gl 9                           | Open-source; vector tiles + WebGL overlays.              |
| LLM                  | `@anthropic-ai/sdk`                                 | Native prompt caching; strict structured outputs.        |
| Unit test            | Vitest 3 (happy-dom)                                | jsdom is legacy.                                         |
| E2E                  | Playwright                                          | Native parallel sharding free. Cypress trailing.         |
| DB test              | pgTAP via `supabase test db` + Basejump helpers     | Only credible way to test RLS.                           |
| LLM eval             | promptfoo + langfuse (self-host)                    | CI evals + production traces. Both OSS.                  |
| Tracing              | `@sentry/nextjs` (OTel-native)                      | One SDK for errors, perf, source maps.                   |
| Logs                 | pino + `@axiomhq/js`                                | JSON to Axiom; queryable.                                |
| Rate limit / bot     | `@arcjet/next` (or `@upstash/ratelimit`)            | Shield + bot + rate-limit; next-safe-action middleware.  |
| Feature flags        | Vercel Edge Config + Vercel Flags SDK               | Free, low-latency.                                       |
| Hooks                | lefthook                                            | Go binary; replaces Husky + lint-staged.                 |
| Dep updates          | Renovate                                            | Monorepo-aware; groupings.                               |
| Releases             | `@changesets/cli`                                   | Monorepo-first.                                          |
| Dead-code            | knip                                                | Auto-detects Next, Vitest, Turborepo.                    |
| Env validation       | `@t3-oss/env-nextjs`                                | Zod-validated server/client env at build time.           |

## Target monorepo layout (post-migration)

```
ituri-sitrep/
├── apps/
│   └── web/                      # Next.js 15 app (today: ./ root)
├── packages/
│   ├── ui/                       # shadcn-style components, Tailwind
│   ├── db/                       # Drizzle schema + supabase gen types
│   ├── shared/                   # runtime-agnostic; consumed by Deno via copy
│   ├── extract/                  # LLM extraction pipeline (zod + tools + prompts)
│   ├── ingest/                   # source-specific fetchers
│   ├── geo/                      # PostGIS helpers, MVT, projection utils
│   ├── observability/            # pino + Sentry + Langfuse wiring
│   ├── config-biome/             # shared biome.json base
│   ├── config-ts/                # shared tsconfig bases
│   └── config-tailwind/
├── supabase/
│   ├── migrations/               # raw SQL — source of truth
│   ├── tests/                    # pgTAP files
│   └── functions/
│       ├── _shared/
│       │   └── generated/        # gitignored; copy of packages/shared
│       └── <name>/index.ts       # Deno edge functions
├── tooling/scripts/              # pglast-validate, sync-shared-to-deno, gen-db-types
└── docs/adr/                     # MADR 4.0 ADRs
```

**Current state:** single Next.js app at the repo root (`app/`, `lib/`,
`components/`). Migration to this layout is a planned operation; until then,
treat per-package CLAUDE.md as a future concern.

## Runtime boundaries

- **RSC** — fetch via `lib/supabase/server.ts` (cookie-bound). No `'use client'`.
- **Client Components** — `'use client'` only when hooks / browser APIs /
  interactivity needed. MapLibre & deck.gl live here, leaf-only.
- **Server Actions** — all mutations. `next-safe-action` + zod validation.
  AuthN AND AuthZ checks. `revalidatePath`/`revalidateTag` after writes.
- **Route Handlers** — webhooks, file streams, MVT tile bytes.
- **Edge Functions (Deno)** — webhooks, cron-triggered ingestion, Slack
  notifications. Shared code via copy from `packages/shared` to
  `supabase/functions/_shared/generated/` (no Deno workspaces yet).
- **Workers (Modal, optional)** — heavy compute (Bayesian Rt nowcast,
  branching-process). Results persisted; nothing live.

## Authoritative rules (a subset of AGENTS.md)

1. No PHI, no line-list data. Aggregate public sitrep figures only.
2. Every rendered figure has a `source_quote_id` FK.
3. Service-role key never reaches `app/**` / `components/**` / `lib/**`.
4. RLS: wrap `auth.uid()` in `(select …)`, always `to authenticated`,
   never `for all`, index every policy column.
5. Raw SQL is the migration source of truth. Drizzle is queries only.
6. Anthropic tool schemas derive from zod. `prompt_version_hash` always.
7. TDD: failing test first. `tdd-guard` enforces.

## Deployment topology (target)

- Vercel for `apps/web` + Routing Middleware.
- Supabase Cloud Pro (for Branching) for Postgres + Storage + Edge Functions.
- GitHub Actions for ingestion cron (every 6 h) until Edge Functions take it.
- Sentry + Axiom + Langfuse — three observability planes, each free tier
  generous, each answers a question the others can't.
- Modal (optional) for offline heavy compute; results written back to Supabase.
