# Phase 2 — Orchestration spine + first end-to-end extract

## Goal

Wire Inngest as the durable orchestration spine, install the Anthropic SDK with explicit `cache_control` breakpoints, build the `packages/extract/` package with zod-derived tool schemas, implement the WHO DON source adapter, and run one real WHO DON document through the complete pipeline: fetch → parse → store → extract → substring-verify (in code and in DB) → write `case_counts` + `source_quotes` + `extraction_runs` in a single transaction. OTel spans go to `audit.llm_traces` (Postgres table, not Langfuse yet). At the end of this phase, a single document round-trip proves every provenance invariant holds end-to-end.

---

## Entry preconditions

- Phase 1 exit gate met: pgTAP green, types in sync, substring-verify trigger rejects bad inserts.
- Anthropic organization-level monthly spend cap set: $50 for development, $200 for staging. The kill switch in Phase 7 is defense in depth — the org cap is the primary guard against runaway spend during development.
- Vercel preview + Supabase Branching wired (Phase 0).
- `ANTHROPIC_API_KEY` available in `.env.local` (gitignored) and in Vercel env (Preview + Production, secret).
- `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` available (from Inngest dashboard).

---

## Deliverables

### Schema / migrations

**`supabase/migrations/<timestamp>_audit_llm_traces.sql`** — OTel span table for Phase 2 traces. Langfuse lands in Phase 7; until then, spans go here:

```sql
begin;
create table if not exists audit.llm_traces (
  id uuid primary key default gen_random_uuid(),
  extraction_run_id uuid references audit.extraction_runs(id),
  trace_id text not null,
  span_id text not null,
  parent_span_id text,
  name text not null,
  agent_name text,
  model_id text,
  prompt_version_hash text,
  cache_read_input_tokens integer,
  cache_creation_input_tokens integer,
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  attributes jsonb not null default '{}'::jsonb
);
create index llm_traces_trace_id_idx on audit.llm_traces (trace_id);
create index llm_traces_started_at_idx on audit.llm_traces (started_at desc);
-- append-only
revoke update, delete on audit.llm_traces from authenticated, anon;
commit;
```

**`supabase/migrations/<timestamp>_pg_cron_synthetic_monitor.sql`** — synthetic monitor job (skeleton; the function it calls is wired in Phase 2 code):

```sql
begin;
select cron.schedule(
  'synthetic-monitor',
  '0 6 * * *',
  $$ select net.http_post(
       url := current_setting('app.inngest_event_endpoint'),
       body := '{"name":"synthetic.check","data":{}}'::jsonb
     ) $$
);
commit;
```

**Required GUC setup** (run once per environment — local and production):
```sql
ALTER DATABASE postgres SET app.inngest_event_endpoint = 'https://inn.gs/e/<your-event-key>';
-- For local dev: 'http://localhost:8288/e/test-key'
```
Without this, `current_setting('app.inngest_event_endpoint')` returns an error and pg_cron silently fails.

### Code — `packages/extract/`

**`packages/extract/src/tools.ts`** — zod schema → Anthropic tool definition chain:

```ts
import { z } from "zod/v4";
import { zodToJsonSchema } from "zod-to-json-schema";

export const ExtractionRowSchema = z.object({
  pathogen_icd11: z.string().regex(/^[A-Z0-9.]+$/),
  country_iso3: z.string().length(3),
  admin1_name: z.string().optional(), // human-readable name; app code normalizes to admin1_code FK
  metric: z.enum(["cases","deaths","suspected","confirmed","probable","vaccinated","contacts"]),
  value: z.number().int().nonnegative(),
  as_of: z.string().date(),
  source_quote: z.object({
    char_start: z.number().int().nonnegative(),
    char_end: z.number().int().positive(),
    quote_text: z.string().min(5),
  }),
});

export const ExtractionBatchSchema = z.object({
  extractions: z.array(ExtractionRowSchema),
});

export const extractionTool = {
  name: "extract_case_counts",
  description: "Extract all epidemiological figures from this document as a structured array. Call once with all figures found.",
  input_schema: zodToJsonSchema(ExtractionBatchSchema),
} as const;
```

**Post-extraction app-level steps** (in the Inngest function, after `runExtraction`):
1. For each extracted row: look up or upsert `public.outbreaks` on `(pathogen_icd11, country_iso3, onset_date)` to get the `outbreak_id`. `onset_date` defaults to the document's `published_at` if no earlier onset is known. If `(pathogen_icd11, country_iso3)` is not in `outbreaks` AND triage marked it `novelty: "new"`, emit the escalation event instead of inserting.
2. Normalize `admin1_name` → `admin1_code` using a lookup against `geo.admin1 WHERE country_iso3 = $1 AND lower(name) = lower($2)`. If no match, set `admin1_code = NULL` (the FK is nullable). Log the unmatched name to `audit.agent_actions` for review.

