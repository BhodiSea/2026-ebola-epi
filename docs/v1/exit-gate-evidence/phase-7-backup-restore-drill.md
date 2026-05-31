# Phase 7 exit gate — backup and restore drill

**Gate:** A full `supabase db dump` → restore → verify cycle completes successfully against the production database schema and seed data.

**Roadmap reference:** G4 in [docs/ROADMAP.md](../../ROADMAP.md#g4----create-exit-gate-evidence-directory).

## How to perform the drill

```bash
# 1. Dump the production database (linked project)
supabase db dump --linked -f /tmp/ituri-backup-$(date +%Y%m%d).sql

# 2. Start a fresh local Supabase stack
supabase start
supabase db reset   # applies all migrations from supabase/migrations/

# 3. Restore the dump into the local stack
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f /tmp/ituri-backup-$(date +%Y%m%d).sql

# 4. Verify row counts for key tables
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
  SELECT 'documents' AS tbl, count(*) FROM public.documents
  UNION ALL
  SELECT 'source_quotes', count(*) FROM public.source_quotes
  UNION ALL
  SELECT 'extraction_runs', count(*) FROM audit.extraction_runs;
"

# 5. Run pgTAP suite against the restored schema
pnpm db:test
```

## Result

> **Status:** ⚠️ Pending — not yet performed.
>
> Replace this block with:
> - Dump file size and row counts from step 4
> - pgTAP result (pass/fail, number of tests)
> - Any issues encountered and how they were resolved
> - Timestamp: YYYY-MM-DD HH:MM UTC
> - Operator: (name)
