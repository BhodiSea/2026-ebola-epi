# Ingest pipeline — code gaps

Status as of 2026-06-02. The pipeline is structurally complete (8 source adapters, full
triage→extract→reconcile Inngest chain, DB-level substring-verify trigger, anomaly detection,
shadow runs, backfill via Anthropic Batches). These are the **surgical gaps** blocking
correct, observable operation in production.

Each gap follows the TDD template:

- **Status** — P0 (blocks correctness), P1 (operational/quality), P2 (polish/decision)
- **Problem** — what is broken and where
- **Why it matters** — observable failure at runtime
- **Failing test to write first** — file path, test name, concrete assertion
- **Files to touch** — everything that must change
- **Code sketch** — minimal patch (not complete implementation)
- **Acceptance** — observable signal the gap is closed

---

## G-1: ICD-11 mismatch between triage and extraction prompts

**Status:** P0 — blocks correctness in production

**Problem:** The triage prompt at
[packages/extract/src/agents/triage-prompt.ts:9](../../packages/extract/src/agents/triage-prompt.ts)
tells the model that Bundibugyo virus = `XN0AT` and Ebola = `1C11`/`1C12`. The extraction
prompt at [packages/extract/src/prompt.ts:12](../../packages/extract/src/prompt.ts) tells
the model Bundibugyo = `1D60.2`, Ebola Zaire = `1D60.1`, Ebola Sudan = `1D60.0`. The two
agents will emit different codes for the same event, so `outbreaks` rows created after
triage will never join `case_counts` rows written by the extraction agent — a silent data
loss that won't surface until you query across the join.

**Why it matters:** `case_counts.outbreak_id` is a FK to `outbreaks(id)`, which is looked
up by `(pathogen_icd11, country_iso3)`. If the triage agent seeds `outbreaks` with
`XN0AT/UGA` and the extraction runner then tries to upsert the same pair as `1D60.2/UGA`,
`upsertOutbreak` in
[apps/web/inngest/lib/persist-extraction.ts](../../apps/web/inngest/lib/persist-extraction.ts)
will create a **second** outbreak row — or fail on a unique constraint if one was added
later. Either way, downstream aggregations are split across two outbreak records.

**Failing test to write first:**

```
File: packages/extract/src/__tests__/icd11-consistency.test.ts
Test: "triage few-shots and extraction few-shots must reference ICD-11 codes from the
      same authoritative table"
Assertion:
  import { PATHOGEN_ICD11 } from "../icd11"
  import { TRIAGE_FEW_SHOTS } from "../agents/triage-prompt"
  import { FEW_SHOTS } from "../prompt"
  const allCodes = Object.values(PATHOGEN_ICD11)
  for (const code of extractICD11CodesFromText(TRIAGE_FEW_SHOTS)) {
    expect(allCodes).toContain(code)   // RED: XN0AT not in table
  }
  for (const code of extractICD11CodesFromText(FEW_SHOTS)) {
    expect(allCodes).toContain(code)   // GREEN once prompts use table
  }
```

**Files to touch:**

1. `packages/extract/src/icd11.ts` — **new file**, single source of truth
2. `packages/extract/src/agents/triage-prompt.ts` — import and use `PATHOGEN_ICD11`
3. `packages/extract/src/prompt.ts` — import and use `PATHOGEN_ICD11`
4. `packages/extract/src/__tests__/icd11-consistency.test.ts` — **new test**

**Code sketch:**

```ts
// packages/extract/src/icd11.ts  (new)
export const PATHOGEN_ICD11 = {
  BUNDIBUGYO:   "1D60.2",
  EBOLA_ZAIRE:  "1D60.1",
  EBOLA_SUDAN:  "1D60.0",
  EBOLA_RESTON: "1D60.3",
  MARBURG:      "1C86.0",
  MPOX:         "1E71",
  CHOLERA:      "1A00",
} as const

export type PathogenCode = (typeof PATHOGEN_ICD11)[keyof typeof PATHOGEN_ICD11]
```

```ts
// packages/extract/src/agents/triage-prompt.ts  (patch)
- const BUNDIBUGYO_CODE = "XN0AT"
- const EBOLA_CODES = ["1C11", "1C12"]
+ import { PATHOGEN_ICD11 } from "../icd11"
// update TRIAGE_FEW_SHOTS string to reference PATHOGEN_ICD11.BUNDIBUGYO etc.
```

**Acceptance:**
- `pnpm --filter @ituri/extract test icd11-consistency` passes GREEN
- Querying `select distinct pathogen_icd11 from outbreaks` after a full run returns only
  codes in `PATHOGEN_ICD11` values
- `prompt_version_hash` bumps on both the triage and extraction runners (hash covers the
  prompt string which now references different ICD codes)

---

## G-2: Source-specific env vars missing from `env.ts` and `.env.example`

**Status:** P0 — silent no-op for two adapters in production