**`packages/extract/src/prompt.ts`** — static prompt fragments with cache_control placement:

```ts
export const STATIC_INSTRUCTIONS = `You extract epidemiological case counts from outbreak situation reports.
Rules:
- Only extract figures explicitly stated in the document.
- char_start and char_end are zero-indexed character offsets of quote_text within the document.
- quote_text must be the verbatim substring at [char_start, char_end). No paraphrasing.
- Call extract_case_counts ONCE with ALL figures found as the extractions array.
- Each extraction must have pathogen_icd11, country_iso3, metric, value, as_of, and source_quote.
- If a figure is absent or ambiguous, do not include it.`;

export const FEW_SHOTS = `Example document: "As of 15 March 2026, 42 confirmed cases and 12 deaths have been reported."
Example call: extract_case_counts({ extractions: [
  { pathogen_icd11: "1D24.0", country_iso3: "COD", metric: "confirmed", value: 42, as_of: "2026-03-15",
    source_quote: { char_start: 21, char_end: 64, quote_text: "42 confirmed cases and 12 deaths" } },
  { pathogen_icd11: "1D24.0", country_iso3: "COD", metric: "deaths", value: 12, as_of: "2026-03-15",
    source_quote: { char_start: 21, char_end: 64, quote_text: "42 confirmed cases and 12 deaths" } }
]})`;
```

Cache breakpoint placement (per AGENTS.md and research/agent-automation.md §7):
- `cache_control: { type: "ephemeral" }` on the **last tool definition** (caches tools + system, 1h TTL).
- `cache_control: { type: "ephemeral" }` on the few-shots message block (5m TTL).

**`packages/extract/src/verify.ts`** — deterministic substring check (defense in depth alongside the DB trigger):

```ts
export function verifySubstring(
  documentText: string,
  quote: { char_start: number; char_end: number; quote_text: string },
): boolean {
  const actual = documentText.slice(quote.char_start, quote.char_end);
  return actual === quote.quote_text;
}
```

**`packages/extract/src/hash.ts`** — deterministic hash computation for provenance fingerprinting:

```ts
import { createHash } from "node:crypto";
import { STATIC_INSTRUCTIONS, FEW_SHOTS } from "./prompt";
import { extractionTool } from "./tools";

export function computePromptVersionHash(): string {
  return createHash("sha256")
    .update(STATIC_INSTRUCTIONS + FEW_SHOTS)
    .digest("hex")
    .slice(0, 16);
}

export function computeToolSchemaHash(): string {
  return createHash("sha256")
    .update(JSON.stringify(extractionTool.input_schema))
    .digest("hex")
    .slice(0, 16);
}
```

`prompt_version_hash` and `tool_schema_hash` are stamped on every `extraction_runs` row. Both are recomputed at runtime — if the prompt or tool schema changes, new runs get a new hash, making it possible to diff extractions before and after a prompt change.

**`packages/extract/src/run.ts`** — Anthropic extraction call via `@anthropic-ai/sdk` directly (not AI SDK Gateway — preserves `cache_control`):

```ts
import Anthropic from "@anthropic-ai/sdk";
import { extractionTool, ExtractionBatchSchema } from "./tools";
import { STATIC_INSTRUCTIONS, FEW_SHOTS } from "./prompt";
import { verifySubstring } from "./verify";
import { computePromptVersionHash } from "./hash";

export async function runExtraction(client: Anthropic, documentText: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: [{ ...extractionTool, cache_control: { type: "ephemeral" } }],
    system: STATIC_INSTRUCTIONS,
    messages: [
      { role: "user", content: [
        { type: "text", text: FEW_SHOTS, cache_control: { type: "ephemeral" } },
        { type: "text", text: `<document trust="untrusted">\n${documentText}\n</document>` },
      ]},
    ],
    tool_choice: { type: "tool", name: "extract_case_counts" },
  });

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("no tool_use block");
  const { extractions } = ExtractionBatchSchema.parse(toolUse.input);

  for (const row of extractions) {
    if (!verifySubstring(documentText, row.source_quote)) {
      throw new Error(`substring_verify_fail: char_start=${row.source_quote.char_start}`);
    }
  }

  return {
    rows: extractions,
    promptVersionHash: computePromptVersionHash(),
    toolSchemaHash: computeToolSchemaHash(),
    usage: response.usage,
  };
}
```

