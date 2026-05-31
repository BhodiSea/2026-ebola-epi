# ituri-sitrep — Operational Readiness Roadmap

> **Superseded.** This document was written 2026-05-30. Several gap items (G1 gold-set
> fixtures, G4 exit-gate-evidence directory) are now stale. The authoritative roadmap
> is [docs/v1/functional_roadmap.md](v1/functional_roadmap.md) — read that instead.
> This file is retained as an archive.

**Scope:** Close the remaining Phase 0–8 exit-gate gaps and bring all cross-repo documentation into internal consistency. When every item below is done, the project is **fully operational**: all non-deferred data flows work end-to-end, the F1 ≥ 0.95 gate is measurable, deployment infra is pinned, and a developer cloning for the first time has accurate instructions.

**Not in scope:** Phase 9 (computed geospatial layers — see [docs/v1/phase-9-computed-geospatial-layers.md](v1/phase-9-computed-geospatial-layers.md)), [ADR-0009](adr/0009-defer-modal-epinow2-to-v2.md) (EpiNow2 Rt → v2), [ADR-0020](adr/0020-defer-priority-adapters-to-post-phase-9.md) (five Priority-tier adapters → post-Phase 9).

**Evidence baseline:** [docs/v1/phase-0-to-8-audit.md](v1/phase-0-to-8-audit.md) — a full spec-vs-filesystem audit run 2026-05-30. All findings below trace to that document.

---

## Current state at a glance

| Area | Status | Note |
|---|---|---|
| Monorepo layout | ✅ | `apps/web/` + 5 packages, pnpm 10.11, turbo 2 |
| Database schema + extensions | ✅ | 41 migrations; PostGIS, pgvector, pg_cron, pg_net, pg_trgm |
| RLS (four-policy split) | ✅ | `(select auth.uid())`, `TO authenticated`, no `FOR ALL` |
| `tg_verify_quote_substring` trigger | ✅ | DB rejects any `source_quotes` insert with bad offsets |
| pgTAP suite | ✅ | 13 tests in `supabase/tests/` |
| Ingestion — 8 v0 adapters | ✅ | who-don, who-afro, africa-cdc, ecdc-cdtr, acled, reliefweb, moh-drc, uganda-moh |
| Inngest pipeline wiring | ✅ | 30+ functions registered; `/api/inngest` serve route live |
| LLM extraction chain | ✅ | zod → `toJSONSchema()` → Anthropic tool; `ttl: "1h"` on long-lived block; `prompt_version_hash` stamped |
| Source-quote provenance UI | ✅ | `<Figure>`, `<SourceQuoteCard>`, `<SourceQuoteDrawer>` wired |
| Map UI | ✅ | MapLibre GL JS 5.24 + deck.gl 9.3; real Ituri geoBoundaries seeded; versioned MVT route |
| Auth (Supabase SSR) | ✅ | `proxy.ts` (Next.js 16 shape); `getUser()` gating on `/internal/*` |
| Observability | ✅ | Sentry + Langfuse/OTel wired in `instrumentation.ts`; env-gated |
| CI workflows | ✅ | 6 workflows; biome, typecheck, test, build, types-drift, pgTAP, axe-core, Lighthouse |
| Gold-set fixtures | ⚠️ | 5 of 7 contexts missing `response-fixture.json` — blocks F1 eval gate |
| Vercel function region pin | ⚠️ | Not set in dashboard; exit-gate evidence not recorded |
| WAF / Arcjet confirmation | ⚠️ | No evidence snapshot committed |
| Exit-gate evidence logs | ⚠️ | `docs/v1/exit-gate-evidence/` directory does not exist |
| `/map` in Lighthouse CI | ⚠️ | `budgetPath` in ci.yml points to wrong path; `/map` not in `urls` |
| Cache-read integration test | ⚠️ | No test asserts `cache_read_input_tokens > 0` on second extraction |
| Documentation consistency | ⚠️ | See §Documentation corrections below |
| Phase 9 | 🚧 | Next milestone; not part of this roadmap |
| Priority-tier adapters (ADR-0020) | 🚧 | Deferred post-Phase 9 |
| EpiNow2 Rt nowcasting (ADR-0009) | 🚧 | Deferred to v2 |

---

