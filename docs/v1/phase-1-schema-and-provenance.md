# Phase 1 — Schema, RLS, and provenance trigger

## Goal

Land the Postgres schema that every subsequent phase builds on: four schemas with deliberate exposure rules, seven core tables, the `tg_verify_quote_substring` trigger that enforces provenance at the database level, RLS enabled and performance-tuned on every public table, and a Drizzle schema mirror in `packages/db/`. At the end of this phase, attempting to insert a `source_quotes` row with a fabricated `quote_text` is rejected by the database trigger — the provenance invariant is a schema fact, not an application convention.

---

## Entry preconditions

- Phase 0 exit gate met: no-op PR passes all six workflows + preview deploy + Supabase branch.
- `supabase start` runs cleanly against the Phase 0 stub migration.
- `supabase/tests/` directory exists (even if empty).
- `packages/db/` stub exists with a `drizzle.config.ts`.
- Postgres extensions already present in the scaffold migration: `postgis`, `vector`, `pg_cron`, `pg_net`, `pg_trgm`, `plpgsql_check`.

---

## Deliverables

### Schema / migrations

**`supabase/migrations/<timestamp>_init_schemas.sql`** — creates the four schemas and grants:

```sql
begin;
create schema if not exists geo;
create schema if not exists audit;
create schema if not exists internal;
-- public is already present
-- Grant usage: authenticated + anon get public only
grant usage on schema public to authenticated, anon;
revoke usage on schema geo, audit, internal from anon, authenticated;
commit;
```

**`supabase/migrations/<timestamp>_init_core_tables.sql`** — all seven tables, indexes, and the trigger. Key decisions (each enforces a hard rule from AGENTS.md):

| Table | Schema | Key constraint |
|---|---|---|
| `sources` | public | `slug` unique, `trust_score numeric(3,2)`, `metadata jsonb` |
| `documents` | public | `sha256 bytea unique`, `full_text_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', full_text)) STORED` — `'simple'` config (no stemming) required because the corpus includes French-language MoH DRC and WHO AFRO documents; `'english'` stemmer would corrupt non-English text |
| `source_quotes` | public | `char_end > char_start`, `tg_verify_quote_substring` trigger |
| `outbreaks` | public | `(pathogen_icd11, country_iso3, onset_date)` unique |
| `case_counts` | public | `source_quote_id uuid NOT NULL`, `admin1_code text REFERENCES geo.admin1(code)`, `as_of date NOT NULL`, `superseded_by` self-FK, `status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'published'))` — Phase 7 autonomy flip changes default to `'published'` for non-escalation rows |
| `extraction_runs` | audit | `prompt_version_hash text NOT NULL`, `tool_schema_hash text NOT NULL`, full token breakdown |
| `agent_actions` | audit | append-only (UPDATE/DELETE revoked) |

The `tg_verify_quote_substring` trigger on `source_quotes` `BEFORE INSERT OR UPDATE`:
```sql
if substring(doc_text from new.char_start + 1 for new.char_end - new.char_start)
     <> new.quote_text then
  raise exception 'quote_text does not match document substring';
end if;
```

**`extraction_runs` (audit schema) — full column list:**

```sql
create table if not exists audit.extraction_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id),
  source_quote_ids uuid[] not null default '{}',
  model_id text not null,
  prompt_version_hash text not null,
  tool_schema_hash text not null,
  schema_version text not null default '1',
  temperature numeric(3,2),
  input_doc_sha256 bytea,
  cache_read_input_tokens integer not null default 0,
  cache_creation_input_tokens integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  rows_extracted integer not null default 0,
  rows_verified integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
-- Idempotency: prevent duplicate extraction of the same document with the same prompt
create unique index extraction_runs_doc_prompt_uniq
  on audit.extraction_runs (document_id, prompt_version_hash);
-- append-only
revoke update, delete on audit.extraction_runs from authenticated, anon;
```

Indexes to create (beyond primary keys):
- `source_quotes`: HNSW on `embedding vector_cosine_ops` (m=16, ef_construction=64); GIN on `quote_text gin_trgm_ops`
- `documents`: GIN on `full_text_tsv` — uses `'simple'` tsvector, so queries must also use `plainto_tsquery('simple', ...)` not the default parser.
- `case_counts`: partial B-tree on `(outbreak_id, metric, as_of desc) WHERE superseded_by IS NULL`
- Every RLS policy column gets a B-tree index