### Code — `packages/ingest/`

**`packages/ingest/src/sources/who-don.ts`** — WHO DON RSS + HTML adapter:

```ts
import RSSParser from "rss-parser";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { createHash } from "node:crypto";

export async function pollWHODON() {
  const parser = new RSSParser();
  const feed = await parser.parseURL("https://www.who.int/feeds/entity/csr/don/en/rss.xml");
  return feed.items.map(item => ({
    url: item.link!,
    title: item.title ?? "",
    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    sourceSlug: "who-don",
  }));
}

export async function fetchAndParseDocument(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "ituri-sitrep/0.1 (+https://ituri-sitrep.example.org/about)" } });
  const html = await res.text();
  const sha256 = createHash("sha256").update(html).digest();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  return { html, sha256, fullText: article?.textContent ?? "", title: article?.title ?? "" };
}
```

**robots.txt compliance**: before any `fetch()` call, the adapter must check `robots.txt` for the source domain using `robots-parser`. WHO DON's robots.txt allows crawling of `/emergencies/disease-outbreak-news/`. Add `robots-parser` to Phase 2's tooling (even though Phase 6 re-lists it for new adapters, the pattern must be established in the base adapter).

### Code — `apps/web/`

**`apps/web/app/api/inngest/route.ts`** — Inngest serve handler:

```ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({ client: inngest, functions });
```

**`apps/web/inngest/client.ts`**:

```ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "ituri-sitrep" });
```

**`apps/web/inngest/functions/ingest-who-don.ts`** — the Phase 2 pipeline function:

```ts
import { createHash } from "node:crypto";

export const ingestWHODON = inngest.createFunction(
  { id: "ingest-who-don", retries: 4,
    concurrency: { limit: 2 } },
  // Note: do NOT use key: "event.data.source_slug" for cron-triggered functions —
  // cron events carry no data payload, so the key evaluates to undefined.
  { cron: "*/30 * * * *" },
  async ({ step }) => {
    const items = await step.run("poll-rss", () => pollWHODON());
    for (const item of items) {
      const stepId = createHash("sha256").update(item.url).digest("hex").slice(0, 16);
      await step.run(`process-${stepId}`, async () => {
        const { fullText, sha256, title } = await fetchAndParseDocument(item.url);
        // 1. Dedupe by sha256: if a documents row with this sha256 already exists, skip fetch
        // 2. Store html in Supabase Storage; insert public.documents row (sha256 unique index prevents duplicates)
        // 3. Idempotency check: if extraction_runs already has a row for (document_id, prompt_version_hash), skip extraction
        // 4. Run extraction (runExtraction)
        // 5. Verify all substrings in code (verifySubstring) — throw on first failure
        // 6. Write case_counts + source_quotes + extraction_runs in one transaction
        //    — if tx fails, the unique index on extraction_runs prevents re-extraction on retry
        // 7. Write OTel span to audit.llm_traces
      });
    }
  },
);
```

### `audit.llm_traces` OTel export

After each `runExtraction` call, write to `audit.llm_traces`:

```ts
await db.insert(auditLlmTraces).values({
  extractionRunId: extractionRunId, // FK to the extraction_runs row
  traceId: crypto.randomUUID(),
  spanId: crypto.randomUUID(),
  name: "extraction",
  agentName: "extract",
  modelId: "claude-sonnet-4-6",
  promptVersionHash,
  cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
});
```

---

## Tests

### Vitest

**`packages/extract/src/__tests__/verify.test.ts`** — unit tests for `verifySubstring`:
```ts
test("exact match passes", () => {
  expect(verifySubstring("hello world test", { char_start: 6, char_end: 11, quote_text: "world" })).toBe(true);
});
test("mismatch fails", () => {
  expect(verifySubstring("hello world test", { char_start: 6, char_end: 11, quote_text: "WRONG" })).toBe(false);
});
```

**`packages/extract/src/__tests__/tools.test.ts`** — asserts `zodToJsonSchema` produces a valid JSON Schema where the top-level has an `extractions` array, and each element has required `char_start`, `char_end`, `quote_text` in `source_quote`.

**`packages/ingest/src/__tests__/who-don.test.ts`** — mocks `fetch` and parses the fixture HTML to assert `fullText` is non-empty and `sha256` is 32 bytes.

### pgTAP

