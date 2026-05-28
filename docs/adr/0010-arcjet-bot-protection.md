# ADR 0010 — Adopt @arcjet/next for bot and attack protection on evidence permalinks

Date: 2026-05-28
Status: Accepted
Deciders: Thomas Nicklin

## Context

`/evidence/[quote-id]` is a public, search-engine-indexed permalink for every
`source_quotes` row. Phase 3 makes this route available without authentication
(public allowlist in `proxy.ts`). Without protection:

- Scrapers can bulk-harvest all extracted quote data via sequential UUID
  enumeration, bypassing the spirit of `display_only` licensing rules.
- OWASP-class attacks (SQLi probes, path traversal, forced-browsing) can target
  the route handler.
- Aggressive crawlers can inflate Supabase request counts and LLM extraction
  costs if combined with future client-side fetch patterns.

Search engines (Google, Bing) must remain able to index the permalink for SEO
(Phase 8 E-E-A-T target). An allowlist for `CATEGORY:SEARCH_ENGINE` is required.

## Decision

Install `@arcjet/next` in `apps/web` and create `apps/web/lib/arcjet.ts` that
exports a single configured client:

```ts
import arcjet, { shield, detectBot } from "@arcjet/next";

export const aj = arcjet({
  key: env.ARCJET_KEY,
  rules: [
    shield({ mode: process.env.NODE_ENV === "test" ? "DRY_RUN" : "LIVE" }),
    detectBot({ mode: process.env.NODE_ENV === "test" ? "DRY_RUN" : "LIVE", allow: ["CATEGORY:SEARCH_ENGINE"] }),
  ],
});
```

`ARCJET_KEY` is added to `lib/env.ts` (server-side, validated by zod).

The `/evidence/[quote-id]` page calls `await aj.protect(req)` at the top before
any database access, returning 403/429 on denial via `notFound()` or a redirect.

Other routes are NOT protected in Phase 3. Rate-limiting and adaptive protection
across authenticated routes is scoped to Phase 8.

`mode: "DRY_RUN"` is used when `NODE_ENV === "test"` so Playwright E2E runs do
not call Arcjet's cloud decision service, avoiding test flakiness and
inadvertent API quota consumption.

## Consequences

- **Security**: OWASP-class attacks and non-search-engine bots are blocked in
  production on the highest-risk public route.
- **SEO preserved**: `CATEGORY:SEARCH_ENGINE` allow-rule ensures Googlebot and
  Bingbot are not blocked.
- **Cost**: Arcjet free tier covers the expected request volume; no budget impact
  in Phase 3.
- **New dependency**: `@arcjet/next` is added to `apps/web` production
  dependencies. No ADR conflict — this is a new top-level dep per Rule 11.
- **Test isolation**: `DRY_RUN` mode in test prevents Playwright from making real
  Arcjet API calls. The E2E assertion tests the route response, not Arcjet's
  decision.
- **Future**: Phase 8 may extend protection to other routes. The singleton
  `lib/arcjet.ts` export is the add point.
