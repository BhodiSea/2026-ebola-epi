#!/usr/bin/env bash
# PostToolUse hook: lint/format the file Claude just touched, and run the
# related Vitest test(s). For SQL files, run pglast validation.
#
# Designed to fail open when tooling isn't installed yet (current single-app
# state of the repo) so the hook adds zero friction now and full enforcement
# the day each tool lands. No coordination required.

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input="$(cat)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
[ -z "$file_path" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

has() { command -v "$1" >/dev/null 2>&1; }

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    # Biome (preferred). Falls back to ESLint via npm/pnpm script when present.
    if has biome; then
      if ! biome check --write "$file_path" >/dev/null 2>&1; then
        echo "biome check failed on $file_path:" >&2
        biome check "$file_path" >&2 || true
        exit 2
      fi
    elif has pnpm && pnpm exec biome --version >/dev/null 2>&1; then
      if ! pnpm exec biome check --write "$file_path" >/dev/null 2>&1; then
        echo "biome check failed on $file_path:" >&2
        pnpm exec biome check "$file_path" >&2 || true
        exit 2
      fi
    elif [ -x "node_modules/.bin/eslint" ]; then
      # Local ESLint as a fallback. Don't exit 2 — warn only — so the session
      # keeps moving in template-phase until Biome lands.
      if ! ./node_modules/.bin/eslint "$file_path" >/dev/null 2>&1; then
        echo "eslint warnings on $file_path:" >&2
        ./node_modules/.bin/eslint "$file_path" >&2 || true
      fi
    fi
    # If neither biome nor a local eslint exists, skip silently — template phase.

    # Related Vitest tests, only if Vitest is locally installed.
    if [ -x "node_modules/.bin/vitest" ]; then
      if ! ./node_modules/.bin/vitest --related --run "$file_path" >/dev/null 2>&1; then
        echo "vitest --related failed for $file_path:" >&2
        ./node_modules/.bin/vitest --related --run "$file_path" >&2 || true
        exit 2
      fi
    fi
    ;;

  *.sql)
    # Validate SQL with pglast if a real binary exists locally or on PATH.
    pglast_cmd=""
    if [ -x "node_modules/.bin/pglast" ]; then
      pglast_cmd="./node_modules/.bin/pglast"
    elif has pglast; then
      pglast_cmd="pglast"
    fi
    if [ -n "$pglast_cmd" ]; then
      if ! "$pglast_cmd" --check "$file_path" >/dev/null 2>&1; then
        echo "pglast failed on $file_path:" >&2
        "$pglast_cmd" --check "$file_path" >&2 || true
        exit 2
      fi
    fi
    ;;
esac

exit 0
