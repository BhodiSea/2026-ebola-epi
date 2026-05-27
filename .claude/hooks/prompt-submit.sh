#!/usr/bin/env bash
# UserPromptSubmit hook: when the user kicks off something that smells like
# a new feature without referencing an existing spec, gently inject a
# reminder that the project workflow starts with /spec.
#
# This hook does NOT block. It writes a stdout note that Claude reads as
# additional context for this turn.

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input="$(cat)"
prompt="$(printf '%s' "$input" | jq -r '.prompt // empty')"

[ -z "$prompt" ] && exit 0

# Skip if the prompt already references a spec/plan or invokes the workflow.
case "$prompt" in
  */spec*|*/plan*|*/tdd*|*/migration*|*/rls*|*/extract*|*/ship*|*/adr*)
    exit 0
    ;;
  *.claude/specs/*|*.claude/plans/*)
    exit 0
    ;;
esac

# Feature-request signal words. Case-insensitive.
shopt -s nocasematch
case "$prompt" in
  *"add a "*|*"implement "*|*"build a "*|*"build the "*|*"new feature"*|*"create a "*|*"let's add"*|*"can you add"*)
    cat <<'EOF'
[prompt-submit nudge] This sounds like a new feature.
The project workflow is: /spec → /plan → /tdd → /ship.

If a spec exists already in .claude/specs/, read it first and reference it.
If not, suggest `/spec <slug>` before starting implementation.
Skip this nudge for trivial edits, refactors, or bug fixes.
EOF
    ;;
esac

exit 0