**Problem:** `RELIEFWEB_APPNAME` is read via bare `process.env["RELIEFWEB_APPNAME"]` in
[packages/ingest/src/sources/reliefweb.ts](../../packages/ingest/src/sources/reliefweb.ts),
and `ACLED_ACCESS_TOKEN` / `ACLED_EMAIL` are similarly read in
[packages/ingest/src/sources/acled.ts](../../packages/ingest/src/sources/acled.ts). If
these vars are missing at runtime, both adapters return `[]` from `poll()` — no error is
raised, `agent_actions` records nothing, and the operator sees a "successful" zero-item
run. The Vercel dashboard will never flag this because the function exits cleanly.

**Why it matters:** ReliefWeb and ACLED together cover humanitarian-context documents and
security events in the DRC/Uganda buffer zone — datasets with no fallback. A production
deployment without these vars will silently miss all ACLED conflict events and all
ReliefWeb health reports.

**Failing test to write first:**

```
File: packages/ingest/src/__tests__/env-contract.test.ts
Test: "reliefweb adapter throws on missing RELIEFWEB_APPNAME, not returns []"
Assertion:
  expect(() => new ReliefWebAdapter({ appname: undefined }))
    .toThrow(/RELIEFWEB_APPNAME/)  // RED: today it returns [] instead
Test: "acled adapter throws on missing ACLED_ACCESS_TOKEN"
  expect(() => new ACLEDAdapter({ accessToken: undefined, email: undefined }))
    .toThrow(/ACLED_ACCESS_TOKEN/)
```

**Files to touch:**

1. `apps/web/lib/env.ts` — add `RELIEFWEB_APPNAME`, `ACLED_ACCESS_TOKEN`, `ACLED_EMAIL`
   as `z.string().optional()` in `server` block
2. `packages/ingest/src/sources/reliefweb.ts` — accept `appname` as constructor param,
   throw if undefined (not return `[]`)
3. `packages/ingest/src/sources/acled.ts` — accept `accessToken`/`email` as constructor
   params, throw if undefined
4. `packages/ingest/src/registry.ts` — thread env vars from `env.ts` into adapter
   constructors when building `ADAPTER_REGISTRY`
5. `.env.example` — add the three vars with comments
6. `packages/ingest/src/__tests__/env-contract.test.ts` — **new test**

**Code sketch:**

```ts
// apps/web/lib/env.ts  (add to server block)
RELIEFWEB_APPNAME:  z.string().optional(),
ACLED_ACCESS_TOKEN: z.string().optional(),
ACLED_EMAIL:        z.string().email().optional(),
```

```ts
// packages/ingest/src/sources/reliefweb.ts  (patch)
export class ReliefWebAdapter implements RegisteredAdapter {
  constructor(private readonly cfg: { appname: string | undefined }) {
    if (!cfg.appname) throw new Error("RELIEFWEB_APPNAME is required")
  }
  // ... remove the `if (!appname) return []` guard
}
```

**Acceptance:**
- `pnpm --filter @ituri/ingest test env-contract` passes GREEN after vars are defined
- Deploying to Vercel preview without `RELIEFWEB_APPNAME` causes the `ingest-reliefweb`
  Inngest function to fail visibly (Inngest marks run as `Failed`, retry counter
  increments) rather than succeed with zero items
- `.env.example` lists all three vars with `# required for ReliefWeb adapter` comments

---

## G-3: `@ituri/ingest` has no `backfill` script — `ingest-once.yml` is broken

**Status:** P0 — CI workflow fails on first invocation

**Problem:**
[.github/workflows/ingest-once.yml](../../.github/workflows/ingest-once.yml) runs:
```
pnpm --filter @ituri/ingest run backfill -- --adapter "$ADAPTER"
```
No `backfill` script exists in
[packages/ingest/package.json](../../packages/ingest/package.json). The workflow will
exit non-zero on `pnpm run backfill: command not found` before a single byte of ingest
work happens.

**Why it matters:** This is the only manual one-shot ingest escape hatch (e.g. for
historical backfills or incident recovery). Without it an operator must either know to
trigger `ingest/<slug>.poll` via the Inngest dashboard manually, or write ad-hoc scripts.

**Failing test to write first:**

```
File: .github/workflows/__tests__/ingest-once.test.sh  (shell/act test)
— or —
File: packages/ingest/src/__tests__/backfill-bin.test.ts
Test: "bin/backfill.ts --adapter who-don prints 'Poll complete' and exits 0 in CI
      (using INNGEST_EVENT_KEY stub)"
Assertion: script exits 0 and stdout contains "events_sent" key
```

**Files to touch:**

1. `packages/ingest/bin/backfill.ts` — **new file**, CLI entry point
2. `packages/ingest/package.json` — add `"backfill": "tsx bin/backfill.ts"` to `scripts`
3. `.github/workflows/ingest-once.yml` — verify it works post-fix (no code change needed
   if the script is added)

**Code sketch:**

