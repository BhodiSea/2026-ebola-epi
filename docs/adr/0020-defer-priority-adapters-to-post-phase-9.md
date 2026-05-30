# ADR-0020 — Defer five Priority-tier source adapters to post-Phase 9

Date: 2026-05-30
Status: Accepted
Deciders: Thomas Nicklin

## Context

The Phase 6 spec identified eight source adapters at two priority tiers:

| Tier | Adapters | Status |
|------|----------|--------|
| v0 (core) | who-don, who-afro, ecdc-cdtr, africa-cdc, reliefweb, acled, moh-drc, uganda-moh | Implemented (this session) |
| Priority (deferred) | hdx-hapi, iom-dtm, ucdp-candidate, grid3-drc, healthsites | **This ADR** |

The five Priority adapters were seeded into the `sources` table in migration
`20260529170400_phase6_sources_seed.sql` with the correct `poll_interval`,
`throttle_key`, `archetype`, `license_tier`, and `requires_env` columns. Their
UI copy and map-layer configuration are complete. Only the adapter implementation
(`packages/ingest/src/sources/<slug>.ts`) and Inngest function
(`apps/web/inngest/functions/ingest-<slug>.ts`) are absent.

Decision to defer rests on three constraints:

1. **Unspecified parse shapes.** `hdx-hapi` exposes a REST API with a
   schema that is not yet captured in a Phase 6 sub-spec. `iom-dtm`,
   `ucdp-candidate`, `grid3-drc`, and `healthsites` each require bespoke
   JSDOM selectors or geometry parsing that depends on Phase 9 spatial
   layers (`admin2_boundaries`, `health_zones_geo`) not yet live.

2. **Phase 9 dependency.** The primary consumers of IOM DTM displacement
   data, UCDP candidate events, GRID3 facility geometry, and Healthsites
   coordinates are the Phase 9 contextual-overlay and access-analysis layers.
   Ingesting data that cannot yet be displayed or reconciled provides no
   user-facing value and wastes extraction budget.

3. **License review pending.** `hdx-hapi` aggregates data from multiple
   source organisations, each with their own license. The `display_only` and
   `noncommercial_verified` tiers for downstream HDX sources must be confirmed
   before the adapter writes to `documents` (a prerequisite of AGENTS.md
   hard rule 14).

## Decision

Do not implement adapter code for `hdx-hapi`, `iom-dtm`, `ucdp-candidate`,
`grid3-drc`, or `healthsites` in Phase 6–8.

- The `sources` DB rows and UI copy remain (already shipped).
- `ADAPTER_REGISTRY` in `packages/ingest/src/registry.ts` does not include
  these slugs until the sub-specs are authored and the Phase 9 spatial layers
  are live.
- Inngest cron functions for these sources are not registered in
  `apps/web/inngest/functions/index.ts`.
- Each adapter gets a `.claude/specs/adapter-<slug>.md` sub-spec authored at
  the start of Phase 9 work, following the same template used for the v0
  adapters in this session.

## Consequences

- No data from HDX, IOM DTM, UCDP, GRID3, or Healthsites will appear in the
  application until Phase 9 begins adapter implementation.
- The F1 gold-set evaluation (`pnpm eval:gold-set`) covers only the eight
  implemented adapters. Priority-adapter coverage is deferred to the Phase 9
  eval run.
- If an urgent operational need arises (e.g., a mass-displacement event
  requiring IOM DTM data), a single adapter can be fast-tracked by authoring
  its sub-spec and implementing it outside the normal phase boundary — this
  ADR does not prohibit that.
