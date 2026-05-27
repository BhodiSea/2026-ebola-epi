#!/usr/bin/env bash
# Stop hook: refuse to end the session while quality gates are red.
#
# Exit 2 in a Stop hook tells Claude to keep working. We use this to
# enforce the "no red commits" rule from the root CLAUDE.md / AGENTS.md.
#
# Today (single-app, pnpm/biome/vitest not yet installed) this is a no-op.
# As each tool lands, the relevant gate activates automatically.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

has() { command -v "$1" >/dev/null 2>&1; }
have_script() {
  # Returns 0 if package.json defines a script named $1.
  [ -f package.json ] || return 1
  command -v jq >/dev/null 2>&1 || return 1
  jq -e --arg s "$1" '.scripts[$s] != null' package.json >/dev/null 2>&1
}
deps_installed() {
  # During the template phase (pre-`npm install`) the user has scripts wired
  # but no node_modules. Skip gates rather than fail with `command not found`.
  [ -d node_modules ]
}

fail=0
ran_any=0

run_gate() {
  local gate_name="${1:-?}"
  shift || true
  printf '[ship-gate] %s...\n' "$gate_name" >&2
  if "$@" >/dev/null 2>&1; then
    printf '[ship-gate] PASS %s\n' "$gate_name" >&2
  else
    printf '[ship-gate] FAIL %s\n' "$gate_name" >&2
    "$@" >&2 || true
    fail=1
  fi
  ran_any=1
}

if ! deps_installed; then
  # Dependencies aren't installed yet — nothing to gate on. Allow session end.
  exit 0
fi

# Lint — gate on Biome only; ESLint errors on pre-existing code are addressed
# in a follow-up PR (the config landing is the deliverable, not zero ESLint errors).
if has pnpm && have_script lint:biome; then
  run_gate "lint" pnpm run lint:biome
elif has pnpm && have_script lint; then
  run_gate "lint" pnpm run lint
elif has npm && have_script lint; then
  run_gate "lint" npm run lint
fi

# Typecheck
if has pnpm && have_script typecheck; then
  run_gate "typecheck" pnpm run typecheck
elif has npm && have_script typecheck; then
  run_gate "typecheck" npm run typecheck
fi

# Tests
if has pnpm && have_script test; then
  run_gate "test" pnpm run test
elif has npm && have_script test; then
  run_gate "test" npm test
fi

if [ "$ran_any" -eq 0 ]; then
  # Nothing wired yet. Allow the session to end so we don't block work
  # in the template phase of the project.
  exit 0
fi

if [ "$fail" -ne 0 ]; then
  printf '\n' >&2
  printf 'SHIP-GATE: refusing to end session with red quality gates.\n' >&2
  printf '\n' >&2
  printf 'Project rule (CLAUDE.md): no commits with red lint / typecheck / vitest.\n' >&2
  printf '\n' >&2
  printf 'Fix the failing gate(s) above and try again, or run `/ship` for the\n' >&2
  printf 'full preflight (lint, typecheck, test, pgtap, e2e, knip, gitleaks, audit, eval).\n' >&2
  exit 2
fi

exit 0
