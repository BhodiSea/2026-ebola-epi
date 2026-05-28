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
-- Use (select auth.uid()) to run auth check as InitPlan once per statement (AGENTS.md rule 5)
alter table public.incidents enable row level security;
create policy "incidents_select_authenticated" on public.incidents
  for select to authenticated using ((select auth.uid()) is not null);
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
- **Inngest `throttle`** — the `throttle: { limit: 2, period: "1s", key: "event.data.host", scope: "account" }` pattern is established in Phase 2 on the WHO DON function. Phase 6 extends it to all new adapters via the registry pattern. In-process `p-throttle` is forbidden (AGENTS.md hard rule 15) because it does not coordinate across concurrent Inngest worker instances.
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

## Expanded source roster

*Source: [`research/data.md`](../../research/data.md) §1, §6.*

Expand beyond the eight Phase 6 v0 sources to the full priority-ordered list below. Wire in this order (highest leverage first):

### Priority 1 — HDX HAPI (keyless)

One adapter unlocks five data layers. Requires only an app identifier string — no account or API key.

```ts
// packages/ingest/src/sources/hdx-hapi.ts
// Base URL: https://hapi.humdata.org/api/v1/
// Datasets: food-security (IPC), risk (INFORM), funding (OCHA FTS), population (baseline),
//           refugees (UNHCR) — all P-coded to OCHA COD boundaries.
```

- **IPC food security** (public domain) — acute food insecurity phases by admin1/2. Correlates with care-seeking delay and population movement.
- **INFORM Risk Index** (CC-BY) — multi-hazard vulnerability composite at admin level.
- **OCHA FTS funding flows** (CC-BY) — proxy for response scale-up.
- **UNHCR refugee/returnee figures** — cleanest via HAPI vs scraping UNHCR directly.

License tier: `open`.

### Priority 2 — IOM DTM v3.0 (display-only)

```ts
// packages/ingest/src/sources/iom-dtm.ts
// API: https://dtm.iom.int/api/v3/
// Returns: admin-2 IDP figures with displacement drivers, origins, sex.
// All boundaries P-coded from OCHA COD database (August 2025 release).
```

**License: non-commercial, NO derivative works, NO redistribution, attribution IOM/DTM required.** Store `license_tier = 'display_only'`. Show aggregated overlays with attribution only. Never include in CSV export or derived rasters.

### Priority 3 — UCDP Candidate Events (CC-BY, monthly)

```ts
// packages/ingest/src/sources/ucdp-candidate.ts
// API: https://ucdpapi.pcr.uu.se/api/candidategedevents/26.0.4 (monthly update ~1 month lag)
// Covers: fatal organized violence (armed conflict, one-sided violence, non-state).
// Note: ACLED stays as the display-only high-resolution overlay; UCDP is the
// redistributable conflict baseline for the researcher-tier CSV export.
```

License tier: `open` (CC-BY 4.0 with citation).

### Priority 4 — GRID3 DRC (CC-BY)

```ts
// packages/ingest/src/sources/grid3-drc.ts
// Settlement extents + health-zone polygons; refines geo.admin2 geometry with higher precision.
// Source: https://grid3.org/countries/democratic-republic-of-the-congo
```

License tier: `open`.

### Priority 5 — HOT OSM healthsites.io (ODbL)

```ts
// packages/ingest/src/sources/hot-osm-healthsites.ts
// API: https://healthsites.io/api/v2/facilities/
// Facility points: hospitals, health centres, ETUs, vaccination sites.
// ODbL share-alike: derivatives must remain ODbL.
```

License tier: `open` (with ODbL share-alike note in attribution). Required for the travel-time-to-ETU derived layer in Phase 9.

### Priority 6 — WorldPop 100m + age/sex structure (CC-BY)