## Path to operational — gap items

### G1 — Populate 5 empty gold-set fixtures

**Audit reference:** Phase 7 — F1 ≥ 0.95 gate unmeasurable (5 of 7 gold contexts have no `response-fixture.json`).

**What's missing.** Each context under `evals/gold-set/<context>/` needs two files:

- `source.txt` — already present in all five
- `ground-truth.json` — already present in all five
- `response-fixture.json` — **missing** in the five below

Contexts to populate:

| Context | Has `source.txt` | Has `ground-truth.json` | Has `response-fixture.json` |
|---|---|---|---|
| `cholera-cod-2024` | ✅ | ✅ | ❌ |
| `ebola-sudan-ssd-2022` | ✅ | ✅ | ❌ |
| `ebola-zaire-cod-2019` | ✅ | ✅ | ❌ |
| `marburg-tz-2026-05-01` | ✅ | ✅ | ❌ |
| `mpox-cod-2023` | ✅ | ✅ | ❌ |
| `bundibugyo-ituri-2026-04-20` | ✅ | ✅ | ✅ (reference) |
| `no-confirmed-figures` | ✅ | ✅ | ✅ (reference) |

**How.** Use `bundibugyo-ituri-2026-04-20/response-fixture.json` as the shape reference. Run the extraction against each `source.txt`, capture the raw Anthropic `tool_use.input` response, save it as `response-fixture.json`. The promptfoo harness in `evals/` drives this via:

```bash
pnpm --filter=@ituri/evals eval   # runs promptfoo eval --config promptfoo.config.yaml --batch
```

**Acceptance check.**
```bash
pnpm --filter=@ituri/evals eval
# All 7 contexts pass; aggregate F1 reported at ≥ 0.95
```

---

### G2 — Pin Vercel function region

**Audit reference:** Phase 5 — "Vercel function region pinning unverified."

**What to do.** In the Vercel project dashboard → Settings → Functions → Regions, pin to `iad1` (us-east-1) or the region matching the Supabase project's deployment. Note: `vercel.ts` does not expose a `regions` key in the current Vercel platform — this is a dashboard-only setting.

**Acceptance check.** Navigate to Vercel dashboard → project settings → Functions and confirm the region is pinned. Record the screenshot or CLI output (`vercel project ls --json | jq '.regions'`) in `docs/v1/exit-gate-evidence/phase-5-region-pin.md`.

---

### G3 — Confirm WAF / Arcjet / Vercel BotID

**Audit reference:** Phase 7 spec referenced a `vercel.ts` `firewall.rules` snippet that is inapplicable — WAF rules are a Vercel dashboard config, not a code config.

**What to do.**
1. Verify Arcjet is active: confirm `ARCJET_KEY` is set in the Vercel project environment for `production`.
2. Confirm the `/evidence/[quote-id]` route is gated by the Arcjet middleware in `apps/web/lib/arcjet.ts`.
3. Optionally enable Vercel BotID in the dashboard (Security → Bot Protection) for additional signal.

**Acceptance check.** Record a config snapshot (env key presence + Arcjet dashboard config + any WAF rules) in `docs/v1/exit-gate-evidence/phase-7-waf-arcjet.md`.

---

### G4 — Create exit-gate evidence directory

**Audit reference:** Multiple phases reference evidence that has not been recorded anywhere in the repo.

**Create:** `docs/v1/exit-gate-evidence/README.md` with an index, plus individual files for each drill:

| File to create | Evidence required |
|---|---|
| `phase-5-region-pin.md` | Screenshot / CLI output of Vercel function region setting (see G2) |
| `phase-7-waf-arcjet.md` | Arcjet + WAF config snapshot (see G3) |
| `phase-7-backup-restore-drill.md` | Transcript of a `supabase db dump` → restore → verify cycle |
| `phase-7-autonomy-run.md` | Log of 7 consecutive days of automated ingestion/extraction without manual intervention |
| `phase-8-nvda-review.md` | Screen-reader audit results (NVDA + Firefox or NVDA + Chrome on `/today` and `/map`) |

These are prose files — a few sentences and a timestamp each. They certify the gates that CI cannot automate.

---

### G5 — Fix Lighthouse CI budget path and add `/map`

