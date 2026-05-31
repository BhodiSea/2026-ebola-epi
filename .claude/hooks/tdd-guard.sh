#!/usr/bin/env bash
# PreToolUse hook: block Write|Edit|MultiEdit on source files without a
# sibling test edit in the same package within the last 2 minutes of this session.
#
# Project rule (root CLAUDE.md / AGENTS.md): tests are written BEFORE
# implementation. Edit a *.test.ts file to register intent before editing
# the implementation it tests.
#
# Package isolation: a test edit in apps/web does NOT satisfy the guard for
# a source edit in packages/extract, and vice versa.
# Root-level config files (eslint.config.ts etc.) use slug "root"; any test
# edit in any package also registers "root".
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

# Derive a package slug from a file path.
#   apps/web/lib/foo.ts      -> apps/web
#   packages/extract/src/... -> packages/extract
#   evals/gold-set/...       -> evals
#   supabase/migrations/...  -> supabase
#   eslint.config.ts (root)  -> root
#
# Handles both absolute paths (strips CLAUDE_PROJECT_DIR prefix first) and
# relative paths. Uses only POSIX parameter expansion.
pkg_slug() {
  local path="$1"
  local project_root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

  # Convert absolute path to project-relative.
  local rel="${path#"$project_root/"}"
  # If still absolute (not under project root), strip leading slash.
  [ "${rel:0:1}" = "/" ] && rel="${rel#/}"

  case "$rel" in
    apps/*)
      local after="${rel#apps/}"
      printf 'apps/%s' "${after%%/*}"
      ;;
    packages/*)
      local after="${rel#packages/}"
      printf 'packages/%s' "${after%%/*}"
      ;;
    evals/*|supabase/*|scripts/*|tooling/*|tools/*)
      printf '%s' "${rel%%/*}"
      ;;
    *)
      # Root-level file (no recognised top-level dir) or unrecognised layout.
      printf 'root'
      ;;
  esac
}

marker_name() {
  local slug="$1"
  # Replace / with _ so the slug is a valid filename component.
  printf 'last-test-edit-%s' "${slug//\//_}"
}

# Always-allowed paths: tests, configs, docs, migrations, Claude scaffolding.
case "$file_path" in
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx)
    slug="$(pkg_slug "$file_path")"
    touch "$state_dir/$(marker_name "$slug")"
    # Also register "root" so root-level config files can be edited after any test touch.
    touch "$state_dir/$(marker_name "root")"
    exit 0
    ;;
  */tests/pgtap/*|*.pgtap.sql)
    slug="$(pkg_slug "$file_path")"
    touch "$state_dir/$(marker_name "$slug")"
    touch "$state_dir/$(marker_name "root")"
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

# Source-code edits require a recent test-file edit in the SAME package.
case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    slug="$(pkg_slug "$file_path")"
    marker="$state_dir/$(marker_name "$slug")"
    if [ -f "$marker" ]; then
      # macOS uses `stat -f %m`; Linux uses `stat -c %Y`.
      last="$(stat -f %m "$marker" 2>/dev/null \
            || stat -c %Y "$marker" 2>/dev/null \
            || echo 0)"
      if [ $(( ts - last )) -lt 120 ]; then
        exit 0
      fi
    fi
    cat >&2 <<EOF
TDD-GUARD: refusing to edit "$file_path".

No test file (*.test.ts, *.spec.ts, tests/pgtap/*) in package "$slug"
was edited in the last 2 minutes of this session.

Project rule (root CLAUDE.md / AGENTS.md):
  Write a failing test BEFORE the implementation.

Next steps:
  1. Identify the smallest behavior you need to implement.
  2. Write or edit a *.test.ts inside "$slug" that exercises it (it should fail).
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
