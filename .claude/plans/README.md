# `.claude/plans/`

Technical plans authored by Claude (typically via `/plan <slug>`) from a
matching `.claude/specs/<slug>.md`. One markdown file per feature.

A plan answers **how**: the design, the migrations, the TDD order, the
verification commands. It is the agreed-upon implementation roadmap before
any code is written.

## Lifecycle

1. The matching spec exists in `.claude/specs/<slug>.md`.
2. `/plan <slug>` writes this plan.
3. Human review (read the plan, push back, request changes).
4. `/tdd <slug>` executes the plan red → green → refactor.
5. `/ship` runs preflight, pushes, opens a draft PR.
6. Mark `Status:` `executed`. Do not delete the plan — it documents the
   actual chosen approach for posterity.

## Hard rules

- No plan without a spec.
- No implementation before a plan.
- Plans are grounded in real code paths — Claude reads the relevant files
  before writing the plan, and references functions to reuse by `path:line`.
- Plans include a verification block describing how to test end-to-end.

If you find yourself "just doing it" without a plan, you have outgrown the
process for that change OR you should be writing a plan. Usually the
latter.