**Audit reference:** Phase 8 — Lighthouse CI covers `/today`, `/outbreaks`, `/methods` but not `/map`.

**File:** [.github/workflows/ci.yml](../.github/workflows/ci.yml), the `lighthouse` job (currently line 79).

**Root cause.** `apps/web/lighthouse-budget.json` exists with a `/*` wildcard entry (minScore 0.95 for performance, accessibility, best-practices). The CI step references it as `budgetPath: ./lighthouse-budget.json` (line 83) — relative to the repo root — but the file lives in `apps/web/`. The step is looking at a path that does not exist at the checkout root.

**Change.** Two edits required:

1. **Fix `budgetPath`** in the `lighthouse` job: change `./lighthouse-budget.json` → `./apps/web/lighthouse-budget.json`.

2. **Add `/map` URL** to the `urls` block and add a path-specific entry to `apps/web/lighthouse-budget.json`. The existing `/*` entry (performance ≥ 0.95) is too strict for `/map`, which loads vector tiles and a MapLibre canvas. Add a `/map` entry with relaxed thresholds before the `/*` fallback (Lighthouse CI matches first-wins):

```json
[
  {
    "path": "/map",
    "scores": [
      { "id": "performance",    "minScore": 0.75 },
      { "id": "accessibility",  "minScore": 0.95 },
      { "id": "best-practices", "minScore": 0.95 }
    ]
  },
  {
    "path": "/*",
    "scores": [
      { "id": "performance",    "minScore": 0.95 },
      { "id": "accessibility",  "minScore": 0.95 },
      { "id": "best-practices", "minScore": 0.95 }
    ]
  }
]
```

**Acceptance check.** The `lighthouse` CI job passes on a PR that touches `apps/web/app/map/` or `apps/web/components/map/`, and the `/map` URL is present in the CI run artifact.

---

### G6 — Add cache-read assertion in integration test

**Audit reference:** Phase 2 exit gate requires "non-null `cache_read_input_tokens > 0` on the second extraction." No test verifies this in isolation.

**File to create:** `packages/extract/src/__tests__/cache-round-trip.test.ts`

**What the test does.**
1. Extract the same `source.txt` fixture twice against the real Anthropic API (integration test, skipped in unit CI, gated by `ANTHROPIC_API_KEY`).
2. Assert that the second call's usage reports `cache_read_input_tokens > 0`.
3. Assert that both calls produce identical `extraction_rows` output (idempotency).

**Acceptance check.**
```bash
ANTHROPIC_API_KEY=... pnpm vitest run packages/extract/src/__tests__/cache-round-trip.test.ts
# Both assertions pass; test logged in docs/v1/exit-gate-evidence/phase-2-cache-hit.md
```

This test is the only observable proof that the `ttl: "1h"` cache block (already asserted in `run.test.ts`) actually produces a cache hit under live conditions.

---

## Documentation corrections

These are **prescriptions** — the items below describe what to change and why. They are not executed by this document; each is a concrete edit to one file.

---

### `AGENTS.md`

