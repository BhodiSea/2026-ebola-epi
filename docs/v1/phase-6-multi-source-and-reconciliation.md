# Phase 6 — Multi-source ingest + reconciliation

## Goal

Expand from one source adapter (WHO DON) to eight, add the Triage Agent (Haiku 4.5) that classifies each document before extraction, add the Reconciliation Agent (Opus 4.7) that resolves cross-source conflicts by writing `superseded_by` rather than overwriting, surface multi-source disagreements in the UI, and add statistical anomaly detection. At the end of this phase, a synthetic disagreement between WHO and ECDC for the same outbreak/metric/date is detected, reconciled by Opus, and displayed in the UI with the superseded value strikethrough-dimmed.

---

## Entry preconditions

- Phase 5 exit gate met: three-pane `/map` live; backup/restore drill passed.
- `/about/data-sources` page is public and enumerates each source's terms-of-use posture (required before adding adapters for those sources — authored in Phase 4).
- Inngest Hobby tier may be insufficient if daily sitrep volume + fan-out exceeds 5 concurrent steps. Budget for Inngest Pro ($75/month) before or at the start of Phase 6.
- API keys / access tokens for ECDC, Africa CDC, ReliefWeb, ACLED (confirm availability).

## Deliverables

### Schema / migrations

**`supabase/migrations/<timestamp>_sources_extraction_paused.sql`** — adds the kill-switch flag column used by Phase 7:

```sql
begin;
alter table public.sources add column if not exists extraction_paused boolean not null default false;
commit;
```

**`supabase/migrations/<timestamp>_source_authority_table.sql`** — configurable trust-score lookup:

The `sources.trust_score` column (already present from Phase 1) stores per-source authority weight. Seed values:

```sql
update public.sources set trust_score = 1.00 where slug = 'who-don';
insert into public.sources (slug, name, url, trust_score) values
  ('who-afro',    'WHO AFRO Sitreps',         '...', 0.95),
  ('ecdc-cdtr',   'ECDC CDTR',                '...', 0.90),
  ('africa-cdc',  'Africa CDC',               '...', 0.85),
  ('reliefweb',   'ReliefWeb',                '...', 0.70),
  ('acled',       'ACLED',                    '...', 0.70),
  ('moh-drc',     'MoH DRC bulletin',         '...', 0.90),
  ('uganda-moh',  'Uganda MoH',               '...', 0.90)
on conflict (slug) do update set trust_score = excluded.trust_score;
```

**`supabase/migrations/<timestamp>_incidents_table.sql`** — escalation tracking:

```sql
begin;
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  class text not null check (class in ('novel_pathogen_country','substring_verify_fail','conflict_unresolvable','anomaly')),
  outbreak_id uuid references public.outbreaks(id),
  thread_id text,
  status text not null default 'open' check (status in ('open','snoozed','acked','closed')),
  snoozed_until timestamptz,
  ack_by text,
  ack_at timestamptz,
  created_at timestamptz not null default now()
);
-- RLS: anon cannot read incidents; authenticated can read; service role manages
alter table public.incidents enable row level security;
create policy "incidents_auth_select" on public.incidents
  for select to authenticated using (true);
commit;
```

### Code — `packages/ingest/`

Add source adapters. Each exports `poll()`, `fetch(url)`, and `parse(html|pdf)` following the `Adapter` interface:

```ts
// packages/ingest/src/adapter.ts
export type FetchResult =
  | { skipped: false; rawContent: string; sha256: Buffer; mimeType: string }
  | { skipped: true; reason: string };

export type ParseResult =
  | { skipped: false; fullText: string; title: string; language: string }
  | { skipped: true; reason: string };

export interface Adapter {
  sourceSlug: string;
  poll(): Promise<Array<{ url: string; title: string; publishedAt: Date }>>;
  fetch(url: string): Promise<FetchResult>;
  parse(raw: string): Promise<ParseResult>;
}
```

The `africa-cdc.ts` adapter returns `{ skipped: false, ... }` for processable documents and `{ skipped: true, reason: "chromium_required" }` for those requiring Chromium. The ingest function must check `result.skipped` before proceeding.

