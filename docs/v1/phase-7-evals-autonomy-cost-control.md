# Phase 7 — Evals, autonomy, and cost control

## Goal

Hand-curate a ~50-example gold set, wire Promptfoo + Anthropic Message Batches API for nightly evals, flip from "manual review every row" to the four-escalation-class autonomy model, deploy Langfuse v3 self-hosted, retarget the OTel exporter from `audit.llm_traces` to Langfuse, wire the cost kill switch (Edge Config + Postgres trigger), and add the Maintenance Agent for weekly source health. At the end of this phase, the system runs 7 consecutive days with zero non-escalation-class human interventions, nightly batch evals report F1 ≥ 0.95 on all sources, and the cache-read ratio is ≥ 60% on every active model.

---

## Entry preconditions

- Phase 6 exit gate met: synthetic WHO/ECDC disagreement reconciled end-to-end.
- A baseline gold set of at least 20 examples exists from Phase 2–6 extraction runs (the full 50 is curated in Phase 7).
- Langfuse v3 infrastructure available: a 4 vCPU / 16 GB VM (Hetzner CX42, DigitalOcean 4cpu-16gb, or Fly.io equivalent) with Docker Compose, ClickHouse ≥ 24.3, Redis, S3-compatible blob storage.
- Vercel Edge Config item exists: `extraction_enabled: true`, `daily_anthropic_spend_usd_cap: 50`.
- Slack webhook URL for escalation notifications (`SLACK_WEBHOOK_URL` in env).
- Twilio credentials for emergency SMS (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in env).
- `GITHUB_TOKEN` with `issues: write` permission for the Maintenance Agent.

---

## Deliverables

### Schema / migrations

**`supabase/migrations/<timestamp>_anthropic_usage_log.sql`** — the usage log that powers the kill switch:

```sql
begin;
create table if not exists audit.anthropic_usage_log (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  model_id text not null,
  cache_read_input_tokens integer not null default 0,
  cache_creation_input_tokens integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10,6),
  logged_at timestamptz not null default now()
);
-- append-only
revoke update, delete on audit.anthropic_usage_log from authenticated, anon;

-- Kill switch trigger: sums today's spend after each insert
create or replace function audit.tg_check_daily_spend()
returns trigger language plpgsql security definer
set search_path = '' as $$
declare
  today_spend numeric;
  cap numeric;
begin
  select coalesce(sum(cost_usd), 0) into today_spend
  from audit.anthropic_usage_log
  where logged_at >= current_date;

  -- Set via: ALTER DATABASE postgres SET app.daily_anthropic_spend_cap = '50';
  -- or via Supabase Dashboard → Settings → Database → Configuration → Custom.
  -- Falls back to 50 USD if unset. The Vercel Edge Config cap is the primary control;
  -- this GUC is defense-in-depth.
  select coalesce((current_setting('app.daily_anthropic_spend_cap', true))::numeric, 50)
  into cap;

  if today_spend > cap then
    perform net.http_post(
      url := current_setting('app.vercel_edge_config_update_url'),
      body := '{"extraction_enabled": false}'::jsonb,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.vercel_edge_config_token'),
        'Content-Type', 'application/json'
      )
    );
    insert into audit.agent_actions (agent, action, payload)
    values ('kill-switch', 'extraction_disabled', jsonb_build_object('trigger', 'daily_spend_cap', 'spend', today_spend, 'cap', cap));
  end if;
  return new;
end; $$;

create trigger anthropic_usage_log_check_spend
  after insert on audit.anthropic_usage_log
  for each row execute function audit.tg_check_daily_spend();
commit;
```

**`supabase/migrations/<timestamp>_shadow_results.sql`** — table for shadow-run comparison data:

```sql
begin;
create table if not exists audit.shadow_results (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id),
  candidate_version text not null,
  production_run_id uuid references audit.extraction_runs(id),
  field_variances jsonb not null default '{}'::jsonb,
  promoted boolean not null default false,
  created_at timestamptz not null default now()
);
create index shadow_results_doc_version_idx on audit.shadow_results (document_id, candidate_version);
-- append-only: shadow results must not be modified after write
revoke update, delete on audit.shadow_results from authenticated, anon;
commit;
```

### Code — gold set