| Line range | Current (stale) | Correct |
|---|---|---|
| ≈ lines 87–89 | "The repo is currently a single Next.js app from the `with-supabase` template. The monorepo migration (apps/web + packages/*) is planned but not done." | Delete this paragraph entirely — the monorepo IS done. |
| ≈ lines 87–104 ("Commands you'll use most") | `npm run dev`, `npm run lint`, `npm run build` | `pnpm dev` (alias for `turbo dev --filter=@ituri/web`), `pnpm lint`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm db:types`, `pnpm db:test` |
| "See also" → `app/CLAUDE.md` | `app/CLAUDE.md` | `apps/web/app/CLAUDE.md` |

---

### `CLAUDE.md`

| Item | Current | Correct |
|---|---|---|
| Per-area navigation → app path | `app/CLAUDE.md` | `apps/web/app/CLAUDE.md` |
| Per-area navigation → `lib/` note | "Shared client utilities & Supabase clients: `lib/`" | Either create `apps/web/lib/CLAUDE.md` (recommended — substantial code lives there: supabase clients, queries, map utilities, provenance, env, actions) or remove the reference. |

---

### `README.md`

**Environment variables block (≈ lines 251–271):** The README block lists env vars that do not appear in `.env.example` and omits vars that do. Replace the block with the canonical list from [`.env.example`](../.env.example). Specifically:

- **Remove:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (renamed to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY` (intentionally absent; hook-enforced), `ANTHROPIC_MODEL_*` (not in env contract), `ACLED_API_KEY`/`ACLED_EMAIL` (not in `lib/env.ts`), `MAPLIBRE_STYLE_URL` (not in `lib/env.ts`).
- **Add:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `POSTGRES_URL_NON_POOLING`, `EDGE_CONFIG`, `SLACK_WEBHOOK_URL`, `TWILIO_{ACCOUNT_SID,AUTH_TOKEN,FROM_NUMBER,TO_NUMBER}`, `GITHUB_TOKEN`, `GITHUB_REPO`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LANGFUSE_{PUBLIC_KEY,SECRET_KEY,BASE_URL}`, `SENTRY_DSN`.
- Phase-label each optional var as the `.env.example` already does.

**Dev command:** Unify on `pnpm dev`. Remove any `npm run dev` references.

**Phase status badges** (roadmap table): Reconcile with the 2026-05-30 audit:

| Phase | Correct badge | Reason |
|---|---|---|
| P0 | ✅ shipped | Audit: fully met |
| P1 | ✅ shipped | Audit: fully met |
| P2 | ⚠️ partial | Audit: met in substance; cache-read integration test (G6) still missing |
| P3 | ✅ shipped | Audit: met |
| P4 | ✅ shipped | Audit: met |
| P5 | ⚠️ partial | Audit: region pin (G2) + evidence (G4) not verified |
| P6 | ⚠️ partial | v0 adapters present; statistical anomaly module noted as absent in audit |
| P7 | ⚠️ partial | Gold fixtures (G1), WAF (G3), evidence (G4) not done |
| P8 | ✅ shipped | Audit: fully met |
| P9 | 🚧 next | Not started |

**"Research notes" section** (≈ lines 350–356): Currently lists only 3 of 10 files under `research/`. Expand to list all 10. Note: links below use `../research/` because this roadmap lives in `docs/`; in `README.md` (repo root) the paths are bare `research/filename.md` with no prefix.

| File | Purpose |
|---|---|
| [research/architecture.md](../research/architecture.md) | Full target architecture |
| [research/claude-code-arcitecture.md](../research/claude-code-arcitecture.md) | `.claude/` automation blueprint |
| [research/backend.md](../research/backend.md) | Schema, RLS, MVT, extraction |
| [research/data.md](../research/data.md) | Data layer inventory, licensing |
| [research/performance.md](../research/performance.md) | PostGIS, cache, rate limiting |
| [research/ui.md](../research/ui.md) | Design system |
| [research/ux.md](../research/ux.md) | UX flows |
| [research/copy.md](../research/copy.md) | Voice guide |
| [research/ts-rules.md](../research/ts-rules.md) | TypeScript conventions |
| [research/agent-automation.md](../research/agent-automation.md) | Inngest + agent orchestration |

**Broken footer link:** The README footer links to `docs/data-sources.md`. This file does not exist. Either create it (a license attribution page for the data sources listed in the README's data-sources table) or remove the link. Creating it is the better outcome — it is already referenced from the README as an authoritative license source.

---

### `docs/adr/README.md`

The index table lists only ADRs 0001–0004 (Proposed). ADRs 0005–0020 are all Accepted and committed but not indexed. Add them:

| # | Title | Status |
|---|---|---|
| 0005 | Hybrid Biome 2 + ESLint for type-aware linting | Accepted |
| 0006 | Hard numeric caps in lint config | Accepted |
| 0007 | pnpm 10 + monorepo directory staging | Accepted |
| 0008 | Adopt @t3-oss/env-nextjs for environment validation | Accepted |
| 0009 | Defer EpiNow2 Rt nowcasting to v2 | Accepted |
| 0010 | Adopt @arcjet/next for bot and attack protection | Accepted |
| 0011 | Visx for editorial timelines | Accepted |
| 0012 | Fuse.js for client-side source search | Accepted |
| 0013 | MapLibre GL JS + deck.gl interleaved overlays | Accepted |
| 0014 | In-database MVT via ST_AsMVT vs external tile server | Accepted |
| 0015 | unpdf for WASM PDF parsing in the ingest package | Accepted |
| 0016 | Edge Config kill-switch dependencies | Accepted |
| 0017 | Observability stack: langfuse-vercel, @vercel/otel, @sentry/nextjs | Accepted |
| 0018 | promptfoo as extraction eval harness | Accepted |
| 0019 | Upstash Redis for per-IP / per-org rate limiting | Accepted |
| 0020 | Defer five Priority-tier source adapters to post-Phase 9 | Accepted |

Also update the status of ADRs 0001–0004 from `Proposed` to `Accepted` — they were all implemented and are no longer merely proposed.

---

### `docs/v1/README.md`

**ADR-0009 reference:** The phase dependency table says "ADR-0009: to be authored in P0." The ADR exists and is Accepted. Remove or update the annotation — it is no longer "to be authored."

---

### `.claude/specs/adapter-*.md` (all five)

Every adapter spec (`adapter-acled.md`, `adapter-africa-cdc.md`, `adapter-moh-drc.md`, `adapter-reliefweb.md`, `adapter-uganda-moh.md`) has a `plan:` header field pointing to:

```
please-verify-the-docs-v1-phase-0-to-8-a-keen-quiche.md
```

This plan file does not exist in `.claude/plans/`. Options:
1. **Create the plan** as a thin wrapper pointing at the audit doc (`docs/v1/phase-0-to-8-audit.md`) and the phase-6 spec (`docs/v1/phase-6-multi-source-and-reconciliation.md`).
2. **Update each spec header** to reference `docs/v1/phase-0-to-8-audit.md` directly.

Option 1 is cleaner — a single one-page plan that the specs can legitimately point to.

---

### `turbo.json`

The `build.env` array (line 16) still lists `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the old key name that was renamed to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. This means builds that set only the new key name will have a stale entry in the turbo cache key. Replace `NEXT_PUBLIC_SUPABASE_ANON_KEY` with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the `build.env` list. The old name can remain as a secondary alias line only if the Supabase project still issues both key names.