New adapters in `packages/ingest/src/sources/`:
- `who-afro.ts` — AFRO sitrep HTML pages; Readability parse; `unpdf` fallback for scanned PDFs.
- `ecdc-cdtr.ts` — ECDC CDTR weekly HTML threat assessment; Readability.
- `africa-cdc.ts` — Africa CDC RSS + HTML. Documents that require Chromium (JavaScript-rendered or scanned PDFs) are gracefully skipped in Phase 6 (the adapter returns `{ skipped: true, reason: "chromium_required" }` for those URLs). Full Chromium support via Trigger.dev task is deferred per the README "What is NOT in v1" section — set up the task skeleton but do not activate until document volume justifies it.
- `reliefweb.ts` — ReliefWeb API (`https://api.reliefweb.int/v1/reports`); JSON response with full text included.
- `acled.ts` — ACLED API (`https://api.acleddata.com/acled/read`); JSON; filters to DRC + Uganda conflict events.
- `moh-drc.ts` — MoH DRC bulletin HTML; French text; Readability.
- `uganda-moh.ts` — Uganda MoH press release HTML.

For each adapter, add to `packages/ingest/src/registry.ts` (source allow-list):
```ts
export const ADAPTER_REGISTRY: Record<string, Adapter> = { 'who-don': ..., 'who-afro': ..., ... };
```

### Code — Triage Agent (`packages/extract/src/agents/triage.ts`)

Haiku 4.5, ~$0.001/call. Zod input/output:

```ts
const TriageOutputBase = z.object({
  novelty: z.enum(["known", "new"]),
  confidence: z.number().min(0).max(1),
});

const TriageOutput = z.discriminatedUnion("is_outbreak", [
  TriageOutputBase.extend({ is_outbreak: z.literal(false) }),
  TriageOutputBase.extend({
    is_outbreak: z.literal(true),
    pathogen_icd11: z.string().regex(/^[A-Z0-9.]+$/),
    country_iso3: z.string().length(3),
  }),
]);
```

This ensures `pathogen_icd11` and `country_iso3` are required when `is_outbreak: true`, preventing runtime errors in the escalation check.

`novelty: "new"` + confidence ≥ 0.7 AND `(pathogen_icd11, country_iso3)` not in `outbreaks` → emit `escalation.novel_pathogen_country` event → Inngest `step.waitForEvent("escalation.confirmed", { matchKey, timeout: "7d" })`.

If `is_outbreak: false` → skip extraction.  
If `confidence < 0.7` → re-route to Sonnet 4.6 for a second pass (not Haiku).

### Code — Reconciliation Agent (`packages/extract/src/agents/reconcile.ts`)

Opus 4.7, called only when two `case_counts` rows for the same `(outbreak_id, metric, as_of)` from different sources diverge by > 25%.

Decision logic:
1. Fetch both rows + their `source_quotes` + parent `documents`.
2. Compare `documents.published_at` (more recent usually wins for same-day reports).
3. Compare `sources.trust_score` (higher trust wins on tie).
4. If Opus cannot rank with confidence ≥ 0.8 → emit `escalation.conflict_unresolvable`.
5. On a winner: set `superseded_by` on the losing row (never DELETE or UPDATE the value).

```ts
const ReconcileOutput = z.object({
  winner_id: z.string().uuid(),
  loser_id: z.string().uuid(),
  reason: z.string(),
  escalate: z.boolean(),
});
```

`pg_trgm` similarity for fuzzy outbreak-name matching across sources (used to match documents that refer to the same outbreak using slightly different names):
```sql
-- Use the % operator (trigram similarity operator) in the WHERE clause to engage the GIN index.
-- similarity() alone in WHERE is not sargable against gin_trgm_ops.
select id, similarity(name, $1) as sim
from public.outbreaks
where name % $1        -- uses gin_trgm_ops index; threshold controlled by pg_trgm.similarity_threshold GUC
order by sim desc
limit 1;
-- Note: SET pg_trgm.similarity_threshold = 0.6; before executing, or use pg_trgm.word_similarity_threshold.
```

### Code — Anomaly detection (`packages/extract/src/agents/anomaly.ts`)

Statistical first (no LLM):

1. Rolling 14-day z-score on per-admin1 case counts.
2. PostGIS `ST_Distance` spatial spread — new cluster > 100 km from prior centroid in 24 h.
3. CFR thresholds: CFR > 80% always flags; week-over-week CFR doubling flags.

LLM tiebreak (Sonnet 4.6) only when statistical z > 2.5:
- Input: new row + 5 prior rows + source quote text.
- Output: `{ severity: "info" | "warn" | "alert" | "emergency", reason: string }`.
- Severity routing: `info` → log only; `warn` → daily digest; `alert` → Slack DM; `emergency` → Twilio SMS + Slack @channel.

