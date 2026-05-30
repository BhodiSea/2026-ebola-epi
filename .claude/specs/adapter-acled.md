# Spec: adapter-acled

**Status:** reviewed
**Owner:** tnicklin@hawaii.edu
**Date:** 2026-05-30
**Plan:** `.claude/plans/please-verify-the-docs-v1-phase-0-to-8-a-keen-quiche.md`

## Mission

Ingest ACLED conflict event data for DRC and Uganda as contextual signals for outbreak access constraints and population displacement. ACLED data is `display_only` — it may render as an overlay with attribution but must never appear in CSV export or derived rasters.

## Sources & data

- **API base:** `https://api.acleddata.com/acled/read`
- **Filter:** `country=Democratic Republic of Congo|Uganda`, `event_date` window (last 30 days rolling)
- **Archetype:** `json_api`
- **Poll interval:** `0 4 * * *` (daily 04:00 UTC)
- **Throttle key:** `api.acleddata.com`
- **License tier:** `display_only` (ACLED TOS prohibits redistribution)
- **Env vars required:** `ACLED_ACCESS_TOKEN` — if absent, `poll()` returns `[]`

## API shape

```
GET https://api.acleddata.com/acled/read
  ?key=${ACLED_ACCESS_TOKEN}
  &email=${ACLED_EMAIL}          (env: ACLED_EMAIL)
  &country=Democratic Republic of Congo|Uganda
  &event_date=${startDate}|${endDate}
  &event_date_where=BETWEEN
  &limit=500
  &fields=event_id_cnty|event_date|event_type|sub_event_type|country|admin1|admin2|admin3|location|latitude|longitude|fatalities|notes
```

Response: `{ data: [{ event_id_cnty, event_date, event_type, sub_event_type, country, admin1, admin2, location, latitude, longitude, fatalities, notes }] }`

## Adapter shape

```ts
// poll() synthesises one "document" per 30-day batch rather than per event —
// the LLM extraction stage will receive the batch text for contextual understanding.
export const acledAdapter: RegisteredAdapter = {
  sourceSlug: "acled",
  throttleKey: "api.acleddata.com",
  pollInterval: "0 4 * * *",
  poll()   // returns ONE item per poll run (the batch URL + synthetic title + today's date)
           // returns [] if ACLED_ACCESS_TOKEN or ACLED_EMAIL absent
  fetch()  // calls the ACLED API, serialises response JSON as rawContent; sha256 of JSON
  parse()  // formats events as plain text: "YYYY-MM-DD | event_type | admin2 | fatalities | notes"
           // sets language: "en"; skips if data[] is empty
}
```

`parse()` output `fullText` is structured plain text (one event per line) so the LLM extraction prompt can identify geographic access constraints near active case-count zones.

`licenseRedistribute: false` is **not** in `ParseResult` (that field doesn't exist in the type). Instead, the `display_only` license tier on the `sources` row restricts export at the DB/API level.

## Skip conditions

| Condition | `skipped` | `reason` |
|---|---|---|
| `ACLED_ACCESS_TOKEN` or `ACLED_EMAIL` absent | `poll()` returns `[]` | — |
| API returns `data: []` | `true` | `"no_events_in_window"` |
| HTTP non-2xx | throws | — |

## Tests (`packages/ingest/src/__tests__/acled.test.ts`)

- `poll()` with env vars set → returns one synthetic item
- `poll()` with env absent → returns `[]`
- `fetch()` with mocked ACLED response → `{ skipped: false, rawContent: JSON.stringify(...) }`
- `parse()` with event array → formats correctly, returns `fullText` with event lines
- `parse()` with empty data array → `{ skipped: true, reason: "no_events_in_window" }`

## Acceptance criteria

- `pnpm test --filter @ituri/ingest` passes.
- `license_tier = "display_only"` on the `sources` row (already seeded).
- The adapter never appears in the `license_tier = 'open'` CSV export query.

## Non-goals

- Per-event row storage in `case_counts` (ACLED events are contextual, not case counts).
- Geospatial join of events to health zones (Phase 9).

## Risks

- ACLED TOS requires email + key; both must be env vars. Treat as `display_only` even if key is absent — the license tier is on the DB row.
- `ACLED_EMAIL` is a second required env var not in the seed metadata; add it to `apps/web/lib/env.ts` (optional, guarded by `ACLED_ACCESS_TOKEN`).