---

### `.claude/skills/source-quote-extractor/SKILL.md`

Two field-name drifts relative to the actual schema:

| SKILL.md says | Actual schema | Migration reference |
|---|---|---|
| `sitrep_id` on `source_quotes` | `document_id` (FK to `public.documents`) | `20260527150300_init_core_tables.sql` |
| sha256 stored on `source_quotes` | sha256 stored on `public.documents` (`sha256 text not null`) | same migration |

Update the SKILL.md to use `document_id` and note that sha256 lives on `documents`, not on `source_quotes`.

---

## Setup punch-list (clone → running)

> The **canonical** setup guide is `README.md`. The section below is a correct minimal path for today's codebase. Until the README env block is corrected (see §Documentation corrections above), **use `.env.example` as your env reference — not the README's env list**.

**Prerequisites:**
- Node 22 LTS
- pnpm 10.11 — `corepack enable && corepack prepare pnpm@10.11.0 --activate`
- Supabase CLI — `brew install supabase/tap/supabase` or `npm install -g supabase`
- Docker (for `supabase start` and optional Langfuse local stack)
- Python 3.x + `pglast ≥ 6.0` — required for `pnpm db:lint` and `pnpm db:validate` and the `biome-check.sh` hook (see §Python toolchain in README)

**Steps:**
```bash
# 1. Clone and install
git clone https://github.com/BhodiSea/2026-ebola-epi
cd 2026-ebola-epi
pnpm install

# 2. Create env file — fill the 6 required vars
cp .env.example .env.local
#   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
#             POSTGRES_URL_NON_POOLING, ANTHROPIC_API_KEY,
#             INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
#   Everything else in .env.example is optional and env-gated.

# 3. Python toolchain for SQL validation (once per checkout)
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pglast --version            # must report ≥ 6.0

# 4. Start the local Supabase stack (applies all 41 migrations + seed.sql)
supabase start
supabase db reset

# 5. Regenerate Drizzle types against the local stack
pnpm db:types

# 6. Run the dev server
pnpm dev
# → http://localhost:3000

# Optional: local Langfuse (Sentry/Langfuse are no-ops until env keys are set)
docker compose -f infra/docker-compose.langfuse.yml up -d

# Optional: Inngest dev server (required to exercise background ingestion/extraction)
npx inngest-cli@latest dev
```

