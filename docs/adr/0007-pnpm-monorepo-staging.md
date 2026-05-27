# 0007 — pnpm 10 + monorepo directory staging

Date: 2026-05-27
Status: Accepted
Deciders: Thomas Nicklin

## Context and Problem Statement

The repo was initialized from `create-next-app --example with-supabase` and uses npm. ADR 0001–0004 reference pnpm workspaces as the target package manager. `research/architecture.md` specifies pnpm 10 + Turborepo as the monorepo orchestrator. The question is when to migrate and how to stage the directory structure.

## Decision Drivers

- `typescript-eslint`, `knip`, `turbo`, and `lefthook` configs all use pnpm workspace patterns (`apps/*`, `packages/*`).
- Waiting to migrate means maintaining two mental models (npm scripts now, pnpm scripts later).
- The npm→pnpm migration is low-risk: lockfile replacement, `packageManager` field, no source changes.
- Staging `apps/web/`, `packages/shared/`, `packages/extract/` directories with tsconfigs and package stubs now pre-wires the lint/type config without moving source code.

## Considered Options

1. **Stay on npm**, rewrite pnpm references to npm equivalents — delay pnpm until monorepo migration.
2. **Migrate to pnpm and stage directories now** (chosen) — configs match target state; source migration is a follow-up.
3. **Full monorepo migration now** — move all source under `apps/web/` and create initial packages — out of scope for a config-only PR.

## Decision Outcome

Chosen option **2**.

Changes applied:
- `package-lock.json` deleted; `pnpm-lock.yaml` generated.
- `packageManager: "pnpm@10.11.0"` added to root `package.json`.
- `pnpm-workspace.yaml` created with `packages: ["apps/*", "packages/*"]`.
- `pnpm.onlyBuiltDependencies` configured for `esbuild`, `lefthook`, `sharp`, `unrs-resolver`; run `pnpm rebuild lefthook esbuild` after a fresh clone.
- `apps/web/` stub created with `tsconfig.json` + `package.json` (no source yet).
- `packages/shared/` stub created with `tsconfig.json` + `package.json` + empty `src/`.
- `packages/extract/` stub created with `tsconfig.json` + `package.json` + empty `src/`.
- `supabase/functions/` directory created with a Deno-scoped `tsconfig.json`.
- Root `tsconfig.json` excludes `apps` and `packages` (they have their own configs).

## Consequences

- ESLint `ituri/react` and `ituri/drizzle` overrides target `apps/web/**` paths that don't exist yet — they no-op until source migration.
- The root Next.js app continues to build from root paths until source migration moves it to `apps/web/`.
- Future monorepo migration: move `app/`, `components/`, `lib/`, `middleware.ts`, `next.config.ts` into `apps/web/`; update root `package.json` to remove Next.js deps and delegate to workspace.
- `turbo.json` is staged but Turborepo only becomes meaningful once workspace packages have their own scripts.