**`supabase/migrations/<timestamp>_rls.sql`** — RLS policies on every `public` schema table. Pattern for each table (four separate policies, never `FOR ALL`, `(select auth.uid())` wrapping, explicit role list):

```sql
alter table public.case_counts enable row level security;

create policy "case_counts_anon_select" on public.case_counts
  for select to anon, authenticated
  using (superseded_by is null and status = 'published');

-- No INSERT/UPDATE/DELETE policy for anon/authenticated
-- Service role bypasses RLS for Inngest jobs
-- Future: researcher tier via auth.jwt() -> app_metadata -> tier
```

**`supabase/migrations/<timestamp>_geo_schema.sql`** — geo schema tables for admin boundaries:

```sql
create table geo.admin1 (
  code text primary key,  -- e.g. 'CD-IT' (ISO 3166-2)
  name text not null,
  country_iso3 char(3) not null,
  geom geometry(MultiPolygon, 4326)
);
create index admin1_gix on geo.admin1 using gist (geom);

create table geo.admin2 (
  code text primary key,
  name text not null,
  admin1_code text not null references geo.admin1(code),
  geom geometry(MultiPolygon, 4326)
);
create index admin2_gix on geo.admin2 using gist (geom);
```

Materialized views for tile serving (Phase 5 will use these):
```sql
-- Zone choropleth views use admin1 — must match case_counts.admin1_code FK granularity
create materialized view geo.zone_geom_z6 as
  select code, name, st_simplifypreservetopology(geom, 0.05) as geom from geo.admin1;
create materialized view geo.zone_geom_z10 as
  select code, name, st_simplifypreservetopology(geom, 0.005) as geom from geo.admin1;
create index zone_geom_z6_gix  on geo.zone_geom_z6  using gist (geom);
create index zone_geom_z10_gix on geo.zone_geom_z10 using gist (geom);
-- For admin2-level detail if needed later:
-- create materialized view geo.admin2_geom_z10 as
--   select code, name, st_simplifypreservetopology(geom, 0.005) as geom from geo.admin2;
```

**`supabase/seed.sql`** — seed one fixture source for tests:
```sql
insert into public.sources (id, slug, name, url, trust_score)
values (
  '00000000-0000-0000-0000-000000000001',
  'who-don',
  'WHO Disease Outbreak News',
  'https://www.who.int/emergencies/disease-outbreak-news',
  1.00
) on conflict (slug) do nothing;
```

### Code

**`packages/db/src/schema.ts`** — Drizzle schema mirror. Use PostGIS-aware custom types:

```ts
import { pgTable, uuid, text, bytea, integer, boolean, timestamp, customType } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core"; // pgvector support in drizzle-orm ≥0.36

export const sourceQuotes = pgTable("source_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  charStart: integer("char_start").notNull(),
  charEnd: integer("char_end").notNull(),
  quoteText: text("quote_text").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ... (full schema mirrors every table)
```

`drizzle.config.ts` at `packages/db/` points to `SUPABASE_DB_URL` (session mode port 5432 for migrations) via `@t3-oss/env-nextjs`.

**`packages/db/src/types.gen.ts`** — generated via `supabase gen types typescript --linked`. Committed. CI fails if the diff between generated and committed is non-empty.

**`packages/shared/src/ids.ts`** — branded ID types:

```ts
import { z } from "zod/v4";
export const SourceQuoteId   = z.string().uuid().brand("SourceQuoteId");
export const ExtractionRunId = z.string().uuid().brand("ExtractionRunId");
export const OutbreakId      = z.string().uuid().brand("OutbreakId");
export const DocumentId      = z.string().uuid().brand("DocumentId");
export const ZoneCode        = z.string().regex(/^[A-Z]{2}-[A-Z0-9]+$/).brand("ZoneCode");
```

## Tests

**`supabase/tests/000-setup.sql`** — installs `dbdev` and `supabase-test-helpers`:
```sql
select dbdev.install('basejump-supabase_test_helpers');
create extension if not exists "basejump-supabase_test_helpers";
```

