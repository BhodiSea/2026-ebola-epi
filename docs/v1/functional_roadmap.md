# ituri-sitrep — Functional Roadmap (v1)

> **Purpose.** This document is an operational synthesis that sits on top of the ten
> [phase docs](./README.md) in this directory. It answers one question: **what
> specifically must change to take the codebase from its current ~90%-wired state to
> fully operational?** Read the phase docs for the original specifications; read this
> doc when you want to know what is broken, what is thin, and in what order to fix it.
>
> Last audited: **2026-05-31**. Supersedes the gap list in `docs/ROADMAP.md` (that doc
> now serves as an archive; treat this file as authoritative).

---

## How to read this document

Four **workstreams** in priority order. Workstream 1 is the largest gap; the others
can proceed in parallel once WS1 has a migration in review. Each workstream has:

- **Current state** — what actually exists in the codebase right now.
- **Gap** — the precise delta to "fully operational."
- **Implementation steps** — concrete files to edit, commands to run.
- **Done signal** — a single observable test that proves the workstream is complete.

At the bottom: remaining operational gaps (infra, CI, docs), out-of-scope deferrals,
and an open-questions list that requires further research before any WS2 Tier-3 work.

---

## State snapshot (2026-05-31)

| Subsystem | State | Blocker |
|---|---|---|
| Ingest pipeline wiring (8 adapters → Inngest → DB) | ✅ ~90% | No PDF path; Africa CDC skips JS pages |
| LLM extraction (triage → extract → reconcile → persist) | ✅ ~90% | Schema too narrow; `healthcare_workers` metric bug; admin-name resolution fragile |
| Source-quote provenance (DB trigger, substring verify) | ✅ ~85% | No PDF offset derivation; backfill Inngest function missing |
| Gold-set eval fixtures | ✅ All 7 populated | — |
| Offline F1 gate (≥ 0.90) | ✅ Wired | — |
| Live F1 gate (≥ 0.95, promptfoo) | ⚠️ Wired but moot | `CANDIDATE_PROMPT_VERSION` self-aliases — shadow compares prompt to itself |
| Zone-level map (MVT, choropleth) | ✅ Wired | Paints correctly only when `case_counts.admin2_code` is populated; currently NULL for most rows |
| Internal admin surface | ✅ Full | — |
| Public-facing pages + SEO | ✅ Full | — |
| Tier-3 source adapters (NCBI, Pathoplexus, HDX, etc.) | ⚠️ Seeded, no code | 13 sources in DB; 0 adapters |
| Vercel deploy + region pin | ⚠️ Deployed | Region not pinned; evidence not committed |
| Lighthouse CI | ⚠️ Wired | Wrong `budgetPath`; `/map` missing from URL list |
| Cache-read integration test | ⚠️ Missing | No test asserts `cache_read_input_tokens > 0` |

The map is the north-star metric for "fully operational": a real WHO AFRO Bundibugyo
PDF sitrep, ingested end-to-end, paints per-zone counts on the Ituri map with
verifiable provenance and an F1 ≥ 0.95 on the live eval. Every workstream below is a
prerequisite for that sentence to be true.

---

## Workstream 1 — Deepen the extraction schema

**Priority: highest.** This is the single largest functional gap. The sitrep ingestion
pipeline processes real documents and produces `case_counts` rows, but those rows are
national-level aggregates. The map choropleth paints on `admin2_code`, which is NULL
on almost every row because the extraction schema does not ask the LLM to provide
health-zone-level data.

### 1.1 Current state

