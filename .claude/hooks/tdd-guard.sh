#!/usr/bin/env bash
# PreToolUse hook: block Write|Edit|MultiEdit on source files without a
# sibling test edit within the last 10 minutes of this session.
#
# Project rule (root CLAUDE.md / AGENTS.md): tests are written BEFORE
# implementation. Edit a *.test.ts file to register intent before editing
# the implementation it tests.
#
# Exit 0 = allow. Exit 2 = block (stderr is shown to Claude).

set -euo pipefail

# jq is required to parse Claude Code hook JSON. If absent, fail open
# so we don't break the session in environments without jq.
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input="$(cat)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
session_id="$(printf '%s' "$input" | jq -r '.session_id // "unknown"')"

# No file_path means nothing to guard.
[ -z "$file_path" ] && exit 0

ts="$(date +%s)"
state_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/.tdd-state/${session_id}"
mkdir -p "$state_dir"

# Always-allowed paths: tests, configs, docs, migrations, Claude scaffolding.
case "$file_path" in
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx)
    touch "$state_dir/last-test-edit"
    exit 0
    ;;
  */tests/pgtap/*|*.pgtap.sql)
    touch "$state_dir/last-test-edit"
    exit 0
    ;;
  *.md|*.json|*.jsonc|*.yaml|*.yml|*.toml|*.lock)
    exit 0
    ;;
  *supabase/migrations/*.sql|*supabase/seed.sql|*tooling/*|*scripts/*)
    exit 0
    ;;
  *.claude/*|*docs/*|*.github/*|*.vscode/*|*.devcontainer/*)
    exit 0
    ;;
  *.gitignore|*.editorconfig|*.nvmrc|*.env*|*.example)
    exit 0
    ;;
esac

# Source-code edits require a recent test-file edit in this session.
case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    if [ -f "$state_dir/last-test-edit" ]; then
      # macOS uses `stat -f %m`; Linux uses `stat -c %Y`.
      last="$(stat -f %m "$state_dir/last-test-edit" 2>/dev/null \
            || stat -c %Y "$state_dir/last-test-edit" 2>/dev/null \
            || echo 0)"
      if [ $(( ts - last )) -lt 600 ]; then
        exit 0
      fi
    fi
    cat >&2 <<EOF
TDD-GUARD: refusing to edit "$file_path".

No test file (*.test.ts, *.spec.ts, tests/pgtap/*) was edited in the last
10 minutes of this session.

Project rule (root CLAUDE.md / AGENTS.md):
  Write a failing test BEFORE the implementation.

Next steps:
  1. Identify the smallest behavior you need to implement.
  2. Write or edit a *.test.ts that exercises it (it should fail).
  3. Then edit the implementation.

If this is a legitimate refactor with existing coverage, edit the relevant
test file with a trivial change (a clarifying comment) to register it for
this session, then retry. If the escape hatch is firing more than ~twice
a day, raise it in chat — the rule may need relaxing.
EOF
    exit 2
    ;;
esac

exit 0
