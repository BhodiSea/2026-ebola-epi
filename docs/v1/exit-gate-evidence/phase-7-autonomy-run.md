# Phase 7 exit gate — 7-day autonomy run

**Gate:** 7 consecutive days of automated ingestion and extraction without manual intervention. All 8 v0 adapters run on schedule; Inngest functions complete without errors; extraction rows are written to the database with valid `prompt_version_hash` values.

**Roadmap reference:** G4 in [docs/ROADMAP.md](../../ROADMAP.md#g4----create-exit-gate-evidence-directory).

## What to monitor

- Inngest dashboard: all functions in the `ingest/*` and `extract/*` namespaces complete with `Completed` status (no `Failed` runs).
- Supabase: `count(*)` on `public.documents` grows each day as new sitreps are ingested.
- Sentry / Axiom: no unhandled errors in the ingestion or extraction pipeline.
- Cost dashboard (`/internal/cost`): daily token spend is within expected range.

## Log template

| Day | Date | Ingestion runs | Extraction runs | Errors | Notes |
|---|---|---|---|---|---|
| 1 | YYYY-MM-DD | | | | |
| 2 | YYYY-MM-DD | | | | |
| 3 | YYYY-MM-DD | | | | |
| 4 | YYYY-MM-DD | | | | |
| 5 | YYYY-MM-DD | | | | |
| 6 | YYYY-MM-DD | | | | |
| 7 | YYYY-MM-DD | | | | |

## Result

> **Status:** ⚠️ Pending — run not yet started.
>
> Replace this block with:
> - The completed log table above
> - Any manual interventions required and why
> - Pass/fail verdict
> - Timestamp range: YYYY-MM-DD to YYYY-MM-DD
> - Operator: (name)