Dedup: `audit.agent_actions` records every anomaly detection; severity pills in the UI dedup by `(outbreak_id, severity, day)`.

### Code — Multi-source disagreement UI

**`apps/web/components/outbreak/stat-card.tsx`** — update to accept optional `disagreements` prop:

When `disagreements.length > 0`, show a `[+N disagreement]` pill next to the value. Hover → expand mini-table of all sources, their values, dates. Never silently pick a winner.

**`apps/web/app/today/page.tsx`** — query `case_counts` grouped by `(outbreak_id, metric, as_of_date)` and collect all non-superseded rows. Pass `disagreements` to `<StatCard>`.

### Code — Inngest functions update

**`apps/web/inngest/functions/ingest-<source>.ts`** — one Inngest function per source family. Each follows the Phase 2 pipeline shape but now includes:

```ts
// After fetch+parse, emit a per-document triage event:
await step.sendEvent("document.triage.requested", {
  data: { documentId, sourceSlug, fullText, sha256: sha256.toString("hex") }
});
// The ingest function does not wait — triage runs in a separate function below.

// ─────────────────────────────────────────────────────────────
// Separate Inngest function: `triage-document`
// ─────────────────────────────────────────────────────────────
// export const triageDocument = inngest.createFunction(
//   { id: "triage-document", retries: 3 },
//   { event: "document.triage.requested" },
//   async ({ event, step }) => {
//     const triage = await step.run("triage", () => runTriage(event.data));
//     if (!triage.is_outbreak) return { skipped: true };
//     if (triage.novelty === "new" && triage.confidence >= 0.7) {
//       await step.sendEvent("escalation.novel_pathogen_country", { data: { ...triage } });
//       await step.waitForEvent("escalation.confirmed", {
//         matchKey: `${triage.pathogen_icd11}-${triage.country_iso3}`,
//         timeout: "7d",
//       });
//     }
//     await step.sendEvent("document.extraction.requested", { data: event.data });
//   }
// );
```

Reason: `step.waitForEvent` inside the for-loop of an ingest function blocks all subsequent document processing in that run. Each document must be triaged independently via its own Inngest function invocation. The ingest function's job is to emit per-document events; triage and extraction each run as separate functions triggered by those events.

---

## Tests

### Vitest

**`packages/ingest/src/__tests__/who-afro.test.ts`** — mocks `fetch`, parses AFRO HTML fixture, asserts `fullText` contains French text and `sha256` is 32 bytes.

**`packages/extract/src/__tests__/reconcile.test.ts`** — unit test: given two `case_counts` rows with values 100 and 80 (> 25% divergence), `shouldReconcile(100, 80)` returns `true`. Given 100 and 90 (10% divergence), returns `false`.

**`packages/extract/src/__tests__/anomaly.test.ts`** — unit test: `rollingZScore([10,11,10,12,10,11,10,11,10,11,10,11,10,11], 14)` returns a z-score < 2.5 for the last value; `rollingZScore([...sameSeries..., 35], 14)` returns z > 2.5 for the outlier.

### pgTAP

**`supabase/tests/007-superseded-by.sql`**:
```sql
-- superseded_by cannot reference itself
select throws_ok(
  $$ update public.case_counts set superseded_by = id where id = (select id from public.case_counts limit 1) $$
);
-- After reconciliation, the loser row has superseded_by set
select ok(
  exists(select 1 from public.case_counts where superseded_by is not null),
  'At least one superseded row exists after reconciliation test'
);
```

**`supabase/tests/008-incidents-rls.sql`** — asserts anon cannot SELECT from `public.incidents`.

### Playwright

**`apps/web/e2e/disagreement.spec.ts`**:
```ts
test("StatCard shows +1 disagreement pill when sources diverge", async ({ page }) => {
  // Seed two case_counts rows for same (outbreak, metric, as_of_date) from different sources
  // with values diverging by > 25%
  await page.goto("/today");
  await expect(page.locator("[data-disagreement-pill]")).toBeVisible();
  await page.locator("[data-disagreement-pill]").hover();
  await expect(page.locator("[data-disagreement-table]")).toBeVisible();
});
```

### Integration (synthetic disagreement)

