# ADR-0017 — Observability stack: langfuse-vercel, @vercel/otel, @sentry/nextjs

Date: 2026-05-29
Status: Accepted
Deciders: @BhodiSea

## Context

Phase 7 adds an anomaly-detection and escalation pipeline. Every Anthropic call
already writes to `audit.llm_traces` (source of truth), but there is no
interactive query layer for prompt debugging, latency histograms, or cost
attribution by run. There is also no error-monitoring harness, so production
regressions surface only through Inngest function failures or user reports.

The project already shells out to `@opentelemetry/api` (transitively via
Inngest), so adding a full OTel SDK completes the trace context rather than
introducing a new observability paradigm.

## Decision

Add three new `apps/web` dependencies:

- **`langfuse-vercel`** — Langfuse OTel exporter for Vercel. Wires into the
  Next.js OTel `registerOTel` hook in `instrumentation.ts` via a
  `LangfuseExporter` `SpanProcessor`. Sends traces to a self-hosted Langfuse
  instance (configured in `infra/docker-compose.langfuse.yml`). The exporter
  is a no-op when `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` are unset, so
  dev / CI / test are unaffected.

- **`@vercel/otel`** — Vercel's first-party OTel SDK wrapper. Registers the
  `NodeTracerProvider` and wires Vercel's request-level spans with custom
  exporters. Preferred over the raw `@opentelemetry/sdk-trace-node` because it
  handles the Vercel/Next.js instrumentation lifecycle automatically.

- **`@sentry/nextjs`** — Sentry error monitoring with Next.js App Router
  support. Initialised in `instrumentation.ts` via `Sentry.init()`. Acts as a
  complementary sink for unhandled exceptions and slow transactions alongside
  Langfuse. No-op when `SENTRY_DSN` is absent.

### Architecture

`audit.llm_traces` remains the authoritative record (written transactionally
with each extraction). Langfuse is the interactive query layer (trace search,
latency charts, cost breakdown). Sentry is the error-monitoring layer.
The two are wired as separate `SpanProcessor` exporters — neither is a
dependency of the other.

## Consequences

- **+** Interactive trace search and cost debugging without custom SQL queries.
- **+** Unhandled exceptions surface in Sentry before users report them.
- **+** `langfuse-vercel` integrates with `@vercel/otel` via standard OTel
  interfaces; swapping to another exporter is one-line.
- **−** Three new supply-chain entries. `@sentry/nextjs` is large (~200 kB
  server-only). `langfuse-vercel` is small (~15 kB).
- **−** Self-hosted Langfuse VM must be provisioned separately (out of scope
  for Phase 7; `docker-compose.langfuse.yml` committed as a starting point).
- **−** `LANGFUSE_*` and `SENTRY_DSN` env vars must be populated in production;
  both are optional and validated at startup by `@t3-oss/env-nextjs`.