**Required Supabase project settings (remote/production):**
- Extensions enabled: `postgis`, `vector`, `pg_cron`, `pg_net`, `pg_trgm` (applied by migrations — confirm via `supabase extensions list --linked`)
- API schema exposure: `public` only (`graphql_public` must be off)
- Auth redirect URLs: `https://<your-domain>/auth/confirm`

---

## Verification

Run these in order after all G-items are complete. Each must be green before the project is considered operational.

```bash
# Toolchain gates (mirrors lefthook + ci.yml)
pnpm typecheck
pnpm lint
pnpm test                    # Vitest; includes run.test.ts ttl assertion

# Database gates
pnpm db:lint                 # pglast over all migrations
pnpm db:validate             # convention checks (begin/commit, IF NOT EXISTS, etc.)
pnpm db:test                 # supabase test db — 13 pgTAP tests

# Eval gate (requires G1 — all 7 gold-set fixtures populated)
pnpm --filter=@ituri/evals eval   # promptfoo F1 score; must report ≥ 0.95

# Integration gate (requires G6 — cache-round-trip test)
ANTHROPIC_API_KEY=... pnpm vitest run packages/extract/src/__tests__/cache-round-trip.test.ts

# Build gate
pnpm build                   # no warnings; cacheComponents: true honored

# Manual walk (local dev server running)
# Navigate to: /today, /map, /outbreaks, /sources/<slug>,
#              /internal/audit, /internal/cost, /internal/pipeline,
#              /internal/quality, /internal/sources
# Confirm: every rendered figure has a sourceQuoteId prop
#          hover any <Figure> → SourceQuoteCard; click → SourceQuoteDrawer
#          /map ?view=table swap works
#          /auth/login redirects to /internal/* correctly
```

**Final certification:** Re-run the checklist in [docs/v1/phase-0-to-8-audit.md](v1/phase-0-to-8-audit.md). Every ⚠️ in that document should resolve to ✅ once G1–G6 and the documentation corrections above are applied.

---

## Phase 8 hotfixes (2026-05-31)

Three defects found during the `/internal/*` audit and resolved:

| Defect | Fix |
|---|---|
| `/internal/audit` always returned 0 rows — `audit.agent_actions` inaccessible to `authenticated` role | Created `public.agent_actions` view owned by `postgres`; added `private.is_internal_user()` RLS helper; enabled RLS on `audit.agent_actions` with internal-only SELECT policy |
| `/internal/quality` always showed "No eval data yet" — `public.extraction_eval_scores` table did not exist | Added table + RLS policies in migration `20260531120000_internal_rbac_helper_and_views.sql`; gold-set test now persists F1 scores when `PERSIST_EVAL_SCORES=1` |
| `/internal/pipeline` retry action returned 401 — used `INNGEST_SIGNING_KEY` instead of `INNGEST_API_KEY` as Bearer token | Fixed `apps/web/app/internal/pipeline/actions.ts`; added guard for undefined key; updated and corrected existing test assertions |

Additional: centralized the duplicated `role ∈ {admin,staff}` check into `apps/web/lib/auth/internal-user.ts`; DB-side defense in depth via RLS policies on `incidents` and `sources` for `UPDATE`.

Admin provisioning instructions: [docs/admin.md](admin.md).

---

## Deferred — out of scope for this roadmap

| Item | ADR / reference | When |
|---|---|---|
| Phase 9 — computed geospatial layers (population overlays, travel-time / healthcare-access analysis, contextual overlays) | [docs/v1/phase-9-computed-geospatial-layers.md](v1/phase-9-computed-geospatial-layers.md) | After this roadmap's G1–G6 + all doc corrections land |
| EpiNow2 Rt nowcasting | [ADR-0009](adr/0009-defer-modal-epinow2-to-v2.md) | v2; insufficient data for stable Rt |
| Five Priority-tier adapters (hdx-hapi, iom-dtm, ucdp-candidate, grid3-drc, healthsites) | [ADR-0020](adr/0020-defer-priority-adapters-to-post-phase-9.md) | Post-Phase 9; spatial dependency + license review pending |
