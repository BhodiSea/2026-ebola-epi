# Plan: phase 0–8 adapter implementation

This plan is the shared reference for all five v0 source adapter specs:

- `.claude/specs/adapter-acled.md`
- `.claude/specs/adapter-africa-cdc.md`
- `.claude/specs/adapter-moh-drc.md`
- `.claude/specs/adapter-reliefweb.md`
- `.claude/specs/adapter-uganda-moh.md`

## Authoritative references

- **Audit doc:** [docs/v1/phase-0-to-8-audit.md](../../docs/v1/phase-0-to-8-audit.md) — the 2026-05-30 spec-vs-filesystem audit. All five adapters are marked ✅ fully implemented in the Phase 6 section.
- **Phase spec:** [docs/v1/phase-6-multi-source-and-reconciliation.md](../../docs/v1/phase-6-multi-source-and-reconciliation.md) — the canonical implementation spec for multi-source ingestion and reconciliation.

## Current status

All five adapters listed above are implemented and functional as of the audit date (2026-05-30). The adapters live under `packages/ingest/src/adapters/`. No implementation work is required for these specs.

## If implementing a new adapter

Follow the Phase 6 spec. Key constraints from AGENTS.md:

- Outbound HTTP goes through Inngest `throttle` with `scope: "account"` keyed per host (rule 15).
- Every `public.sources` row carries a `license_tier` (`open` / `display_only` / `noncommercial_verified` / `excluded`) (rule 14).
- Raw SQL migrations for any new schema changes; pglast must parse them (rule 6).
- TDD: failing test first (rule 8).
