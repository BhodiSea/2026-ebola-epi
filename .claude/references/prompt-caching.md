# Anthropic prompt caching

The single highest-ROI optimisation in the extraction pipeline. Per
Anthropic's official pricing docs: cache reads cost **0.1×** the standard
input price (90% discount), 5-minute cache writes cost **1.25×** base
input, 1-hour cache writes cost **2×**. Caching pays off after one cache
read for the 5-min duration, or two cache reads for the 1-hour duration.

## Order matters

The cached prefix is **everything before the `cache_control` breakpoint**.
The breakpoint can sit on the last block in any of these (in this order):

1. `tools` — fields are part of the cache key
2. `system` — array of blocks
3. `messages[].content` — array of blocks

Cache the longest, most stable prefix. For extraction the order is:

```
tools → system → messages
```

with `cache_control: { type: 'ephemeral' }` on the **last** block of
either `tools`, `system`, or the static portion of `messages`. Usually the
last few-shot example.

## Canonical wiring for extraction

```ts
import Anthropic from '@anthropic-ai/sdk';

const msg = await anthropic.messages.create({
  model: 'claude-opus-4-7',
  max_tokens: 4096,
  tools: [outbreakTool],
  tool_choice: { type: 'tool', name: 'record_outbreak' },
  system: [
    { type: 'text', text: SYSTEM_PROMPT },
    {
      type: 'text',
      text: FEW_SHOT_EXAMPLES,
      cache_control: { type: 'ephemeral' }, // ← cache up to here
    },
  ],
  messages: [{ role: 'user', content: sitrepText }], // varies per call
});
```

- Cache breakpoint on the **last few-shot block** in `system`.
- The user message varies per call — DO NOT put `cache_control` there.
- One breakpoint is usually enough. Anthropic auto-detects the longest
  cached prefix; manual breakpoints further down become redundant.

## Cache lanes (invalidators to fear)

Each of these spawns a NEW cache; the next call writes (1.25× / 2× cost)
instead of reads (0.1× cost):

- Changing any field of `tools` (schema, description, name).
- Changing the model (Opus 4.7 ↔ Sonnet 4.6 = separate cache lanes).
- Reordering tools.
- Adding / removing images anywhere in the prefix.
- Changing `tool_choice` shape.
- Changing the `system` prefix even by one character.

When you intentionally change the prompt or tool, expect the next call to
be expensive — that's normal.

## Minimum token thresholds (model-specific)

Per Anthropic's docs (May 2026):

- Claude 3.7 Sonnet: ≥ 1,024 tokens per cache checkpoint.
- Claude 4.5 / 4.6 Opus, 4.5 / 4.6 Sonnet, 4.5 Haiku: ≥ 4,096 tokens.

Short prompts won't cache regardless of `cache_control`. Build prompts to
always include the source document inline; never split a document across
requests.

## Usage reporting

After the call:

```ts
const { usage } = msg;
// usage.cache_read_input_tokens      ← reads (0.1× cost)
// usage.cache_creation_input_tokens  ← writes (1.25× or 2× cost)
// usage.input_tokens                 ← uncached input (1× cost)
// usage.output_tokens                ← always uncached
```

Store these on every `extraction_runs` row. Compute the cache-read ratio
as `cache_read / (cache_read + cache_creation + input)`. After the first
warm call you should see > 0.7.

If the ratio is consistently low:

1. The prefix is changing — check for accidental nondeterminism in the
   prompt assembly (timestamps, ids, ordering of items).
2. The cache TTL (5 min default) expired — bump `prompt_version_hash`
   stability or move to 1-hour caching for slow pipelines.

## 5-min vs 1-hour

- **5-min ephemeral** (default): refreshes on every read within the
  window. Right for tight extraction loops.
- **1-hour ephemeral**: explicit opt-in (`{ type: 'ephemeral', ttl: '1h' }`),
  costs 2× to write, so amortises after two reads in the hour. Right for
  daily / hourly batch jobs.

## prompt_version_hash

Every `extraction_runs` row stores

```ts
prompt_version_hash = sha256(SYSTEM + FEW_SHOT + JSON.stringify(tool))
```

so that:

- you can answer "did this extraction use the same prompt as last week's?"
- you can detect cache lane changes in observability.
- re-running v3.2 against v3.2 inputs is byte-identical (with `temperature: 0`).

Bump the hash automatically — don't rely on manual versioning.

## Forbidden

- `cache_control` on the user message.
- Including the user message in the cached prefix (it changes per call).
- Inline-stringing a JSON Schema into the prompt to "make it part of the cache."
- Skipping the `usage.cache_*` capture on the run row.
- Adding a `Date.now()` or random id to the prompt for "freshness."