**`supabase/tests/001-substring-verify.sql`** — pgTAP test:
```sql
-- Assert: trigger rejects mismatched quote_text
select throws_ok(
  $$ insert into public.source_quotes (document_id, char_start, char_end, quote_text)
     values ('<doc-id>', 0, 10, 'WRONG TEXT') $$,
  'quote_text does not match document substring'
);
-- Assert: trigger accepts correct quote_text
select lives_ok(
  $$ insert into public.source_quotes (document_id, char_start, char_end, quote_text)
     values ('<doc-id>', 0, 10, 'correct te') $$
);
```

**`supabase/tests/002-rls.sql`** — pgTAP RLS tests:
```sql
-- RLS is enabled on every public table
select ok(relrowsecurity, 'RLS enabled on ' || relname)
from pg_class join pg_namespace on relnamespace = pg_namespace.oid
where nspname = 'public' and relkind = 'r';

-- Anon cannot insert case_counts
select tests.authenticate_as('anon');
select throws_ok(
  $$ insert into public.case_counts (...) values (...) $$
);
select tests.clear_authentication();
```

**`supabase/tests/003-provenance-not-null.sql`**:
```sql
-- case_counts rejects insert without source_quote_id
select throws_ok(
  $$ insert into public.case_counts (outbreak_id, as_of, metric, value, extraction_run_id, model_id, prompt_version_hash)
     values (...) $$,
  'null value in column "source_quote_id" of relation "case_counts" violates not-null constraint'
);
```

**`packages/db/src/__tests__/schema.test.ts`** — Vitest smoke tests that Drizzle schema types compile cleanly (no runtime, just TypeScript inference checks).

---

## Tooling

- `ci.yml` step: `supabase gen types typescript --linked > /tmp/types.gen.ts && diff /tmp/types.gen.ts packages/db/src/types.gen.ts` — fails build if types drift.
- `db-test.yml` runs `pg_prove` against `supabase/tests/` on every PR.
- pglast runs on every migration file in CI and in lefthook `pre-commit`.

---

## Verification

```bash
# 1. Apply migrations locally
supabase db reset
# Expected: "All migrations applied."

# 2. Attempt a bad insert (substring verify rejects)
supabase db execute --local \
  "insert into public.source_quotes values (gen_random_uuid(), (select id from public.documents limit 1), 0, 10, 'WRONG TEXT')"
# Expected: ERROR: quote_text does not match document substring

# 3. pgTAP all tests green
supabase test db
# Expected: all ok

# 4. Types in sync
supabase gen types typescript --linked > /tmp/types.gen.ts
diff /tmp/types.gen.ts packages/db/src/types.gen.ts
# Expected: no diff (exit code 0)

# 5. Drizzle compiles
pnpm --filter packages/db typecheck
# Expected: zero type errors
```

If pgTAP fails on test 002 (RLS tests): confirm `supabase/tests/000-setup.sql` installs helpers before `pg_prove` runs.  
If types diff is non-empty: run `supabase gen types typescript --linked > packages/db/src/types.gen.ts` and commit.

---

## Exit gate

`supabase test db` reports all pgTAP tests as `ok`; `supabase gen types typescript --linked` diff against the committed `packages/db/src/types.gen.ts` is empty; a direct SQL `INSERT` into `source_quotes` with a fabricated `quote_text` is rejected with `quote_text does not match document substring`.

---

## Research cross-references

- [backend.md §1 — The canonical Postgres schema](../../research/backend.md#1-the-canonical-postgres-schema)
- [backend.md §5 — Provenance enforcement as a schema invariant](../../research/backend.md#5-provenance-enforcement-as-a-schema-invariant)
- [backend.md §2 — Supabase configuration](../../research/backend.md#2-supabase-configuration)
- [backend.md §10 — Testing infrastructure](../../research/backend.md#10-testing-infrastructure)
- [agent-automation.md §4 — Scheduling & Triggering](../../research/agent-automation.md#4-scheduling--triggering) (pg_cron setup, Phase 1 only wires extensions)
- [AGENTS.md hard rules 2, 4, 5, 6](../../AGENTS.md)

---

## Out of scope

- Inngest, Anthropic SDK, or any extraction code (Phase 2).
- `geo.admin1` / `geo.admin2` data loading — tables are created but geometry data loads via `supabase/seed.sql` in Phase 5 when the tile pipeline needs it.
- `audit.llm_traces` table for OTel spans (Phase 2).
- `sources.extraction_paused` column used by kill switch (Phase 6 adds it via a separate migration; Phase 1 just has the base `sources` table).
- The MVT functions `internal.mvt` and `public.mvt` (Phase 5).
