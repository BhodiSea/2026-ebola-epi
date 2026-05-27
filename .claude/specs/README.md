# `.claude/specs/`

Human-authored product specs. One markdown file per feature, named
`<kebab-slug>.md`. Use `_template.md` as the starting point.

A spec answers **what** and **why**, not **how**. It lives here so Claude
can read it via `/spec <slug>` and so future you remembers the original
intent when revisiting a feature.

## What goes here

- New user-facing features
- New data sources or ingestion pipelines
- New extraction surfaces (prompts + tools + schemas)
- Non-trivial UX changes
- Anything that requires an `/plan` before code

## What does NOT go here

- Bug fixes (just fix them; one-liner in the commit message is enough)
- Refactors with no behavior change
- Dependency bumps
- Architecture decisions (those go in `docs/adr/` in MADR 4.0 format)

## Lifecycle

1. `/spec <slug>` — author or read a spec. Plan mode only.
2. Human review (read it, edit it, sign off).
3. `/plan <slug>` — write the technical plan in `.claude/plans/`.
4. `/tdd <slug>` — implement, red → green → refactor.
5. `/ship` — preflight + push + PR.
6. Once shipped, update the spec's `Status:` to `implemented`. Do NOT
   delete it — the spec is the project's memory of intent.

Specs are append-only-in-spirit: if scope changes substantially, write a
follow-up spec rather than rewriting history.
