# ADR-0001: Adopt Biome 2 for lint and format

- **Status:** Proposed
- **Date:** 2026-05-27
- **Deciders:** @BhodiSea
- **Consulted:** `.claude/agents/reviewer.md`, `.claude/hooks/biome-check.sh`
- **Tags:** tooling, dx, top-level-dep

## Context and Problem Statement

The repo currently uses ESLint 9 + `eslint-config-next` (the `with-supabase`
template default). `AGENTS.md` declares Biome 2 as the target lint+format
tool. Today every save runs a single ESLint pass; there is no formatter and
the PostToolUse hook (`biome-check.sh`) already prefers `biome` and falls
back to ESLint as warn-only — so the apparatus is waiting for the binary.

Adding a top-level dep crosses rule 11 and requires this ADR.

## Decision Drivers

- Single binary for lint + format (no Prettier + ESLint dual config).
- ~25× faster than ESLint on this codebase's likely size.
- First-class support for TS/TSX/JS/JSX/JSON/CSS as one toolchain.
- The PostToolUse hook is already written against `biome check --write`;
  installing Biome activates it with zero hook changes.
- Must preserve the React Hooks lint rules — those are not in Biome with
  the same fidelity as `eslint-plugin-react-hooks`.

## Considered Options

1. **Biome 2** as primary lint + format; thin ESLint kept only for
   `eslint-plugin-react-hooks` (the sole surviving plugin, per AGENTS.md
   tech-stack row).
2. **Status quo** — ESLint + (later) Prettier. Slower; two configs.
3. **Oxlint** — Rust-based, faster than Biome; no formatter; rule
   coverage still maturing. Not in AGENTS.md.
4. **Knip / Biome's `useExhaustiveDependencies`** as the React Hooks
   replacement. Less battle-tested for hooks-specific lint than
   `eslint-plugin-react-hooks`.

## Decision Outcome

**Chosen: Option 1 — Biome 2 + thin ESLint for `react-hooks` only.**

- Add `@biomejs/biome@^2` to `devDependencies`.
- Add `biome.json` at repo root: 2-space indent, single quotes, trailing
  commas `all`, line width 100, semicolons `always`. Enable the
  recommended rule set; turn off rules duplicated by `eslint-plugin-react-hooks`.
- Trim `eslint.config.mjs` to: `next/core-web-vitals` plus
  `eslint-plugin-react-hooks` (`react-hooks/rules-of-hooks: error`,
  `react-hooks/exhaustive-deps: error`). Remove everything else.
- `package.json` scripts:
  - `lint`: `biome check . && eslint .`
  - `lint:fix`: `biome check --write . && eslint . --fix`
  - `format`: `biome format --write .`
  - `typecheck`: `tsc --noEmit` (added here; reused by `ship-gate.sh`).
- Order matters in `lint`: Biome first (faster, catches more), ESLint
  second (only react-hooks left, so it's small).

## Consequences

**Positive:**
- `biome-check.sh` PostToolUse hook starts working immediately.
- Ship-gate's `lint` and `typecheck` arms light up after install.
- Single config file replaces ESLint + (future) Prettier.

**Negative:**
- One extra binary in `node_modules` (~5 MB).
- Two-tool lint pipeline (Biome + thin ESLint) — but it's the price
  of keeping the authoritative React Hooks plugin.

**Neutral:**
- A first-pass `biome check --write .` will reformat existing template
  files. Land that mechanical commit first, then any behavioural changes.

## Validation

After install:
```bash
npm run lint       # must exit 0
npm run typecheck  # must exit 0
npm run build      # must still succeed
```

Plus: edit any `.tsx` file via Claude; `biome-check.sh` should now report
PASS instead of skipping.
