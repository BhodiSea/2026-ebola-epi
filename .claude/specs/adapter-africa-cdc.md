# Spec: adapter-africa-cdc

**Status:** reviewed
**Owner:** tnicklin@hawaii.edu
**Date:** 2026-05-30
**Plan:** `.claude/plans/please-verify-the-docs-v1-phase-0-to-8-a-keen-quiche.md`

## Mission

Ingest Africa CDC outbreak and sitrep content from their RSS feed and linked HTML pages. Provides a tier-1 African-continent primary epi source complementing WHO AFRO. Documents that require Chromium (JavaScript-rendered pages) are gracefully skipped in Phase 6.

## Sources & data

- **Feed URL:** `https://africacdc.org/news/` (RSS/Atom feed if available; fall back to HTML listing page scrape)
- **Entry URL pattern:** `https://africacdc.org/news/<slug>/`
- **Archetype (seed):** `rss_html`, `chromium_required_fallback: true`
- **Poll interval:** `0 8 * * *` (daily 08:00 UTC)
- **Throttle key:** `africacdc.org`
- **License tier:** `open`
- **Attribution required:** yes
- **Env vars required:** none

## Adapter shape

```ts
export const africaCDCAdapter: RegisteredAdapter = {
  sourceSlug: "africa-cdc",
  throttleKey: "africacdc.org",
  pollInterval: "0 8 * * *",
  poll()  // RSS parse → outbreak keyword filter, or skip on feed parse error
  fetch() // fetchWithConditionalGet; returns { skipped: true, reason: "chromium_required" } when
          //  res.headers.get("content-type") indicates JS-rendered SPA (no readable HTML body)
  parse() // Readability; returns { skipped: true, reason: "readability_parse_failed" } on null
}
```

## Skip conditions

| Condition | `skipped` | `reason` |
|---|---|---|
| `robots.txt` disallows | throws (per `fetchWithConditionalGet`) | — |
| HTTP 304 Not Modified | `true` | `"304 Not Modified"` |
| HTTP 429 | throws `RateLimitedError` | — |
| Readability returns null | `true` | `"readability_parse_failed"` |
| JS-rendered page (no article body) | `true` | `"chromium_required"` |

Detection for `chromium_required`: after Readability parse, if `article.textContent.trim().length < 200` treat as a JS-rendered stub and return `{ skipped: true, reason: "chromium_required" }`.

## Tests (`packages/ingest/src/__tests__/africa-cdc.test.ts`)

- `poll()` with mocked RSS response → returns filtered item array
- `poll()` with RSS parse error → returns `[]` (no throw)
- `fetch()` with mocked 200 HTML → `{ skipped: false, mimeType: "text/html", ... }`
- `fetch()` with mocked 304 → `{ skipped: true, reason: "304 Not Modified" }`
- `parse()` with full HTML → `{ skipped: false, fullText: <non-empty>, language: "en" }`
- `parse()` with stub HTML (< 200 chars body) → `{ skipped: true, reason: "chromium_required" }`

## Acceptance criteria

- `pnpm test --filter @ituri/ingest` passes including `africa-cdc.test.ts`.
- Adapter registered in `ADAPTER_REGISTRY`.
- `ingest-africa-cdc` Inngest function handles `skipped: true` without emitting a triage event.

## Non-goals

- Full Chromium / Playwright rendering of JS-heavy pages (Trigger.dev task — Phase 9 or later).
- PDF ingestion for press releases (handled by who-afro adapter pattern; not needed here).

## Risks

- africacdc.org RSS feed URL may change; fall back to HTML listing scrape if needed.
- High JS-rendering ratio on the site may result in most documents being skipped.
