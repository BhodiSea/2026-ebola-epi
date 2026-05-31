# Exit-gate evidence

This directory holds human-recorded evidence for Phase 0–8 exit gates that CI cannot automate. Each file certifies a specific gate. None of these files block the test suite; they exist so auditors and future contributors can verify that operational requirements were met before the project was declared fully operational.

See [docs/ROADMAP.md](../../ROADMAP.md) for the full gate list and acceptance criteria.

## Index

| File | Gate | Roadmap item |
|---|---|---|
| [phase-5-region-pin.md](phase-5-region-pin.md) | Vercel function region pinned to `iad1` (or Supabase co-located region) | G2 |
| [phase-7-waf-arcjet.md](phase-7-waf-arcjet.md) | Arcjet + Vercel WAF active in production | G3 |
| [phase-7-backup-restore-drill.md](phase-7-backup-restore-drill.md) | Supabase `db dump` → restore → verify round-trip | G4 |
| [phase-7-autonomy-run.md](phase-7-autonomy-run.md) | 7 consecutive days of automated ingestion/extraction without manual intervention | G4 |
| [phase-8-nvda-review.md](phase-8-nvda-review.md) | Screen-reader audit with NVDA on `/today` and `/map` | G4 |

## Status

All files are stubs pending human completion. Replace the `Result:` blocks with actual evidence before declaring Phase 5–8 fully operational.
