# ADR-0022 — Vercel Sandbox + agent-browser for JS-rendered Africa CDC pages

Date: 2026-06-01
Status: Accepted
Deciders: Thomas Nicklin

## Context

Most Africa CDC outbreak posts render client-side via JavaScript. The
`africa-cdc` adapter's `fetch()` returns `{ skipped: true, reason:
"chromium_required" }` when the response body is below `MIN_READABLE_CHARS`
(a ~50-character SPA shell). Nothing in Workstream 1 acted on that signal,
so Africa CDC content was silently dropped from the ingest pipeline.

Two alternatives were considered:

| Option | Pros | Cons |
|--------|------|------|
| **Vercel Sandbox + agent-browser** | GA (Jan 2026), Node 24, AsyncDisposable cleanup, iad1 regional | $$/invocation; regional pin; requires kill-switch |
| Puppeteer in a self-hosted Docker container | No per-invocation cost | Ops overhead; no cold-start guarantee; out of scope for Vercel-only deploy |

Vercel Sandbox is already a project dependency (`@vercel/sandbox ^2.0.2`) and
fits the serverless deployment model.

## Decision

Add a `fetchJsRendered(url: string): Promise<string>` wrapper in
`apps/web/inngest/lib/fetch-with-sandbox.ts` that:

1. Creates a Sandbox with `runtime: "node24"`.
2. Runs `agent-browser --url <url> --output text`.
3. Returns `stdout()` — the rendered page text.
4. Cleans up via `await using` (TypeScript 5.9 explicit resource management,
   `AsyncDisposable` protocol).

The fallback is wired in `runPerSourceIngest` via a extracted helper
`runChromiumFallback`. It activates only when:

- `fetchResult.reason === "chromium_required"`, AND
- `chromiumFallbackEnabled()` returns `true` (Edge Config key
  `chromium_fallback_enabled`; safe default `false`).

### Kill-switch

`chromiumFallbackEnabled()` reads `chromium_fallback_enabled` from Vercel
Edge Config (`@vercel/edge-config`). Operators flip it to `true` in staging
after observing cost, then promote to production. Safe default is `false`
(disabled) when `EDGE_CONFIG` env var is absent (dev/CI).

### Daily cap

Inngest's function-scoped throttle does not coordinate across concurrent
function instances. To prevent runaway Sandbox spend, `runChromiumFallback`
queries `audit.agent_actions` for rows with `action =
"chromium_sandbox_invoked"` in the last 24 hours. When the count reaches
`CHROMIUM_DAILY_CAP = 5`, it logs `chromium_daily_cap_reached` and returns
`null` (skip). This is a single cross-function source of truth with no extra
infrastructure.

The cap of 5 is conservative for a Phase 2 rollout. It covers the typical
daily run cadence for Africa CDC (one to three new sitrep posts per week)
while bounding cost during initial deployment. Operators can raise the cap
by bumping the constant and redeploying.

### Regional constraint

Vercel Sandbox currently runs only in `iad1`. The Inngest function that calls
`fetchJsRendered` must be configured to route to `iad1` when Sandbox is
active. This is tracked as roadmap operational gap G2 and is not wired in
this workstream.

## Consequences

**Positive:**
- Africa CDC sitrep content enters the pipeline end-to-end.
- Kill-switch + daily cap bound cost risk in production.
- `await using` guarantees Sandbox cleanup on both success and error paths.
- `chromium_sandbox_invoked` and `chromium_daily_cap_reached` agent_actions
  rows provide an audit trail for spend analysis.

**Negative / mitigations:**
- Sandbox invocations add latency (~3–8 s per URL). Acceptable for a daily
  ingest cron; unacceptable for interactive use. Wiring is in the background
  ingest function only.
- `iad1` regional pin is undocumented in Vercel public docs as of this ADR.
  If Sandbox expands to additional regions, the pin can be removed.
- `CHROMIUM_DAILY_CAP = 5` is a constant, not an Edge Config value. Changing
  it requires a redeploy. This is intentional — the cap is a safety rail, not
  an operator knob.

## See also

- [ADR-0015](0015-unpdf-for-wasm-pdf-parsing.md) — `unpdf` for PDF ingestion (WS2 §2.1)
- [ADR-0020](0020-defer-priority-adapters-to-post-phase-9.md) — Tier-3 adapters deferred (WS2 §2.4)
- `apps/web/inngest/lib/fetch-with-sandbox.ts`
- `apps/web/lib/kill-switch.ts` — `chromiumFallbackEnabled()`
- `apps/web/inngest/lib/ingest-runner.ts` — `runChromiumFallback()`
