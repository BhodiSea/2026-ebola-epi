# `ituri-sitrep` Backend Configuration Blueprint — Reference Build (May 2026)

**TL;DR**
- **Treat the Postgres schema as the source of truth, RLS as defense-in-depth, and provenance (`source_quote_id` NOT NULL + char offsets + extraction_run fingerprint) as a schema-level invariant** — not application convention. Every other choice flows from these three.
- **The stack as locked-in is sound for May 2026 conditions**, with two pressure points to defend in ADRs: (a) keep Anthropic prompt caching via `cache_control` even though the Vercel AI SDK Gateway path doesn't expose it consistently — use the `@ai-sdk/anthropic` provider directly inside `step.ai.wrap`; (b) self-host Langfuse v3 (Postgres + ClickHouse + Redis + S3) for the LSHTM/Epiverse audit posture, not Cloud.
- **At 10–100 sitreps/day the projected monthly burn is ~$135–$310/month all-in** (Vercel Pro + Supabase Pro + Anthropic + Sentry Team + Axiom + Inngest Hobby + a small Langfuse VM). Re-tier triggers sit well above: Inngest Pro at >500 sitreps/day, Trigger.dev v4 when PDF/Chromium work crosses ~50 jobs/day, Qdrant only above several million quote vectors.

---

## Key Findings