```ts
// packages/ingest/bin/backfill.ts  (new)
import { parseArgs } from "node:util"
import { ADAPTER_REGISTRY } from "../src/registry"

const { values } = parseArgs({ options: { adapter: { type: "string" } }, strict: true })
if (!values.adapter) { console.error("--adapter required"); process.exit(1) }

const adapter = ADAPTER_REGISTRY[values.adapter]
if (!adapter) {
  console.error(`Unknown adapter: ${values.adapter}`)
  console.error(`Valid: ${Object.keys(ADAPTER_REGISTRY).join(", ")}`)
  process.exit(1)
}

const items = await adapter.poll()
console.log(JSON.stringify({ adapter: values.adapter, items_found: items.length }))

// Emit ingest/<slug>.poll via Inngest event key (HTTP POST, no SDK needed)
const res = await fetch("https://inn.gs/e/" + process.env.INNGEST_EVENT_KEY, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: `ingest/${values.adapter}.poll`, data: {} }),
})
if (!res.ok) throw new Error(`Inngest event send failed: ${res.status}`)
console.log(JSON.stringify({ events_sent: 1 }))
```

**Acceptance:**
- `pnpm --filter @ituri/ingest run backfill -- --adapter who-don` exits 0 in CI with a
  valid `INNGEST_EVENT_KEY` secret
- `.github/workflows/ingest-once.yml` passes in a dry-run `act` invocation

---

## G-4: `sources.last_fetched_at` and `sources.parser_version` are never written

**Status:** P0 — UI displays `—` for every source; operator cannot tell if polling is alive

**Problem:** The `public.sources_with_health` view (migration
[20260601000000_sources_with_health_view.sql](../../supabase/migrations/20260601000000_sources_with_health_view.sql))
surfaces `last_fetched_at` and `parser_version` columns that the sources page at
[apps/web/app/internal/sources/page.tsx](../../apps/web/app/internal/sources/page.tsx)
renders. No code path writes either column. The `RegisteredAdapter` interface in
[packages/ingest/src/adapter.ts](../../packages/ingest/src/adapter.ts) has no `version`
field, so there is nothing to write even if the write path existed.

**Why it matters:** An operator cannot distinguish "adapter ran successfully but found
nothing new" from "adapter never ran." The primary health-check signal on the internal
dashboard is permanently blank.

**Failing test to write first:**

```
File: apps/web/inngest/lib/__tests__/ingest-runner.test.ts
Test: "runPerSourceIngest writes last_fetched_at after a successful poll"
Assertion:
  await runPerSourceIngest(fakeAdapter, stepMock)
  const [sources_row] = await db
    .select({ last_fetched_at: sources.last_fetched_at, parser_version: sources.parser_version })
    .from(sources).where(eq(sources.slug, "fake-adapter"))
  expect(sources_row.last_fetched_at).not.toBeNull()   // RED: always null today
  expect(sources_row.parser_version).toBe("1.0.0")
```

**Files to touch:**

1. `packages/ingest/src/adapter.ts` — add `readonly version: string` to
   `RegisteredAdapter` interface
2. Each adapter in `packages/ingest/src/sources/*.ts` — add `readonly version = "1.0.0"`
   (or extract from package.json)
3. `apps/web/inngest/lib/ingest-runner.ts` — after `step.run("poll")` succeeds, add
   `step.run("update-source-health", ...)` to write `last_fetched_at + parser_version`
4. `apps/web/inngest/lib/__tests__/ingest-runner.test.ts` — extend existing test

**Code sketch:**

```ts
// apps/web/inngest/lib/ingest-runner.ts  (add after poll step)
await step.run("update-source-health", async () => {
  await db
    .update(sources)
    .set({ lastFetchedAt: new Date(), parserVersion: adapter.version })
    .where(eq(sources.slug, adapter.sourceSlug))
})
```

**Acceptance:**
- After a single `runPerSourceIngest` call, `select last_fetched_at, parser_version from
  sources where slug = 'who-don'` returns non-null values
- `/internal/sources` page shows a timestamp instead of `—` for WHO DON
- `parser_version` column shows a semver string matching the adapter's declared version

---

## G-5: `ingest-who-don` bypasses the shared `runPerSourceIngest` runner

**Status:** P0 — WHO DON ingestion misses Chromium fallback, skip logging, and mime/language metadata

**Problem:**
[apps/web/inngest/functions/ingest-who-don.ts](../../apps/web/inngest/functions/ingest-who-don.ts)
was written before the shared runner
[apps/web/inngest/lib/ingest-runner.ts](../../apps/web/inngest/lib/ingest-runner.ts)
existed. It calls the legacy free functions `pollWHODON` + `fetchAndParseDocument` and
passes `{publishedAt, sha256, sourceId, url, fullText}` directly to `upsertDocument` —
omitting `mimeType`, `language`, `etag`, and `lastModified` that all other 7 adapters
populate. It also never emits `agent_actions:ingest_skipped` on fetch/parse failures, and
never invokes the Chromium-sandbox fallback path in
[apps/web/inngest/lib/fetch-with-sandbox.ts](../../apps/web/inngest/lib/fetch-with-sandbox.ts)
for JS-rendered pages.

