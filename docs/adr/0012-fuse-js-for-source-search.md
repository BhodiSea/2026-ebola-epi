# ADR-0012 — Fuse.js for client-side source search

## Status

Accepted

## Context

The `/sources` library page lists ~20 public data sources. Analysts want to
filter by name, trust tier, and licence type without a network round-trip on
each keystroke. The dataset is small and static on page load.

## Decision

Adopt `fuse.js` (~6 kb gzip, zero runtime dependencies) for client-side fuzzy
search on the `/sources` page and the `<SourceLibraryTable>` island.

## Alternatives considered

| Option | Reason rejected |
|---|---|
| URL-param + server `ILIKE` | Adds a network round-trip per keystroke; perceptibly slow at >100 ms latency |
| Postgres `pg_trgm` | Same latency problem; also requires an additional DB extension and index for a static list |
| Plain `Array.filter` + `String.includes` | No fuzzy matching; poor UX when user typos source names |

## Consequences

- `fuse.js` v7 adds ~6 kb gz to the `/sources` client bundle only.
- Fuse is scoped to `<SourceLibraryTable>` (`'use client'`); the RSC parent
  fetches the full source list at render time and passes it as a serialisable
  prop.
- Sitreps and outbreaks filter pages remain URL-driven (server filters via
  Supabase query params) — Fuse is not used there.
- Bundle impact must be verified with `pnpm --filter apps/web build` chunk
  report after PR 4.
