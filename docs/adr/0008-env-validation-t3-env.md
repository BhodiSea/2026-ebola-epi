# ADR 0008 — Adopt @t3-oss/env-nextjs for environment validation

Date: 2026-05-27  
Status: Accepted  
Deciders: Thomas Nicklin

## Context

`AGENTS.md` anti-patterns bans `process.env.X!` non-null assertions because
they produce silent runtime crashes when an env var is missing. The legacy
`with-supabase` template used this pattern in three files
(`lib/supabase/client.ts`, `server.ts`, `proxy.ts`). Additionally, the project's
ESLint config enables `n/no-process-env` for `packages/shared` and
`packages/extract`, requiring a centralised env read site for those packages.

The architecture reference table locks in `@t3-oss/env-nextjs` as the env
validation solution.

## Decision

Add `@t3-oss/env-nextjs` and `zod` as production dependencies. Write a single
`lib/env.ts` module as the only place `process.env` is accessed. All other
modules import from `lib/env.ts`.

`lib/env.ts` uses `createEnv` to:
- validate `NEXT_PUBLIC_SUPABASE_URL` (required URL)  
- validate `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (required non-empty string)  
- expose optional Vercel deployment vars (`VERCEL_URL`, `VERCEL_ENV`,
  `VERCEL_PROJECT_PRODUCTION_URL`) consumed by UI tutorial components

`createEnv` throws at module load if required vars are absent, which surfaces
misconfiguration at startup rather than at the call site.

## Consequences

- Build-time and startup validation: missing required vars abort the process
  with a clear message.
- `n/no-process-env` remains enabled; `lib/env.ts` is the single sanctioned
  read site.
- Removes six `!` non-null assertions across three supabase client files.
- `zod` is now a production dep; it was already the planned validation library
  for the extraction pipeline (architecture.md).
- ADR required per `AGENTS.md` hard rule 11 (no new top-level dependency
  without an ADR).
