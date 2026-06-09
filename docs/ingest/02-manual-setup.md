# Ingest pipeline — manual setup runbook

Everything in this document requires **clicking in a dashboard, running a CLI command, or
sending an email** — nothing here can be done by pushing code. Work through sections in
order; later sections depend on earlier ones.

Items marked `> [verify]` were derived from codebase analysis. Confirm the exact UI path
in the linked docs before executing, as dashboard navigation changes frequently.

Items marked `> [research-gap]` were researched via adversarial multi-source verification
but the correct value could not be confirmed — these require hands-on verification before
executing.

---

## 1. Vercel project settings

### 1a. Link the project (if not already done)

The project is already linked (`/.vercel/project.json` exists). Skip this step if you
can see the project at `vercel.com/team_N1JEWabVM1Qf88wY0ClqiX3t/ituri-sitrep`.

If re-linking from scratch:
```
cd apps/web
vercel link --project ituri-sitrep
```

### 1b. Build & output settings

In the Vercel dashboard → Project → Settings → General:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Build Command | `cd ../.. && pnpm turbo build --filter=@ituri/web` |
| Output Directory | `.next` |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` |

These match `apps/web/vercel.ts`. If they drift, `vercel.ts` is authoritative.

### 1c. Fluid Compute

Fluid Compute is enabled by default on new Vercel projects. Verify it is active for this
project:

Dashboard → Project → Settings → Functions → confirm "Fluid Compute" shows as enabled.
If not, enable it.

**Why it matters for Inngest:**  Fluid Compute allows the `/api/inngest` serve handler to
reuse warm instances across concurrent webhook deliveries, eliminating cold-start overhead
between rapid event dispatches (e.g. the 8 source adapters firing in sequence).

**Verified by research (3-0):** Fluid Compute raises the `maxDuration` ceiling to 800s on
Pro and Enterprise plans (Hobby is capped at 300s). Default `maxDuration` on all plans is
300s.

> [verify] Whether Fluid Compute auto-applies to the `/api/inngest` route specifically in
> an existing (vs newly created) project was disputed 1-2 in research. Confirm the setting
> is active for this route after deployment by checking Vercel dashboard → Project →
> Functions tab for the `/api/inngest` route entry.

### 1d. Function timeout (maxDuration) and streaming

The `/api/inngest` route handler is the Inngest webhook receiver — it does not run
extraction work directly. However, enabling **streaming** on the serve handler allows
Inngest to maintain long-running connections up to the Vercel 800s ceiling:

```ts
// apps/web/app/api/inngest/route.ts  (add streaming: true)
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  streaming: "allow",   // enables streaming up to 800s on Pro/Enterprise
})
```

**Important:** The serve handler must export `GET`, `POST`, **and `PUT`**. `PUT` is
required for Inngest function-manifest sync (verified 3-0). The current codebase already
exports all three.

For most ingest runs, the 300s default is sufficient. The 800s ceiling matters for the
batch-poll loop in `back-fill.ts` (polls every 5 min × 50 iterations = up to 4h — this
is handled by Inngest `waitForEvent` steps, not the Vercel function timeout).

No other `maxDuration` configuration is required in `vercel.ts` for the ingest pipeline.

### 1e. Deployment protection

Dashboard → Project → Settings → Deployment Protection:

- **Production:** Enable "Vercel Authentication" or "Password" for internal routes
  (`/internal/**`). The app enforces its own RBAC via Supabase, but adding a Vercel layer
  prevents the HTML from being fetched by unauthenticated scrapers.
- **Preview:** Leave public (required for Playwright E2E in `e2e.yml`).

### 1f. Regions

Dashboard → Project → Settings → Functions → Serverless Function Region:

Set to `iad1` (Washington DC, US East). This is required because:
- The Vercel Sandbox Chromium fallback runs **only in `iad1`**
  (see `apps/web/inngest/lib/fetch-with-sandbox.ts` comment)
- The Supabase project is likely provisioned in `us-east-1`; co-locating reduces latency

> [verify] Confirm the Supabase project region in the Supabase dashboard → Project
> Settings → Infrastructure. If not `us-east-1`, set the Vercel region to the nearest
> equivalent.

---

## 2. Vercel ↔ Supabase marketplace integration

This integration provisions all Postgres connection strings automatically.

### 2a. Install the integration

1. Go to `vercel.com/integrations/supabase` (or search "Supabase" in the Vercel
   Marketplace).
2. Click **Add Integration**.
3. Choose your Vercel team.
4. Select **Connect to existing Supabase project** — do NOT create a new project. Your
   Supabase project ref is in `.mcp.json` as `${SUPABASE_PROJECT_REF}`.
5. Select the `ituri-sitrep` project from the dropdown.
6. Grant access to the `ituri-sitrep` Vercel project.
7. Click **Install**.

### 2b. Env vars provisioned automatically

> [research-gap] The exact env var names provisioned by the Supabase Vercel Marketplace
> integration could not be confirmed by research — three competing claim sets were all
> refuted (0-3, 0-3, 1-2 votes). The names have changed with the Supabase API key
> migration (publishable/secret replacing anon/service-role). Before proceeding, confirm
> the current variable list at:
> https://supabase.com/docs/guides/integrations/vercel-marketplace

**After installation, run `vercel env ls` to get the ground-truth list for your install.**

The codebase (in `apps/web/lib/env.ts`) requires these names specifically:

| Var name the codebase expects | Likely provisioned as |
|---|---|
| `POSTGRES_URL_NON_POOLING` | `POSTGRES_URL_NON_POOLING` (unchanged) |
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` (unchanged) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Verify** — may be `NEXT_PUBLIC_SUPABASE_ANON_KEY` on older integrations |

If the integration provisions `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, add a manual alias in Vercel:
Dashboard → Project → Settings → Environment Variables → Add:
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `$NEXT_PUBLIC_SUPABASE_ANON_KEY` (copy the value).

### 2c. Publishable key migration note

Supabase began migrating from `anon`/`service_role` key names to `publishable`/`secret`
in late 2025. The codebase uses the new names (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`). If the marketplace integration provisions legacy names, map
them manually as above. See: https://supabase.com/docs/guides/getting-started/api-keys

### 2d. Pull env vars locally

```bash
cd apps/web
vercel env pull .env.local
```

This writes all Vercel env vars (including the Supabase ones) to `.env.local` for local
development. Run this whenever env vars change in Vercel.

---

## 3. Vercel env vars (manual — not from the Supabase integration)

Set these in the Vercel dashboard → Project → Settings → Environment Variables.
Add each to both **Preview** and **Production** unless noted.

### 3a. Required for ingest to function at all

| Variable | Where to get it | Environments | Degrades if missing |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | Preview + Production | All LLM calls fail; Inngest functions error on first step |
| `INNGEST_EVENT_KEY` | Inngest dashboard → App → Keys (see §4) | Preview + Production | `inngest.send()` calls fail; no events dispatched |
| `INNGEST_SIGNING_KEY` | Inngest dashboard → App → Keys (see §4) | Preview + Production | `serve()` rejects all webhook calls; also used as REST API bearer for the run-inspector poll |
| `NEXT_PUBLIC_SITE_URL` | Your production domain, e.g. `https://ituri-sitrep.org` | Production | `siteUrl()` helper returns wrong value; OG images break |

### 3b. Required per-source (ingest silently no-ops without these)

After G-2 is implemented, these become validated by `env.ts` and will throw at boot
rather than silently returning empty. Until then, they silently degrade.

| Variable | Where to get it | Notes |
|---|---|---|
| `RELIEFWEB_APPNAME` | ReliefWeb API registration (see §11) | No key, just an app identifier string |
| `ACLED_ACCESS_TOKEN` | ACLED data portal after approval (see §10) | Access request takes days |
| `ACLED_EMAIL` | Same as above | Must match the email registered with ACLED |

### 3c. Recommended for operations

| Variable | Where to get it | What breaks if missing |
|---|---|---|
| `EDGE_CONFIG` | Vercel Edge Config store (see §6) | Kill-switch always disabled; Chromium fallback always disabled; daily cost-cap check uses hardcoded fallback |
| `SLACK_WEBHOOK_URL` | Slack → Your workspace → Apps → Incoming Webhooks | Anomaly, conflict, synthetic-monitor alerts are silent; incidents still written to DB |
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → Fine-grained PAT (see §12) | Substring-verify failures and maintenance PRs don't create GitHub issues |
| `GITHUB_REPO` | Format: `BhodiSea/ituri-sitrep` | Same as above |
| `ARCJET_KEY` | Arcjet dashboard (see ADR-0010) | Bot protection disabled; proxy.ts falls back to no-op |

### 3d. Optional observability

| Variable | Service | Notes |
|---|---|---|
| `SENTRY_DSN` | Sentry → Project → Settings → Client Keys | Gracefully disabled if unset |
| `LANGFUSE_PUBLIC_KEY` | Langfuse → Project → Settings | Gracefully disabled if unset |
| `LANGFUSE_SECRET_KEY` | Same | |
| `LANGFUSE_BASE_URL` | Your Langfuse instance URL | Defaults to cloud.langfuse.com |

### 3e. Optional rate-limiting (Upstash)

| Variable | Service |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash console → Redis database |
| `UPSTASH_REDIS_REST_TOKEN` | Same |

### 3f. Optional escalation (Twilio SMS)

| Variable | Service |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio console |
| `TWILIO_AUTH_TOKEN` | Same |
| `TWILIO_FROM_NUMBER` | Verified Twilio number, e.g. `+1...` |
| `TWILIO_TO_NUMBER` | Destination number |

---

## 4. Inngest Cloud setup

### 4a. Create an account and app

1. Sign up at `app.inngest.com`.
2. Create an **Organization** (maps to your team).
3. Create an **App** named `ituri-sitrep`.

### 4b. Copy keys to Vercel

In the Inngest dashboard → App → Keys:

| Inngest key | Vercel var | Purpose |
|---|---|---|
| **Event Key** (`inngest_...`) | `INNGEST_EVENT_KEY` | Used by `inngest.send()` to dispatch events (write side). Keep in server-only env; never expose to browser. Created via: click key icon next to environment dropdown → "Event keys" → "+ Create Event Key". |
| **Signing Key** (`signkey-...`) | `INNGEST_SIGNING_KEY` | Used by `serve()` to verify webhook signatures (verified 3-0). Also has embedded timestamps for replay-attack prevention. For zero-downtime key rotation, set `INNGEST_SIGNING_KEY_FALLBACK` to the old key while `INNGEST_SIGNING_KEY` holds the new one (available SDK v3.18+). |

> [research-gap] **Run Inspector REST API bearer token — code bug flagged.** The current
> codebase uses `INNGEST_SIGNING_KEY` as a Bearer token for `GET
> https://api.inngest.com/v1/events/{eventId}/runs` (in
> `apps/web/app/api/internal/ingest-runs/[eventId]/route.ts` and
> `apps/web/app/internal/pipeline/page.tsx`). Research adversarially refuted this (0-3
> vote) — the signing key is for server↔Inngest webhook auth, not REST API reads. The
> correct token type for the Run Inspector API is unconfirmed. **Before relying on the
> pipeline run-inspector UI**, verify the auth requirement at:
> https://www.inngest.com/docs/examples/fetch-run-status-and-output
> If a separate API key is required, add `INNGEST_API_KEY` to Vercel and update both
> route files. This is an undocumented code gap not listed in `01-code-gaps.md`.

### 4c. Register the production serve URL (first deployment only)

If using the **Vercel Inngest integration** (recommended): install it from
`vercel.com/integrations/inngest`. After installation, the integration automatically
syncs your function manifest to Inngest on every Vercel deployment (verified 2-1). Skip
the manual registration below.

If **not** using the Vercel integration, register manually:

1. In Inngest dashboard → Apps → click **Sync** (or **New App**).
2. Enter: `https://ituri-sitrep.org/api/inngest` (or your production domain).
3. Inngest makes a PUT request to that URL to fetch the function manifest.

The manifest is served by the `serve()` call in
`apps/web/app/api/inngest/route.ts`. The 17 functions registered in
`apps/web/inngest/functions/index.ts` will appear in the Inngest dashboard once synced.

**Cron triggers** are declared inside each Inngest function definition (e.g.
`{ cron: "0 0 * * *" }` in `ingest-who-don.ts`). Inngest Cloud executes these — they
do NOT use Vercel Cron. No `vercel.ts` configuration is needed for cron scheduling.

**Critical: Deployment Protection bypass.** If Vercel Deployment Protection is enabled
(§1e), Inngest's sync callback will be blocked. Add Inngest's IP ranges or use a bypass
secret in the Vercel Deployment Protection settings. See:
https://www.inngest.com/docs/deploy/vercel (search "Deployment Protection").

### 4d. Register a preview URL

For preview deployments (triggered by PRs):

1. Inngest dashboard → App → Environments → **Branch** (create one named `preview` or
   use auto-detection).
2. Add the Vercel preview URL pattern: `https://ituri-sitrep-*.vercel.app/api/inngest`.
3. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in Vercel's **Preview** environment
   (they can be the same as production keys or branch-specific ones).

### 4e. Verify Inngest is connected

Trigger a manual event from the Inngest dashboard:

1. Dashboard → Events → Send Event.
2. Event name: `ingest/who-don.poll`.
3. Data: `{}`.
4. Click Send.
5. Go to Runs — you should see a `ingest-who-don` run appear within seconds.

Alternatively, click the **Run** button on `/internal/sources` for WHO DON and watch the
Inngest dashboard for the run.

### 4f. Concurrency / throttle / retry (already configured in code)

These are set in code — no Inngest dashboard configuration needed:

- **Retries:** 4 per function (all ingest functions)
- **Concurrency:** limit 1 per function (prevents duplicate runs)
- **Throttle:** 2 calls per second per host, `scope: "account"` (AGENTS.md rule 15)

These settings sync automatically when the function manifest is fetched by Inngest.

---

## 5. Anthropic Console

### 5a. Create API key

1. Go to `console.anthropic.com` → API Keys.
2. Create a key with name `ituri-sitrep-production`.
3. Copy the key value and set as `ANTHROPIC_API_KEY` in Vercel (Production environment).
4. Create a second key `ituri-sitrep-preview` for the Preview environment.

### 5b. Set spending limits

Per `docs/v1/phase-2-orchestration-and-first-extract.md`:
- **Development / Preview:** $50 / month hard limit
- **Staging / Production:** $200 / month hard limit

In Anthropic Console → Settings → Limits, set monthly spend cap. An Inngest kill-switch
(Edge Config `kill_switch_enabled`) provides an independent circuit breaker — see §6.

### 5c. Enable prompt caching

Prompt caching is controlled per-call via `cache_control` in the request body — it
requires no account-level setting. The extraction, triage, and reconcile runners all set
`cache_control: { type: "ephemeral", ttl: "1h" }` on tool schemas (per AGENTS.md
rule 13).

Verify caching is working after the first real extraction run:
- In Anthropic Console → Usage, look for "Cache Read Input Tokens" appearing alongside
  "Input Tokens" for the same model. Cache hits typically appear within 5–15 minutes of
  the first cold run.

### 5d. Enable Message Batches (for backfill)

Message Batches are used by `apps/web/inngest/functions/back-fill.ts` for historical
document backfills. Batches are available on all paid Anthropic plans.

> [verify] As of 2026, Message Batches require no special account-level activation —
> they are available via the same API key.

---

## 6. Vercel Edge Config (kill-switch + chromium flag)

### 6a. Create an Edge Config store

1. Vercel dashboard → Project → Settings → **Edge Config**.
2. Click **Create Edge Config**.
3. Name: `ituri-sitrep-config`.
4. Link to the `ituri-sitrep` project.
5. Linking auto-injects `EDGE_CONFIG` (the connection string) into all environments.

### 6b. Seed the initial values

In the Edge Config store → Items, add:

| Key | Value | Type | Purpose |
|---|---|---|---|
| `kill_switch_enabled` | `false` | Boolean | Emergency stop for all LLM calls |
| `chromium_fallback_enabled` | `true` | Boolean | Enables Vercel Sandbox for JS-rendered pages |
| `daily_anthropic_cost_cap` | `200` | Number | USD; triggers kill-switch when exceeded |

These keys are read in `apps/web/lib/kill-switch.ts` and
`apps/web/inngest/lib/capacity-guard.ts`.

### 6c. Generate an update token (for pg_cron writes)

The pg_cron `kill-switch-daily-reset` job (migration
`20260529180100_pg_cron_kill_switch_reset.sql`) resets the kill-switch daily via an HTTP
POST to the Vercel Edge Config update API. This requires a token with write access.

1. Vercel dashboard → Account Settings → **Tokens**.
2. Create a token with **Full Account** scope (Edge Config update API requires account-
   level token, not project-scoped).

> [verify] Vercel may offer project-scoped tokens with Edge Config write permission in
> newer dashboard versions. Check `vercel.com/docs/storage/edge-config/edge-config-api`
> for the current token scope requirement.

3. Copy the token value — this is `vercel_edge_config_token` in `private.settings`.

### 6d. Get the Edge Config update URL

The update URL format is:
```
https://api.vercel.com/v1/edge-config/<EDGE_CONFIG_ID>/items
```

Find `<EDGE_CONFIG_ID>` in the `EDGE_CONFIG` connection string (it's the ID component
after `ecfg_`). Or copy it from the Edge Config store detail page.

This URL is `vercel_edge_config_update_url` in `private.settings` — see §7.

---

## 7. Supabase `private.settings` seed

Three pg_cron jobs silently no-op if these rows don't exist. Set them via Supabase Studio
SQL Editor (or `psql`):

```sql
-- Run in Supabase Studio → SQL Editor against the remote project
-- After running, verify with: SELECT key, LEFT(value, 40) FROM private.settings;

INSERT INTO private.settings (key, value) VALUES
  ('inngest_event_endpoint',
   'https://inn.gs/e/<YOUR_INNGEST_EVENT_KEY>'),
  ('vercel_edge_config_update_url',
   'https://api.vercel.com/v1/edge-config/<YOUR_EDGE_CONFIG_ID>/items'),
  ('vercel_edge_config_token',
   '<YOUR_VERCEL_TOKEN_FROM_STEP_6c>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

Replace:
- `<YOUR_INNGEST_EVENT_KEY>` — the Event Key from §4b (format `inngest_...`)
- `<YOUR_EDGE_CONFIG_ID>` — from the `EDGE_CONFIG` connection string
- `<YOUR_VERCEL_TOKEN_FROM_STEP_6c>` — the token from §6c

**What breaks if you skip this:**
- `synthetic-monitor` Inngest function is never triggered (pg_cron posts `synthetic.check`
  but has no endpoint)
- Kill-switch is never automatically reset each day (it could get stuck in `enabled` state
  if triggered by an anomalous spend spike)

Repeat this for **each environment** (development local stack vs remote project). The
schema is in
[supabase/migrations/20260529000000_private_settings.sql](../../supabase/migrations/20260529000000_private_settings.sql).

---

## 8. Supabase admin role assignment

The `/internal/**` pages (sources, pipeline) check `app_metadata.role === "admin"`. The
first admin must be elevated via SQL — there is no UI for this by design.

### 8a. Create your account

Sign up on the deployed app (or use the local stack) with `tnicklin@hawaii.edu` (or
whichever email you use).

### 8b. Elevate to admin

In Supabase Studio → SQL Editor:

```sql
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'),
  '{role}',
  '"admin"'
)
WHERE email = 'tnicklin@hawaii.edu';
```

### 8c. Verify

Log in to the deployed app. Navigate to `/internal/sources`. If the page loads (instead
of redirecting to `/`), the role is applied. If it redirects, sign out and back in to
force a session refresh.

To add additional staff members (read-only access):

```sql
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'),
  '{role}',
  '"staff"'
)
WHERE email = 'colleague@example.com';
```

Per `docs/admin.md`, `staff` role gets read-only access; `admin` gets write access
(trigger ingest, toggle pause, retry runs).

---

## 9. Supabase Storage bucket (if G-11 raw-bytes decision is accepted)

**Skip this section** until the G-11 code gap decision is made (see
`docs/ingest/01-code-gaps.md` §G-11).

If accepted:

1. Supabase Studio → Storage → New Bucket.
2. Name: `source-bytes`.
3. **Public:** Off (no public access).
4. **File size limit:** 50 MiB.
5. Save.
6. Studio → SQL Editor — apply the migration from G-11 which sets RLS to `service_role`
   only.

---

## 10. ACLED account and API access

ACLED data requires an approved API account. Access is not instant.

1. Go to `acleddata.com/access-data` and register.
2. In the registration form, describe the project (public health situational awareness
   for the 2026 Ituri outbreak, non-commercial research).
3. Wait for approval email (typically 1–5 business days).
4. Once approved, you receive `ACLED_ACCESS_TOKEN` and your registered `ACLED_EMAIL`.
5. Set both in Vercel (§3b).

**License reminder:** ACLED data has `license_tier = 'display_only'` per
`docs/data-sources.md`. It may be rendered in overlays with attribution but must never
appear in any CSV export or derived raster redistribution.

---

## 11. ReliefWeb API appname

ReliefWeb does not require an API key — just an app identifier sent in the User-Agent.

1. Go to `reliefweb.int/help/api`.
2. Register your app with name `ituri-sitrep` and contact email.
3. The appname string you choose (e.g. `ituri-sitrep`) becomes `RELIEFWEB_APPNAME`.
4. Set in Vercel (§3b).

---

## 12. GitHub PAT for the maintenance agent (optional)

The maintenance Inngest function (`apps/web/inngest/functions/maintenance.ts`) opens
GitHub issues for substring-verify failures and pull requests for auto-detected parser
fixes. Without a token it silently skips these steps.

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens** →
   Generate new token.
2. Token name: `ituri-sitrep-maintenance`.
3. Resource owner: `BhodiSea`.
4. Repository access: Only `ituri-sitrep` repo.
5. Permissions:
   - **Issues:** Read and write
   - **Pull requests:** Read and write
   - **Contents:** Read and write (needed to create PR branches)
6. Copy the token → set as `GITHUB_TOKEN` in Vercel.
7. Set `GITHUB_REPO` = `BhodiSea/ituri-sitrep` in Vercel.

---

## 13. Slack webhook (optional)

The Slack webhook drives anomaly alerts, conflict escalations, and synthetic-monitor
failures. Without it, the `notify.ts` module silently no-ops.

1. Go to `api.slack.com/apps` → Create New App → From scratch.
2. Name: `ituri-sitrep-alerts`.
3. Workspace: your team workspace.
4. Enable **Incoming Webhooks** and add a webhook to the `#ituri-alerts` channel (or
   equivalent).
5. Copy the webhook URL (format: `https://hooks.slack.com/services/...`).
6. Set as `SLACK_WEBHOOK_URL` in Vercel.

---

## 14. Sentry + Langfuse (optional)

Both are wired in `apps/web/instrumentation.ts` and activate only when the env vars are
set. Both degrade gracefully when unset.

### Sentry

1. Create a project at `sentry.io` (framework: Next.js).
2. Copy the DSN from Settings → Client Keys.
3. Set `SENTRY_DSN` in Vercel.
4. Traces sample rate is hardcoded at 0.1 (10%) in `instrumentation.ts`.

### Langfuse

1. Create a project at `cloud.langfuse.com` (or self-host via
   `infra/docker-compose.langfuse.yml`).
2. Copy Public Key and Secret Key from Settings.
3. Set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` in Vercel.

---

## 15. Vercel Sandbox (Chromium fallback, optional)

The Chromium fallback is used for sources that return `skipped: chromium_required` from
their `parse()` call — currently only Africa CDC when Readability produces fewer than 200
characters.

**Availability:** Vercel Sandbox is GA (since January 2026) and available on Pro and
Enterprise plans. It can also be used on Hobby plans for individual experimentation.
Pricing: charged per second of active sandbox time.

**`agent-browser` CLI:** The `agent-browser` package (used by
`apps/web/inngest/lib/fetch-with-sandbox.ts`) is an open-source CLI tool maintained at
`github.com/vercel-labs/agent-browser`. Check the repo for the current version and
install requirements.

### Regional constraint

> [research-gap] Whether Vercel Sandbox is available in `iad1` only (as the codebase
> comment asserts) or across multiple regions was not covered by the verified research
> claims. Check `vercel.com/docs/sandbox` for current regional availability before
> assuming `iad1` exclusivity.

The codebase hardcodes `iad1` in `fetch-with-sandbox.ts`. Ensure your Vercel project
region matches (§1f). If Sandbox is now multi-region, the hardcoded region may still
be fine (Sandbox invocations are short-lived).

### Enable the flag

Once your Vercel project region is confirmed and Sandbox availability is verified, set in
Edge Config (§6b):

```
chromium_fallback_enabled = true
```

This is already the recommended seed value. The daily cap of 5 Sandbox invocations is
enforced in `apps/web/inngest/lib/ingest-runner.ts`.

---

## 16. GitHub Actions secrets

Set in GitHub → Repository → Settings → Secrets and variables → **Actions**:

### For G-6 (`db-push.yml`, migration auto-push — implement gap first)

The recommended GitHub Actions pattern for Supabase migrations uses the official
`supabase/setup-cli` action and `supabase db push`:

```yaml
- uses: supabase/setup-cli@v1
  with: { version: latest }
- run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
  env: { SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }} }
- run: supabase db push
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_DB_PASSWORD:  ${{ secrets.SUPABASE_DB_PASSWORD }}
```

`supabase db push` is the current recommended command (not `supabase migration up`).
The `supabase/setup-cli` GitHub Actions marketplace action handles CLI installation.
See: https://github.com/supabase/setup-cli and https://github.com/marketplace/actions/supabase-cli-action

| Secret | Value |
|---|---|
| `SUPABASE_PROJECT_REF` | Your Supabase project ref (subdomain of your project URL, visible in Project Settings → General) |
| `SUPABASE_ACCESS_TOKEN` | Supabase account access token (Account → Access Tokens → Generate new token at supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Your project database password (Project Settings → Database → Database Password) |

### For `ingest-once.yml` (already present, but broken — fix G-3 first)

| Secret | Value |
|---|---|
| `INNGEST_EVENT_KEY` | Same as Vercel env var §4b |
| `SUPABASE_SERVICE_ROLE_KEY` | From Vercel env (provisioned by Supabase integration §2b) |

### For `eval-pr.yml` (live extraction eval on PRs)

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | A separate key for CI use (recommended) or the same preview key |

### For `llm-eval.yml` (nightly promptfoo eval)

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Same as above |

---

## 17. Smoke-test runbook

Run this sequence end-to-end to confirm the pipeline is operational after completing
sections 1–16.

### Step 1 — Apply migrations

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
```

(`supabase db push` is the current recommended command; `--include-all` flag is
deprecated in newer CLI versions.)

Verify: `select count(*) from supabase_migrations.schema_migrations` returns the same
count as `ls supabase/migrations/*.sql | wc -l`.

### Step 2 — Deploy to Vercel preview

```bash
cd apps/web
vercel deploy
```

Note the preview URL (e.g. `https://ituri-sitrep-<hash>-bhodiSea.vercel.app`).

### Step 3 — Sync Inngest functions

1. Inngest dashboard → App → Environments → Branch (or Production).
2. Sync → enter the preview URL + `/api/inngest`.
3. Verify 17 functions appear in the function list.
4. Check that cron triggers show the expected schedules (e.g. WHO DON: `0 0 * * *`).

### Step 4 — Trigger a manual WHO DON run

Option A (from the app UI):
1. Navigate to `https://<preview-url>/internal/sources`.
2. Log in (admin role required — §8).
3. Click **Run** on the WHO DON row.
4. Watch the status badge cycle: `Queued → Running → Done`.

Option B (from Inngest dashboard):
1. Events → Send Event.
2. Name: `ingest/who-don.poll`, Data: `{}`.
3. Send.

### Step 5 — Watch the Inngest run

Inngest dashboard → Runs. Find the `ingest-who-don` run. Expand to see:

- `poll` step: should return ≥ 1 URL from the WHO DON RSS feed
- `fetch-parse-<hash>` step: should show `{ fullText: "..." }` in the output
- `emit-triage-...` step: should emit `document.triage.requested`
- `triage-document` run: should show `{ is_outbreak: true, ... }`
- `extract-document` run: should show extracted case counts

### Step 6 — Query case_counts

In Supabase Studio → SQL Editor:

```sql
SELECT
  cc.value,
  cc.metric,
  cc.as_of,
  sq.quote_text,
  d.url
FROM case_counts cc
JOIN source_quotes sq ON sq.id = cc.source_quote_id
JOIN documents d ON d.id = sq.document_id
JOIN sources s ON s.id = d.source_id
WHERE s.slug = 'who-don'
ORDER BY cc.created_at DESC
LIMIT 10;
```

Expected: rows with `value > 0`, `metric` from the 12-value enum, and verbatim `quote_text`
from the source document.

### Step 7 — Confirm no provenance failures

```sql
SELECT action, payload, ts
FROM audit.agent_actions
WHERE action = 'ingest_skipped'
   OR (action LIKE 'substring_verify_fail%')
ORDER BY ts DESC
LIMIT 20;
```

Expected: zero rows with `substring_verify_fail`. Some `ingest_skipped` rows are normal
(e.g. `{ reason: "304 Not Modified" }` on repeat runs).

### Step 8 — Verify the kill-switch is disabled

```bash
# From local terminal with EDGE_CONFIG set
node -e "
const { get } = require('@vercel/edge-config')
get('kill_switch_enabled').then(v => console.log('kill_switch_enabled:', v))
"
```

Expected: `kill_switch_enabled: false`.

If the ingest ran but produced no `case_counts` rows, run:

```sql
SELECT action, payload FROM audit.agent_actions
WHERE action IN ('capacity_blocked', 'kill_switch_triggered')
ORDER BY ts DESC LIMIT 5;
```

A `capacity_blocked` row means the daily cost cap was hit or the kill-switch fired.