**`evals/gold-set/`** directory structure:

```
evals/gold-set/
  bundibugyo-ituri-2026-04-20/
    source.html          (the actual WHO DON page)
    ground-truth.json    (array of expected extracted rows)
  marburg-tz-2026-05-01/
    ...
  ebola-zaire-cod-2019/
    ...
  ebola-sudan-ssd-2022/
    ...
  mpox-cod-2023/
    ...
  cholera-cod-2024/
    ...
```

Each `ground-truth.json` entry:
```json
{
  "pathogen_icd11": "1D24.0",
  "country_iso3": "COD",
  "metric": "confirmed",
  "value": 142,
  "as_of_date": "2026-05-26",
  "source_quote": {
    "char_start": 543,
    "char_end": 602,
    "quote_text": "a total of 142 confirmed cases of Ebola virus disease"
  }
}
```

Target: ~50 examples across 6 pathogen contexts, including edge cases: reports with no confirmed figures (should extract zero rows), reports with figures in French (should handle via language detection), reports with ambiguous dates (should default to document publication date).

### Code — `evals/promptfoo.config.yaml`

```yaml
providers:
  - id: anthropic:messages:claude-sonnet-4-6
    config:
      apiKey: ${ANTHROPIC_API_KEY}
      cacheEnabled: true
# Note: the provider format is anthropic:messages:<model-id>, not anthropic:<model-id>.
# Using the wrong format causes promptfoo to fall back to the default provider silently.

prompts:
  - file://packages/extract/src/prompt.ts:STATIC_INSTRUCTIONS

tests:
  - vars:
      document: file://evals/gold-set/bundibugyo-ituri-2026-04-20/source.html
    assert:
      - type: javascript
        value: |
          const expected = require('./evals/gold-set/bundibugyo-ituri-2026-04-20/ground-truth.json');
          const actual = JSON.parse(output);
          // F1 calculation across (pathogen, country, metric, value, as_of_date) tuples
          return computeF1(expected, actual) >= 0.95;
```

Add `llm-eval.yml` CI step to run `promptfoo eval` on the gold set nightly via Anthropic Message Batches API:
```yaml
- name: Run nightly evals (Batch API)
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    pnpm promptfoo eval --config evals/promptfoo.config.yaml --batch
    # Fails if F1 drops > 2 points on any source vs trailing 7-day median
```

Metrics tracked per run:
- Schema-valid rate (all required fields present and typed correctly).
- Substring-match rate (LLM-returned spans verified against source).
- F1 on `(pathogen, country, value, date)` tuples.
- Hallucination rate (LLM-as-judge via Opus 4.7, sampled 10% of outputs).

Regression gate: if F1 drops > 2 points on any source, set `sources.extraction_paused = true` for that source and open a GitHub issue.

Shadow-run: 10% of production Inngest traffic mirrored to candidate prompts for 24 h before promotion. Field-by-field variance > 5% blocks promotion. Implementation: in the main extraction step, after extraction succeeds and before writing to DB, add:

```ts
if (Math.random() < 0.10) {
  await step.sendEvent("shadow.run.trigger", {
    data: { documentId, fullText, candidatePromptVersion: CANDIDATE_PROMPT_VERSION }
  });
}
```

A separate `shadow-extraction` Inngest function receives this event, runs the candidate prompt, and writes comparison results to `audit.shadow_results (document_id, candidate_version, field_variances jsonb, created_at)` — no writes to `case_counts`. The nightly eval script compares `shadow_results` against the corresponding production `extraction_runs` rows and blocks promotion if any field variance exceeds 5%.

### Code — Langfuse v3 self-hosted

**`infra/docker-compose.langfuse.yml`** (committed to the repo with placeholder env vars):
**`infra/.env.langfuse`** (gitignored — contains production secrets):

Docker Compose stack per Langfuse v3 docs: Postgres + ClickHouse ≥ 24.3 + Redis/Valkey + S3-compatible blob (MinIO) + Langfuse Web + Langfuse Worker. Minimum per-container spec: 2 CPU / 4 GB RAM.

The compose file is committed with `${LANGFUSE_SECRET_KEY}` and other secrets as placeholder variables. The actual values go in `infra/.env.langfuse` (add to `.gitignore`). Do NOT use `env_file` pointing to a committed file with real secrets. Run with: `docker compose --env-file infra/.env.langfuse -f infra/docker-compose.langfuse.yml up -d`.