**Why it matters:** WHO DON is a high-priority source (daily cron, 00:00 UTC; previously 30-minute, dropped for cost/rate-limit). Missing
`mimeType` makes the `sources_with_health` view incomplete. The absence of skip logging
means parse failures are invisible. The Chromium gap matters less today (WHO DON pages
are Readability-parseable) but will bite if WHO restructures their site.

**Failing test to write first:**

```
File: apps/web/inngest/functions/__tests__/ingest-who-don.test.ts
Test: "ingest-who-don emits ingest_skipped agent_action when fetch returns 304"
Assertion:
  // stub adapter.fetch to return { skipped: "304 Not Modified" }
  await runFn(event, stepMock)
  expect(db.insert).toHaveBeenCalledWith(agentActions)
  expect(insertArgs.action).toBe("ingest_skipped")   // RED: inline impl never does this
Test: "ingest-who-don writes mimeType and language to documents row"
  expect(upsertDocumentArgs.mimeType).toBe("text/html")  // RED: currently undefined
```

**Files to touch:**

1. `apps/web/inngest/functions/ingest-who-don.ts` — replace inline logic with
   `runPerSourceIngest(whoDONAdapter, step)`
2. `packages/ingest/src/sources/who-don.ts` — confirm adapter already exports a
   `whoDONAdapter` conforming to `RegisteredAdapter`; if the export is the legacy free
   functions only, add the adapter object
3. `apps/web/inngest/functions/__tests__/ingest-who-don.test.ts` — extend existing test

**Code sketch:**

```ts
// apps/web/inngest/functions/ingest-who-don.ts  (replace body)
import { runPerSourceIngest } from "../../lib/ingest-runner"
import { whoDONAdapter } from "@ituri/ingest"

export const ingestWHODON = inngest.createFunction(
  buildIngestConfig("who-don", "who.int"),
  [{ cron: whoDONAdapter.pollInterval }, { event: pollEventName("who-don") }],
  async ({ step }) => runPerSourceIngest(whoDONAdapter, step),
)
```

**Acceptance:**
- `pnpm --filter @ituri/web test ingest-who-don` passes GREEN for skip-logging and
  mimeType assertions
- A live run of `ingest/who-don.poll` produces a `documents` row with non-null `mimeType`
  and `language` columns
- Inngest run inspector shows `fetch-with-sandbox` step for any item that returns
  `skipped: chromium_required` (verifiable once WHO DON page triggers the condition)

---

## G-6: No pre-deploy migration runner

**Status:** P1 — schema drift accumulates silently; operator must push migrations manually

**Problem:** Nothing in `.github/workflows/` automatically applies new SQL migrations to
the linked Supabase project when PRs merge to `main`. The only guard is a `types-drift`
check in `ci.yml` which compares generated TypeScript types — it will fail if types are
stale but won't actually push the migration. The `db-test.yml` workflow boots a **local**
Supabase stack; it does not touch the remote project.

**Why it matters:** Every workstream lands new migrations (`supabase/migrations/`). If the
deploy workflow is not wired, the remote schema will lag the codebase by however many
undeployed migrations exist at the time of a production deploy, and the Inngest functions
will encounter missing tables/columns at runtime.

**Failing test to write first:**
This gap is a CI workflow file — it has no Vitest unit test. The acceptance check is
functional. Write a workflow file and validate it with `act` (GitHub Actions local runner):

```
File: .github/workflows/db-push.yml  (new)
Manual test: act push -e .github/test-events/push-migration.json --secret-file .env.ci
Expected: workflow completes, supabase db push exits 0
```

**Files to touch:**

1. `.github/workflows/db-push.yml` — **new file**
2. `.github/test-events/push-migration.json` — **new test event** for `act`
3. GitHub repository secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`,
   `SUPABASE_DB_PASSWORD` (the secret names; values configured in GitHub Settings)

**Code sketch:**

```yaml
# .github/workflows/db-push.yml
name: Push DB migrations
on:
  push:
    branches: [main]
    paths: ["supabase/migrations/**"]
concurrency:
  group: db-push
  cancel-in-progress: false   # never cancel — partial migration is worse than a queue

jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env: { SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }} }
      - run: supabase db push --include-all
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD:  ${{ secrets.SUPABASE_DB_PASSWORD }}
```

**Acceptance:**
- Merging a PR that adds a new migration to `supabase/migrations/` triggers the
  `db-push` workflow automatically
- Workflow exits 0 and the migration appears in
  `select * from supabase_migrations.schema_migrations` on the remote project
- Simultaneous pushes are serialized (concurrency group prevents races)

---

## G-7: No eval gold-set for the triage agent

**Status:** P1 — triage classifier has zero regression gate

**Problem:** [evals/gold-set/](../../evals/gold-set/) contains 7 extraction fixtures.
No triage gold-set exists for the Haiku/Sonnet classifier in
[apps/web/inngest/functions/triage-document.ts](../../apps/web/inngest/functions/triage-document.ts)
and [packages/extract/src/agents/triage.ts](../../packages/extract/src/agents/triage.ts).
A prompt change to the triage system instruction or few-shots won't be caught by any CI
gate.

**Why it matters:** The triage decision determines whether a document even enters the
extraction pipeline. A false-negative on `is_outbreak` silently drops a sitrep. Given
the ICD-11 mismatch in G-1, this is a second silent failure mode in the same pipeline
stage.

**Failing test to write first:**

```
File: evals/__tests__/triage-gold-set.test.ts  (new)
Test: "triage gold-set accuracy ≥ 0.95 on is_outbreak"
Assertion:
  // Runs against response-fixture.json, not live API
  const accuracy = correct / fixtures.length
  expect(accuracy).toBeGreaterThanOrEqual(0.95)  // RED: no fixtures exist yet
