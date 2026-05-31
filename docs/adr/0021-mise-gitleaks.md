# ADR-0021: Adopt mise for gitleaks binary pinning

- **Status:** Accepted
- **Date:** 2026-05-31
- **Deciders:** @BhodiSea
- **Consulted:** `.claude/hooks/ship-gate.sh`, `AGENTS.md` rule 11
- **Tags:** tooling, dx, security, top-level-dep

## Context and Problem Statement

Work Package 6 (B6) rewrites `ship-gate.sh` to run 9 sequential quality gates,
including secret scanning via `gitleaks`. `gitleaks` is a compiled Go binary with
no npm wrapper; it must be installed separately. Without pinning the version, two
developer machines can run different `gitleaks` versions and produce divergent
results.

AGENTS.md rule 11 requires an ADR before any new top-level dependency is added.

## Decision Drivers

- `gitleaks` must be available in CI (GitHub Actions) and locally without manual
  version tracking.
- Node 22 and pnpm 10.11 are already pinned via `package.json` `engines` and
  `packageManager`; the same binary is not a candidate for npm wrapping.
- A `.mise.toml` at the repo root is the standard ergonomic solution: one file,
  one `mise install` command, works on macOS and Linux.
- The alternative (`.tool-versions` via asdf) is less ergonomic and asdf is not
  in the project's existing toolchain.

## Considered Options

1. **mise** — single `mise.toml`, `mise install`, works on CI via
   `jdx/mise-action@v2`. Pins gitleaks only; node/pnpm stay in `package.json`.
2. **npm wrapper** (`@cisco-secure/gitleaks` or similar) — adds an npm dep; the
   wrappers lag behind upstream releases and some are unmaintained.
3. **brew install gitleaks** + docs — not reproducible across developer machines
   or CI without additional script gymnastics.
4. **asdf + .tool-versions** — equivalent to mise but less ergonomic; asdf is
   not in the existing toolchain.

## Decision Outcome

**Chosen: Option 1 — mise with `mise.toml`.**

- Add `mise.toml` at repo root with `gitleaks = "8.18.4"`.
- Pin only gitleaks for now; node and pnpm continue to be managed via
  `package.json` `engines` / `packageManager`.
- Root `package.json` gains a `"gitleaks"` script that calls
  `gitleaks detect --no-banner --redact --source .`.
- `ship-gate.sh` checks `has gitleaks`; warn-skips locally when the binary is
  absent, hard-fails in CI.
- CI pipelines that need gitleaks should add `uses: jdx/mise-action@v2` before
  the `pnpm gitleaks` step.
- Installation for developers: `brew install mise && mise install` (macOS) or
  `curl https://mise.run | sh && mise install` (Linux/WSL).

## Consequences

**Positive:**
- Pinned version means reproducible secret scanning on every machine and in CI.
- `ship-gate.sh` step 8 is now always wired, not a documentation promise.
- `mise.toml` is the standard hook for future binary tooling (pglast, etc.).

**Negative:**
- Developers need `mise` installed. One extra `brew install mise` step.
- The `mise.toml` file is a new project convention; team members unfamiliar with
  mise need the README note.

**Neutral:**
- `mise install` is idempotent; re-running it after pulling is harmless.
- gitleaks 8.18.4 is the current stable release as of this ADR; update by
  bumping the version in `mise.toml` and opening a PR.

## Validation

```bash
mise install                 # provisions gitleaks 8.18.4
pnpm gitleaks                # must exit 0 on a clean working tree
CI=true bash .claude/hooks/ship-gate.sh  # step 8 hard-fails when gitleaks absent
```