**OTel exporter retargeting**: in `apps/web/instrumentation.ts`, add the Langfuse OTel exporter alongside Sentry. The `audit.llm_traces` Postgres table is kept as the auditable source of truth (append-only, immutable); Langfuse is the query/visualization layer. Both receive the same spans:

```ts
import { LangfuseExporter } from "langfuse-vercel";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [new LangfuseExporter({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL, // self-hosted URL
  })],
});
```

**Daily Langfuse dashboard**: configure a Langfuse dashboard (via API or UI) that plots `cache_read_input_tokens / (cache_read + cache_creation + input)` per model per day. Alert when this ratio drops below 0.60 for any model.

### Code — cost kill switch

**`apps/web/lib/kill-switch.ts`**:

```ts
import { get } from "@vercel/edge-config";

export async function assertExtractionEnabled(): Promise<void> {
  const enabled = await get<boolean>("extraction_enabled");
  if (enabled === false) {
    throw new Error("KILL_SWITCH_ACTIVE: extraction disabled by daily cost cap");
  }
}
```

Every Inngest extract step calls `assertExtractionEnabled()` as its first step. On `KILL_SWITCH_ACTIVE`, the step writes a skip record to `audit.agent_actions` and halts.

Slack alert when the kill switch fires: sent via the existing Slack webhook, mentioning `@channel` with the current spend and cap.

### Code — the autonomy flip

**Before Phase 7 (Phases 2–6):** every extracted row is held in a `status: 'pending_review'` state in `case_counts` and requires human ack in `/internal/escalations` before it is published.

**Phase 7 autonomy flip:** remove the `pending_review` hold for the three non-escalation classes. Only these four classes now require human intervention:

1. Novel `(pathogen_icd11, country_iso3)` combination not in `outbreaks` → `step.waitForEvent`.
2. Extraction `substring_verify` fails twice → GitHub issue opened.
3. Cross-source conflict with no authority winner (Reconciliation Agent `escalate: true`) → Slack thread + `/internal/escalations` card.
4. Anomaly z-score > 4 OR CFR ≥ 80% OR new cluster > 100 km → Twilio SMS + Slack @channel.

Implementation: change the publish step to no longer check `status`, and add a guard at the top of the publish step:
```ts
if (result.escalationClass) {
  await step.sendEvent("escalation.created", { data: result });
  return;
}
await publishToDB(result);
```

### Code — Maintenance Agent

**`apps/web/inngest/functions/maintenance.ts`** — weekly Inngest cron (Sundays 03:00 UTC):

```ts
export const maintenanceAgent = inngest.createFunction(
  { id: "maintenance", retries: 2 },
  { cron: "0 3 * * 0" },
  async ({ step }) => {
    // 1. HEAD every source URL; flag 3× consecutive 4xx/5xx
    const unhealthySources = await step.run("health-check-sources", () => headAllSources());

    // 2. For unhealthy sources, diff last-known-good XML vs current
    for (const source of unhealthySources) {
      await step.run(`self-heal-${source.slug}`, async () => {
        const diff = await diffLastKnownGoodVsCurrent(source);
        const fix = await suggestParserFix(diff); // Sonnet 4.6
        await openGithubPR({ source, fix });
      });
    }

    // 3. Link-rot: resolve canonical redirects, update source URLs
    await step.run("link-rot-check", () => checkAndFixLinkRot());

    // 4. Doc drift: Vitest snapshot test that CLAUDE.md + README.md reference paths exist
    await step.run("doc-drift-check", () => checkDocDrift());
  },
);
```

---

## Tests

### Vitest

**`evals/__tests__/gold-set.test.ts`** — Vitest test that runs the Promptfoo config against the gold set (sample mode, first 5 examples) and asserts F1 ≥ 0.90 in CI (lower threshold than production nightly to keep CI fast):

```ts
test("gold set F1 ≥ 0.90 on sample (5 examples)", async () => {
  const result = await runPromptfooSample(5);
  expect(result.f1).toBeGreaterThanOrEqual(0.90);
}, { timeout: 60_000 });
```

