# ADR-0016 — Edge Config kill-switch dependencies: @vercel/edge-config and @slack/webhook

Date: 2026-05-29
Status: Accepted
Deciders: @BhodiSea

## Context

Phase 7 adds a cost kill-switch that must propagate globally within ~10 seconds
when the daily Anthropic spend cap is exceeded. The switch reads a boolean from
Vercel Edge Config, which is replicated to Vercel's edge network and readable
with sub-millisecond latency. Slack notifications are needed when the switch
fires and for anomaly class-4 alerts.

## Decision

Add two new top-level dependencies to `apps/web`:

- **`@vercel/edge-config`** — official Vercel SDK for reading Edge Config values.
  Used by `apps/web/lib/kill-switch.ts` (`get("extraction_enabled")`,
  `get("extraction_spend_ratio")`). The alternative (a raw `fetch` to the
  Edge Config REST API) would add ~100 ms of network latency per request vs
  the SDK's in-process read from Vercel's edge cache.

- **`@slack/webhook`** — official Slack incoming-webhook client. Used by
  `apps/web/lib/notify.ts`. The alternative (raw `fetch`) would require
  manually constructing and validating the Slack payload envelope. The
  official SDK handles retry, error messaging, and typing at negligible bundle
  cost.

Both integrations no-op safely when their environment variables (`EDGE_CONFIG`,
`SLACK_WEBHOOK_URL`) are absent, so dev / CI / test environments are unaffected.

## Consequences

- **+** Global kill-switch propagates within ~10 s (Edge Config SLA).
- **+** Slack alerts reach on-call immediately on cap breach and anomaly events.
- **−** Two new supply-chain entries. Risk is low: both are first-party
  (Vercel) or maintained by Slack/Salesforce with strong release cadences.
- **−** `EDGE_CONFIG` connection string must be kept in Vercel env and never
  committed. Documented in `.env.example` and the trigger migration header.
- The Edge Config cap is a circuit breaker, not a budget-precise limiter.
  Updates take up to 10 s to propagate globally; fine-grained enforcement is
  handled by Inngest concurrency and priority controls (deferred to a follow-up).
