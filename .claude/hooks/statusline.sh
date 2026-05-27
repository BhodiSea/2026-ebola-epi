#!/usr/bin/env bash
# Status line: [branch • model • cwd]
# Reads JSON from stdin per Claude Code statusLine contract.

set -euo pipefail

input="$(cat 2>/dev/null || true)"

model="?"
cwd_short="?"
if command -v jq >/dev/null 2>&1 && [ -n "$input" ]; then
  model="$(printf '%s' "$input" | jq -r '.model.display_name // .model.id // "?"' 2>/dev/null || echo "?")"
  cwd="$(printf '%s' "$input" | jq -r '.workspace.current_dir // .cwd // empty' 2>/dev/null || true)"
  [ -n "$cwd" ] && cwd_short="$(basename "$cwd")"
fi

branch=""
if command -v git >/dev/null 2>&1; then
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
fi

dirty=""
if [ -n "$branch" ] && [ -n "$(git status --porcelain 2>/dev/null || true)" ]; then
  dirty="*"
fi

parts=()
[ -n "$branch" ]    && parts+=("⎇ ${branch}${dirty}")
[ "$model" != "?" ] && parts+=("⚙ ${model}")
[ "$cwd_short" != "?" ] && parts+=("📁 ${cwd_short}")

IFS=" • "
echo "${parts[*]}"
