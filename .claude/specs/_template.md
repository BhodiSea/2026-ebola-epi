# Spec: <feature-name>

**Status:** draft | reviewed | implemented
**Owner:** <you>
**Date:** YYYY-MM-DD
**Plan:** `.claude/plans/<feature-name>.md` (once written)

## Mission

One paragraph. What problem does this solve? For whom? What does success
look like?

## Sources & data

Which feeds (WHO DON, WHO AFRO, Africa CDC, ECDC, ReliefWeb, ACLED, HDX,
Pathoplexus, Nextstrain)? Existing tables/columns, or new?

## UI surface

Which routes? What does each component look like? Wireframes / screenshots
where useful. **Every rendered figure must have a `source_quote_id` prop.**

## Data model

New tables, columns, views, or RLS policies. List every column that would
be referenced in a USING/WITH CHECK clause (each must be indexed).

## Extraction

Does this require a new prompt / zod schema / Anthropic tool? How many
gold-set entries (≥ 3 covering happy path, ambiguity, missing field)?
What is the F1 target vs the current baseline?

## Acceptance criteria

Concrete and measurable. Examples:

- ≥ 95 % of WHO-AFRO admin-1 polygons render.
- pgTAP RLS suite for `<table>` is green.
- Playwright smoke test: load map, click zone, hover figure → source quote
  visible within 200 ms.
- Gold-set F1 for `<extract-slug>` ≥ 0.85.
- p95 query time on the new view < 25 ms on 10k rows.

## Non-goals

What this feature does NOT do. (Future Thomas will thank present Thomas.)

## Risks

Anything that could derail the work. Data-licensing, source instability,
LLM cost, etc.

## Open questions

Anything you couldn't resolve. Mark each with `TODO(@<owner>)`.