- Replace the existing 1km WorldPop seed with the 100m constrained mosaic.
- Add age/sex structure (`ages_m_0_4`, `ages_f_0_4`, etc.) — CFR and care demand are age-structured.
- Ingest as a raster reference: store the COG URL in `internal.derived_layers.storage_url`. Do not use `raster2pgsql` to bulk-import pixel values into Postgres — loading 100m pixel values at DRC scale produces a table too large to query at tile-serving speeds. The Phase 9 `care-access-deficit` pipeline consumes WorldPop at build time via Modal and writes only aggregated admin-zone statistics to Postgres. See ADR-0010 for the full decision.

License tier: `open`.

### Priority 7 — GHSL + Meta HRSL (CC-BY)

- **GHSL** (Global Human Settlement Layer, Copernicus, open): built-up area, settlement classification.
- **Meta High-Resolution Settlement Layer** (CC-BY on HDX): ~30m population where WorldPop is coarse.
- Ingest as offline raster references; serve via precomputed COG tiles (Phase 9 pipeline).

License tier: `open`.

### Priority 8 — Genomic feeds

- **NCBI Virus / GenBank** — openly deposited BDBV sequences not under GISAID.
- **Pathoplexus** — Restricted-Use embargo respected; display-only until embargo lifted.
- **Nextstrain** — read-only JSON tree.
- **Virological.org** — link + own summary (ISID-style posting; check per-post rights).

License tiers: `open` (NCBI), `display_only` (Pathoplexus RU), `open` (Nextstrain), verify per post (Virological).

### Priority 9 — Event-based surveillance feeds

- **ProMED-mail** — link + headline + own summary only. ISID holds copyright on post text; never republish full text.
- **HealthMap** — public alerts usable.
- **EC MediSys (JRC)** — open RSS.
- **Africa CDC Event-Based Surveillance** — already in scope.

License tier: `display_only` for ProMED post text; `open` for aggregated alert metadata.

---

## License tier — Phase 1 schema, Phase 6 population

The `license_tier` column (`CHECK (license_tier IN ('open', 'display_only', 'noncommercial_verified', 'excluded'))`) shipped in Phase 1 migration `20260528200000_add_license_tier.sql`. Phase 6 populates it for the new source rows added in this phase.

Add a migration `<timestamp>_license_tier_phase6_sources.sql` to set tiers on Phase 6 sources:

```sql
begin;

-- Documents inherit license from sources at ingest time; also store ETag/Last-Modified for conditional GET.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS license text,
  ADD COLUMN IF NOT EXISTS etag text,
  ADD COLUMN IF NOT EXISTS last_modified timestamptz,
  ADD COLUMN IF NOT EXISTS http_status integer;

-- Populate license_tier + license_url on all sources (who-don already seeded in Phase 1)
UPDATE public.sources SET license_tier = 'open',         license_url = 'https://creativecommons.org/licenses/by/4.0/' WHERE slug = 'who-don';
UPDATE public.sources SET license_tier = 'open',         license_url = 'https://creativecommons.org/licenses/by/4.0/' WHERE slug = 'who-afro';
UPDATE public.sources SET license_tier = 'open',         license_url = 'https://creativecommons.org/licenses/by/4.0/' WHERE slug = 'ecdc-cdtr';
UPDATE public.sources SET license_tier = 'open',         license_url = 'https://creativecommons.org/licenses/by/4.0/' WHERE slug = 'reliefweb';
UPDATE public.sources SET license_tier = 'display_only', license_url = 'https://acleddata.com/terms-and-conditions-of-use/' WHERE slug = 'acled';
-- moh-drc, africa-cdc, uganda-moh: public press releases, no explicit licence — treat as open for display; confirm before CSV export.

commit;
```

**Researcher-tier CSV export rule**: filters `WHERE license_tier = 'open'`. The `display_only` sources render as aggregated overlays with attribution in the UI but never appear in any CSV export and never feed derived rasters that would be redistributed.

---

## Sources adapter registry

*Source: [`research/performance.md`](../../research/performance.md) §3.2.*