**`supabase/tests/004-extraction-runs-not-null.sql`** — asserts `extraction_runs.prompt_version_hash NOT NULL` constraint rejects a null insert.

**`supabase/tests/004b-extraction-runs-idempotency.sql`** — asserts the unique index on `(document_id, prompt_version_hash)` rejects a duplicate insert.

**`supabase/tests/005-llm-traces-append-only.sql`** — asserts `UPDATE` on `audit.llm_traces` is denied for `authenticated` role.

### Integration (manual, then automated in Phase 7)

After wiring:
1. Run `supabase start && pnpm inngest:dev`.
2. Trigger `ingest-who-don` manually from Inngest dashboard (or `npx inngest-cli@latest dev`).
3. Inspect the resulting `extraction_runs` row: `prompt_version_hash`, `tool_schema_hash` must be non-null; `cache_read_input_tokens` should be > 0 after the second invocation.

---

## Tooling

- Add `inngest`, `@anthropic-ai/sdk`, `undici`, `unpdf`, `@mozilla/readability`, `jsdom`, `rss-parser`, `zod-to-json-schema`, `robots-parser` to `apps/web/package.json` and `packages/extract/package.json` respectively.
- `.env.local` additions: `ANTHROPIC_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.
- `@t3-oss/env-nextjs` schema (in `apps/web/env.ts`) — add these three vars as `server` entries.
- `apps/web/package.json` scripts: `"inngest:dev": "npx inngest-cli@latest dev -u http://localhost:3000/api/inngest"`.

---

## Verification

```bash
# 1. Unit tests
pnpm --filter packages/extract test
# Expected: all green, including verify.test.ts.

# 2. pglast validates new migrations
pnpm pglast-validate supabase/migrations/
# Expected: all valid.

# 3. pgTAP green
supabase test db
# Expected: tests 001–005 all ok.

# 4. End-to-end (manual)
pnpm dev  # start Next.js
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
# In Inngest dashboard, send event: {"name": "ingest/who-don.poll", "data": {}}
# Expected: Inngest shows function completed successfully.
# Expected: SELECT * FROM public.extraction_runs LIMIT 1; returns a row with non-null prompt_version_hash.
# Expected: SELECT * FROM public.case_counts LIMIT 1; returns a row with non-null source_quote_id.
# Expected: manually verify: SELECT sq.quote_text, substring(d.full_text from sq.char_start+1 for sq.char_end-sq.char_start) FROM source_quotes sq JOIN documents d ON d.id = sq.document_id LIMIT 1;
# — the two columns must be identical.
```

If substring-verify fails during extraction: check that `@mozilla/readability` is not stripping content that the LLM is quoting. Use `full_text` not `article.content` (HTML-stripped).  
If cache tokens are always 0: verify `cache_control` is placed on the **last tool** and on the few-shots message block, not the dynamic document block.

---

## Exit gate

One real WHO DON document round-trips fetch → parse → extract → store → substring-verify, with all asserts passing; the resulting `extraction_runs` row records non-null `prompt_version_hash`, `tool_schema_hash`, and `cache_read_input_tokens > 0` on the second extraction of the same document.

---

## Research cross-references

- [agent-automation.md §1 — End-to-end pipeline DAG](../../research/agent-automation.md#1-the-end-to-end-autonomous-pipeline--dag)
- [agent-automation.md §7 — Extraction pipeline](../../research/agent-automation.md#7-extraction-pipeline--the-llm-core)
- [agent-automation.md §2 — Inngest choice](../../research/agent-automation.md#2-orchestration-framework-choice--picking-inngest)
- [backend.md §3 — Database access layer](../../research/backend.md#3-database-access-layer)
- [backend.md §4 — Ingestion plumbing](../../research/backend.md#4-ingestion-plumbing)
- [backend.md §8 — Observability infrastructure](../../research/backend.md#8-observability-infrastructure)
- [AGENTS.md hard rules 3, 4, 6, 7](../../AGENTS.md)

---

## Out of scope

- Triage Agent (Haiku 4.5 classification) — comes in Phase 6.
- Reconciliation Agent (Opus 4.7) — comes in Phase 6.
- Anomaly detection — comes in Phase 6.
- Multiple source adapters beyond WHO DON — comes in Phase 6.
- Langfuse self-hosted — comes in Phase 7. `audit.llm_traces` is the authoritative trace store until then.
- The cost kill switch (Edge Config + Postgres trigger) — comes in Phase 7.
- Slack escalation bot — comes in Phase 6.
- ProMED inbound email webhook — comes in Phase 6.