To demonstrate the exit gate:
1. Manually insert two `case_counts` rows for the same `(outbreak_id, 'cases', '2026-05-27')` — one from `who-don` (value=142) and one from `ecdc-cdtr` (value=108, divergence > 25%).
2. Trigger the reconcile Inngest function.
3. Assert the Opus 4.7 call runs, selects WHO DON as the winner (higher trust_score), sets `superseded_by` on the ECDC row.
4. Reload `/today` — the ECDC value appears strikethrough-dimmed; WHO DON value is the headline.

---

## Tooling

- `unpdf` — WASM PDF parser fallback for AFRO scanned bulletins (already added in Phase 2; no new install needed). `unpdf` wraps Mozilla's PDF.js for Node.js/Edge environments. Do NOT use `pdf-oxide` — that is a Rust library with no published npm package.
- `p-throttle` — rate limiting at 2 req/s per source.
- `robots-parser` — honor `robots.txt` at the adapter fetch boundary.
- Playwright on Trigger.dev v4 task — for Africa CDC if Chromium-required PDFs are encountered. Set up Trigger.dev account and task skeleton but do not activate until the source actually requires Chromium.
- Twilio SDK — SMS escalation for `emergency` anomaly class.
- Slack Incoming Webhook — for `alert` and `emergency` notifications.

---

## Verification

```bash
# 1. Unit tests
pnpm test
# Expected: all green, including reconcile and anomaly tests.

# 2. pgTAP
supabase test db
# Expected: tests 007–008 pass.

# 3. Multiple adapters poll (manual)
pnpm inngest:dev
# In Inngest, trigger each adapter function.
# Expected: documents appear in public.documents with correct source_id.

# 4. Synthetic reconciliation demo
supabase db execute --local "
  insert into public.case_counts (outbreak_id, as_of, metric, value, source_quote_id, extraction_run_id, model_id, prompt_version_hash)
  values
    ('<outbreak-id>', '2026-05-27', 'cases', 142, '<sq1>', '<run1>', 'test', 'hash1'),
    ('<outbreak-id>', '2026-05-27', 'cases', 108, '<sq2>', '<run2>', 'test', 'hash2');
"
# Trigger reconcile function in Inngest dashboard
# Assert:
supabase db execute --local "SELECT superseded_by FROM public.case_counts WHERE value = 108"
# Expected: non-null superseded_by pointing to the value=142 row

# 5. Disagreement pill visible on /today
pnpm dev
# Navigate to /today
# Expected: [+1 disagreement] pill on the Confirmed StatCard
# Hover: mini-table shows WHO 142 · ECDC 108
# The ECDC value appears strikethrough-dimmed
```

---

## Exit gate

A synthetic disagreement between WHO (value=142) and ECDC (value=108) for the same outbreak/metric/date is detected, reconciled by the Reconciliation Agent (Opus 4.7), surfaces in `/today` with the WHO value as the headline and the ECDC value strikethrough-dimmed in the disagreement mini-table, and the `superseded_by` FK is set on the ECDC row in the database.

---

## Research cross-references

- [agent-automation.md §3 — Agent topology](../../research/agent-automation.md#3-agent-topology)
- [agent-automation.md §8 — Cross-source reconciliation](../../research/agent-automation.md#8-cross-source-reconciliation)
- [agent-automation.md §9 — Anomaly detection](../../research/agent-automation.md#9-anomaly-detection)
- [agent-automation.md §15 — Human-in-the-loop escalation criteria](../../research/agent-automation.md#15-human-in-the-loop-escalation--precise-criteria)
- [backend.md §4 — Ingestion plumbing](../../research/backend.md#4-ingestion-plumbing)
- [backend.md §9 — Security, abuse protection, compliance](../../research/backend.md#9-security-abuse-protection-and-compliance)
- [ux.md §5 — Progressive disclosure (disagreement)](../../research/ux.md#5-progressive-disclosure--novice--expert)

---

## Out of scope

- Langfuse self-hosted (Phase 7).
- Cost kill switch with Postgres trigger (Phase 7).
- Gold set and Promptfoo evals (Phase 7).
- Autonomy flip from "manual review every row" to "only four escalation classes" (Phase 7).
- Maintenance Agent with weekly source-health checks (Phase 7).
- `/internal/escalations` kanban UI (Phase 8).
- The Triage Agent's low-confidence re-route to Sonnet — implement in Phase 6 but the 0.7 threshold is tunable and will be calibrated against real data in Phase 7.
