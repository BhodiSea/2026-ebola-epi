#!/usr/bin/env bash
# Stop hook: refuse to end the session while quality gates are red.
#
# Exit 2 in a Stop hook tells Claude to keep working.
# Exit 0 allows the session to end.
#
# Gates run sequentially; the first failure stops the chain.
# External tools (supabase, gitleaks) warn-skip locally when not installed;
# they hard-fail in CI (CI=true).
#
# Gate order and coverage:
#   1. lint          — Biome + ESLint workspace-wide
#   2. typecheck     — TypeScript across all packages (turbo)
#   3. test          — Vitest unit suite incl. offline gold-set eval
#   4. db:test       — pgTAP suite (supabase test db)
#   5. test:integration — Supabase integration tests (WP5)
#   6. e2e           — Playwright specs (WP7)
#   7. knip          — unused exports / dead code
#   8. gitleaks      — secret scanning
#   9. audit:prod    — pnpm audit --prod --audit-level=high
#
# The live Anthropic eval (F1 ≥ 0.95) runs in CI only, via eval-pr.yml.
# The offline gold-set check is included in gate 3 (pnpm test → turbo test →
# @ituri/evals vitest run).

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

has() { command -v "$1" >/dev/null 2>&1; }
have_script() {
  [ -f package.json ] || return 1
  has jq || return 1
  jq -e --arg s "$1" '.scripts[$s] != null' package.json >/dev/null 2>&1
}

is_ci() { [ "${CI:-}" = "true" ]; }

# Run a gate: print label, run cmd, stop on first failure.
# In CI, missing binaries hard-fail. Locally they warn-skip.
run_gate() {
  local label="$1"
  shift
  printf '[ship-gate] %s...\n' "$label" >&2
  if "$@" >/dev/null 2>&1; then
    printf '[ship-gate] PASS %s\n' "$label" >&2
  else
    printf '[ship-gate] FAIL %s\n' "$label" >&2
    "$@" >&2 || true
    printf '\n' >&2
    printf 'SHIP-GATE: refusing to end session — %s failed.\n' "$label" >&2
    printf '\n' >&2
    printf 'Fix the gate above and try again, or run /ship for the full\n' >&2
    printf 'preflight (lint, typecheck, test, db:test, integration, e2e,\n' >&2
    printf 'knip, gitleaks, audit:prod).\n' >&2
    exit 2
  fi
}

# Warn-skip or hard-fail depending on CI mode.
skip_or_fail() {
  local label="$1"
  local reason="$2"
  if is_ci; then
    printf '[ship-gate] FAIL %s — %s (required in CI)\n' "$label" "$reason" >&2
    exit 2
  else
    printf '[ship-gate] SKIP %s — %s\n' "$label" "$reason" >&2
  fi
}

if [ ! -d node_modules ]; then
  # Pre-install: nothing to gate on; allow session end.
  exit 0
fi

# ── 1. Lint ──────────────────────────────────────────────────────────────────
if have_script lint; then
  run_gate "lint" pnpm run lint
else
  skip_or_fail "lint" "no lint script in package.json"
fi

# ── 2. Typecheck ─────────────────────────────────────────────────────────────
if have_script typecheck; then
  run_gate "typecheck" pnpm run typecheck
else
  skip_or_fail "typecheck" "no typecheck script in package.json"
fi

# ── 3. Test (unit + offline gold-set) ────────────────────────────────────────
if have_script test; then
  run_gate "test" pnpm run test
else
  skip_or_fail "test" "no test script in package.json"
fi

# ── 4. pgTAP (db:test) ───────────────────────────────────────────────────────
if ! has supabase; then
  skip_or_fail "db:test" "supabase CLI not installed"
elif ! supabase status >/dev/null 2>&1; then
  skip_or_fail "db:test" "supabase stack not running (supabase start)"
elif have_script db:test; then
  run_gate "db:test" pnpm run db:test
fi

# ── 5. Integration tests ──────────────────────────────────────────────────────
if ! has supabase; then
  skip_or_fail "test:integration" "supabase CLI not installed"
elif ! supabase status >/dev/null 2>&1; then
  skip_or_fail "test:integration" "supabase stack not running (supabase start)"
elif have_script test:integration; then
  run_gate "test:integration" pnpm run test:integration
fi

# ── 6. E2E (Playwright) ───────────────────────────────────────────────────────
if ! has playwright && ! [ -x "node_modules/.bin/playwright" ]; then
  skip_or_fail "e2e" "playwright binary not found (pnpm exec playwright install)"
elif have_script e2e; then
  run_gate "e2e" pnpm run e2e
fi

# ── 7. Knip (dead exports) ────────────────────────────────────────────────────
if have_script knip; then
  # drizzle.config.ts throws at module load when SUPABASE_DB_URL is unset and
  # knip tries to evaluate it. Fall back to the standard local Supabase DB URL
  # (port 54322 per supabase/config.toml). In CI, SUPABASE_DB_URL must be set.
  SUPABASE_DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" \
    run_gate "knip" pnpm run knip
fi

# ── 8. Secret scanning (gitleaks) ─────────────────────────────────────────────
if ! has gitleaks; then
  skip_or_fail "gitleaks" "gitleaks not installed (mise install)"
elif have_script gitleaks; then
  run_gate "gitleaks" pnpm run gitleaks
fi

# ── 9. Dependency audit ───────────────────────────────────────────────────────
if have_script audit:prod; then
  run_gate "audit:prod" pnpm run audit:prod
fi

printf '[ship-gate] All gates passed.\n' >&2
exit 0