```

**Files to touch:**

1. `evals/triage-gold-set/` — **new directory** with 4 fixture sub-directories:
   - `who-don-bundibugyo/` — positive outbreak
   - `who-routine-policy/` — negative, non-outbreak
   - `who-afro-french-bulletin/` — positive, French-language
   - `novel-pathogen-country/` — positive, novel pair flag expected
2. Each fixture: `source.txt`, `ground-truth.json` (`is_outbreak, pathogen_icd11,
   country_iso3, novelty`), `response-fixture.json`
3. `evals/__tests__/triage-gold-set.test.ts` — **new test file**
4. `evals/regen-fixture.mjs` — extend to support triage (currently extraction-only)

**Code sketch:**

```ts
// evals/__tests__/triage-gold-set.test.ts
import { buildTriageParams } from "@ituri/extract/agents/triage"
// load fixtures, run parseTriageResponse against response-fixture.json
// assert F1 on is_outbreak ≥ 0.95 and pathogen_icd11 ≥ 0.90
```

**Acceptance:**
- `pnpm test triage-gold-set` exits 0 with at least 4 fixtures
- A change to `TRIAGE_SYSTEM` that degrades accuracy below 0.95 fails CI in `eval-pr.yml`
- `promptfoo.config.yaml` gains a `triage` provider so the nightly `llm-eval.yml` covers
  this agent

---

## G-8: No eval gold-set for the reconcile agent

**Status:** P1 — Opus reconciler has zero regression gate

**Problem:** No reconcile gold-set exists for
[apps/web/inngest/functions/reconcile-counts.ts](../../apps/web/inngest/functions/reconcile-counts.ts)
and [packages/extract/src/agents/reconcile.ts](../../packages/extract/src/agents/reconcile.ts).
A cross-source divergence ≥25% triggers this agent — exactly the scenario where a wrong
decision (wrong `winner_id`, or false `escalate: true`) creates a misleading public-facing
number.

**Why it matters:** The reconciler decides which `case_counts` row becomes the canonical
figure (via `superseded_by`). An incorrect arbitration silently publishes the wrong count.
This agent also can escalate to `conflict_unresolvable` which creates an `incidents` row
and pages Slack — a false positive here burns operator time.

**Failing test to write first:**

```
File: evals/__tests__/reconcile-gold-set.test.ts  (new)
Test: "reconcile gold-set: winner_id matches ground-truth ≥ 0.85"
Assertion:
  const accuracy = correct / fixtures.length
  expect(accuracy).toBeGreaterThanOrEqual(0.85)  // RED: no fixtures exist yet
```

**Files to touch:**

1. `evals/reconcile-gold-set/` — **new directory** with 3 fixture sub-directories:
   - `clear-winner/` — WHO DON count (higher trust_score) vs ECDC CDTR (lower) for same
     metric/date. Expected: `winner_id = who_don_row_id`.
   - `tied-resolvable/` — same source-trust but different dates; more-recent wins.
     Expected: specific `winner_id`.
   - `unresolvable/` — same date, same trust, conflicting counts with no context.
     Expected: `escalate: true`.
2. `evals/__tests__/reconcile-gold-set.test.ts` — **new test file**
3. `evals/regen-fixture.mjs` — extend for reconcile

**Acceptance:**
- `pnpm test reconcile-gold-set` exits 0 with 3 fixtures
- `eval-pr.yml` runs reconcile gold-set on PRs touching `packages/extract/src/agents/
  reconcile*.ts`

---

## G-9: F1 scorer is admin-blind; zone-level extraction has no regression gate

**Status:** P1 — WS1 admin_name disambiguation has no quality signal

**Problem:** [evals/lib/f1.ts:7-8](../../evals/lib/f1.ts) explicitly excludes `admin_name`
from the tuple key used for matching: the comment reads "admin_name and source_quote are
intentionally excluded." This means a change to the extraction prompt's zone-disambiguation
guidance — or a regression in `resolveAndLogAdmin2` in
[apps/web/inngest/lib/persist-extraction.ts](../../apps/web/inngest/lib/persist-extraction.ts)
— will not move the F1 score and will not fail CI.

**Why it matters:** The health-zone map is the primary public output. A model that
extracts correct national counts but wrong admin_name ("Ituri" vs "Djugu") will pass the
existing eval gate at ≥0.90 F1 while producing a blank or mislabelled map.

**Failing test to write first:**

```
File: evals/__tests__/gold-set-zone.test.ts  (new)
Test: "zone-level F1 ≥ 0.70 on bundibugyo-ituri-2026-04-20 fixture"
Assertion:
  const f1Zone = computeF1Zone(predicted, groundTruth)  // includes admin_name
  expect(f1Zone).toBeGreaterThanOrEqual(0.70)  // RED: scorer doesn't exist yet
