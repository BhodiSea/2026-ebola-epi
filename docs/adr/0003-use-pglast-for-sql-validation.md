# ADR-0003: Use pglast (Python) to validate SQL migrations

- **Status:** Proposed
- **Date:** 2026-05-27
- **Deciders:** @BhodiSea
- **Consulted:** `.claude/hooks/biome-check.sh`,
  `.claude/skills/pglast-migration-validator/SKILL.md`,
  `.claude/commands/migration.md`
- **Tags:** tooling, database, migrations

## Context and Problem Statement

`AGENTS.md` rule 6: raw SQL migrations under `supabase/migrations/**.sql`
are the source of truth, and **pglast must parse them**. The Phase 1 hook
(`biome-check.sh`) already checks `node_modules/.bin/pglast` and PATH for
a `pglast` binary, exiting 2 on failure. No migrations exist yet, but the
extraction-engineer / migration commands will produce them soon.

The choice is which `pglast` flavour to install:

1. **Python `pglast`** (`pip install pglast`) — mature Python wrapper around
   `libpg_query`. Ships a `pglast` CLI. Used widely; what the architecture
   research doc assumed.
2. **Node `libpg-query`** — bindings to the same `libpg_query` C library.
   No bundled CLI; we'd write a ~30-line Node validator script.

## Decision Drivers

- A working CLI today, with no glue script to maintain.
- Reproducible across contributor machines.
- Fits the project's broader Python-light posture (no other Python deps
  expected).
- Cheap to swap to the alternative if the trade-off flips later.

## Considered Options

1. **Python `pglast` (`pip install pglast`)** — `pglast --parse <file>` is
   the validation primitive. Adds Python ≥3.10 to the contributor
   prerequisites. No `package.json` impact.
2. **Node `libpg-query` + thin TS wrapper** — no Python in the toolchain,
   but we maintain `scripts/validate-sql.ts` ourselves.
3. **`squawk`** (Rust) — opinionated migration linter (e.g. flags adding
   `NOT NULL` without a default). Stricter than we want for a greenfield;
   would fight us during the early raw-SQL phase. Defer.

## Decision Outcome

**Chosen: Option 1 — Python `pglast`.**

Concretely:
- Add a `requirements.txt` at the repo root pinning `pglast>=6.0`.
- Add a one-paragraph "Python toolchain" note to `README.md` under
  contributor setup: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`.
- Confirm `.venv/` is in `.gitignore` (it is — `*.local` plus `node_modules`
  block it; add an explicit line if not).
- `package.json` adds a thin script: `db:lint`:
  `find supabase/migrations -name '*.sql' -print0 | xargs -0 -n1 pglast --parse`.
  No-ops cleanly today (the dir doesn't exist yet).
- The existing `biome-check.sh` already detects a PATH `pglast` and runs
  `--check`. No hook change.

If Python toolchain becomes a maintenance burden (developer onboarding
friction, CI image complexity), supersede this ADR with one that adopts
`libpg-query`.

## Consequences

**Positive:**
- Migration command and PostToolUse hook both gain real validation on
  the first `.sql` write.
- `pglast` will surface real Postgres parser errors (dollar-quote
  mismatches, missing semicolons, syntax bugs) at edit time.

**Negative:**
- Contributors need Python ≥3.10 in addition to Node 22.
- Two language toolchains in CI.

**Neutral:**
- The hook's `--check` invocation should probably be `--parse` in a
  follow-up — `--check` is closer to the lint-style mode in newer pglast
  versions; harmless to call either since both exit non-zero on syntax
  errors. Leave as-is until first real migration lands and we can verify
  behavior against an actual file.

## Validation

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pglast --version    # >= 6.0
```

Plus: write a deliberately broken SQL file (e.g.
`supabase/migrations/00000000000001_smoke.sql` with `selct 1;`); the
PostToolUse hook should block with exit 2 and the pglast error.
