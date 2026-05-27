# 0005 — Hybrid Biome 2 + ESLint for type-aware linting

Date: 2026-05-27
Status: Accepted
Deciders: Thomas Nicklin

## Context and Problem Statement

ADR 0001 adopted Biome 2 for lint + format. Biome v2 added type-aware rules (`noFloatingPromises`, `noMisusedPromises`, `useAwaitThenable`) via its own inference engine. The question is whether Biome alone is sufficient or whether ESLint with `typescript-eslint` is still needed.

## Decision Drivers

- The Biome v2 launch post is explicit: *"it can currently only analyse types that occur in the same file."*
- Vercel ran an internal stress test of Biome's `noFloatingPromises` and documented edge cases around `PromiseLike` / generic-conditional types that the rule still misses.
- Production-grade type-aware linting for `PromiseLike`, union-conditional types, and cross-module generics requires the full TypeScript type checker.
- Several rules critical to this project (`strict-boolean-expressions`, `switch-exhaustiveness-check`, `naming-convention`, `restrict-template-expressions`) have no Biome equivalent.
- `eslint-plugin-drizzle`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import-x` (no-cycle), and `eslint-plugin-sonarjs` (cognitive complexity) are ecosystem plugins with no Biome parallel.

## Considered Options

1. **Biome only** — single tool, fast, no `tsc` invocation.
2. **ESLint only** — full type-aware coverage, slower, more configuration.
3. **Hybrid: Biome for fast 90%, ESLint for type-aware + ecosystem rules** (chosen).

## Decision Outcome

Chosen option **3 — hybrid**.

Division of labor:
- **Biome**: format (Prettier replacement), organize-imports, fast safe lint (recommended + nursery additions including `useSortedClasses` for Tailwind, `noBarrelFile`, `noReExportAll`, `useExhaustiveDependencies`).
- **ESLint**: type-aware rules (`no-floating-promises` cross-module accuracy, `no-unnecessary-condition`, `restrict-template-expressions`, `strict-boolean-expressions`, `switch-exhaustiveness-check`, `naming-convention`), ecosystem rules (drizzle, jsx-a11y, perfectionist groups, import-x cycle detection, security, no-secrets, sonarjs cognitive complexity), and hard caps.

Both `noFloatingPromises` (Biome) and `@typescript-eslint/no-floating-promises` (ESLint) are kept ON during the transition: Biome catches in editor instantly; ESLint catches the remainder in CI. Once Biome's type inference is multi-file (targeted for post-v3), the ESLint duplicate will be removed.

## Consequences

- Pre-commit and CI run both tools (see lefthook.yml, turbo.json).
- Cold ESLint runs with `projectService: true` are 30–90 s on the current repo; Turborepo caching amortizes this.
- `typescript-eslint` uses `parserOptions.projectService: true` (replaces legacy `project: true`), giving editor-identical types.
- If pre-commit time exceeds 10 s consistently, `import-x/no-cycle` should be moved to CI-only.
