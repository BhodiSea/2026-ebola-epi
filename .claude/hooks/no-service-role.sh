#!/usr/bin/env bash
# PreToolUse hook: refuse writes that put SUPABASE_SERVICE_ROLE_KEY (or the
# Supabase secret key, sb_secret_*) into client-reachable paths.
#
# Service-role / secret keys may only appear in server-only modules:
#   - supabase/functions/**
#   - lib/server/**, lib/supabase/server.ts
#   - any *.server.ts file
#   - migrations / scripts / tooling

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input="$(cat)"
tool_name="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"

[ -z "$file_path" ] && exit 0

content="$(printf '%s' "$input" | jq -r '
  [
    .tool_input.content // empty,
    .tool_input.new_string // empty,
    (.tool_input.edits // [] | map(.new_string // empty) | join("\n"))
  ] | map(select(length > 0)) | join("\n")
')"

[ -z "$content" ] && exit 0

# Only inspect text payloads that mention a service-role / secret reference.
if ! printf '%s' "$content" | grep -E -q '(SUPABASE_SERVICE_ROLE_KEY|sb_secret_|service_role[[:space:]]*key)'; then
  exit 0
fi

# Allowed (server-only) destinations.
case "$file_path" in
  *supabase/functions/*) exit 0 ;;
  *lib/server/*|*lib/supabase/server.ts|*lib/supabase/admin.ts) exit 0 ;;
  *.server.ts|*.server.tsx) exit 0 ;;
  *supabase/migrations/*|*scripts/*|*tooling/*) exit 0 ;;
  *.env.example|*.env.*.example|*README*|*CLAUDE.md|*AGENTS.md|*.md|*.claude/*) exit 0 ;;
  *.github/*) exit 0 ;;
esac

# Anything client-reachable is a no-go.
case "$file_path" in
  *app/*|*components/*|*lib/*|*hooks/*|*pages/*|*public/*)
    cat >&2 <<EOF
NO-SERVICE-ROLE: refusing $tool_name on $file_path.

Detected reference to SUPABASE_SERVICE_ROLE_KEY / sb_secret_* / service_role
in a client-reachable path. The service-role key bypasses RLS and must
never reach the browser bundle.

Move the call to one of:
  - supabase/functions/<name>/index.ts (Deno edge function)
  - lib/supabase/server.ts (server-only client; mark file 'server-only')
  - a *.server.ts module imported only from RSC / Route Handlers / Actions

If this file is legitimately server-only, either:
  - rename it to *.server.ts, or
  - move it under lib/server/, or
  - add a top-line "import 'server-only'" and move under lib/supabase/.
EOF
    exit 2
    ;;
esac

exit 0
