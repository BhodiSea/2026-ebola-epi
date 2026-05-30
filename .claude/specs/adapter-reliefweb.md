# Spec: adapter-reliefweb

**Status:** reviewed
**Owner:** tnicklin@hawaii.edu
**Date:** 2026-05-30
**Plan:** `.claude/plans/please-verify-the-docs-v1-phase-0-to-8-a-keen-quiche.md`

## Mission

Ingest ReliefWeb situation reports and humanitarian updates for DRC outbreaks. ReliefWeb provides full article text via JSON API — no HTML scraping required. License is CC-BY (open tier), allowing downstream export.

## Sources & data

- **API base:** `https://api.reliefweb.int/v1/reports`
- **Filter:** `country=COD` + keyword filter on `disease-outbreak` / `ebola` / `mpox` / `cholera` / `marburg`
- **Archetype:** `json_api`
- **Poll interval:** `0 12 * * *` (daily 12:00 UTC)
- **Throttle key:** `api.reliefweb.int`
- **License tier:** `open` (CC-BY 3.0)
- **Env vars required:** `RELIEFWEB_APPNAME` (required by API TOS for identification; if absent → `poll()` returns `[]`)

## API shape

```
GET https://api.reliefweb.int/v1/reports
  ?appname=${RELIEFWEB_APPNAME}
  &filter[operator]=AND
  &filter[conditions][0][field]=country.iso3
  &filter[conditions][0][value][]=COD
  &filter[conditions][0][value][]=UGA
  &filter[conditions][1][field]=theme.name
  &filter[conditions][1][value]=Health
  &fields[include][]=title&fields[include][]=body&fields[include][]=date&fields[include][]=language
  &sort[]=date.created:desc
  &limit=10
```

Response: `{ data: [{ id, fields: { title, body-html, date: { created }, language: [{ code }] } }] }`

## Adapter shape

```ts
export const reliefwebAdapter: RegisteredAdapter = {
  sourceSlug: "reliefweb",
  throttleKey: "api.reliefweb.int",
  pollInterval: "0 12 * * *",
  poll()  // JSON API → returns [{ url, title, publishedAt }]; returns [] if RELIEFWEB_APPNAME absent
  fetch() // returns { skipped: false, rawContent: JSON.stringify(fields), mimeType: "application/json", sha256 }
          // URL is the RW canonical: https://reliefweb.int/report/<slug>
          // fetchWithConditionalGet is NOT used — content is returned from poll() fields directly
  parse() // strips HTML tags from body-html; language from language[0].code; skips if body empty
}
```

Note: `fetch()` and `parse()` operate on the JSON fields object stringified as `rawContent`. The canonical URL (from `poll()`) is stored as `documents.url`; `fetch()` reconstructs the API URL from the report ID encoded in the URL.

## Skip conditions

| Condition | `skipped` | `reason` |
|---|---|---|
| `RELIEFWEB_APPNAME` env var absent | `poll()` returns `[]` | — |
| `body-html` field empty | `true` | `"empty_body"` |
| HTML strip yields < 100 chars | `true` | `"body_too_short"` |

## Tests (`packages/ingest/src/__tests__/reliefweb.test.ts`)

- `poll()` with `RELIEFWEB_APPNAME` set + mocked JSON API → returns items
- `poll()` with env var absent → returns `[]`
- `parse()` with `body-html` field → strips tags, returns `fullText`
- `parse()` with empty body → `{ skipped: true, reason: "empty_body" }`
- Language code extraction: `language: [{ code: "fra" }]` → `language: "fr"`

## Acceptance criteria

- `pnpm test --filter @ituri/ingest` passes.
- Adapter registered in `ADAPTER_REGISTRY`.
- `license_tier: "open"` — no restriction on export path.

## Non-goals

- Ingesting non-DRC/Uganda content.
- Fetching attachments (PDFs linked from reports).
