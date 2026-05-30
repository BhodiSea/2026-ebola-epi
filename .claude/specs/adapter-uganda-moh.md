# Spec: adapter-uganda-moh

**Status:** reviewed
**Owner:** tnicklin@hawaii.edu
**Date:** 2026-05-30
**Plan:** `.claude/plans/please-verify-the-docs-v1-phase-0-to-8-a-keen-quiche.md`

## Mission

Ingest Uganda Ministry of Health press releases for Ebola Sudan and other outbreak events affecting the DRC/Uganda border corridor. Trust score 0.90 (primary national authority for Ugandan outbreak data).

## Sources & data

- **Listing URL:** `https://www.health.go.ug/press-releases/` (or category page)
- **Entry URL pattern:** `https://www.health.go.ug/<year>/<slug>/`
- **Archetype:** `html` (Readability parse)
- **Poll interval:** `0 10 * * *` (daily 10:00 UTC)
- **Throttle key:** `health.go.ug`
- **License tier:** `open`
- **Language:** `en`
- **Env vars required:** none

## Adapter shape

```ts
export const ugandaMOHAdapter: RegisteredAdapter = {
  sourceSlug: "uganda-moh",
  throttleKey: "health.go.ug",
  pollInterval: "0 10 * * *",
  poll()  // fetches press-releases listing, parses links + titles + dates
          // keyword filter: ebola, mpox, cholera, outbreak, marburg, bundibugyo, sudan
  fetch() // fetchWithConditionalGet
  parse() // Readability; language: "en" (detect from <html lang> with "en" default)
}
```

`poll()` link selector: `a[href*="health.go.ug"]` or `article a` on the listing page. Date from `<time datetime>` or nearest `.date` / `.post-date` element; fall back to today's UTC midnight. Apply outbreak keyword filter (same list as who-don) before returning items.

## Skip conditions

| Condition | `skipped` | `reason` |
|---|---|---|
| robots.txt disallows | throws | — |
| HTTP 304 | `true` | `"304 Not Modified"` |
| Readability returns null | `true` | `"readability_parse_failed"` |
| Listing parse yields 0 links | `poll()` returns `[]` | — |

## Tests (`packages/ingest/src/__tests__/uganda-moh.test.ts`)

- `poll()` with mocked listing HTML containing outbreak links → returns filtered items
- `poll()` with listing containing only non-outbreak links → returns `[]`
- `parse()` with full press-release HTML → `{ language: "en", fullText: <non-empty> }`
- `parse()` with Readability failure → `{ skipped: true, reason: "readability_parse_failed" }`

## Acceptance criteria

- `pnpm test --filter @ituri/ingest` passes.
- Adapter registered in `ADAPTER_REGISTRY`.
- Outbreak keyword filter is applied in `poll()` (not in `parse()`).

## Non-goals

- Ingesting non-outbreak press releases.
- Archiving historical press releases (poll-only, no backfill).

## Risks

- `health.go.ug` is slow and may time out; `fetchWithConditionalGet` respects robots.txt but not timeouts — add an `AbortSignal.timeout(15_000)` to `fetch()` calls to avoid hanging Inngest steps.
- Site structure has changed before; document the link selector in inline comment.
