# ADR-0019 — Upstash Redis for per-IP / per-org rate limiting

Date: 2026-05-30  
Status: Accepted  
Deciders: Thomas Nicklin

## Context

Phase 7 adds layered rate limiting:

- **L1 (Vercel WAF)** — coarse-grained token-bucket and fixed-window rules on `/api/mvt/*`, `/api/inngest`, `/auth/*`, and `/outbreaks/*`. WAF counters are per-region; no cross-region coordination.
- **L2 (application)** — per-IP / per-org sliding-window and token-bucket rules that the WAF cannot express. Required for the MVT tile burst pattern (pan/zoom) and general API protection.

Options evaluated for L2:

| Option | Notes |
|--------|-------|
| **Upstash Redis + `@upstash/ratelimit`** | Serverless-native, HTTP-based Redis with atomic `EVALSHA`; supports sliding window and token bucket. Zero persistent connections (safe for Fluid Compute). |
| Vercel KV | Deprecated; replaced by Marketplace integrations. |
| In-process `p-throttle` | Does not coordinate across concurrent function instances (AGENTS.md anti-pattern). |
| Redis via `ioredis` | Requires persistent TCP connection; not safe for Fluid Compute cold-start semantics. |

## Decision

Use `@upstash/ratelimit` + `@upstash/redis` in `apps/web/proxy.ts`.

- **General API**: sliding window 120 req / 60 s (smooth burst distribution).
- **MVT tiles** (`/api/mvt/*`): token bucket 300 tokens / 60 s with burst 20 (allows a rapid pan-sequence of ~20 tiles without triggering 429s).
- **No-op when `UPSTASH_REDIS_REST_URL` is unset** — dev, CI, and test environments pass through without rate-limit calls.
- Rate-limit runs on CDN-miss paths only; cached tile hits bypass `proxy.ts`.

## Consequences

- Adds two new dependencies: `@upstash/ratelimit` and `@upstash/redis`.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` must be provisioned (Upstash free tier is sufficient at current traffic levels).
- Per-region counter semantics: Upstash REST API is a single global store, unlike the WAF L1 counters. Provides true cross-region rate limiting.
- 429 responses include `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.
