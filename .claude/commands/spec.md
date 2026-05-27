---
argument-hint: <feature-slug>
description: Author or read a product spec under .claude/specs/. Plan mode only — no code is written.
allowed-tools: Read, Write, Glob, Grep, Bash(git status:*), Bash(git log:*)
---

You are entering **spec mode** for `$ARGUMENTS`. Do NOT write any application
code in this turn.

## Steps

1. Read `.claude/specs/_template.md` first.
2. If `.claude/specs/$ARGUMENTS.md` already exists:
   - Summarize it in 5–10 lines.
   - Ask the user what to clarify, expand, or change.
   - Do NOT silently rewrite an existing spec — propose a diff.
3. Otherwise, create `.claude/specs/$ARGUMENTS.md` from the template and fill
   it out by asking the user (one batched set of questions via AskUserQuestion
   where possible) about the following:

   1. **Mission.** What problem does this solve, for whom, and what is
      explicitly NOT in scope?
   2. **Sources & data.** Which WHO / AFRO / Africa CDC / ECDC / ReliefWeb /
      ACLED / Pathoplexus feeds does this need? Existing or new?
   3. **UI surface.** Which routes? What does each rendered figure look like?
      Confirm that every figure will have a `source_quote_id` prop.
   4. **Data model.** New tables / columns / views? RLS implications? List
      every column that would be referenced in an RLS USING/WITH CHECK clause
      (those must be indexed).
   5. **Extraction.** Does this need a new prompt + zod schema + Anthropic
      tool? How many gold-set entries (≥ 3)?
   6. **Acceptance criteria.** Concrete, measurable: row counts, pgTAP RLS
      tests, screenshot diff thresholds, F1 against gold.
   7. **Non-goals.** What this feature does NOT do.
   8. **Open questions.** Anything you couldn't resolve.

4. Stop after writing the spec. Suggest `/plan $ARGUMENTS` as the next step.

## Rules

- Do not invent acceptance criteria the user hasn't agreed to.
- Do not promise extraction quality numbers without justifying them.
- If the user's request touches PHI, refuse and explain why (AGENTS.md rule #1).
- If you can't fill a section, leave a `TODO(@user):` marker rather than guessing.