1. **Provenance discipline is the single most credibility-bearing decision in this build.** A reviewer at LSHTM or Epiverse-TRACE will look for three things in the first ten minutes: (a) can every published figure be traced to a SHA-256-keyed raw artifact in object storage, (b) is the substring-verification gate enforceable at the database level rather than the model's good behavior, and (c) is there an `extraction_runs` table that records model fingerprint, prompt hash, and tool-schema hash so any historical figure can be reproduced bit-for-bit. The schema below enforces all three.
2. **Use the new Supabase publishable/secret key model (`sb_publishable_…`/`sb_secret_…`)**, not the legacy anon/service_role JWTs. The legacy keys will continue to work until the end of 2026 but new projects should adopt the new model immediately for independent rotation and asymmetric JWT support.
3. **Schema-first, Drizzle-second.** Raw SQL migrations under `supabase/migrations/`, validated by pglast in CI, are the source of truth. Drizzle 0.36+ mirrors the schema as a typed query layer only — `drizzle-kit` is *not* used to generate migrations. This is the only pattern that survives PostGIS column types (`geometry(MultiPolygon,4326)`), `tsvector` generated columns, pg_cron jobs, partial GiST indexes, and RLS policies with `(select auth.uid())` wrapping. Drizzle Kit silently downgrades `geometry(Polygon,4326)` to `geometry(point)` on push (drizzle-orm issues #3040 and #2675); hand-written migrations sidestep it.
4. **RLS is mandatory and must be performance-tuned from day one.** Every public-schema table gets RLS enabled, `(select auth.uid())` wrapping, indexed policy columns, separate FOR SELECT/INSERT/UPDATE/DELETE policies, explicit `TO authenticated`/`TO anon`. The cautionary tale is CVE-2025-48757, disclosed May 29, 2025 by security researcher Matt Palmer, whose automated scan of 1,645 Lovable-built apps found 170 (10.3%) exposing 303 endpoints — "303 endpoints across 170 Lovable projects (10.3% of the 1,645 analyzed) had Supabase tables readable by unauthenticated requests using the public anon key." The Supabase troubleshooting docs additionally benchmark a >100× speedup from indexing alone on a 100K-row table.
5. **Inngest's `step.ai.wrap` is the right orchestration primitive**, but you must pass the *function reference* and JSON-serializable args (not pre-bound clients) so prompts are editable in the Inngest dev server. For the Anthropic client specifically, use `bind()` to preserve instance context — Inngest documents this as a footgun.
6. **Self-host Langfuse v3, don't use Cloud.** A health-data project audited by an academic institution cannot ship LLM traces (including raw quotes the model saw) to a third-party SaaS by default. The v3 architecture (Postgres + ClickHouse ≥24.3 + Redis/Valkey + S3-compatible blob) runs comfortably on a single 4 vCPU / 16 GB VM at this scale; the minimum per-container spec is 2 CPU / 4 GB RAM. ClickHouse acquired Langfuse in 2026, but the MIT license and self-host story remain intact.
7. **`ST_AsMVT` in a SECURITY DEFINER Postgres function is the correct tile path** — no separate `pg_tileserv` or Martin instance needed. A Next.js Route Handler at `/api/mvt/[z]/[x]/[y]/route.ts` calls the function via PostgREST RPC, returns `application/x-protobuf`, and caches with `s-maxage=604800, immutable`. The function lives in the `internal` schema so PostgREST cannot expose it directly and bypass RLS.

---

## Details

### 1. The canonical Postgres schema

Four schemas with deliberate exposure rules:

- `public` — PostgREST-exposed, RLS-enabled, the only schema the Data API sees
- `geo` — spatial reference data (admin boundaries, facilities, WorldPop) — read-only, SELECT to `authenticated`, no PostgREST exposure (excluded via `api.schemas` in `config.toml`)
- `audit` — append-only logs (`agent_actions`, `extraction_runs`) — INSERT-only grants
- `internal` — SECURITY DEFINER helpers, tile RPCs, cost-rollup views — never exposed via API; admin UI uses service-role key

Migration files follow `YYYYMMDDHHMMSS_snake_case_description.sql`, validated in CI by pglast (currently 7.13 against PostgreSQL 17 parser). Each migration is dollar-quoted and idempotent.

**Provenance invariant.** Every numeric figure stored has a pointer to the exact substring of the exact document it came from, plus the model run that extracted it.

```sql
-- supabase/migrations/20260501120000_init_core.sql (excerpt)
create schema if not exists geo;
create schema if not exists audit;
create schema if not exists internal;
create extension if not exists postgis;
create extension if not exists vector;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pg_trgm;
create extension if not exists plpgsql_check;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id),
  url text not null,
  sha256 bytea not null unique,
  storage_path text not null,
  mime_type text not null,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  language text,
  title text,
  full_text text not null,
  full_text_tsv tsvector generated always as (to_tsvector('simple', coalesce(full_text,''))) stored
);
create index documents_tsv_gin on public.documents using gin (full_text_tsv);

create table public.source_quotes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  char_start integer not null,
  char_end integer not null,
  quote_text text not null,
  embedding vector(1024),
  created_at timestamptz not null default now(),
  constraint quote_offsets_valid check (char_end > char_start and char_start >= 0),
  constraint quote_text_nonempty check (length(quote_text) > 0)
);
create index source_quotes_emb_hnsw on public.source_quotes
  using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);
create index source_quotes_text_trgm on public.source_quotes using gin (quote_text gin_trgm_ops);

-- Schema-level half of the substring-verify gate
create or replace function public.tg_verify_quote_substring()
returns trigger language plpgsql as $$
declare doc_text text;
begin
  select full_text into doc_text from public.documents where id = new.document_id;
  if doc_text is null then raise exception 'missing document'; end if;
  if new.char_end > length(doc_text) then
    raise exception 'char_end (%) exceeds document length (%)', new.char_end, length(doc_text);
  end if;
  if substring(doc_text from new.char_start + 1 for new.char_end - new.char_start) <> new.quote_text then
    raise exception 'quote_text does not match document substring';
  end if;
  return new;
end; $$;
create trigger source_quotes_verify_substring
  before insert or update on public.source_quotes
  for each row execute function public.tg_verify_quote_substring();

create table audit.extraction_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id),
  model_id text not null,                  -- 'claude-sonnet-4-6@2026-04-01'
  prompt_version_hash text not null,
  tool_schema_hash text not null,
  schema_version text not null,
  temperature numeric(3,2) not null default 0,
  input_doc_sha256 bytea not null,
  cache_read_tokens integer,
  cache_creation_tokens integer,
  input_tokens integer,
  output_tokens integer,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  succeeded boolean
);

create table public.case_counts (
  id uuid primary key default gen_random_uuid(),
  outbreak_id uuid not null references public.outbreaks(id),
  as_of date not null,
  admin2_code text references geo.admin2(code),
  metric text not null check (metric in ('cases','deaths','suspected','confirmed','probable','vaccinated','contacts')),
  value integer not null check (value >= 0),
  -- non-nullable provenance: the invariant
  source_quote_id uuid not null references public.source_quotes(id),
  extraction_run_id uuid not null references audit.extraction_runs(id),
  model_id text not null,
  prompt_version_hash text not null,
  superseded_by uuid references public.case_counts(id),
  created_at timestamptz not null default now()
);
create index case_counts_active_idx on public.case_counts
  (outbreak_id, metric, as_of desc) where superseded_by is null;

create table audit.agent_actions (
  id bigserial primary key, agent text not null, action text not null,
  subject_table text, subject_id uuid,
  payload jsonb not null default '{}'::jsonb,
  trace_id text, ts timestamptz not null default now()
);
revoke update, delete on audit.agent_actions from authenticated, anon;

-- Simplified geometries by zoom (materialized views)
create materialized view geo.zone_geom_z6  as
  select code, name, st_simplifypreservetopology(geom, 0.05)  as geom from geo.admin2;
create materialized view geo.zone_geom_z10 as
  select code, name, st_simplifypreservetopology(geom, 0.005) as geom from geo.admin2;
create index zone_geom_z6_gix  on geo.zone_geom_z6  using gist (geom);
create index zone_geom_z10_gix on geo.zone_geom_z10 using gist (geom);
```

GiST on all admin polygons and event points, SRID 4326 throughout (`geometry`, not `geography`), tsvector + GIN for full-text, pgvector HNSW with `m=16, ef_construction=64` per pgvector defaults on source-quote embeddings. **Hybrid search** combines `ts_rank_cd` and pgvector cosine via Reciprocal Rank Fusion with **k=60** — the original value from Cormack, Clarke & Büttcher, "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods," SIGIR 2009 (ACM DOI 10.1145/1571941.1572114). The paper itself documents the robustness: "The constant k mitigates the impact of high rankings by outlier systems," and the optimum is flat — anywhere in k ∈ [20, 100] MAP barely moves.

**RLS:**

```sql
alter table public.documents enable row level security;
alter table public.source_quotes enable row level security;
alter table public.case_counts enable row level security;
-- … and every other public table

create policy "docs_public_select" on public.documents
  for select to anon, authenticated using (true);
create policy "cases_public_select" on public.case_counts
  for select to anon, authenticated using (superseded_by is null);
-- No INSERT/UPDATE/DELETE policies for anon/authenticated → denied by default with RLS on.
-- Service role (Inngest jobs) bypasses RLS.
-- Future researcher tier:
--   using ( (select (auth.jwt() -> 'app_metadata' ->> 'tier')) = 'researcher' )
```

Every policy avoids `FOR ALL`, uses `(select auth.uid())` wrapping when functions appear, and indexes the columns referenced. A reviewer familiar with CVE-2025-48757 will look for `FOR ALL`, missing `TO`, and unwrapped `auth.uid()` — and not find any of them.

### 2. Supabase configuration

```toml
# supabase/config.toml
project_id = "ituri-sitrep"

[api]
enabled = true
port = 54321
schemas = ["public"]                # geo/audit/internal are NOT PostgREST-exposed
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
major_version = 17
[db.pooler]
enabled = true
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 200

[auth]
site_url = "https://ituri-sitrep.example.org"
jwt_expiry = 3600                   # max 604800 per Supabase docs
enable_refresh_token_rotation = true
[auth.email]
enable_signup = false               # admin-only via magic link
[auth.external.github]
enabled = true
client_id = "env(GITHUB_OAUTH_CLIENT_ID)"
secret    = "env(GITHUB_OAUTH_CLIENT_SECRET)"

[storage]
file_size_limit = "50MiB"

[edge_runtime]
enabled = true
policy = "oneshot"                  # dev hot-reload; prod uses per_worker
inspector_port = 8083

[realtime]
enabled = false                     # off by default; enabled per-channel during emergencies

[functions.synthetic-check]
verify_jwt = false                  # cron-only endpoint, HMAC-signed instead
```

**Branching.** Enable the GitHub integration with working directory at repo root. Every PR triggers an ephemeral Postgres branch that runs `supabase/migrations/*.sql` + `supabase/seed.sql`. The Supabase-Vercel integration auto-populates the preview deployment's env vars. Mark the "Supabase" check as **required** in branch protection. Persistent branches reserved for staging, configured via `[remotes.staging]` in `config.toml`.

**Keys.** `sb_publishable_…` (client) and `sb_secret_…` (server/Inngest/CI). Legacy `anon`/`service_role` keys remain valid through end of 2026 but are disabled in this project from day one. Rotate secret keys every 90 days via a scheduled GitHub Action calling Management API `POST /v1/projects/{ref}/api-keys`.

**Storage buckets:**

```
artifacts-who/<sha256[0:2]>/<sha256>.pdf
artifacts-afro/<sha256[0:2]>/<sha256>.html
artifacts-moh-drc/<sha256[0:2]>/<sha256>.pdf
…
```

Lifecycle: keep 1 year, archive cold afterward. RLS on `storage.objects`: anon SELECT, INSERT service_role only. Public read makes the audit trail externally verifiable — what an LSHTM reviewer wants.

**Edge Functions narrow-scope.** Three only: `webhook-postmark` (inbound email → Inngest event), `webhook-slack` (Slack actions), `synthetic-check` (cron pinger). All extraction lives in Next.js Server Actions invoked from Inngest steps, not Deno. Reason: Deno's `npm:` import compatibility for unpdf, undici, Playwright is still imperfect; do not want to debug "works locally, fails in Deno deploy" at 02:00 UTC when ProMED posts an alert.

**Deno/Node code-sharing seam.** `packages/shared/` is Node-first; a copy-on-build script mirrors selected exports:

```ts
// tooling/scripts/sync-shared-to-deno.ts
import { glob, cp, mkdir, rm } from "node:fs/promises";
const SRC = "packages/shared/src", DST = "supabase/functions/_shared/generated";
await rm(DST, { recursive: true, force: true });
await mkdir(DST, { recursive: true });
for await (const f of glob(`${SRC}/**/*.ts`)) {
  if (f.endsWith(".test.ts") || f.endsWith(".node.ts")) continue;
  await cp(f, f.replace(SRC, DST));
}
```

`.vscode/settings.json`:

```json
{ "deno.enable": true, "deno.enablePaths": ["supabase/functions"], "deno.lint": true }
```

Pinned `npm:`/`jsr:` specifiers in `supabase/functions/_shared/deps.ts`.

**Vault.** DB-scoped secrets only (Postmark inbound key, Slack signing secret). Everything else in Vercel env / GitHub Actions secrets.

**pg_cron + pg_net.** Supabase Cron supports up to 32 concurrent jobs each holding a DB connection, but Supabase recommends ≤8 concurrent with each job under 10 minutes. Three jobs: 10-min ingest snapshot, daily 06:00 UTC synthetic check, 5-min anomaly-detector tick. pg_net's response table (`net._http_response`) is retained 6 hours by default; we mirror every cron invocation into `audit.agent_actions` so the trail outlasts it.

### 3. Database access layer

**The 30-line @supabase/ssr triple:**

```ts
// lib/supabase/client.ts
import "client-only";
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/env";
export const createClient = () =>
  createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

// lib/supabase/server.ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/env";
export const createClient = async () => {
  const c = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => c.getAll(),
      setAll: (toSet) => { try { toSet.forEach(({name,value,options}) => c.set(name,value,options)); } catch {} },
    },
  });
};

// lib/supabase/middleware.ts — runs on every request, refreshes Auth token
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/env";
export async function updateSession(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({name,value}) => req.cookies.set(name,value));
        res = NextResponse.next({ request: req });
        toSet.forEach(({name,value,options}) => res.cookies.set(name,value,options));
      },
    },
  });
  await supabase.auth.getUser();  // never trust getSession() in middleware
  return res;
}
```

**Drizzle schema mirror** in `packages/db/src/schema.ts` uses PostGIS-aware custom types and native `vector()` with `l2Distance`/`cosineDistance` operators. `drizzle-zod` generates Zod schemas; `@t3-oss/env-nextjs` validates env at build time. `supabase gen types typescript --linked > packages/db/src/types.gen.ts` runs in CI and fails the build if the diff is non-empty.

**Pooling.** Drizzle connects via Supavisor **transaction mode (port 6543)** for Server Actions and Inngest, with `prepare: false` (transaction-mode pooling cannot use prepared statements). Long-running migrations use **session mode (port 5432)**. Set Vercel function `maxDuration` such that no function holds a Supavisor connection beyond ~30s on the hot path; longer jobs run on Inngest.

### 4. Ingestion plumbing

Per-source adapters in `packages/ingest/src/sources/`: `who-dons.ts`, `afro-sitrep.ts`, `ecdc-cdtr.ts`, `africa-cdc.ts`, `reliefweb.ts`, `acled.ts`, `hdx.ts`, `pathoplexus.ts`, `moh-drc.ts`, `uganda-moh.ts`, `virological.ts`, `nextstrain.ts`. Each exports an `Adapter` with `poll()`, `fetch()`, `parse()` methods.

**HTTP layer.** `undici` for keep-alive pooling, `p-throttle` at 2 req/s/source, `robots-parser` to honor `robots.txt` (memoized per Inngest worker at solo scale). Every request sends `If-Modified-Since` / `If-None-Match` from the last fetch, plus a project-identifying `User-Agent` (`"ituri-sitrep/0.1 (+https://ituri-sitrep.example.org/about; mailto:thomas@…)"`). 429 → exponential backoff via Inngest step retry; persistent 4xx ≥3 times → escalate to incident.

**PDFs.** `unpdf` default, `pdf-oxide` (WASM) fallback for AFRO scanned bulletins, Tesseract.js OCR as third tier. Chromium-required PDFs (rare; Africa CDC embedded charts) route to a **Trigger.dev v4** task — Vercel functions cannot reliably run Chromium.

**HTML.** `@mozilla/readability` over JSDOM default, `defuddle` fallback for malformed AFRO sitemaps. **RSS** uses `rss-parser` 3.x with `fast-xml-parser` fallback for malformed ProMED feeds.

**Inbound email** (ProMED-mail subscriptions). Postmark inbound webhook → Edge Function `webhook-postmark` → Inngest event `email.received`. Postmark signs payloads with HMAC; signature verification in the Edge Function before the event is sent.

**Geospatial imports.** GRID3 DRC Health Zones GeoJSON loaded once via `ogr2ogr` in `supabase/seed.sql` for branches; production import is a one-off migration. HOT OSM healthsites API refreshes daily via pg_cron. WorldPop DRC 1km imported once via `raster2pgsql` into PostGIS raster (`geo.population_raster`), used by anomaly detection for case-rate normalization.

### 5. Provenance enforcement as a schema invariant

Four pillars:

1. **`source_quote_id` NOT NULL** on `case_counts` (and every figures table). Code that tries to insert a figure without a quote pointer fails at the database, not at PR review.
2. **Character offsets CHECKed** at `char_end > char_start AND char_start >= 0`; the trigger `tg_verify_quote_substring` confirms quoted text *is* the substring of the document.
3. **Every figure row carries `model_id`, `prompt_version_hash`, `extraction_run_id`.** Reproducing a historical figure is a SQL join.
4. **`audit.extraction_runs` records the full fingerprint** — model id with deployment date suffix (`claude-sonnet-4-6@2026-04-01`), prompt SHA-256, tool-schema SHA-256 (the JSON-Schema serialization of the Zod tool definition), schema version (semver), temperature, input document SHA-256.

**Branded TypeScript IDs:**

```ts
// packages/shared/src/ids.ts
import { z } from "zod";
export const SourceQuoteId   = z.string().uuid().brand("SourceQuoteId");
export const ExtractionRunId = z.string().uuid().brand("ExtractionRunId");
export const OutbreakId      = z.string().uuid().brand("OutbreakId");
export const ZoneCode        = z.string().regex(/^[A-Z]{2}-[A-Z0-9]+$/).brand("ZoneCode");
```

### 6. Vector-tile serving via ST_AsMVT

```sql
create or replace function internal.mvt(z integer, x integer, y integer, p_outbreak uuid default null)
returns bytea language plpgsql stable parallel safe security definer
set search_path = '' as $$
declare result bytea;
begin
  with bounds as (select st_tileenvelope(z, x, y) as g),
  zones as (
    select st_asmvt(t, 'zones', 4096, 'geom') as mvt
    from (
      select st_asmvtgeom(st_transform(zg.geom, 3857), (select g from bounds), 4096, 64, true) as geom,
             zg.code, zg.name
      from (
        select code, name, geom from geo.zone_geom_z6  where z < 8
        union all
        select code, name, geom from geo.zone_geom_z10 where z >= 8
      ) zg
      where zg.geom && st_transform((select g from bounds), 4326)
    ) t where t.geom is not null
  ),
  cases as (
    select st_asmvt(t, 'cases', 4096, 'geom') as mvt
    from (
      select st_asmvtgeom(st_transform(st_centroid(a.geom), 3857),
               (select g from bounds), 4096, 16, true) as geom,
             cc.outbreak_id, cc.metric, cc.value, cc.as_of
      from public.case_counts cc
      join geo.admin2 a on a.code = cc.admin2_code
      where cc.superseded_by is null
        and (p_outbreak is null or cc.outbreak_id = p_outbreak)
        and a.geom && st_transform((select g from bounds), 4326)
    ) t where t.geom is not null
  )
  select coalesce((select mvt from zones), ''::bytea) || coalesce((select mvt from cases), ''::bytea) into result;
  return result;
end; $$;
revoke all on function internal.mvt(integer,integer,integer,uuid) from public;
grant execute on function internal.mvt(integer,integer,integer,uuid) to anon, authenticated;

-- PostgREST-visible wrapper
create or replace function public.mvt(z integer, x integer, y integer, outbreak_id uuid default null)
returns bytea language sql stable parallel safe security invoker as $$
  select internal.mvt(z, x, y, outbreak_id);
$$;
```

Route handler:

```ts
// app/api/mvt/[z]/[x]/[y]/route.ts
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function GET(_: Request, ctx: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z, x, y } = await ctx.params;
  const sb = await createClient();
  const { data, error } = await sb.rpc("mvt", { z: +z, x: +x, y: +y });
  if (error) return new Response(error.message, { status: 500 });
  return new Response(data as ArrayBuffer, {
    headers: {
      "Content-Type": "application/x-protobuf",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
```

Cache invalidation: every publish step calls `revalidateTag("map:tiles")`.

### 7. Deployment, CI/CD, and infrastructure

`.github/workflows/` contains six files:

- **ci.yml** — `pnpm install --frozen-lockfile`, Biome 2 lint, `tsc --noEmit`, `vitest run`, `pnpm build`.
- **e2e.yml** — Playwright against the preview URL post-deploy; sharded ×4.
- **db-test.yml** — `supabase start`, `pg_prove -h localhost -p 54322 -U postgres supabase/tests/`, pglast validates every `*.sql` in `supabase/migrations/`.
- **llm-eval.yml** — Nightly `promptfoo eval` on the gold set against current production prompts; fails if F1 drops >2 points on any source.
- **release.yml** — Changesets-based versioning of internal packages.
- **ingest-once.yml** — Manual `workflow_dispatch` re-trigger of a single adapter for backfill.

**Vercel.** Pro plan ($20/seat/month, with $20 monthly usage credit included per seat). The default Node function `maxDuration` is 300 seconds on Pro and is configurable up to 800 seconds (~13.3 minutes) with Fluid Compute enabled, per Vercel's Functions Limits docs (last updated 2026-02-24): "Pro: 300s (default) — configurable up to 800s." That is plenty for the Inngest serve handler. Env vars are scoped per-environment (Production / Preview / Development). Deployment Protection on Production only; previews public so Supabase branch URLs work for QA links.

**Supabase Branching wired to GitHub.** Every PR → ephemeral Postgres (Micro tier, $0.01344/branch-hour) → migrations + seed → preview Vercel deploy bound via the Supabase-Vercel integration. "Supabase" status check required for merge.

**Inngest.** Vercel-native HTTP handler at `/api/inngest`. Per the current Inngest pricing page (inngest.com/pricing, May 2026), Hobby (free) includes **50,000 executions/month and 5 concurrent steps**; Pro is $75/month with 1M executions and 100+ concurrent steps. The low Hobby concurrency cap (5) is the trigger that pushes you to Pro before raw execution count does — when fan-out from a single sitrep across 8 agents stresses concurrency, not when monthly executions cross 50k.

**Modal (deferred).** Reserved for EpiNow2 Rt nowcasting via `rpy2` / `epinowcast`. Modal stays cold until needed; Inngest function `compute-rt` invokes Modal via HTTPS only when an outbreak has ≥14 days of observation.

**Renovate (not Dependabot).** `.github/renovate.json` configures grouping (`@supabase/*`, `@types/*`, `eslint*`), weekly schedule, auto-merge for patch/minor on green CI.

**Lefthook + Conventional Commits + Changesets + commitlint** at repo root. **Knip** runs in CI to fail dead-code creep. **@t3-oss/env-nextjs** validates env at build time.

**First-PR green checklist.** Mergeable only when: (1) Biome 2 lint passes; (2) `tsc --noEmit` passes; (3) Vitest ≥50% per-package coverage; (4) pgTAP passes against ephemeral Supabase branch; (5) pglast validates every migration in the diff; (6) Knip reports no new dead exports; (7) `supabase gen types typescript --linked` diff against committed `types.gen.ts` is empty; (8) Supabase Branching check is green; (9) Playwright E2E against the Vercel preview passes; (10) Changeset present if `packages/*` changed.

### 8. Observability infrastructure

**Sentry.** `@sentry/nextjs` v10+ (OpenTelemetry-native by default). `instrumentation.ts` exports `register` (loads server + edge configs) and `onRequestError = Sentry.captureRequestError`. `next.config.ts` wrapped with `withSentryConfig` for source-map upload via `SENTRY_AUTH_TOKEN`. `tunnelRoute: "/sentry-tunnel"` avoids ad-blockers (researchers sometimes use them). The Sentry SDK uses OpenTelemetry under the hood — per Sentry's docs, "any OpenTelemetry instrumentation that emits spans will automatically be picked up by Sentry without any further configuration."

**Axiom.** Vercel log drain → Axiom dataset; application uses `@axiomhq/js` with `pino` JSON logging at `info` and above. Axiom's 2026 pricing is credit-based ($0.12/GB ingest scaling down with volume) with a $25/month Cloud entry — within budget at this scale.

**Langfuse self-hosted v3 on Docker.** Single 4 vCPU / 16 GB VM (Hetzner CX42, DO 4cpu/16gb, or Fly.io equivalent) running docker-compose with Postgres + ClickHouse ≥24.3 + Redis + Web + Worker + MinIO. Minimum per-container spec is 2 CPU / 4 GB RAM. The Vercel AI SDK Anthropic provider integrates via the Langfuse OpenTelemetry exporter: traces include prompt versions, cache_read/cache_creation token breakdown, tool-call structure. **Daily dashboard plots `cache_read_input_tokens / (cache_read + cache_creation + input)` per model** — the single best leading indicator of cost regression.

**OpenTelemetry plumbing.** Inngest exposes `step.ai.wrap` traces; Vercel AI SDK can export OTel spans; Sentry exposes a `SentryPropagator`. Configure once in `instrumentation.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  // Sentry's OTel-compatible propagator means Langfuse spans inherit trace IDs.
});
```

**Synthetic monitor.** Daily 06:00 UTC pg_cron job POSTs a known-fixture sitrep through `/api/ingest/synthetic`. Expected output: a specific case-count row whose `source_quote_id` resolves to a known substring. Monitor asserts (a) the row is created, (b) the substring-verify trigger does *not* fire, (c) the provenance tooltip renders in a Playwright headed run. Any assertion failure → incident with class `substring_verify_fail`.

**Cost kill switch.** Vercel Edge Config holds `{ extraction_enabled: boolean, daily_anthropic_spend_usd_cap: number }`. Every Inngest extract step calls `get("extraction_enabled")` at the top; if `false`, the step exits with a soft skip and writes to `audit.agent_actions`. A Postgres trigger on `audit.anthropic_usage_log` sums today's spend after each insert; when it exceeds the cap, it calls `pg_net.http_post` to flip the Edge Config flag via Vercel's API. Edge Config reads return P99 <15ms globally, so the kill switch propagates in seconds.

### 9. Security, abuse protection, and compliance

- **Arcjet** at every Route Handler / Server Action that touches LLMs: `shield({ mode: "LIVE" })` + `detectBot({ mode: "LIVE", allow: [] })` + `tokenBucket` keyed on IP for `/api/extract/*`. Per-route (not in middleware) because middleware lacks route context (Arcjet docs explicitly recommend this).
- **Vercel Firewall L7** rules block known scraper UAs and any path matching the patient-portal denylist (`/portal/`, `/mychart/`, `/ehr/`, `/patient/`) at the edge.
- **CSP with nonce + strict-dynamic** generated in `middleware.ts` using `await headers()`; Next.js version pinned in `package.json` to avoid CVE-2025-29927-style middleware bypass.
- **`agent_actions` append-only**: RLS forbids UPDATE/DELETE except service_role; monthly compaction (service_role) buckets rows older than 30 days into partitions.
- **Prompt-injection defense.** Every document passed to a quarantined LLM (Triage, Extraction) is wrapped:

  ```xml
  <document trust="untrusted" source_id="…" sha256="…">{{raw text}}</document>
  ```

  Quarantined LLMs only emit structured tool calls (`extract_case_count`, `flag_anomaly`). Actor LLMs (publication, notification) never see free-form text from the quarantined plane — only validated, typed records. Standard CaMeL-style two-plane defense.
- **No-PHI / no-line-list CI check.** A regex scan over every ingested document fails the build if any of these match: `Patient\s+[A-Z]\b`, `DOB:\s*\d`, `\+\d{1,3}\s*\d{6,}`, `[A-Z]{2}\d{7,}` (passport-like), `\d{3}-\d{2}-\d{4}` (SSN-like). Matching SHA-256 is recorded in `audit.agent_actions` with action `phi_reject`; the document is quarantined to a separate Storage bucket with no public RLS policy.
- **Source allow-list** committed in `packages/ingest/src/registry.ts`, version-controlled, reviewed in PR.
- **URL rejection regex** applied at the adapter `fetch` boundary.
- **Secret rotation.** GitHub Actions workflow runs every 90 days against the Anthropic console API to rotate the workspace key; Supabase secret keys rotate via Management API on the same schedule.
- **Public API rate-limiting.** 10 req/min anon, 100 req/min keyed (Arcjet `tokenBucket` with `characteristics: ["userId"]`).
- **Webhook signature verification.** Postmark inbound, Slack interactions, Supabase Storage webhooks all verify HMAC before emitting Inngest events.
- **SECURITY DEFINER functions in `internal` only**, never `public`. PostgREST sees only `public` (enforced by `api.schemas = ["public"]` in `config.toml`).

### 10. Testing infrastructure

- **Vitest 3** with `happy-dom` for unit/component. Coverage gate: 80% on `packages/extract` and `packages/db`, 60% on `apps/web`, hard-gate 50% per-package.
- **Playwright 1.5x** for E2E, sharded ×4 in CI against the Vercel preview URL.
- **pgTAP via `supabase test db`** + **Basejump `supabase-test-helpers` v0.0.6+** for RLS testing as authenticated users. Setup file `000-setup-tests-hooks.sql` installs dbdev + helpers; subsequent files test specific policies. Critical pattern: RLS failures are *silent* (filtered results, not errors) — tests use `is_empty(…)` to assert what *didn't* happen, not just what did.
- **fast-check** property-based tests on the source-quote normalizer (every `(document, substring)` pair must round-trip through char-offset normalization).
- **Promptfoo gold-set evals.** Hand-curated ~50 prompts covering Bundibugyo, Marburg, Ebola Zaire & Sudan, mpox, cholera. Metrics: substring-match-rate, F1 on `(pathogen, country, value, date)` tuples, hallucination rate (figure not in document). Nightly `llm-eval.yml` posts a digest to Slack.
- **Shadow-run.** 10% of production traffic mirrored to a candidate prompt for 24h before promotion; results scored against gold-set metrics. Promotion is manual after review.
- **Regression gate.** F1 drop >2 points on any source pauses the offending source via the cost kill switch flag (`extraction_enabled_<source>=false`).

### 11. ADRs (MADR 4.0) to commit on day one

`docs/adr/` contains 12 files:

1. **ADR-001** — Monorepo tool: pnpm + Turborepo. (Bun is faster, but Turborepo's caching semantics are the safer fit for this team size.)
2. **ADR-002** — Next.js App Router only; no Pages Router.
3. **ADR-003** — Raw SQL migrations as schema source of truth; Drizzle as typed query layer; no `drizzle-kit migrate` (drizzle-orm issues #3040, #2675 cited as evidence).
4. **ADR-004** — RLS enabled on every public-schema table as defense-in-depth, with `(select auth.uid())` wrapping and indexed policy columns.
5. **ADR-005** — Provenance enforced at the schema level: NOT NULL `source_quote_id`, char-offset CHECK constraints, substring-verify trigger.
6. **ADR-006** — Anthropic as the only LLM vendor; Sonnet workhorse, Haiku triage, Opus reconciliation, Batch API for evals; explicit `cache_control` breakpoints.
7. **ADR-007** — `ST_AsMVT` in a SECURITY DEFINER Postgres function (no separate tile server).
8. **ADR-008** — Biome 2 + react-hooks plugin; ESLint not used.
9. **ADR-009** — Observability split: Sentry (errors) + Axiom (logs) + Langfuse (LLM traces); all share OTel trace IDs.
10. **ADR-010** — Supabase Branching as staging; no separate staging Vercel/Supabase project.
11. **ADR-011** — Deno/Node copy-on-build seam; no Edge Functions for extraction.
12. **ADR-012** — No PHI / no line-list data; CI regex gate; quarantined-LLM tool-only output.

### 12. Cost envelope and scaling thresholds

Monthly estimates at three scales (USD, May 2026 prices verified against anthropic.com/pricing, vercel.com/pricing, supabase.com/pricing, inngest.com/pricing, sentry.io/pricing, axiom.co/pricing):

| Component | 10 sitreps/day | 100 sitreps/day | 500 sitreps/day |
|---|---|---|---|
| Vercel Pro (1 seat) | $20 | $20 | $20–$60 (Active CPU + GB-hrs) |
| Supabase Pro | $25 | $25–$40 (storage + egress) | $40–$80 |
| Inngest | $0 (Hobby: 50k execs / 5 concurrent) | $0 (still under 50k execs) | $75 (Pro: 1M execs / 100+ concurrent) |
| Anthropic — Sonnet 4.6 workhorse ($3/$15 per 1M) | $5 | $35–$50 | $150–$220 |
| Anthropic — Haiku 4.5 triage ($1/$5 per 1M) | $1 | $5 | $20 |
| Anthropic — Opus 4.7 reconciliation (rare; $5/$25 per 1M) | $1 | $5–$10 | $25–$40 |
| Anthropic — Batch API nightly evals (Sonnet 4.6, 50% off → $1.50/$7.50) | $2 | $5 | $10–$15 |
| Langfuse self-hosted (Hetzner CX42 / DO 4cpu-16gb) | $30–$50 | $30–$50 | $50–$80 |
| Sentry Team ($26/mo annual, 50k errors + 5M spans) | $26 | $26 | $26–$80 (Business) |
| Axiom Cloud entry ($25/mo + credit usage) | $25 | $25–$40 | $40–$80 |
| **Total** | **~$135–$170** | **~$180–$310** | **~$455–$770** |

**Cache hit-rate assumption:** Sonnet figures assume ≥60% `cache_read_input_tokens` ratio on extraction prompts (large stable system + tool catalogue cached, document varies). Cache reads are billed at 10% of normal input; below 30% hit rate the Sonnet line item roughly doubles.

**Architecture re-tier triggers:**

- **Inngest Pro at >500 executions/day** (~30,000/month, accounting for fan-out) — but realistically, the **5-step Hobby concurrency cap** will force the upgrade earlier than the 50k execution ceiling does. When any single sitrep fans out to more than 5 concurrent agent steps, you are paying Inngest Pro's $75/month regardless of monthly volume.
- **Trigger.dev v4 for PDF-heavy or Chromium-required scale** — fold in when AFRO PDF parsing exceeds ~50 jobs/day or any single source consistently requires headless rendering. Hobby ($10/month, 50 concurrent runs) is the right entry; Pro ($50/month, 200+ concurrent) lifts when daily Chromium work exceeds ~200 invocations.
- **Mastra if multi-user agent surfaces ship** — when the system exposes interactive agent tools to authenticated researchers. The 8-agent topology becomes user-scoped and Mastra's per-session orchestration is worth the migration cost. Solo-developer scale does not warrant it.
- **pgvector → Qdrant when source-quote embeddings exceed ~5M rows.** HNSW on pgvector is good through low millions; above that, a separate vector store wins on latency. Until then, the operational simplicity of "one Postgres, RLS-aware, transactional with the rest of the data" outweighs every benchmark.
- **Modal for Rt nowcasting** when ≥1 active outbreak has ≥14 days of observation and needs nightly EpiNow2 / epinowcast updates. Not warranted at 10 sitreps/day from one outbreak.

---

## Recommendations

1. **Week 1 — Land the schema and the provenance trigger.** Write migrations 001 (`init_core.sql`) and 002 (`rls.sql`), get pglast green in CI, write the first three pgTAP tests: `source_quotes_substring_verify_fails_on_mismatch`, `case_counts_requires_source_quote_id_not_null`, `rls_enabled_on_public_schema`. This is the foundation an LSHTM reviewer inspects first.
2. **Week 2 — Wire Supabase Branching, Vercel preview, Inngest serve handler.** Confirm a PR cycle creates an ephemeral Postgres, runs migrations + seed, deploys to Vercel preview, binds env vars automatically. Add the synthetic monitor as the first Inngest cron.
3. **Week 3 — First two adapters (WHO-DON and AFRO-SitRep)** end-to-end through Inngest → Triage (Haiku) → Extraction (Sonnet with `cache_control`) → substring-verify → Reconciliation (Opus only on disagreement) → `case_counts`. Confirm Langfuse traces show cache hit rate ≥50% by day 5.
4. **Week 4 — Tile pipeline and three-pane UI.** Land `internal.mvt`, the Route Handler, MapLibre client, and the inspector pane showing every case count's provenance tooltip with the verbatim source quote and a deep link to the SHA-256-keyed PDF in Storage.
5. **Month 2 — Promptfoo gold set, shadow-run, regression gate.** This is the gate that lets you change prompts without breaking trust.
6. **Move triggers:** flip to Inngest Pro the *week any single sitrep needs >5 concurrent steps* (likely week 4–5, given the 8-agent topology); introduce Trigger.dev v4 the week any single source needs Chromium for >24h running; turn on Realtime per-channel only when an outbreak is actively reviewed.

---

## Caveats

- **Drizzle Kit's PostGIS SRID bug** (drizzle-orm #2675, #3040) means we never use `drizzle-kit push` / `drizzle-kit generate` against PostGIS columns; ADR-003 should cite the issue numbers.
- **Supabase Edge Functions with publishable/secret keys**: the docs explicitly note Edge Functions only support JWT verification via the legacy anon/service_role keys; using new keys requires `--no-verify-jwt` and DIY apikey check in function code. Our three Edge Functions implement HMAC verification themselves, but this is a platform footgun worth flagging.
- **pg_net intentionally rate-limits** at ~200 req/s and retains response data only 6 hours; the kill-switch trigger uses pg_net but every cron invocation also writes to `audit.agent_actions` so the trail outlasts it.
- **Langfuse v3 architecture changed mid-2025** — older self-host guides assuming Postgres-only are obsolete; ClickHouse ≥24.3 is now mandatory. The 2026 ClickHouse acquisition of Langfuse does not change MIT licensing or self-host capability, but watch for product-direction changes over the next 12 months.
- **The Vercel AI SDK Gateway doesn't expose `cache_control` consistently** — to retain explicit Anthropic prompt-caching breakpoints, import `@ai-sdk/anthropic` directly inside `step.ai.wrap`, not through the Gateway. This is the most common reason teams see "caching does nothing" in Langfuse dashboards.
- **The Inngest Hobby concurrency cap is 5, not 25** (corrected against inngest.com/pricing, May 2026). Solo developer-scale fan-out from a single sitrep across 8 agents will hit this cap quickly even at 10 sitreps/day; budget for Inngest Pro from month 1–2, not at the 500 sitreps/day threshold.
- **The cost table assumes a single active outbreak.** A simultaneous Marburg event in Equateur or a separate cholera surveillance scope multiplies Anthropic costs roughly linearly (cache hits would also rise, partially offsetting). Re-tier triggers should be evaluated on *executions/day*, not *outbreaks*.
- **CVE-2025-29927** (Next.js middleware bypass) and **CVE-2024-51479** (Next.js auth bypass via `pages/`-style routing) are the two CVEs reviewers will probe for. Pinning Next.js to the latest patched version in `package.json` and using App Router only (ADR-002) closes both.