**`apps/web/lib/__tests__/kill-switch.test.ts`** — mocks `@vercel/edge-config`; asserts `assertExtractionEnabled()` throws when `extraction_enabled: false`.

**`apps/web/inngest/functions/__tests__/maintenance.test.ts`** — mocks `headAllSources()` to return one unhealthy source, asserts `openGithubPR` is called with the source slug.

### pgTAP

**`supabase/tests/009-kill-switch-trigger.sql`** — asserts the `tg_check_daily_spend` trigger exists on `audit.anthropic_usage_log`:
```sql
select ok(
  exists(select 1 from pg_trigger where tgname = 'anthropic_usage_log_check_spend'),
  'kill-switch trigger exists'
);
```

### Playwright

**`apps/web/e2e/autonomy.spec.ts`**:
```ts
test("Rows published without pending_review after autonomy flip", async ({ page }) => {
  // Trigger a known-good extraction
  // Assert the row appears on /today without any 'pending review' badge
  await page.goto("/today");
  await expect(page.locator("[data-pending-review]")).not.toBeVisible();
});
```

---

## Tooling

- `promptfoo` — eval framework.
- `langfuse` / `langfuse-vercel` — OTel exporter.
- `@vercel/edge-config` — kill switch reads.
- Langfuse v3 self-hosted: Docker Compose + ClickHouse + Redis + MinIO. Host URL in `LANGFUSE_BASE_URL` env var.
- `@changesets/cli` — already in P0; `release.yml` workflow handles version bumps.

---

## Verification

```bash
# 1. Gold set evals pass
pnpm promptfoo eval --config evals/promptfoo.config.yaml
# Expected: F1 ≥ 0.95 on all sources.

# 2. Kill switch test
pnpm --filter apps/web test lib/__tests__/kill-switch.test.ts
# Expected: throws correctly.

# 3. Daily spend trigger
supabase db execute --local "
  insert into audit.anthropic_usage_log (agent_name, model_id, cost_usd)
  select 'test', 'claude-sonnet-4-6', 51.00;
"
# Expected: pg_net fires; Edge Config update called (mock with pg_net stub in test env).
# Check audit.agent_actions for 'extraction_disabled' action.

# 4. Langfuse receives spans
# Trigger one extraction in dev; open Langfuse UI.
# Expected: trace appears with prompt_version_hash, cache hit ratio visible.

# 5. 7-day autonomy run (final gate)
# Disable manual review hold in staging, let the system run for 7 days.
# Expected: zero non-escalation-class human interventions required.
# Check nightly eval reports: F1 ≥ 0.95 each night.
# Check Langfuse dashboard: cache_read_ratio ≥ 0.60 per model per day.
```

---

## Exit gate

Seven consecutive days of fully autonomous operation with zero non-escalation-class human interventions; nightly batch eval F1 ≥ 0.95 on all active sources in the Promptfoo run; `cache_read_input_tokens / (cache_read + cache_creation + input)` ≥ 0.60 for every active model as measured in the Langfuse dashboard.

---

## Research cross-references

- [agent-automation.md §11 — Self-evaluation loop](../../research/agent-automation.md#11-self-evaluation-loop)
- [agent-automation.md §13 — Cost control](../../research/agent-automation.md#13-cost-control)
- [agent-automation.md §15 — Escalation classes](../../research/agent-automation.md#15-human-in-the-loop-escalation--precise-criteria)
- [agent-automation.md §16 — Maintenance automation](../../research/agent-automation.md#16-maintenance-automation)
- [agent-automation.md §17 — Evals & quality gates](../../research/agent-automation.md#17-evals--quality-gates-in-cicd)
- [backend.md §8 — Observability infrastructure](../../research/backend.md#8-observability-infrastructure)
- [backend.md §10 — Testing infrastructure](../../research/backend.md#10-testing-infrastructure)

---

## Out of scope

- Multi-tenant agent surfaces or Mastra spine (v2).
- Qdrant vector store (v2; pgvector sufficient through ~5M embeddings).
- Modal / EpiNow2 Rt nowcasting (v2; ADR-0009).
- Full WCAG AAA audit (Phase 8 targets AA; AAA post-launch).
- Mobile bottom-sheet and `/internal/*` admin routes (Phase 8).
