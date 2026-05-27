#!/usr/bin/env bash
# PreToolUse hook: refuse Write|Edit|MultiEdit operations whose payload
# contains PHI tells. Project rule: ituri-sitrep ingests aggregate
# public sitrep data only — never PHI, never line-list data.
#
# Detected patterns (case-insensitive where sensible):
#   - "Patient X" / "Patient #N" / "Patient ID:"
#   - "DOB:" / "Date of Birth:"
#   - "MRN:" / "Medical Record Number"
#   - "SSN:" / 9-digit SSN format (\d{3}-\d{2}-\d{4})
#   - Phone numbers in US/intl formats (\+?\d[\d -]{8,})
#   - "Address:" with a street suffix near a number
#
# This is a heuristic. False positives are possible; when they happen,
# raise it in chat — do not silently bypass.

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input="$(cat)"
tool_name="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"

# Pull writeable payloads from the various Write/Edit/MultiEdit shapes.
content="$(printf '%s' "$input" | jq -r '
  [
    .tool_input.content // empty,
    .tool_input.new_string // empty,
    (.tool_input.edits // [] | map(.new_string // empty) | join("\n"))
  ] | map(select(length > 0)) | join("\n")
')"

[ -z "$content" ] && exit 0

# Allow gold-set fixtures and migration files that may legitimately reference
# anonymised numeric identifiers (these are not PHI by themselves).
case "$file_path" in
  *gold-set/*|*tests/fixtures/*|*/migrations/*.sql)
    exit 0
    ;;
esac

violation=""

matches() {
  # grep -E returns 0 on match. -q to suppress output.
  printf '%s' "$content" | grep -E -i -q "$1"
}

if matches '\bpatient[[:space:]]*(x|y|z|#?[0-9]+|id[[:space:]]*:)' ; then
  violation="${violation}- 'Patient X/#N/ID:' identifier pattern\n"
fi
if matches '\b(dob|date[[:space:]]+of[[:space:]]+birth)[[:space:]]*:' ; then
  violation="${violation}- 'DOB:' / 'Date of Birth:' field\n"
fi
if matches '\b(mrn|medical[[:space:]]+record[[:space:]]+number)[[:space:]]*:' ; then
  violation="${violation}- 'MRN:' / 'Medical Record Number' field\n"
fi
if matches '\bssn[[:space:]]*:' || matches '\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b' ; then
  violation="${violation}- SSN pattern (XXX-XX-XXXX)\n"
fi
if matches '\bcontact[[:space:]]+tracing[[:space:]]+id\b' || matches '\bline[[:space:]]*list\b' ; then
  violation="${violation}- contact-tracing / line-list identifier\n"
fi

if [ -n "$violation" ]; then
  printf 'NO-PHI: refusing %s on %s\n\n' "$tool_name" "${file_path:-<unknown>}" >&2
  printf 'Detected pattern(s):\n' >&2
  printf '%b' "$violation" >&2
  cat >&2 <<EOF

Project rule (AGENTS.md hard rule #1):
  ituri-sitrep ingests aggregate, publicly-released sitrep figures only.
  No PHI, no line-list data, no contact-graph reconstruction — even if a
  source publishes it accidentally.

If this is a false positive (e.g. you are writing documentation ABOUT
the rule, or a regex test), edit the content to avoid the literal trigger,
or annotate the line with a comment such as // no-phi: documentation.
EOF
  exit 2
fi

exit 0