```

**Files to touch:**

1. `evals/lib/f1-zone.ts` — **new file**, zone-aware F1 scorer (tuple key includes
   `admin_name.toLowerCase().trim()`)
2. `evals/__tests__/gold-set-zone.test.ts` — **new test** that runs against existing
   `bundibugyo-ituri-2026-04-20` fixture (which already has admin_name in ground-truth)
3. `evals/gold-set/bundibugyo-ituri-2026-04-20/ground-truth.json` — verify `admin_name`
   is present in each tuple (may need backfilling)

**Code sketch:**

```ts
// evals/lib/f1-zone.ts
export function tupleKeyZone(row: ExtractionRow): string {
  return [
    row.pathogen_icd11,
    row.country_iso3,
    row.metric,
    String(row.value),
    row.as_of,
    (row.admin_name ?? "").toLowerCase().trim(),
  ].join("|")
}
```

**Acceptance:**
- `pnpm test gold-set-zone` exits 0 and reports a zone F1 ≥ 0.70
- A simulated admin_name regression (all admin_names cleared) drops the zone F1 visibly
  below the threshold and fails the test

---

## G-10: Run-button poll timeout may truncate slow PDF runs

**Status:** P1 — operator sees `timeout` even when the run succeeds

**Problem:**
[apps/web/components/internal/run-ingest-button.tsx](../../apps/web/components/internal/run-ingest-button.tsx)
polls `/api/internal/ingest-runs/{eventId}` every 2 seconds for 150 iterations — a hard
5-minute cap. A WHO AFRO PDF parse (via `unpdf` WASM) + Sonnet 4.6 extraction with one
retry can easily take 6–8 minutes. The UI transitions to the `timeout` state and the
operator assumes failure; the run actually completes moments later with no feedback.

**Why it matters:** On a first deployment, every manual trigger from `/internal/sources`
will appear to time out while actually running. This erodes confidence in the system
exactly when confidence is most needed.

**Failing test to write first:**

```
File: apps/web/components/internal/__tests__/run-ingest-button.test.tsx
Test: "shows Inngest run URL link when poll times out"
Assertion:
  // advance fake timers past 5 min
  expect(screen.getByRole("link", { name: /view in inngest/i })).toBeInTheDocument()
  // RED: today timeout state has no such link
Test: "uses exponential backoff (2s, 4s, 8s, capped at 30s)"
  // assert fetch call intervals via fake timers
```

**Files to touch:**

1. `apps/web/components/internal/run-ingest-button.tsx` — extend poll loop
2. `apps/web/components/internal/__tests__/run-ingest-button.test.tsx` — new or extended
   test

**Code sketch:**

```ts
// run-ingest-button.tsx  (patch poll loop)
const MAX_WAIT_MS = 15 * 60 * 1000   // 15 min
const BASE_INTERVAL = 2_000
const MAX_INTERVAL = 30_000

