# ADR-0023: Use Vercel AI SDK for source-quote embedding generation

Date: 2026-06-22  
Status: Accepted  
Deciders: @BhodiSea

## Context

`public.source_quotes.embedding` is a `vector(1024)` column with an HNSW
cosine-distance index. All 70 rows currently have `NULL` embeddings, making the
HNSW index unused and semantic search impossible. We need an embedding
generation pipeline that:

- Produces 1024-dimensional normalized vectors (matches existing HNSW index)
- Runs server-side only (inside an Inngest step, never in the browser)
- Is provider-swappable — the project already has a dependency on Anthropic;
  we want to avoid hard-coding a second LLM vendor at the call-site level

## Decision

Add `ai` (Vercel AI Core SDK) and `@ai-sdk/openai` to `@ituri/web`.

- **Model**: `openai/text-embedding-3-small` with `dimensions: 1024`
  (OpenAI supports configurable output dimensions since the 3rd-gen models)
- **Call-site**: `embedMany({ model, values })` from `ai` — one call per batch
  of up to 100 quotes
- **Orchestrator**: new Inngest function `backfill-embeddings` (batches of 100,
  idempotent via `ON CONFLICT DO NOTHING`)
- **Env var**: `OPENAI_API_KEY` added to `apps/web/lib/env.ts` as
  `z.string().optional()` (optional so the function can check at runtime and
  write an `agent_actions` row instead of crashing at boot)
- **Swap path**: changing provider requires only replacing `@ai-sdk/openai`
  with another AI SDK provider adapter (e.g., `@ai-sdk/voyage` when Voyage
  becomes first-class in the AI SDK); the `embedMany` call-site is unchanged

## Alternatives considered

| Option | Why rejected |
|---|---|
| `voyageai` npm package (voyage-3, 1024 dims native) | Not an AI SDK adapter; ties the call-site to Voyage-specific types. Requires a separate `VOYAGE_API_KEY`. |
| Direct Anthropic API (Voyage via Anthropic) | No first-party embedding endpoint in `@anthropic-ai/sdk` as of this decision; would require raw HTTP calls and manual schema validation. |
| Supabase pgvector `pgembedding` extension | Runs embedding inside Postgres; limits model choice and observability; incompatible with Inngest step memoization. |

## Rate-limit & politeness (AGENTS.md Rule 15)

Rule 15 mandates Inngest `throttle` with `scope: "account"` for all outbound HTTP
calls, keyed per host. This rule targets courtesy-throttled public sites (WHO DON,
ReliefWeb, ACLED) where parallel scraping violates terms of service.

OpenAI's Embeddings API is a commercial endpoint: requests are authenticated,
rate-limited server-side by tier, and explicitly designed for programmatic bulk
use. No per-host courtesy throttle is required or appropriate. Inngest `retries: 2`
already handles `429 Too Many Requests` responses from the OpenAI tier limits.

## Consequences

- **Positive**: `embedMany` is provider-agnostic; swapping models is one-line.
- **Positive**: Vercel AI Gateway can intercept the call in production for
  observability and model fallback without changing application code.
- **Positive**: `ai` is already the de-facto standard for Next.js AI features;
  no novel dependency pattern.
- **Negative**: Adds `OPENAI_API_KEY` as a new secret to manage. Clearly
  documented in `.env.example` and `env.ts`.
- **Neutral**: `ai` and `@ai-sdk/openai` are added to `apps/web` only; not
  a monorepo-root or `packages/*` dep.