[packages/extract/src/tools.ts:5](../../packages/extract/src/tools.ts#L5) defines
`ExtractionRowSchema`:

```
pathogen_icd11 | country_iso3 | admin1_name? | metric (8 values) | value (int) | as_of
```

`admin1_name` is a free-text province name. The persist-extraction mapper
([apps/web/inngest/lib/persist-extraction.ts:335](../../apps/web/inngest/lib/persist-extraction.ts#L335))
attempts to resolve it to an `admin2_code` via a name-match query — but this query
joins `admin2.name` against the `admin1_name` string. A province name ("Ituri") will
never match a zone de santé name ("Rethy", "Bunia", "Mongbwalu"), so `admin2_code` is
nearly always NULL after insert.

The prompt ([packages/extract/src/prompt.ts:1](../../packages/extract/src/prompt.ts#L1))
instructs the model with 7 lines and a single national-level few-shot example. The
few-shot names no sub-national geography.

The F1 scorer ([evals/lib/f1.ts:10](../../evals/lib/f1.ts#L10)) evaluates only
`(pathogen_icd11, country_iso3, metric, value, as_of)` — it ignores `admin1_name`
entirely. So the offline eval passes even when zone data is missing.

**There is also a live DB bug:** the `case_counts.metric` CHECK constraint
([supabase/migrations/20260527150300_init_core_tables.sql:138](../../supabase/migrations/20260527150300_init_core_tables.sql#L138))
allows `('cases', 'deaths', 'suspected', 'confirmed', 'probable', 'vaccinated',
'contacts')` — seven values. The zod schema in
[packages/extract/src/tools.ts:12](../../packages/extract/src/tools.ts#L12) has eight,
adding `"healthcare_workers"`. Any extraction where the LLM returns
`metric: "healthcare_workers"` will fail the DB insert constraint. This must be fixed
in both directions: add the metric to the constraint **and** expand it further as part
of the schema widening below.

### 1.2 What the data actually contains

WHO DON602 (the May 15 2026 bulletin for this exact outbreak,
[https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON602](https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON602))
— verified against the primary source — demonstrates:

- **Health-zone granularity:** cases are reported per named zone de santé (Rwampara HZ
  with 6 health areas, Mongbwalu HZ with 3 health areas, Bunia HZ). Province-level
  aggregates exist but zone-level is the operationally useful unit.
- **Healthcare-worker deaths as a nosocomial signal:** four HCW deaths at Mongbwalu
  General Referral Hospital are called out explicitly. This is clinically distinct from
  community deaths.
- **New vs. cumulative distinction:** DON reports both cumulative totals and new-since-
  last-sitrep figures. The current schema stores a single `value` with no `is_new_in_period` flag.

A 2025 peer-reviewed analysis of the WHO DON structured data corpus
([Scientific Data, PMC12152149](https://www.nature.com/articles/s41597-025-05276-2))
confirms that automated extraction pipelines for DON reports have historically captured
only five fields: disease, country, date, total cases, mortality. The ituri-sitrep
schema already exceeds that baseline, but the operational data (zone-level breakdown,
HCW deaths, time-window) is not captured.

### 1.3 Target schema (zod)

Replace `ExtractionRowSchema` in
[packages/extract/src/tools.ts](../../packages/extract/src/tools.ts) with:

```typescript
export const ExtractionRowSchema = z.object({
  pathogen_icd11: z.string().regex(/^[A-Z0-9.]+$/).min(4).max(12),
  country_iso3:   z.string().length(3),
  // Most specific geographic name the document provides.
  // Use the zone de santé name when available (e.g. "Rethy", "Mongbwalu"),
  // fall back to province/region name (e.g. "Ituri") when zone is not named.
  admin_name:     z.string().min(1).optional(),
  metric: z.enum([
    "cases",        "deaths",       "suspected",  "confirmed",
    "probable",     "vaccinated",   "contacts",   "healthcare_workers",
    "hcw_deaths",   "nosocomial",   "lab_positive", "in_treatment",
  ]),
  value:          z.number().int().nonnegative(),
  as_of:          z.iso.date(),
  // true = value is new since previous sitrep; false/absent = cumulative
  is_new_in_period: z.boolean().optional(),
  source_quote: z.object({
    char_start: z.number().int().nonnegative(),
    char_end:   z.number().int().positive(),
    quote_text: z.string().min(1),
  }),
});
```

**Schema design rationale:**
- `admin_name` replaces `admin1_name`. The field carries whichever geographic name the
  document provides — zone de santé when available, province as fallback. The
  persist-extraction mapper resolves it against both `admin2.name` and `admin1.name` in
  priority order (zone first).
- Metric enum gains `hcw_deaths`, `nosocomial`, `lab_positive`, `in_treatment` — all
  consistently present in filovirus sitreps and absent from the current schema.
- `is_new_in_period` enables the map's time-scrubber and epidemiological curves; without
  it, new and cumulative figures are indistinguishable in the DB.
- Keeping the schema flat (no nesting beyond `source_quote`) preserves Anthropic tool
  compatibility — discriminated unions produce `anyOf` which the API rejects.

### 1.4 Database migration

New migration: `supabase/migrations/YYYYMMDDHHMMSS_widen_case_counts_schema.sql`

```sql
begin;

-- 1. Add missing metrics to constraint (drop + re-add)
alter table public.case_counts
  drop constraint if exists case_counts_metric_check;

alter table public.case_counts
  add constraint case_counts_metric_check check (metric in (
    'cases', 'deaths', 'suspected', 'confirmed',
    'probable', 'vaccinated', 'contacts',
    'healthcare_workers',   -- was missing; fixes live insert bug
    'hcw_deaths',
    'nosocomial',
    'lab_positive',
    'in_treatment'
  ));

-- 2. Add time-window flag
alter table public.case_counts
  add column if not exists is_new_in_period boolean;

-- 3. Rename admin1_code → retain for FK integrity; add resolved admin name text
--    (persist-extraction stores the raw name before zone resolution)
alter table public.case_counts
  add column if not exists admin_name text;

commit;
```

Run `pglast` validation:
```bash
python -m pglast < supabase/migrations/YYYYMMDDHHMMSS_widen_case_counts_schema.sql
```

**Note:** the existing `admin1_code` FK column is retained to avoid breaking existing
rows. New rows will populate `admin2_code` (already present from migration
`20260528210000_case_counts_to_admin2.sql`) when zone resolution succeeds, and
`admin_name` for all rows regardless.

### 1.5 Admin name resolution fix

In [apps/web/inngest/lib/persist-extraction.ts](../../apps/web/inngest/lib/persist-extraction.ts),
the `resolveAdmin2Code` function at line ~335 queries `admin2.name` against
`row.admin1_name`. After the schema rename it will query against `row.admin_name`.
Extend the resolver to check admin2 first, then admin1:

```typescript
// Priority: exact zone-de-santé match (admin2) → province match (admin1) → null
async function resolveAdminCode(
  tx: DbTx,
  countryIso3: string,
  adminName: string,
): Promise<{ admin1Code: string | null; admin2Code: string | null }> {
  const zone = await tx
    .select({ code: admin2.code, admin1Code: admin2.admin1Code })
    .from(admin2)
    .innerJoin(admin1, eq(admin2.admin1Code, admin1.code))
    .where(and(
      eq(admin1.countryIso3, countryIso3),
      eq(sql`lower(${admin2.name})`, adminName.toLowerCase()),
    ))
    .limit(1);
  if (zone[0]) return { admin2Code: zone[0].code, admin1Code: zone[0].admin1Code };

  const province = await tx
    .select({ code: admin1.code })
    .from(admin1)
    .where(and(
      eq(admin1.countryIso3, countryIso3),
      eq(sql`lower(${admin1.name})`, adminName.toLowerCase()),
    ))
    .limit(1);
  return { admin2Code: null, admin1Code: province[0]?.code ?? null };
}
```

Extend the `caseCounts.values(...)` call to include `adminName: row.admin_name`.

### 1.6 Prompt and few-shot updates

[packages/extract/src/prompt.ts](../../packages/extract/src/prompt.ts) needs three
changes:

**a. Extend `STATIC_INSTRUCTIONS`** to name the new metrics and clarify geographic
granularity:

```typescript
export const STATIC_INSTRUCTIONS = `You extract epidemiological data from outbreak situation reports.

Rules:
- Only extract figures explicitly stated in the document.
- char_start and char_end are zero-indexed character offsets of quote_text within the
  document text (not HTML/XML tags). quote_text must be the verbatim substring at
  [char_start, char_end). No paraphrasing.
- Call extract_case_counts ONCE with ALL figures found.
- Required per extraction: pathogen_icd11, country_iso3, metric, value, as_of, source_quote.
- admin_name: provide the MOST SPECIFIC geographic name the document states — use the
  zone de santé (health zone) name when named (e.g. "Rethy", "Mongbwalu", "Bunia"),
  fall back to province/region name only when no zone is named.
- is_new_in_period: true when the document explicitly says "new" or "since the last
  report"; omit or false for cumulative totals.
- Metrics: cases, deaths, suspected, confirmed, probable, vaccinated, contacts,
  healthcare_workers (total HCW cases), hcw_deaths (HCW fatalities), nosocomial
  (hospital-acquired cases), lab_positive (positive lab tests), in_treatment (current
  ETU/CTC occupancy).
- If a figure is absent or ambiguous, do not include it.`;
```

**b. Extend `FEW_SHOTS`** with a zone-level, multi-metric example that mirrors the
actual DON602 structure:

```typescript
export const FEW_SHOTS = `\
Example document: "As of 15 May 2026, 47 cumulative confirmed cases and 12 deaths have \
been reported from Ituri Province. Rwampara Health Zone accounts for 28 cases. Four deaths \
occurred among healthcare workers at Mongbwalu General Referral Hospital."

Example call: extract_case_counts({ extractions: [
  { pathogen_icd11: "XN0AT", country_iso3: "COD", metric: "confirmed", value: 47,
    as_of: "2026-05-15", is_new_in_period: false,
    source_quote: { char_start: 10, char_end: 82,
      quote_text: "47 cumulative confirmed cases and 12 deaths have been reported from Ituri Province" } },
  { pathogen_icd11: "XN0AT", country_iso3: "COD", metric: "deaths", value: 12,
    as_of: "2026-05-15", is_new_in_period: false,
    source_quote: { char_start: 10, char_end: 82,
      quote_text: "47 cumulative confirmed cases and 12 deaths have been reported from Ituri Province" } },
  { pathogen_icd11: "XN0AT", country_iso3: "COD", admin_name: "Rwampara", metric: "cases",
    value: 28, as_of: "2026-05-15",
    source_quote: { char_start: 83, char_end: 131,
      quote_text: "Rwampara Health Zone accounts for 28 cases" } },
  { pathogen_icd11: "XN0AT", country_iso3: "COD", admin_name: "Mongbwalu", metric: "hcw_deaths",
    value: 4, as_of: "2026-05-15",
    source_quote: { char_start: 133, char_end: 217,
      quote_text: "Four deaths occurred among healthcare workers at Mongbwalu General Referral Hospital" } }
]})`;
```

**c. Bump `prompt_version_hash`:** any change to `STATIC_INSTRUCTIONS`, `FEW_SHOTS`,
or `extractionTool` must trigger a hash bump. The hash is computed automatically in
[packages/extract/src/hash.ts](../../packages/extract/src/hash.ts) via
`computePromptVersionHash()` — no manual bump needed, but confirm via test.

### 1.7 Gold-set updates

The offline F1 gate evaluates `(pathogen_icd11, country_iso3, metric, value, as_of)`.
Once `hcw_deaths` and zone-level metrics are added to the schema, the
`bundibugyo-ituri-2026-04-20` ground-truth must be updated to include zone-level
expectations:

```json
// evals/gold-set/bundibugyo-ituri-2026-04-20/ground-truth.json — add:
{ "pathogen_icd11": "XN0AT", "country_iso3": "COD", "metric": "confirmed", "value": 47, "as_of": "2026-04-20" },
{ "pathogen_icd11": "XN0AT", "country_iso3": "COD", "metric": "deaths",    "value": 12, "as_of": "2026-04-20" }
```

(The current two-entry ground-truth already covers these; add zone-level entries from
the source text to increase eval coverage when the source text names zones.)

Regenerate `response-fixture.json` for fixtures that include new metric types by
running the promptfoo eval live:
```bash
ANTHROPIC_API_KEY=... pnpm --filter=@ituri/evals eval
```

### 1.8 Done signal (WS1)

```bash
# 1. Migration applies cleanly
supabase db reset --local

# 2. A live extraction of the bundibugyo-ituri-2026-04-20 source text
#    produces at least one row with admin2_code IS NOT NULL
pnpm --filter=@ituri/evals test   # offline F1 still ≥ 0.90

# 3. Insert with metric='healthcare_workers' no longer raises constraint violation
#    (test exists in supabase/tests/rls/case_counts_rls.sql or add one)

# 4. Zone-level figure appears on /map for Ituri (Rwampara HZ painted non-grey)
```

---

## Workstream 2 — Close ingestion gaps

**Priority: high.** The extraction pipeline is only as good as the text it receives.
Three sources currently deliver empty or silently-skipped documents for the majority of
their sitrep publications.

### 2.1 PDF ingestion (WHO AFRO, Africa CDC, MoH DRC)

**Gap.** WHO AFRO sitreps ([example AFRO Ebola report](https://www.afro.who.int/countries/democratic-republic-of-congo/publication/who-ebola-situation-report-drc-25-04-05-october-2025))
and Africa CDC situation reports are frequently published as PDFs. The current
[who-afro.ts](../../packages/ingest/src/sources/who-afro.ts) adapter passes all URLs
through `fetchWithConditionalGet` → Readability HTML parse. PDF responses return binary
that Readability cannot parse, resulting in `readability_parse_failed` skip.

**Recommendation (Phase B research — high confidence).**
Use `pdfjs-serverless`
([https://github.com/johannschopplich/pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless)):

- 1.6 MB single-file bundle (PDF.js v5.6.205) with inlined worker — compatible with
  Vercel Fluid Compute.
- Exposes the standard `getTextContent()` API (same as `pdfjs-dist`) returning
  `TextItem[]` with `{ str, transform, width, height, fontName, hasEOL }`.
- No native `char_start`/`char_end` per item — **offsets must be derived by
  accumulating `str` lengths** across the `TextItem` array.

**Implementation steps:**

1. Add to `packages/ingest/package.json`:
   ```json
   "pdfjs-serverless": "^1.2.3"
   ```

2. Add `PDF_MIN_TEXT_CHARS = 100` guard (same pattern as `MIN_READABLE_CHARS` in
   Africa CDC adapter).

3. In [packages/ingest/src/fetch-helper.ts](../../packages/ingest/src/fetch-helper.ts),
   extend `fetchWithConditionalGet` to detect PDF content-type (`application/pdf`) and
   return it as a separate `pdfBuffer: Buffer` field on `FetchResult`, or add a
   separate `fetchPdf(url)` helper.

4. Add a `parsePdf(buffer: Buffer): Promise<ParseResult>` function:

   ```typescript
   import { getDocument } from "pdfjs-serverless";

   export async function parsePdf(buffer: ArrayBuffer): Promise<ParseResult> {
     const doc = await getDocument({ data: buffer }).promise;
     const pieces: string[] = [];
     for (let i = 1; i <= doc.numPages; i++) {
       const page = await doc.getPage(i);
       const content = await page.getTextContent();
       pieces.push(content.items.map((item) =>
         "str" in item ? item.str : ""
       ).join(""));
     }
     const fullText = pieces.join("\n");
     if (fullText.trim().length < PDF_MIN_TEXT_CHARS) {
       return { skipped: true, reason: "pdf_text_empty" };
     }
     return { skipped: false, fullText, title: "", language: "en" };
   }
   ```

5. **Offset accumulation contract.** The DB trigger `tg_verify_quote_substring`
   ([supabase/migrations/20260527150300_init_core_tables.sql:35](../../supabase/migrations/20260527150300_init_core_tables.sql#L35))
   verifies `substring(doc_text, char_start+1, len) = quote_text`. The `fullText` string
   produced by `parsePdf` is the `documents.full_text` value; the LLM's quoted offsets
   must align to it. Because `str` concatenation is deterministic, this constraint is
   satisfiable — but **test against real WHO/Africa CDC PDFs before shipping**, since
   multi-column layouts, ligatures, and OCR artifacts can corrupt sequential offset
   counts. Add an integration test that exercises at least one real WHO AFRO PDF URL.

6. Extend the `ParseResult` type in
   [packages/ingest/src/adapter.ts](../../packages/ingest/src/adapter.ts) with
   `contentType?: "html" | "pdf"` so callers can route correctly.

7. Update [who-afro.ts](../../packages/ingest/src/sources/who-afro.ts) and the MoH DRC
   adapter's `parse()` method to detect PDF content-type and call `parsePdf`.

**ADR required:** new runtime dependency `pdfjs-serverless` requires
`docs/adr/0022-pdf-extraction-pdfjs-serverless.md`.

### 2.2 Chromium fallback for Africa CDC

**Gap.** [africa-cdc.ts:76](../../packages/ingest/src/sources/africa-cdc.ts#L76)
returns `{ skipped: true, reason: "chromium_required" }` when Readability yields fewer
than 200 characters. Africa CDC's news CMS renders articles client-side via JavaScript.

**Recommendation (Phase B research — high confidence).**
Use Vercel Sandbox + `vercel-labs/agent-browser`
([https://github.com/vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)):

- Vercel Sandbox is GA as of January 30 2026 (Firecracker microVMs).
- `agent-browser` wraps it with a `Sandbox.create({ runtime: 'node24' })` pattern and
  can run Chrome headlessly inside the VM.
- **Constraints:** available in `iad1` region only; ~30 s cold-start for Chrome install;
  each sandbox is ephemeral.
- Calling from an Inngest step function is straightforward — the step timeout is
  configurable and the per-host `throttle` in `ingest-source-config.ts` still applies.

**Implementation steps:**

1. Add `@vercel/sandbox` to `apps/web/package.json` (runs inside Inngest, not the
   ingest package).
2. Create `apps/web/inngest/lib/fetch-with-sandbox.ts` — a thin wrapper:

   ```typescript
   import { Sandbox } from "@vercel/sandbox";
   export async function fetchJsRendered(url: string): Promise<string> {
     const sandbox = await Sandbox.create({ runtime: "node24" });
     try {
       const result = await sandbox.runCommand(
         "agent-browser",
         ["--url", url, "--output", "text"],
       );
       return result.stdout;
     } finally {
       await sandbox.destroy();
     }
   }
   ```

3. In the Africa CDC Inngest function (not the adapter), after a
   `chromium_required` skip-reason, retry the URL via `fetchJsRendered`.
   Keep the Readability path as the fast lane; Sandbox only activates on skip.
4. Because Sandbox is billed per-second and has a ~30 s cold-start, rate-limit
   Sandbox calls to no more than 5/day per host via a second `throttle` key
   `"africacdc.org:chromium"`.

**ADR required:** `docs/adr/0023-headless-chromium-vercel-sandbox.md`.

**Caveat:** the Inngest throttle primitive is function-scoped
([GitHub issue #3701](https://github.com/inngest/inngest/issues/3701) — labeled stale).
If multiple Inngest functions share a `throttle` key, they do NOT share a combined
budget — each maintains its own. This could allow collective over-fetching from
Africa CDC across functions. Until this is resolved upstream, document this limitation
in the ADR and add a manual cross-function daily cap via a DB counter or Edge Config
flag.

### 2.3 MoH DRC selector hardening

**Gap.** [moh-drc.ts:25](../../packages/ingest/src/sources/moh-drc.ts#L25) uses
`querySelectorAll('a[href*="/epidemie/"]')`. If `sante.gouv.cd` restructures its
URL scheme, polling silently returns `[]` rather than erroring — no alert fires.

**Fix:**

1. After `querySelectorAll`, if `anchors.length === 0`, emit a
   `DOCUMENT_TRIAGE_REQUESTED` event with a synthetic "parse_failed" signal **or**
   throw a `new Error("moh_drc_selector_empty — site structure may have changed")`.
   The second approach will trigger Inngest retry + eventual escalation to an incident.
2. Add a pgTAP-style integration assertion or a nightly synthetic-monitor check
   ([apps/web/inngest/functions/synthetic-monitor.ts](../../apps/web/inngest/functions/synthetic-monitor.ts))
   that verifies `sante.gouv.cd/epidemie` returns at least one anchor matching
   `/epidemie/` at least once per week.

### 2.4 Tier-3 source adapters

Thirteen sources are seeded in the DB
([supabase/migrations/20260529170400_phase6_sources_seed.sql](../../supabase/migrations/20260529170400_phase6_sources_seed.sql))
with no adapters: NCBI Virus, Pathoplexus, Nextstrain, HDX HAPI, IOM-DTM, UCDP,
GRID3, WorldPop, Meta-HRSL, and others.

**Phase B research produced no verified claims on Q5** (canonical API interfaces,
license tiers, Ituri-resolution utility, Node.js wrappers). This is an open research
gap — see [Open questions](#open-questions) below.

**What can be decided now:**

- [ADR-0020](../adr/0020-defer-priority-adapters-to-post-phase-9.md) explicitly defers
  "Priority" adapters to post-Phase 9. Treat Tier-3 as v1.1, not v1.0, unless the
  roadmap is extended.
- **Pathoplexus:** the platform ([pathoplexus.org/api-documentation](https://pathoplexus.org/api-documentation))
  uses the Loculus LAPIS API; sequences for the 2026 Bundibugyo outbreak will appear
  here. The "Lineage" tab stub on the outbreak detail page (Phase 4) is the correct
  integration point. License is [CC BY-SA 4.0](https://pathoplexus.org/about/terms-of-use/data-use-terms)
  per the Pathoplexus terms — qualifies for `license_tier: 'open'`.
- **Nextstrain:** the `auspice.us` public JSON datasets are MIT-licensed; the
  [2025 PPX/Pathoplexus integration](https://nextstrain.org/blog/2025-08-24-Nextstrain-PPX)
  makes Nextstrain the presentation layer for Pathoplexus sequences.
- **HDX HAPI** ([hdx-hapi.readthedocs.io](https://hdx-hapi.readthedocs.io/)) exposes a
  REST API over humanitarian datasets; DRC admin2 population data is directly relevant
  for per-zone attack-rate computation.

**Decision gate:** before building any Tier-3 adapter, answer the open questions in §5
and file an ADR per source.

### 2.5 Done signal (WS2)

```bash
# PDF ingestion:
# Run the who-afro adapter against a known WHO AFRO PDF URL in the integration test
pnpm --filter @ituri/web test:integration -- --grep "who-afro pdf"
# source_quotes row with char_start/char_end inserted; tg_verify_quote_substring passes

# Chromium fallback:
# Africa CDC adapter no longer returns chromium_required for known JS-rendered URLs
# (manual verification against a known Africa CDC sitrep URL in staging)

# MoH DRC: daily cron runs without silent empty return; synthetic monitor green
```

---

## Workstream 3 — Activate the quality gate

**Priority: medium.** The eval infrastructure exists and is wired. The offline F1 gate
(≥ 0.90) runs in `pnpm test` via
[evals/\_\_tests\_\_/gold-set.test.ts](../../evals/__tests__/gold-set.test.ts). All 7
fixtures are populated. The live promptfoo gate (≥ 0.95) runs in `eval-pr.yml`. The
blocker is not missing infrastructure — it is a self-referencing placeholder.

### 3.1 Current state

[packages/extract/src/run.ts:20](../../packages/extract/src/run.ts#L20):

```typescript
export const CANDIDATE_PROMPT_VERSION = computePromptVersionHash();
```

This sets `CANDIDATE_PROMPT_VERSION` equal to the production hash. The shadow
extraction function
([apps/web/inngest/functions/shadow-extraction.ts](../../apps/web/inngest/functions/shadow-extraction.ts))
extracts 10% of production documents with the candidate prompt and stores results in
`audit.shadow_results`. The divergence comparison is a no-op: candidate === production.

### 3.2 Stage a real candidate

After WS1 is complete (new schema, new prompt, new few-shots, hash bump), the new
`computePromptVersionHash()` value will differ from the pre-WS1 hash. At that point:

1. Pin the **old** hash in `CANDIDATE_PROMPT_VERSION`:
   ```typescript
   export const CANDIDATE_PROMPT_VERSION = "a1b2c3d4"; // pre-WS1 hash value
   ```
2. Merge the WS1 prompt changes to main.
3. Shadow extraction now compares the new prompt (production) against the old prompt
   (candidate) on 10% of traffic.
4. After ≥ 100 shadow comparisons (approximately 1-2 weeks at current ingest rate),
   review the `audit.shadow_results` table via `/internal/shadow`. Confirm F1 on the
   new prompt is higher or equal before retiring the old candidate.

### 3.3 Cache-read integration test

The cache-read ratio gate in the Phase 7 exit criteria ("cache-read ratio ≥ 60%") is
currently unmeasurable — no test asserts `cache_read_input_tokens > 0` on a second
extraction of the same prompt.

Add to `apps/web/inngest/lib/__tests__/ingest-runner.test.ts` (or a new
`packages/extract/src/__tests__/cache-read.integration.test.ts`):

```typescript
it("second extraction of same doc returns cache_read_input_tokens > 0", async () => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const params = buildExtractionParams(SOURCE_TEXT);
  const r1 = await client.messages.create(params);
  const r2 = await client.messages.create(params);
  // 1h cache should still be warm
  expect(r2.usage.cache_read_input_tokens).toBeGreaterThan(0);
});
```

Skip in offline CI (`skipIf(!process.env.ANTHROPIC_API_KEY)`); gate it in `eval-pr.yml`
alongside the F1 eval.

### 3.4 Done signal (WS3)

```bash
# 1. Shadow is live and comparing two distinct prompt versions:
supabase db --local execute "select count(*) from audit.shadow_results where candidate_prompt_version_hash != production_prompt_version_hash"
# → count > 0 after 1 week

# 2. Live F1 gate:
pnpm --filter=@ituri/evals eval
# → aggregate F1 ≥ 0.95

# 3. Cache-read integration test green (requires API key):
ANTHROPIC_API_KEY=... pnpm --filter=@ituri/evals test:integration -- --grep "cache_read"
```

---

## Workstream 4 — Provenance completeness

**Priority: medium.** Source-quote provenance is the core invariant of this platform.
The DB trigger `tg_verify_quote_substring` ensures that any `source_quotes` row is
anchored to a verbatim substring of its parent document. The gap is backfill coverage
for documents ingested before the extraction pipeline was live, and for PDFs.

### 4.1 Current state

- Every `case_counts` row has a `source_quote_id NOT NULL` constraint — enforced.
- `tg_verify_quote_substring` rejects bad offsets at insert time.
- The [source-quote-extractor skill](.claude/skills/source-quote-extractor/SKILL.md)
  is a Claude Code agent skill (invoked by a human developer), not a runtime function.
  It is not wired into any Inngest function.
- The `extractionCapacity` kill-switch tracks running extractions but not
  source_quote coverage gaps.

### 4.2 Wire source-quote-extractor into backfill

The [backfill Inngest function](../../apps/web/inngest/functions/) already handles
document re-extraction. Extend it to also handle documents that were ingested before
the substring verification step was hardened.

Add a query to `apps/web/lib/queries/source-quotes.ts`:

```typescript
// Returns document IDs that have zero source_quotes rows
export async function getDocumentsWithoutProvenance(
  limit = 50,
): Promise<{ id: string; sourceId: string; fullText: string }[]> { ... }
```

Add a maintenance cron step to
[apps/web/inngest/functions/maintenance.ts](../../apps/web/inngest/functions/maintenance.ts)
(already runs every Sunday at 03:00 UTC) that:

1. Calls `getDocumentsWithoutProvenance(50)`.
2. Fires `BACKFILL_EXTRACTION_REQUESTED` for each.
3. Logs coverage ratio to `audit.agent_actions`.

Surface the metric on the `/internal/quality` page: `% of published case_counts rows
with source_quote_id non-null` (it already is non-null for all rows by constraint, but
track `% with verified char offsets`, i.e. offset > 0).

### 4.3 PDF provenance gap

PDF documents ingested via the WS2 PDF path will have `fullText` derived from
`pdfjs-serverless` offset accumulation. The DB trigger will enforce the substring
contract at insert time. No additional code is needed beyond WS2 if `parsePdf` is
implemented correctly. The risk (OCR artifacts, multi-column) is documented as a caveat
in WS2.

### 4.4 Done signal (WS4)

```sql
-- In Supabase SQL editor (local or prod):
select
  count(*) filter (where source_quote_id is not null) as with_provenance,
  count(*) as total,
  round(100.0 * count(*) filter (where source_quote_id is not null) / count(*), 1) as pct
from public.case_counts
where superseded_by is null;
-- Target: pct = 100 (enforced by constraint)

-- Verify offset fidelity on a sample:
select count(*) from public.source_quotes where char_start = 0 and char_end = 1;
-- Should be 0 (would indicate placeholder offsets)
```

---

## Remaining operational gaps (from docs/ROADMAP.md)

These are real but secondary to WS1–WS4. Do them before declaring "fully operational."

| Gap | File to change | Acceptance check |
|---|---|---|
| **G2 — Vercel region pin** | Vercel dashboard → Settings → Functions → Default Region: `iad1` | Vercel dashboard shows `iad1`; commit evidence to `docs/v1/exit-gate-evidence/phase-5-region-pin.md` |
| **G3 — WAF/Arcjet confirmation** | `apps/web/proxy.ts` already imports Arcjet; env var `ARCJET_KEY` must be set in prod dashboard | Run `curl -s -o /dev/null -w "%{http_code}" <prod-url>/api/mvt/...` with a spoofed IP; confirm 429; commit to `phase-7-waf-arcjet.md` |
| **G5 — Lighthouse CI fix** | `.github/workflows/ci.yml` — fix `budgetPath` and add `/map` to `urls` array | `ci.yml` Lighthouse step passes on a PR that touches the map page |
| **G6 — Cache-read integration test** | New test file (see WS3 §3.3) | Test green in `eval-pr.yml` |
| **Stale ROADMAP.md** | `docs/ROADMAP.md` — add deprecation notice pointing here | Reader sees "superseded by `docs/v1/functional_roadmap.md`" in the first paragraph |

---

## Open questions (require research before work begins)

These were submitted to a deep-research harness (106 agents, 14 verified claims) and
produced no verified answers. Do not start implementation without resolving them.

**1. PDF sitrep HTML alternatives.** Do WHO AFRO and Africa CDC publish machine-readable
HTML versions of their filovirus sitrep PDFs alongside or instead of PDFs? If so, the
HTML path (Readability) is cleaner than offset accumulation and sidesteps the OCR risk.
*Check manually:* visit the most recent WHO AFRO Bundibugyo bulletin URL and inspect
whether a `.html` version exists at the same path with `.pdf` replaced.

**2. Real-world cache-hit ratios.** At what daily document volume does the 2x write
cost of the 1h TTL break even against the 0.1x hit cost? For the current ~50 docs/day
ingest rate, the break-even is roughly: `(1h TTL write surcharge) / (hit discount) =
(2x - 1x) / (1x - 0.1x) = 1.1 extra cache-create cost per cache miss`. This is
profitable from the second document forward, but empirical hit-rate data for real
extraction pipelines is unavailable.

**3. Tier-3 source license tiers and Ituri resolution.** For each seeded source
(NCBI Virus, HDX HAPI, IOM-DTM, UCDP), confirm: (a) which qualify for
`license_tier: 'open'`; (b) which provide health-zone-level data for Ituri DRC vs
country-only; (c) what the canonical fetch interface is. Required before filing the ADRs
that gate any Tier-3 adapter work.

**4. Inngest throttle cross-function coordination.** Does the throttle primitive
coordinate budget across multiple concurrent Inngest functions sharing a key, or is it
per-function? GitHub issue #3701 (stale) suggests per-function. Confirm with Inngest
support before WS2 ships the `africacdc.org:chromium` throttle key.

---

## Out of scope for v1

Per [docs/v1/README.md](./README.md#what-is-not-in-v1) and
[ADR-0009](../adr/0009-defer-modal-epinow2-to-v2.md) /
[ADR-0020](../adr/0020-defer-priority-adapters-to-post-phase-9.md):

- **EpiNow2 / Rt nowcasting** — Bayesian Rt estimates; requires ≥ 14 days of
  observation; deferred to v2.
- **Tier-4/5 raster-tile sources** (GRID3, WorldPop, Meta-HRSL, GHSL) — population
  denominators for attack-rate layers; Phase 9 work.
- **Multi-tenant / Mastra agent surfaces** — interactive researcher queries; v2.
- **Full WCAG AAA** — Phase 8 targets AA; AAA is post-launch.
- **Multi-language UI chrome** — French/Swahili rendering behind `?lang=` toggle is
  Phase 8; full localization is v2.
- **Deploy/observability polish** (browser-side Sentry, Axiom wiring) — not blocking
  functional correctness.

---

## Verification — the fully-operational smoke test

When all four workstreams and the operational gaps above are resolved, this sequence
should succeed end-to-end in a staging environment:

```bash
# 1. Ingest one real WHO AFRO Bundibugyo sitrep PDF:
pnpm --filter @ituri/web inngest:dev &   # start Inngest dev server
# POST inngest event: { name: "ingest/who-afro.poll.requested" }
# Watch dev server: confirm triage → extract → persist steps succeed
# Confirm no chromium_required or readability_parse_failed skips

# 2. Check the resulting DB state:
supabase db --local execute "
  select cc.metric, cc.value, cc.admin2_code, sq.char_start, sq.char_end
  from public.case_counts cc
  join public.source_quotes sq on cc.source_quote_id = sq.id
  where cc.status = 'published'
  order by cc.created_at desc
  limit 10;
"
# Expect: admin2_code IS NOT NULL for zone-level rows; char offsets > 0

# 3. Run the offline F1 eval (must still pass after schema changes):
pnpm --filter=@ituri/evals test
# F1 ≥ 0.90 on all 7 fixtures

# 4. Run the live F1 eval (requires API key):
ANTHROPIC_API_KEY=... pnpm --filter=@ituri/evals eval
# F1 ≥ 0.95

# 5. Open /map in a browser (localhost:3000/map):
#    - At least one Ituri health zone is painted non-grey
#    - Clicking a zone opens the inspector panel with a source-quote citation

# 6. pgTAP suite:
pnpm db:test
# All tests green, including tg_verify_quote_substring and the new metric constraint test
```

The north-star definition of "fully operational":

> A real WHO AFRO Bundibugyo PDF sitrep, ingested end-to-end via the automated Inngest
> pipeline, produces named-health-zone case counts on the Ituri choropleth map, every
> figure anchored to its verbatim source sentence, with the live F1 eval ≥ 0.95 on the
> current extraction prompt.

---

## References

**Internal (codebase):**
- [packages/extract/src/tools.ts](../../packages/extract/src/tools.ts) — extraction schema (WS1)
- [packages/extract/src/prompt.ts](../../packages/extract/src/prompt.ts) — prompt + few-shots (WS1)
- [packages/extract/src/run.ts](../../packages/extract/src/run.ts) — `CANDIDATE_PROMPT_VERSION` (WS3)
- [apps/web/inngest/lib/persist-extraction.ts](../../apps/web/inngest/lib/persist-extraction.ts) — admin resolution (WS1)
- [packages/ingest/src/sources/who-afro.ts](../../packages/ingest/src/sources/who-afro.ts) — PDF path (WS2)
- [packages/ingest/src/sources/africa-cdc.ts](../../packages/ingest/src/sources/africa-cdc.ts) — Chromium fallback (WS2)
- [packages/ingest/src/sources/moh-drc.ts](../../packages/ingest/src/sources/moh-drc.ts) — selector hardening (WS2)
- [evals/gold-set/](../../evals/gold-set/) — 7 populated fixtures (WS3)
- [evals/lib/f1.ts](../../evals/lib/f1.ts) — F1 scorer (WS3)
- [supabase/migrations/20260527150300_init_core_tables.sql](../../supabase/migrations/20260527150300_init_core_tables.sql) — DB constraint bug (WS1)
- [supabase/migrations/20260528210000_case_counts_to_admin2.sql](../../supabase/migrations/20260528210000_case_counts_to_admin2.sql) — admin2_code column (WS1)
- [docs/v1/README.md](./README.md) — phase sequence + exit gates
- [docs/ROADMAP.md](../ROADMAP.md) — operational gap list G1–G7 (superseded here)

**External (verified in Phase B deep research, 2025-2026):**
- WHO DON602 — Bundibugyo virus disease DRC, May 15 2026:
  https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON602
- WHO DON structured data corpus analysis (PMC12152149):
  https://www.nature.com/articles/s41597-025-05276-2
- `pdfjs-serverless` (PDF.js v5.6.205, 1.6 MB bundle):
  https://github.com/johannschopplich/pdfjs-serverless
- Mozilla PDF.js `TextItem` API (no native char offsets):
  https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html
- Vercel Sandbox GA (January 30 2026, Firecracker microVMs):
  https://vercel.com/changelog/vercel-sandboxes-ga
- `vercel-labs/agent-browser` (Sandbox + Chrome wrapper):
  https://github.com/vercel-labs/agent-browser
- Anthropic prompt caching — TTL tiers, invalidation rules, pricing:
  https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Pathoplexus API documentation + CC BY-SA 4.0 license:
  https://pathoplexus.org/api-documentation
- Nextstrain / Pathoplexus integration (2025):
  https://nextstrain.org/blog/2025-08-24-Nextstrain-PPX
- HDX HAPI REST API (humanitarian data, DRC admin2):
  https://hdx-hapi.readthedocs.io/
- Inngest throttle vs rate-limit primitives:
  https://www.inngest.com/docs/guides/rate-limiting