let waited = 0, interval = BASE_INTERVAL
while (waited < MAX_WAIT_MS) {
  await sleep(interval)
  waited += interval
  interval = Math.min(interval * 2, MAX_INTERVAL)
  const res = await fetch(`/api/internal/ingest-runs/${eventId}`)
  const data = await res.json()
  if (data.status === "completed") return { status: "done" }
  if (data.status === "failed")    return { status: "failed" }
}
// On timeout: surface the Inngest run URL for manual inspection
return {
  status: "timeout",
  inngestUrl: `https://app.inngest.com/env/production/runs?event=${eventId}`,
}
```

**Acceptance:**
- Fake-timer test passes: timeout state renders an Inngest link and poll used exponential
  backoff
- Manual smoke test: a slow WHO AFRO PDF run completes within the 15-minute window without
  a false timeout

---

## G-11 (DECISION): Raw-bytes storage — original PDFs and HTML are not persisted

**Status:** P2 — decision required before implementing

**Problem:** The ingest runner fetches raw bytes, hashes them, extracts `full_text`, then
**discards the bytes**. Only `documents.full_text` + `documents.sha256` (a hash of the
raw fetch bytes) survive to the DB.
[apps/web/inngest/lib/persist-extraction.ts](../../apps/web/inngest/lib/persist-extraction.ts)
`upsertDocument` takes no `rawBytes` argument.
[supabase/config.toml](../../supabase/config.toml) has no `[storage.buckets.*]` block.

**Why it matters:** If a WHO DON URL is restructured (as happened with the 2019 archive),
the original PDF is gone. Provenance survives via DB trigger (quote text must match
`full_text`) but the original byte sequence that a lawyer or auditor would want is not
archived. This is currently accidental — no ADR covers this decision.

**Recommendation:** Write raw bytes to a **Supabase Storage** bucket `source-bytes/`
keyed by `${sha256hex}.{ext}` (mime-derived extension). Rationale: (a) same trust
boundary as the DB row, (b) avoids a second vendor, (c) 50 MiB ceiling covers all sitrep
PDFs observed to date.

**Files to touch (if accepted):**

1. `supabase/migrations/<timestamp>_create_source_bytes_bucket.sql` — create bucket,
   set `public = false`, RLS: `service_role` only
2. `packages/ingest/src/fetch-helper.ts` — return `rawBytes: Uint8Array` from
   `fetchWithConditionalGet`; adapter `FetchResult` carries it through
3. `packages/ingest/src/adapter.ts` — add `rawBytes?: Uint8Array` to `FetchResult`
4. `apps/web/inngest/lib/persist-extraction.ts` `upsertDocument` — accept `rawBytes?`,
   upload to Supabase Storage with the Supabase JS admin client if present
5. `apps/web/inngest/lib/ingest-runner.ts` — pass `rawBytes` from adapter fetch result
   into `upsertDocument`

**Acceptance (if accepted):**
- After a full WHO DON ingest run, every `documents` row has a corresponding object in
  `source-bytes/` (verifiable via Supabase Storage dashboard)
- `select sha256, url from documents where url like '%who.int%' limit 1` — the sha256
  matches the object key in `source-bytes/`

**If rejected:** Write an ADR (`docs/adr/0023-no-raw-byte-storage.md`) explaining the
deliberate choice to rely on upstream URL availability plus `documents.sha256` as the
de-facto integrity check.

---

## G-12 (DECISION): Skill ↔ code drift in `source-quote-extractor`

**Status:** P2 — decision required; no code change needed if skill is shrunk

**Problem:**
[.claude/skills/source-quote-extractor/SKILL.md](../../.claude/skills/source-quote-extractor/SKILL.md)
promises four behaviours that are **not implemented anywhere in the codebase**:

| Claim in SKILL.md | Reality |
|---|---|
| Levenshtein ≤ 5 fallback for offset drift | Not implemented; `resolveSubstring` in [packages/extract/src/verify.ts](../../packages/extract/src/verify.ts) uses verbatim `indexOf` only |
| `ON CONFLICT (document_id, char_start, char_end) DO UPDATE` upsert | No unique constraint on those three columns in any migration |
| NFKC normalization before comparison | Not implemented |
| Vision/tesseract OCR fallback for image-only PDFs | Not implemented; no `extraction_method` column on `audit.extraction_runs` |

**Why it matters:** The skill is what Claude agents (including this codebase's own
`@extraction-engineer` sub-agent) read when they work on provenance code. Aspirational
claims in a skill file will cause future agents to implement features that conflict with
the real schema, or to trust that these guards exist when they don't.

**Recommendation:** **Shrink the skill** to match real behaviour. Split future aspirations
into a separate `docs/ingest/03-future-work-ocr.md` note.

**Files to touch:**

1. `.claude/skills/source-quote-extractor/SKILL.md` — rewrite to document only:
   verbatim substring match (`indexOf` fallback when LLM offsets are off-by-one),
   double-layer enforcement (app-level `resolveSubstring` + DB trigger
   `tg_verify_quote_substring`), rejection on no match, GitHub issue + `incidents` row
   on second failure
2. `docs/ingest/03-future-work-ocr.md` — new note capturing what the skill was _aiming_
   for: vision OCR, NFKC normalization, Levenshtein fuzzy match — with the schema changes
   each would require

**Acceptance:**
- No "Levenshtein", "NFKC", "ON CONFLICT", or "tesseract" appear in the shrunk SKILL.md
- The `@extraction-engineer` sub-agent, when asked to add a new extraction, no longer
  references an upsert key that doesn't exist

---

## G-13: Substring-verify failure — GitHub issue path has no test coverage

**Status:** P2 — edge-case safety net is untested

**Problem:**
[apps/web/inngest/functions/extract-document.ts:86-108](../../apps/web/inngest/functions/extract-document.ts)
opens a GitHub issue when a `substring_verify_fail` occurs on attempt ≥ 1 (i.e. the
second try). Test coverage exists for the trigger condition (`substring_verify_fail`
thrown by `resolveSubstring`) but not for the downstream GitHub API call. The CI
environment has no `GITHUB_TOKEN` so the call has never been exercised in a test.

**Why it matters:** If the GitHub issue creation silently fails (network error, token
scope, wrong `GITHUB_REPO` format), the operator never learns that a document has a
provenance failure. The `incidents` row is still written, but the GitHub issue alert is
the higher-visibility signal.

**Failing test to write first:**

```
File: apps/web/inngest/functions/__tests__/extract-document.test.ts
Test: "opens GitHub issue on second substring_verify_fail"
Assertion (using msw or nock to intercept GitHub API):
  server.use(
    http.post("https://api.github.com/repos/*/issues", async ({ request }) => {
      const body = await request.json()
      expect(body.title).toMatch(/substring_verify_fail/)
      return HttpResponse.json({ number: 42 })
    })
  )
  await runExtractionWithSubstringFailure({ attempt: 1 })
  expect(githubApiCalled).toBe(true)   // RED: no such assertion today