Replace the ad-hoc barrel pattern in [`packages/ingest/src/index.ts`](../../packages/ingest/src/index.ts) with a typed registry:

```ts
// packages/ingest/src/registry.ts
import type { Adapter } from "./adapter";
import { whoDONAdapter }       from "./sources/who-don";
import { whoAFROAdapter }      from "./sources/who-afro";
import { hdxHAPIAdapter }      from "./sources/hdx-hapi";
import { iomDTMAdapter }       from "./sources/iom-dtm";
import { ucdpCandidateAdapter } from "./sources/ucdp-candidate";
import { acledAdapter }        from "./sources/acled";
// ... additional adapters

export const ADAPTER_REGISTRY: Record<string, Adapter & { throttleKey: string }> = {
  "who-don":       { ...whoDONAdapter,        throttleKey: "who.int"            },
  "who-afro":      { ...whoAFROAdapter,       throttleKey: "who.int"            },
  "hdx-hapi":      { ...hdxHAPIAdapter,       throttleKey: "hapi.humdata.org"   },
  "iom-dtm":       { ...iomDTMAdapter,        throttleKey: "dtm.iom.int"        },
  "ucdp-candidate": { ...ucdpCandidateAdapter, throttleKey: "ucdpapi.pcr.uu.se" },
  "acled":         { ...acledAdapter,         throttleKey: "api.acleddata.com"  },
  // ...
};
```

Each Inngest function keyed to a source uses:

```ts
inngest.createFunction(
  {
    id: `ingest-${slug}`,
    // `key` is a CEL expression; string literals must be quoted within the expression.
    // `"${adapter.throttleKey}"` evaluates to e.g. `"who.int"` (with the quotes),
    // which is a valid CEL string constant — this is intentional and correct.
    // scope: "account" enforces the limit across ALL concurrent worker instances globally.
    throttle: { limit: 2, period: "1s", key: `"${adapter.throttleKey}"`, scope: "account" },
  },
  { cron: adapter.pollInterval },
  async ({ event, step }) => { /* ... */ }
);
```

### Conditional GET — ETag/Last-Modified

Pass `If-None-Match` and `If-Modified-Since` headers on every poll using the values stored in `documents.etag` / `documents.last_modified`. A `304 Not Modified` response short-circuits the extract path — zero LLM tokens consumed, zero `case_counts` writes.

```ts
const headers: Record<string, string> = {
  "User-Agent": `ituri-sitrep/1.0 (+https://ituri-sitrep.org/about/bot)`,
};
if (lastDoc?.etag)         headers["If-None-Match"]    = lastDoc.etag;
if (lastDoc?.lastModified) headers["If-Modified-Since"] = lastDoc.lastModified.toUTCString();

const res = await fetch(url, { headers });
if (res.status === 304) return { skipped: true, reason: "304 Not Modified" };

// On success, persist ETag/Last-Modified for the next conditional GET:
await db.update(documents).set({
  etag:         res.headers.get("ETag")           ?? null,
  lastModified: res.headers.get("Last-Modified") ? new Date(res.headers.get("Last-Modified")!) : null,
  httpStatus:   res.status,
});
```

### RetryAfterError on upstream 429

```ts
import { RetryAfterError } from "inngest";

if (res.status === 429) {
  const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
  throw new RetryAfterError("Upstream rate limit", retryAfter * 1000);
}
```

Inngest will reschedule the step respecting the throttle, instead of burning retries immediately.

---

## Out of scope

- Langfuse self-hosted (Phase 7).
- Cost kill switch with Postgres trigger (Phase 7).
- Gold set and Promptfoo evals (Phase 7).
- Autonomy flip from "manual review every row" to "only four escalation classes" (Phase 7).
- Maintenance Agent with weekly source-health checks (Phase 7).
- `/internal/escalations` kanban UI (Phase 8).
- The Triage Agent's low-confidence re-route to Sonnet — implement in Phase 6 but the 0.7 threshold is tunable and will be calibrated against real data in Phase 7.
