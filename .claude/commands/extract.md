---
argument-hint: <extract-slug>
description: Scaffold a new LLM extraction — zod schema, Anthropic tool, prompt with cache breakpoint, runner, gold set, tests.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm eval:*), Bash(pnpm test:*)
---

Scaffold a new extraction pipeline for `$ARGUMENTS`.

## Read first

- `.claude/references/prompt-caching.md`
- `.claude/references/anti-patterns.md`
- Any existing schema in `packages/extract/src/schemas/` (when the package
  lands) as a stylistic reference.

## Files to create (target monorepo paths; map to current layout if pre-migration)

1. **`packages/extract/src/schemas/$ARGUMENTS.ts`** — single source of truth.
   ```ts
   import { z } from 'zod';
   export const $ARGUMENTSExtract = z.object({
     // … fields …
     source_quote_id: z.string().uuid().brand<'SourceQuoteId'>(),
     char_start: z.number().int().nonnegative(),
     char_end: z.number().int().nonnegative(),
   }).strict();
   export type $ARGUMENTSExtract = z.infer<typeof $ARGUMENTSExtract>;
   ```

2. **`packages/extract/src/tools/$ARGUMENTS.ts`** — derive the Anthropic tool.
   ```ts
   import { zodToJsonSchema } from 'zod-to-json-schema';
   import type Anthropic from '@anthropic-ai/sdk';
   import { $ARGUMENTSExtract } from '../schemas/$ARGUMENTS';
   export const $ARGUMENTSTool: Anthropic.Tool = {
     name: 'record_$ARGUMENTS',
     description: '…',
     input_schema: zodToJsonSchema($ARGUMENTSExtract, { target: 'jsonSchema7' }) as Anthropic.ToolInputSchema,
   };
   ```
   **Never** hand-write the JSON Schema. **Never** `JSON.stringify` a zod
   schema into a prompt.

3. **`packages/extract/src/prompts/$ARGUMENTS.ts`** — system + few-shot block.
   Place `cache_control: { type: 'ephemeral' }` on the **last** few-shot
   block, not on the user message. Order: `tools → system → messages`.

4. **`packages/extract/src/runners/$ARGUMENTS.ts`** — `runExtract$ARGUMENTS(sitrepId)`:
   - Compute `prompt_version_hash = sha256(SYSTEM + FEW_SHOT + JSON.stringify(tool))`.
   - INSERT an `extraction_runs` row BEFORE the API call (model id, prompt
     hash, sitrep id, started_at).
   - Call `anthropic.messages.create({ … cache_control … tool_choice: { type: 'tool', name: 'record_$ARGUMENTS' } })`.
   - Parse the `tool_use` block, **re-validate with the zod schema**, reject
     on failure.
   - For each fact: verify `text.substring(char_start, char_end)` matches
     the LLM-claimed span (Levenshtein ≤ 5 chars) via the
     `source-quote-extractor` skill. Reject if not.
   - INSERT extracted facts, each stamped with `extraction_run_id` and
     `source_quote_id`.
   - UPDATE the run row with `usage` (cache_read_input_tokens,
     cache_creation_input_tokens, output_tokens) and `finished_at`.

5. **`packages/extract/tests/gold-set/$ARGUMENTS/*.json`** — ≥ 3 ground-truth
   examples covering at minimum: happy path, ambiguous date format, missing
   field (LLM should fail validation gracefully).

6. **`packages/extract/tests/$ARGUMENTS.test.ts`** — Vitest cases:
   - schema roundtrip
   - tool schema validity (`zodToJsonSchema` produces JSON Schema 7)
   - gold-set assertions (F1 ≥ baseline)
   - rejects when LLM returns invalid span

## Forbidden

- Inline-stringing the JSON Schema.
- Calling Anthropic from anywhere other than a runner module.
- Omitting `prompt_version_hash` on the `extraction_runs` row.
- Trusting `tool_use.input` without re-validating with the zod schema.
- Returning a fact row without a verified `source_quote_id`.

## Finish

Run:
```bash
pnpm eval -- --extract $ARGUMENTS
```
Report F1, precision, recall vs the baseline in the gold-set log. If F1
drops > 2 points, delegate to `@extraction-engineer` before merging.
