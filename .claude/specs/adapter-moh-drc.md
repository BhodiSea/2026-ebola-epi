# Spec: adapter-moh-drc

**Status:** reviewed
**Owner:** tnicklin@hawaii.edu
**Date:** 2026-05-30
**Plan:** `.claude/plans/please-verify-the-docs-v1-phase-0-to-8-a-keen-quiche.md`

## Mission

Ingest MoH DRC epidemiological bulletins from `sante.gouv.cd/epidemie`. DRC is the primary outbreak country; MoH press releases are a tier-1 primary source (trust_score 0.90). Content is in French.

## Sources & data

- **Listing URL:** `https://sante.gouv.cd/epidemie`
- **Entry URL pattern:** `https://sante.gouv.cd/epidemie/<slug>`
- **Archetype:** `html` (Readability parse)
- **Poll interval:** `0 10 * * *` (daily 10:00 UTC)
- **Throttle key:** `sante.gouv.cd`
- **License tier:** `open`
- **Language:** `fr` (hard-coded — all content is French)
- **Env vars required:** none

## Adapter shape

```ts
export const mohDRCAdapter: RegisteredAdapter = {
  sourceSlug: "moh-drc",
  throttleKey: "sante.gouv.cd",
  pollInterval: "0 10 * * *",
  poll()   // fetches listing page, parses <a> links matching /epidemie/<slug> pattern,
           // returns [{ url, title, publishedAt }]
           // publishedAt: parse from visible date text near each link; fall back to today's UTC midnight
  fetch()  // fetchWithConditionalGet
  parse()  // Readability; hard-codes language: "fr"
}
```

`poll()` scrapes the listing page with JSDOM (no RSS available). Link selector: `a[href*="/epidemie/"]`. Title from link text; date from nearest `<time>` or `<span class="date">` sibling.

## Skip conditions

| Condition | `skipped` | `reason` |
|---|---|---|
| robots.txt disallows | throws | — |
| HTTP 304 | `true` | `"304 Not Modified"` |
| Readability returns null | `true` | `"readability_parse_failed"` |
| Listing page parse yields 0 links | `poll()` returns `[]` | — |

## Tests (`packages/ingest/src/__tests__/moh-drc.test.ts`)

- `poll()` with mocked listing HTML → returns items with French titles
- `poll()` with listing yielding 0 links → returns `[]`
- `parse()` with French bulletin HTML → `{ language: "fr", fullText: <non-empty> }`
- `parse()` with Readability failure → `{ skipped: true, reason: "readability_parse_failed" }`
- `fetch()` with 304 → `{ skipped: true, reason: "304 Not Modified" }`

## Acceptance criteria

- `pnpm test --filter @ituri/ingest` passes.
- `language: "fr"` in `ParseResult.language`.
- Adapter registered in `ADAPTER_REGISTRY`.

## Non-goals

- PDF ingestion (scanned bulletins — Phase 9 or later).
- Translation of French text (LLM extraction prompt handles multilingual input).

## Risks

- `sante.gouv.cd` may be intermittently unreachable (poor connectivity in DRC).
- Listing page structure may change; the link selector is fragile. Document in adapter inline comment.