```

**Files to touch:**

1. `apps/web/inngest/functions/__tests__/extract-document.test.ts` — add `msw` handler
   and assertion for the GitHub API call shape
2. `apps/web/inngest/functions/extract-document.ts` — no code change needed if the
   existing implementation is correct; the test is the gap

**Acceptance:**
- `pnpm --filter @ituri/web test extract-document` passes with the new assertion
- The test runs in CI without `GITHUB_TOKEN` (the `msw` handler intercepts before the
  real network call is made)

---

---

## G-14: Run Inspector REST API uses wrong auth token

**Status:** P1 — internal pipeline dashboard may be broken in production

**Problem:** Both
[apps/web/app/api/internal/ingest-runs/[eventId]/route.ts](../../apps/web/app/api/internal/ingest-runs/%5BeventId%5D/route.ts)
and
[apps/web/app/internal/pipeline/page.tsx](../../apps/web/app/internal/pipeline/page.tsx)
use `INNGEST_SIGNING_KEY` as a Bearer token for calls to
`https://api.inngest.com/v1/events/{eventId}/runs` and
`https://api.inngest.com/v1/runs`. This was introduced in commit `00d9cb7` ("fix: ingest
pipeline").

A multi-source adversarial research pass (114 agents, 31 sources) refuted the claim
that `INNGEST_SIGNING_KEY` is the correct Bearer token for these REST endpoints (0-3
vote). The signing key is documented as securing the server↔Inngest webhook channel —
its role as a REST API read credential is unconfirmed. If Inngest requires a different
scoped API key for the Run Inspector endpoints, both pages will return 401s and the
pipeline dashboard / run-button status will show failures that are authentication
failures, not real run failures.

**Why it matters:** The pipeline dashboard (`/internal/pipeline`) and the Run button's
status polling are both gated on this auth. A wrong token means the operator can't
observe pipeline state through the app UI.

**Failing test to write first:**

```
File: apps/web/app/api/internal/ingest-runs/__tests__/route.test.ts
Test: "returns Inngest run status when auth succeeds"
Assertion (using msw):
  server.use(
    http.get("https://api.inngest.com/v1/events/*/runs", ({ request }) => {
      const auth = request.headers.get("Authorization")
      // Assert the token format once we know the correct one
      return HttpResponse.json({ data: [{ status: "Completed" }] })
    })
  )
```

**Files to touch:**

1. `apps/web/app/api/internal/ingest-runs/[eventId]/route.ts` — update auth header
2. `apps/web/app/internal/pipeline/page.tsx` — update auth header
3. `apps/web/lib/env.ts` — add `INNGEST_API_KEY` as optional env var if a separate key
   is needed
4. `.env.example` — document the new var

**Resolution path:**

Verify the correct auth mechanism at:
https://www.inngest.com/docs/examples/fetch-run-status-and-output

Three possibilities:
- (a) `INNGEST_SIGNING_KEY` is actually correct and research was wrong — test with a
  live Inngest account before changing anything.
- (b) A separate API key is needed — add `INNGEST_API_KEY` to env and use it as Bearer.
- (c) Basic auth or a different scheme is used — update accordingly.

**Acceptance:**
- Clicking **Run** on `/internal/sources` and watching the status badge: it must reach
  `Done` or `Failed` (not `Timeout` caused by 401 responses from Inngest)
- `/internal/pipeline` page renders real run history from Inngest (not an empty state
  caused by a 401)

---

## Summary table

| Gap | Status | Category | Effort |
|---|---|---|---|
| G-1: ICD-11 mismatch | P0 | Correctness | M |
| G-2: Missing env vars for ACLED + ReliefWeb | P0 | Correctness | S |
| G-3: Broken `backfill` script | P0 | CI | S |
| G-4: `last_fetched_at` / `parser_version` never written | P0 | Observability | S |
| G-5: WHO DON bypasses shared runner | P0 | Correctness | S |
| G-6: No migration auto-push workflow | P1 | CI | S |
| G-7: No triage eval gold-set | P1 | Quality | M |
| G-8: No reconcile eval gold-set | P1 | Quality | M |
| G-9: F1 scorer admin-blind | P1 | Quality | S |
| G-10: Run-button poll timeout | P1 | UX | S |
| G-14: Run Inspector REST API wrong auth token | P1 | Observability | S |
| G-11: Raw-bytes not stored (decision) | P2 | Architecture | L (if accepted) |
| G-12: Skill ↔ code drift (decision) | P2 | Documentation | S |
| G-13: Substring-verify GitHub path untested | P2 | Test coverage | S |

Effort key: S = < 1 day, M = 1–3 days, L = > 3 days.

Recommended execution order: G-1 first (ICD-11 mismatch corrupts data silently), then G-14
(verify live with a real Inngest account — may be a false alarm), then G-2 and G-5 together
(same adapter layer), then G-3 and G-4 (observability), then G-6 (CI). G-7 through G-10 can
run in parallel. G-11 requires a product decision before starting. G-12 and G-13 can be done
any time.
