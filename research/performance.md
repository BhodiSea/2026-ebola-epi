# ituri-sitrep: Deep Technical Research — Next.js 16 / Vercel Performance, Supabase/PostGIS SQL Heavy Hitters, and Rate Limiting

## TL;DR
- **Next.js 16 changes the default**: caching is now opt-in via `"use cache"` + Cache Components / PPR; Turbopack is the default bundler; `middleware.ts` is now `proxy.ts` and supports a Node runtime. The MVT route should stay on the Node.js runtime (PostGIS RPC + pg.js TCP) but get aggressive CDN caching via the existing `s-maxage=604800, immutable` header — the single biggest Vercel-side fix is co-locating the function region with the Supabase Postgres region; the most consequential code-side fixes are dynamic-importing MapLibre+deck.gl with `ssr:false`, leaving `lucide-react` to Next.js's built-in `optimizePackageImports`, and enabling Fluid Compute for the Inngest/MVT endpoints.
- **Supabase/Postgres heavy hitters are dominated by three concerns**: PostGIS MVT generation (precompute a 3857 geometry to skip `ST_Transform` per tile, use the new `margin` argument to `ST_TileEnvelope`, and rely on `ST_AsMVT`'s PARALLEL SAFE aggregation), RLS evaluation (every `auth.uid()` call MUST be wrapped as `(select auth.uid())` and every policy MUST specify `TO authenticated`/`TO anon`), and serverless connection management (Supavisor transaction mode on port 6543 with `prepare: false` in postgres.js — but Supavisor 1.0 now supports named prepared statements, which is a meaningful upgrade over PgBouncer). On vectors, the codebase's HNSW (m=16, ef_construction=64) defaults are the right starting point; the bigger wins are pgvector 0.7's halfvec (per AWS's "Load vector embeddings up to 67x faster with pgvector and Amazon Aurora," halfvec saves 50% storage with near-zero recall loss; the headline 67× build speedup applies to binary quantization on top of halfvec, not halfvec alone) and pgvector 0.8's iterative scans for filtered queries.
- **Rate limiting must be layered at all three boundaries**: inbound = Vercel WAF rate-limit rules (Fixed Window on all plans, Token Bucket on Enterprise) as a first line plus `@upstash/ratelimit` sliding-window in `proxy.ts` for finer per-key control; outbound = Inngest `throttle` with `scope: "account"` and a per-host key for global enforcement across distributed workers (NOT in-process p-throttle, which does not coordinate across instances); Anthropic = enforce the existing kill-switch (Edge Config + pg_net trigger), use 1-hour `cache_control` for the stable system/tool prefix, and route nightly evals through the Message Batches API for a flat 50% discount that stacks with caching.

## Key Findings

1. **Next.js 16's caching inversion is a structural change, not a tweak.** Caching is now fully opt-in (`"use cache"`, `cacheLife`, `cacheTag`); PPR is stable; Turbopack is the default; `middleware.ts` is replaced by `proxy.ts` which now supports Node and Bun runtimes.
2. **Fluid Compute eliminates cold starts for 99.37% of requests** — per Vercel's blog "Scale to one: How Fluid solves cold starts": *"Powered by Fluid compute, Vercel delivers zero cold starts for 99.37% of all requests."* It does this by allowing in-function concurrency on the same warm instance, and is default for new projects since April 23, 2025.
3. **Function/DB region co-location is the dominant latency lever** for any Supabase-backed Vercel app. The supabase/supabase Discussion #5532 documents a practitioner observing *"Vercel edge function = 1-6s 🥲 Client side = 200ms CF worker = ~80ms 🚀"* — i.e., 1–6 second API calls falling to under 100 ms when compute is co-located with the Supabase region (in that case via a Cloudflare Worker; the same effect is achievable by aligning Vercel's Function Region with the Supabase AWS region).
4. **Supabase RLS `auth_rls_initplan` is the #1 documented Postgres performance footgun** on Supabase. Wrapping `auth.uid()` in a subquery promotes it to an initPlan, evaluated once per statement instead of once per row. Per Supabase's "RLS Performance and Best Practices" troubleshooting doc: *"Improvement seen over 100x on large tables."* Every policy must also specify a `TO` role list.
5. **PostGIS `ST_AsMVT` is PARALLEL SAFE** since PostGIS 3.0 and was made substantially more memory-efficient in 3.1. Per Raúl Marín (CARTO/PostGIS contributor) in "Waiting for PostGIS 3.1: Vector tile improvements" (republished on Paul Ramsey's blog), *"PostGIS 3.1 is 30-40% faster in both situations"* and *"the server uses around a third of the memory as in 3.0 (1GB vs 2.7GB)"* — a 2.7× memory reduction, not 3×. The biggest tile-pipeline wins come from (a) dropping unused columns, (b) using the `margin` argument to `ST_TileEnvelope` for sargable `&&` filtering, and (c) avoiding per-request `ST_Transform` by storing pre-transformed 3857 geometry.
6. **Supavisor 1.0 supports named prepared statements in transaction mode** — a real differentiator vs PgBouncer (which requires `max_prepared_statements > 0` and re-prepares per backend). Drizzle/postgres.js should still set `prepare: false` for the pooled port 6543; use the direct/session port 5432 only for migrations.
7. **pgvector 0.7+ halfvec** cuts vector storage in half with near-zero recall loss on cosine-similarity workloads; pgvector 0.8 adds **iterative index scans** (`hnsw.iterative_scan = relaxed_order`) that rescue HNSW recall when WHERE-filters are highly selective.
8. **Inngest's `throttle` (GCRA) with `scope: "account"` and a per-host key is the correct primitive** for enforcing "be polite to WHO's server, globally across all worker instances" — `concurrency` limits in-flight steps, `rateLimit` is lossy (drops events), `throttle` queues them.
9. **Anthropic's `cache_control` ephemeral default is 5 minutes**; explicitly set `ttl: "1h"` for long-lived prefixes. Cached reads do NOT count toward ITPM rate limits for current Claude 4.x models (per Anthropic's rate-limits docs: *"For most Claude models, only uncached input tokens count towards your ITPM rate limits"* — Haiku 3.5 marked with † is the exception), which can multiply effective throughput by 5–10×. The Message Batches API offers an unconditional 50% discount that stacks with caching.
10. **Vercel WAF supports native rate-limit rules** at the CDN edge (Fixed Window all plans, Token Bucket Enterprise) with persistent actions for repeat offenders — this is the correct first line in front of `/api/mvt`, far cheaper than a function-time Upstash check.

---

## RESEARCH AREA 1 — Vercel / Next.js 16 Performance

### 1.1 The Next.js 16 caching model (Cache Components, PPR, `"use cache"`)

Next.js 16 (released October 21, 2025) reverses the framework's default stance on caching. Quoting the Next.js team: *"Cache Components are a new set of features designed to make caching in Next.js both more explicit, and more flexible. They center around the new 'use cache' directive… Unlike the implicit caching found in previous versions of the App Router, caching with Cache Components is entirely opt-in."* `unstable_cache` enters a deprecation window; `revalidateTag` now requires a `cacheLife` profile as its second argument. PPR has graduated from experimental to stable behind a single `cacheComponents: true` flag in `next.config.ts`.

**Concrete recommendations for ituri-sitrep:**

- **Editorial / outbreak summary pages**: these are perfect PPR targets. Wrap the per-outbreak shell (title, hero metric tiles, last-updated badge) in `"use cache"` with a `cacheTag("outbreak", outbreak.id)` and a `cacheLife("hours")`; wrap genuinely dynamic regions (the case-count chart whose `as_of` changes on every ingest run) in `<Suspense>`. The shell streams from edge cache while the dynamic data streams from origin. On every successful Inngest job that writes a new `case_counts` row, call `updateTag(["outbreak", outbreak.id])` (Next.js 16's replacement for `revalidateTag` when you want stale-while-revalidate behavior).
- **The MVT route is fundamentally request-time and uncacheable in Next.js's data cache**, but it is heavily edge-cacheable via the existing `Cache-Control: public, max-age=86400, s-maxage=604800, immutable` header. Keep that header; it puts Vercel CDN in front of the function on a per-`[z]/[x]/[y]` key. **DO NOT** add `"use cache"` to the MVT handler — the Postgres RPC is dynamic, cookie-bound under RLS (when used by authenticated users), and `cacheTag` keying would be impractical given the tile cardinality.
- **Cookies in Next.js 16 are async** (`await cookies()`). Make sure any data fetch using the Supabase client that reads cookies is *inside* a Suspense boundary, not at the page/layout level, or the whole route degrades to fully dynamic (`λ` in the build output) and loses PPR.

### 1.2 RSC / client-component boundary and bundle splitting

The map command center is the bundle hotspot. MapLibre GL JS ≥5 and deck.gl ≥9 plus `@deck.gl/mapbox`'s MapboxOverlay must be loaded only on the client (they reference `window` and a WebGL2 context). deck.gl's own docs are explicit: *"deck.gl renders into a WebGL2/WebGPU context, it wouldn't benefit from SSR to begin with."*

Required pattern:

```ts
// apps/web/components/MapCommandCenter.tsx  (parent is a Server Component)
import dynamic from "next/dynamic";
const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
export default MapClient;
```

`MapClient.tsx` itself has `"use client"` at the top and is the *only* file that imports `maplibre-gl`, `deck.gl`, `@deck.gl/mapbox`, and `@deck.gl/layers`. This keeps both MapLibre and deck.gl out of the server bundle and out of the initial JS chunk for any non-map route.

**Barrel imports**: `lucide-react` is already on Next.js's default auto-optimized list (along with `date-fns`, `lodash-es`, `@mui/material`, `@headlessui/react`, `@heroicons/react/*`, `recharts`, `@tabler/icons-react`, `react-icons/*`, etc.). Vercel's blog "How we optimized package imports in Next.js" reports for `lucide-react`: *"5.8s (1583 modules) -> 3s (333 modules) (-2.8s)"*. No action needed for lucide-react beyond confirming it isn't being re-exported through a local barrel file (re-exporting it from `packages/ui` defeats the optimization). For any other large libraries (Radix primitives are tree-shakeable by default), add explicit entries to `optimizePackageImports` in `next.config.ts`.

**React Compiler** is stable in Next.js 16; enable it (`reactCompiler: true`) to get automatic memoization across the RSC + island boundary. This is particularly valuable for the map control surface where derived map state (filters, viewport) is recomputed on every render.

### 1.3 Server Actions and revalidation

For ingest-trigger admin actions (e.g., "re-extract document"), Server Actions are fine but should `updateTag(["document", doc.id])` after they succeed. The actual heavy work belongs in Inngest, dispatched from the action via `inngest.send()`; the action returns immediately. Use `after()` (Next.js 16's `waitUntil` equivalent) for analytics or audit-row writes that must not block the response.

### 1.4 Vercel platform: Fluid Compute, regions, and the MVT route

**Fluid Compute** changes the math for any I/O-bound function. Per Vercel's blog "Scale to one: How Fluid solves cold starts": *"Powered by Fluid compute, Vercel delivers zero cold starts for 99.37% of all requests."* The model is in-function concurrency on warm instances plus bytecode caching plus predictive scaling, and *"In production, single instances regularly handle dozens of requests concurrently, with peaks above 250 concurrent requests per instance."* It is **enabled by default for new projects since April 23, 2025**.

Concrete recommendation:
- **Enable Fluid for all functions** (it's per-project). The MVT route and `/api/inngest` handler are exactly the I/O-bound profile Fluid is designed for (PostGIS RPC, then return) and will see the biggest cost/latency wins.
- **Audit module-level state**: Fluid shares an instance across concurrent invocations, so any module-level `let` or in-memory cache becomes shared state across requests. The Supabase client is fine (it's request-scoped via `createServerClient`), but any per-request memoization (`const cache = new Map()` at module scope) is a cross-tenant data leak under Fluid. Move such caches behind a `WeakMap` keyed by request, or push them to Edge Config / Upstash.

**Runtime selection for `/api/mvt/[z]/[x]/[y]`**: keep `runtime = "nodejs"`. Reasons:
1. The Supabase client uses `node-postgres`/`postgres.js`-style TCP connections; the Edge runtime has no TCP and forces you through PostgREST or Supavisor's pooled connection, neither of which improves the RPC path.
2. Fluid Node.js can handle dozens of concurrent tile RPCs on one warm instance with negligible per-request overhead; Edge would just shift the latency to the database round-trip anyway.
3. The 4.5 MB response body limit is irrelevant for MVT (tiles should be ≤500 KB per Crunchy Data's published guidance; tiles >500 KB are a sign of bad column selection).

**Region co-location is the single biggest latency lever.** A single Postgres round-trip from `iad1` to a `eu-west-1` Supabase project adds ~80–100 ms each way; multiple round-trips per request make pages feel broken. The supabase/supabase Discussion #5532 documents a practitioner seeing *"Vercel edge function = 1-6s 🥲 Client side = 200ms CF worker = ~80ms"* — the 1–6 s figure on Vercel without region co-location, the sub-100 ms result with Cloudflare Worker co-location. The same effect is reproducible by setting **Vercel → Project Settings → Functions → Function Region** to the same AWS region as the Supabase project. Confirm by checking the Supabase project URL (e.g., `aws-0-eu-central-1.pooler.supabase.com` ↔ `fra1`). If you need multi-region UX, use Supabase read replicas, not Vercel multi-region (Inngest fan-outs would otherwise scatter across regions).

### 1.5 Caching the MVT tile route at the edge

Today's header is good: `public, max-age=86400, s-maxage=604800, immutable`. Two refinements:

- **Vary on geometry version, not on time alone**: include a content-hash query parameter or a per-outbreak version segment in the URL when zone geometry changes. This keeps the `immutable` directive truthful and lets you bust the cache with a deploy or a `revalidatePath`. Practical pattern: `/api/mvt/[v]/[z]/[x]/[y]` where `v` is a short version string (e.g., `zones_v3`) bumped only when `geo.admin1`/`admin2` changes.
- **Move the auth check to `proxy.ts`** — anonymous tile access goes straight to the CDN; only authenticated/internal tiles hit the function. This avoids invoking Postgres for repeat tile fetches.

### 1.6 Monitoring and build performance

- Enable **Speed Insights** and **Web Analytics** for the editorial surfaces; the map command center will have a CLS hit on first paint from the dynamic-imported map — fix by reserving the map container height in the skeleton.
- **Turborepo remote caching on Vercel** is automatically enabled for monorepo projects; ensure `apps/web/turbo.json` declares dependency on `packages/db`, `packages/ui`, `packages/shared`, `packages/extract`, `packages/ingest` so affected-only builds work. Build Command on Vercel should be `cd ../.. && pnpm turbo build --filter=web...`.
- Turbopack file system caching (`experimental.turbopackFileSystemCacheForDev: true`) materially shortens dev startup for the monorepo.

---

## RESEARCH AREA 2 — Supabase / Postgres 16 SQL Performance: The Heavy Hitters

### 2.1 The PostGIS MVT tile pipeline

The hot path is `internal.mvt(z,x,y,outbreak uuid)` → `ST_TileEnvelope` → `ST_AsMVTGeom` → `ST_AsMVT`. Five concrete improvements:

**(a) Pre-transform geometry to EPSG:3857 and store it.** `ST_Transform` is not cheap when called per tile per feature. Add a generated column or a sibling table:

```sql
ALTER TABLE geo.admin1
  ADD COLUMN geom_3857 geometry(MultiPolygon, 3857)
    GENERATED ALWAYS AS (ST_Transform(geom, 3857)) STORED;
CREATE INDEX geo_admin1_geom_3857_gix ON geo.admin1 USING GIST (geom_3857);
```

(Generated stored columns are supported and the GIST index can be built on them.) Now the tile function reads `geom_3857` directly and `ST_TileEnvelope(z,x,y)` (which returns 3857) matches the geometry's SRID with no per-row transform. Storage cost is ~1× the original geometry — worth it for tile-serving workloads.

**(b) Use the `margin` argument to `ST_TileEnvelope` for the bounding-box filter.** PostGIS's official ST_AsMVT example shows the right pattern:

```sql
WITH mvtgeom AS (
  SELECT ST_AsMVTGeom(geom_3857, ST_TileEnvelope(z, x, y), extent => 4096, buffer => 64) AS geom,
         properties_jsonb
  FROM geo.zone_geom_z10
  WHERE geom_3857 && ST_TileEnvelope(z, x, y, margin => 64.0/4096)
)
SELECT ST_AsMVT(mvtgeom.*) FROM mvtgeom;
```

The `margin` parameter on `ST_TileEnvelope` (PostGIS 3.1+) expands the envelope by the clip buffer ratio so that geometries that overlap into the buffer aren't missed by the GIST `&&` filter. **The `&&` operator is what hits the GIST index** — `ST_Intersects` works too but is more expensive. Without `margin`, you either miss features at tile edges or have to use a much looser filter.

**(c) Clip buffer values (64 for zones, 16 for points) are reasonable defaults but worth tuning by zoom.** PostGIS docs use 64 in their canonical example. For point layers you can typically go lower (16 or even 4) because labels/icons don't overhang tile boundaries the way polygon strokes do. Smaller buffer → smaller tile size → faster transit. Test with `length(ST_AsMVT(...))` at representative zooms.

**(d) Get `ST_AsMVT` to parallelize.** Per Paul Ramsey's "Waiting for PostGIS 3: ST_AsMVT Performance": *"ST_AsMVT() aggregate itself has been made parallelizable, so that all the work above can be parceled out to multiple CPUs."* Parallelism only fires when (i) the planner thinks the cost is high enough — PostGIS 3 raised function costs precisely to encourage this — and (ii) `max_parallel_workers_per_gather` is > 0. On Supabase, this GUC is set; check `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` for the tile function and confirm you see `Gather (Workers Planned: N)` for large polygon layers. If not, force it for testing with `SET max_parallel_workers_per_gather = 4; SET parallel_setup_cost = 0;`. Per Crunchy Data's "Waiting for PostGIS 3: Parallelism in PostGIS" benchmark: *"Spatial query performance appears to scale about the same as non-spatial as the number of cores increases, taking 30-50% less time with each doubling of processors, so not quite linearly."*

**(e) ONLY return needed columns.** Paul Ramsey (the maintainer of PostGIS) documented in "Waiting for Postgis 3.1: Vector tile improvements" that `SELECT *` into `ST_AsMVT` was triggering OOM kills with 50–100× oversized tiles in real-world Carto traffic: *"queries using a massive amount of resources to generate tiles 50-100 times bigger than they should (the recommendation is smaller than 500 KB)."* The fix in PostGIS 3.1 — per Raúl Marín's writeup — gave *"PostGIS 3.1 is 30-40% faster in both situations"* and *"the server uses around a third of the memory as in 3.0 (1GB vs 2.7GB)"* (a 2.7× reduction). The application-level fix remains to only select the properties you actually render. Audit `internal.mvt` and confirm the inner SELECT lists only the four or five columns the client needs.

**(f) Materialized views `geo.zone_geom_z6` (tol=0.05) and `geo.zone_geom_z10` (tol=0.005) — keep them, refresh CONCURRENTLY via pg_cron.**

```sql
-- Required for CONCURRENTLY
CREATE UNIQUE INDEX geo_zone_geom_z6_pk ON geo.zone_geom_z6 (admin1_id);
CREATE UNIQUE INDEX geo_zone_geom_z10_pk ON geo.zone_geom_z10 (admin1_id);

SELECT cron.schedule(
  'refresh_zone_geom_z6',
  '0 3 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY geo.zone_geom_z6;$$
);
```

Per PostgreSQL docs: `REFRESH MATERIALIZED VIEW CONCURRENTLY` requires a unique index and *"may be faster in cases where a small number of rows are affected"* — i.e., it's correct for the daily/weekly admin-boundary update cadence. Without CONCURRENTLY you get an `ACCESS EXCLUSIVE` lock and tile requests hang.

For **very large polygons** (multi-country admin0 or large lakes), `ST_Subdivide(geom, 256)` materialized into a derived table both improves spatial-join selectivity (GIST index sees more, smaller bounding boxes) and accelerates per-tile clipping. Worth applying to any polygon with >2,000 vertices.

**(g) Function volatility on `internal.mvt` should be `STABLE`** (matching the codebase) so the planner can fold repeated calls in the same statement; never `IMMUTABLE` (depends on table state) and never `VOLATILE` (loses caching).

**(h) pg_tileserv / Martin vs in-DB function:** for ituri-sitrep's scale (single project, modest QPS), the in-DB route handler + RPC is fine and keeps RLS/auth integrated. Martin is the better choice at higher QPS or when you want a separate scale unit, but it adds operational surface. **Recommendation: stay with in-DB until you measure tile QPS >50 RPS sustained**; at that point evaluate Martin or pre-rendering tiles to Supabase Storage / Vercel Blob.

### 2.2 pgvector HNSW on `source_quotes`

Current configuration `m=16, ef_construction=64` is **exactly the documented default** and the right starting point. For ~5M embeddings:

- **`ef_search`** is the runtime knob, default 40, max 1000. Set per-query with `SET LOCAL hnsw.ef_search = 100` inside the function/transaction that runs the similarity search. Sweep with a recall-vs-latency benchmark on ground truth — the published pattern is `ef_search ∈ {40, 80, 120, 200}` and pick the smallest that hits your recall target (typically ≥0.95).
- **`maintenance_work_mem`** must be large enough to hold the index in memory during build, or build time explodes. On Supabase, set per-session for index builds: `SET maintenance_work_mem = '2GB'; SET max_parallel_maintenance_workers = 4;`. The latter parallelizes the build.
- **halfvec is the highest-leverage change.** For 1024-dim vectors, halfvec cuts storage and index size in half with documented recall loss <1% on cosine-similarity workloads on normalized embeddings:

  ```sql
  ALTER TABLE source_quotes
    ADD COLUMN embedding_half halfvec(1024)
    GENERATED ALWAYS AS (embedding::halfvec(1024)) STORED;
  CREATE INDEX source_quotes_embedding_half_hnsw
    ON source_quotes USING hnsw (embedding_half halfvec_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  ```

  Per AWS's "Load vector embeddings up to 67x faster with pgvector and Amazon Aurora" blog, halfvec alone gives *"50% reduction in index size [with] very little impact on load or recall"*; the headline 67× build-speed figure is achieved only by combining halfvec with binary quantization on top — not by halfvec alone. The pure-halfvec speedup is more modest but the storage saving is the primary value.
- **pgvector 0.8 iterative scans rescue selective filtering.** The code path `WHERE outbreak_id = $1 AND embedding <=> $2 < 0.3` was previously a recall nightmare: HNSW returns ef_search candidates, the WHERE filter then discards most, and you may return <k results. With `SET hnsw.iterative_scan = 'relaxed_order';` (or `strict_order`) the planner expands the search until the LIMIT is met or `hnsw.max_scan_tuples` is reached. **Enable this in the RPC functions that combine vector search with metadata filtering** — for ituri-sitrep this is essentially every embedding query (always scoped to an outbreak or document).
- **Binary quantization** (`bit(1024)` with `bit_hamming_ops`) is a step too far for normalized 1024-dim embeddings used for semantic citation matching; the recall loss is documented as significant for standalone search. Use it only as a pre-filter to retrieve a larger candidate set, then re-rank with the halfvec/vector column. For most ituri-sitrep workloads, halfvec is the right stopping point.

### 2.3 GIN trigram and full-text search

`source_quotes.quote_text` has `GIN gin_trgm_ops`. The `%` operator is sargable against this index; LIKE patterns starting with `%` (i.e., contains substring) are also sargable. The key GUC is `pg_trgm.similarity_threshold` (default 0.3) — too low and you scan too many rows; too high and you miss fuzzy matches. For French infectious-disease entity matching, **0.4–0.5 is usually the right zone**; test with `SET LOCAL pg_trgm.similarity_threshold = 0.4`.

GiST vs GIN for trigram: GIN is faster for read-heavy workloads (matches this codebase); GiST is faster to build and update. Stay with GIN.

`documents.full_text_tsv` GENERATED ALWAYS with `simple` config and GIN index — correct for French content (no stemming via `simple` avoids the English-stemmer bug for French queries). `plainto_tsquery('simple', ...)` is the right query function; `websearch_to_tsquery('simple', ...)` is also worth considering if you want quoted phrase support without the user learning Postgres tsquery syntax. Document the choice in a comment on the column.

### 2.4 Partial / covering B-tree on `case_counts`

`(outbreak_id, metric, as_of desc) WHERE superseded_by IS NULL` is excellent: the partial predicate keeps the index small (most rows are eventually superseded) and the trailing `as_of desc` makes "current value" queries index-only. Add `INCLUDE` for covering scans:

```sql
CREATE INDEX case_counts_current
  ON public.case_counts (outbreak_id, metric, as_of DESC)
  INCLUDE (count_value, source_quote_id, status)
  WHERE superseded_by IS NULL;
```

This makes the "latest value per (outbreak, metric)" query truly index-only and avoids heap fetches. Verify with `EXPLAIN (ANALYZE, BUFFERS)` and the presence of `Heap Fetches: 0`.

### 2.5 RLS performance — the documented #1 footgun

Supabase's official docs and the GaryAustin1/RLS-Performance benchmarks are unambiguous. **Two non-negotiable rules:**

1. **Always wrap `auth.uid()` (and any other stable function) in `(select …)`**. Per Supabase's "RLS Performance and Best Practices" troubleshooting doc: *"Wrapping the function causes an initPlan to be run by the Postgres optimizer, which allows it to 'cache' the results per-statement, rather than calling the function on each row."* The same doc reports: *"Improvement seen over 100x on large tables."* This is enforced by the Supabase linter as `0003_auth_rls_initplan`.
2. **Always specify `TO authenticated` / `TO anon`** explicitly. Per Supabase docs: *"This prevents the policy `((select auth.uid()) = user_id)` from running for any anon users, since the execution stops at the to authenticated step."* Skipping the role check for traffic that can't possibly satisfy the policy is a meaningful saving on every request.

The codebase already specifies "four separate policies per table (never FOR ALL), explicit role lists" — this is exactly right. Audit checklist:

- Every policy column has a B-tree index. (The codebase already states this — keep verifying with `pg_stat_user_indexes.idx_scan` to make sure they're being used.)
- For tables only accessed by the service role (e.g., `audit.llm_traces`, `audit.extraction_runs`), **disable RLS entirely** rather than write a permissive policy. Service-role bypass works either way, but RLS evaluation cost is non-zero even when it passes. Set `ALTER TABLE audit.llm_traces DISABLE ROW LEVEL SECURITY;` for the append-only audit tables.
- For hot-path RPCs (the tile function, the case-count query), use `SECURITY DEFINER` functions with `SET search_path = ''` and explicit schema-qualified references inside. This bypasses RLS on the join targets. The codebase already does this for `internal.mvt` — exactly right.

### 2.6 Connection management for Inngest fan-out

Inngest fan-outs are the classic "thundering herd" workload. Supabase's connection model:

- **Port 6543** is Supavisor transaction mode (pooler). Use this for all serverless / Inngest function code.
- **Port 5432** is direct/session mode. Use this only for migrations (Drizzle Kit, schema changes).

**postgres.js / Drizzle config for port 6543**: set `prepare: false`. Even though Supavisor 1.0 added named-prepared-statement support (broadcasting `PREPARE` to all backends), the safe default for ORM-generated statements that may not be reused is to disable client-side prepared statements. Concretely:

```ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const sql = postgres(process.env.DATABASE_URL!, {
  prepare: false,           // required for pooled 6543
  max: 1,                   // one connection per invocation; Fluid + pooler handle concurrency
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(sql, { schema });
```

For Inngest fan-out specifically: cap `concurrency` on the function (Inngest's flow control) so that you don't blow past Supabase's pool size. With Pool Size = 20 on a Pro tier and 100+ concurrent Inngest steps, you'll see `FATAL: sorry, too many clients already` even through the pooler unless you constrain at the queue layer. Recommended:

```ts
inngest.createFunction(
  {
    id: "extract-document",
    concurrency: { scope: "account", key: '"supabase-write"', limit: 15 },
  },
  { event: "document/extract.requested" },
  async ({ event, step }) => { /* ... */ }
);
```

This caps concurrent Postgres-writing steps account-wide at 15, leaving headroom for the Supavisor pool and PostgREST/Realtime.

### 2.7 Generated columns, triggers, partitioning

- **`tg_verify_quote_substring`** runs on every insert/update of `source_quotes`. The substring extraction itself is O(quote_length) — cheap. The risk is **lock contention** during bulk extraction inserts. Mitigate by batching with `INSERT … ON CONFLICT DO NOTHING` and accepting that the trigger fires per row; it's still much cheaper than a network round-trip per quote. Consider a `DEFERRABLE INITIALLY DEFERRED` variant if you ever need to bulk-rewrite quotes within a transaction.
- **`full_text_tsv` GENERATED ALWAYS STORED** — cost is at insert/update time, paid once. Worth it.
- **Audit table partitioning**: `audit.llm_traces` and `audit.agent_actions` are append-only and time-keyed. Set up native declarative partitioning by month (or week if you anticipate >10M rows/month):

  ```sql
  CREATE TABLE audit.llm_traces (
    id bigserial,
    occurred_at timestamptz NOT NULL,
    -- ...
    PRIMARY KEY (id, occurred_at)
  ) PARTITION BY RANGE (occurred_at);
  ```

  Then use pg_partman or a pg_cron job to create future partitions and detach/archive old ones. This keeps planner statistics tight and VACUUM proportional.
- **VACUUM tuning**: `case_counts` is high-write but mostly insert (you write `superseded_by` instead of UPDATE-in-place), so bloat is bounded. `autovacuum_vacuum_scale_factor = 0.05` for the audit tables is a defensive setting if they grow into the tens of millions.

### 2.8 EXPLAIN workflow

For any slow query: `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT) <query>`. Pay attention to:

- `Heap Fetches: N` (non-zero means your "covering" index isn't actually covering; visibility map may need a VACUUM).
- `Buffers: shared hit=… read=…` — `read` > 0 on hot queries means shared_buffers is undersized for the working set.
- `Workers Planned: 0` on PostGIS aggregates means parallelism isn't firing — bump `max_parallel_workers_per_gather` or check costs.

Supabase has `pg_stat_statements` enabled by default. Use the Supabase Query Performance advisor and the Index Advisor weekly during heavy iteration; both are surfaced in the dashboard.

---

## RESEARCH AREA 3 — Rate Limiting at All Three Boundaries

### 3.1 INBOUND: protecting public API routes

**Layer 1 — Vercel WAF (CDN edge):** The Vercel WAF has built-in rate-limit rules (per Vercel's "Vercel WAF upgrade brings persistent actions, rate limiting, and API control" blog: *"Rate limiting is now generally available in Vercel's WAF, allowing you to set precise request limits for specific endpoints"*). Algorithms: Fixed Window on all plans, Token Bucket on Enterprise. Rules are configured in the dashboard or via `vercel.json`. **Persistent actions** let you block repeat offenders without consuming function invocations or counting against CDN usage (Vercel docs: *"With persistent actions enabled, edge requests are processed earlier in the lifecycle, bypassing both usage metrics and WAF evaluation entirely"*).

Recommended ituri-sitrep rules:

| Rule | Path | Limit | Action |
|---|---|---|---|
| Tile abuse cap | `/api/mvt/*` | 600 / minute per IP | Deny, persistent 5 min |
| Ingest trigger | `/api/inngest` | 60 / minute per IP, plus signature verification in Inngest's handler | Challenge |
| Editorial pages | `/outbreaks/*` | 300 / minute per IP | Log first, then Deny |
| Auth endpoints | `/auth/*` | 10 / 60s per IP | Deny, persistent 15 min |
| Global per-ASN | `*` | 6,000 / minute per ASN | Challenge (BotID) |

Rate-limit counters are **per region** (per Vercel's WAF Rate Limiting docs): *"Rate limit counters are tracked on a per-region basis; traffic matching a given rate limit key in multiple regions can exceed the limit you configure for any single region."* Set limits accordingly (i.e., a 600/min per IP per region is realistically ~600 × N_regions globally; tune the per-region cap to ~limit/N if you need a tight global budget).

For programmatic/conditional rate limits use the `@vercel/firewall` SDK with custom `rateLimitKey` (e.g., `auth.orgId` for authenticated routes).

**Layer 2 — `@upstash/ratelimit` in `proxy.ts`:** for per-user/per-org keys that the WAF can't easily express, use Upstash Redis with the sliding-window algorithm. Place the limiter declaration outside the handler so it's reused across invocations (the library caches Redis state while the function is warm). For Next.js 16 this lives in `proxy.ts`:

```ts
// apps/web/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(120, "60 s"),
  analytics: true,
  prefix: "ituri:rl",
});

export async function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  const id = request.headers.get("x-forwarded-for") ?? "anon";
  const { success, limit, remaining, reset } = await ratelimit.limit(id);
  if (!success) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  }
  return NextResponse.next();
}
```

**Algorithm choice:** sliding window for general APIs (smooths the boundary-burst problem of fixed window); **token bucket** for the MVT route specifically (it's naturally bursty as a user pans/zooms — token bucket lets a burst of ~20 tiles in 1s through if there's saved capacity).

**Critical interaction with CDN caching:** count rate limits only against requests that **miss** the edge cache. The Vercel WAF rule operates at the edge regardless; the Upstash rule in `proxy.ts` is only invoked for cache misses (proxy/middleware doesn't run on CDN hits). This means a user scrolling around the map mostly hits cache and doesn't burn through their limit — exactly what you want.

**DDoS / attack mode:** Vercel BotID + Attack Challenge Mode is the right escalation. For a public outbreak tracker that *will* see traffic spikes during a real outbreak, pre-document a runbook: switch to Attack Challenge Mode, temporarily raise WAF limits for known good ASNs (news media, MoH IP ranges), and disable any heavy editorial pages by toggling an Edge Config kill switch.

### 3.2 OUTBOUND: politeness to WHO, WHO AFRO, ECDC, Africa CDC, ReliefWeb, ACLED, MoH

p-throttle at 2 req/s in-process is **insufficient under Inngest fan-out** because each function instance runs its own in-memory limiter. The instant you have 5 concurrent extractor instances, you're hitting WHO at 10 req/s.

**The correct primitive is Inngest's `throttle` with a global key.** Per the Inngest "Throttling" docs: *"Throttling limits the number of new function runs being started… Throttling is FIFO (first in first out), so the first function run to be enqueued will be the first to start when there's capacity."* GCRA + persisted state means it works correctly across distributed worker instances. (The same docs explicitly contrast `throttle` against `rateLimit`: *"Rate limiting is lossy and provides hard limits on function runs, while throttling delays function runs over the limit until there's capacity, smoothing spikes."*)

Wrap each upstream fetch in its own Inngest function or step, throttled per host:

```ts
inngest.createFunction(
  {
    id: "fetch-who-don",
    throttle: { limit: 2, period: "1s", key: `"who-don"` },
  },
  { event: "ingest/who-don.fetch.requested" },
  async ({ event, step }) => {
    const res = await step.run("http", async () =>
      fetch(event.data.url, {
        headers: {
          "User-Agent": "ituri-sitrep/1.0 (+https://ituri-sitrep.org/about/bot)",
          "If-None-Match": event.data.etag ?? "",
          "If-Modified-Since": event.data.lastModified ?? "",
        },
      })
    );
    if (res.status === 429) {
      const retry = parseInt(res.headers.get("retry-after") ?? "60", 10);
      throw new RetryAfterError("Upstream rate limit", retry * 1000);
    }
    // ...
  }
);
```

For sources with very strict limits (ACLED in particular — *"ACLED redistribution prohibited"* suggests strict terms), combine `throttle` with a low `concurrency` limit keyed to the same host. Use `rateLimit` (lossy) only for deduplication (e.g., "don't refetch the same RSS URL more than once per hour"):

```ts
rateLimit: { limit: 1, period: "1h", key: "event.data.url" }
```

**robots-parser and Retry-After:**

- Check `robots.txt` per host at the start of each crawl session; cache the parsed result for 24 h.
- Respect `Crawl-delay` if specified — Inngest `throttle` `period` should be ≥ `Crawl-delay` seconds.
- On 429: throw an Inngest retriable error with the `retry-after` value — Inngest will reschedule the step, respecting throttle.
- On 5xx: exponential backoff with jitter (Inngest's built-in retry logic handles this; default is 3 retries, configurable up to 20).

**Conditional requests** (`ETag`, `If-Modified-Since`, `If-None-Match`) reduce bandwidth dramatically for RSS-style sources that change infrequently. Persist the last `ETag` per source URL in `public.sources.last_etag` and re-send it on every poll; a `304 Not Modified` response means "skip extraction" and burns no upstream tokens or LLM cycles.

### 3.3 ANTHROPIC: cost and rate management

**Rate limits (per Anthropic's official "Rate limits" docs):** RPM, ITPM (input tokens/min), OTPM (output tokens/min), per model class. Tiers advance with cumulative credit purchases ($5 / $40 / $200 / $400 to reach Tiers 1–4; Tier 4 monthly spend ceiling is $200,000 above which sales is required). Opus and Sonnet rate limits pool across all versions (4.0, 4.5, 4.6, 4.7) — quoting the docs: *"Opus rate limit is a total limit that applies to combined traffic across Opus 4.7, Opus 4.6, Opus 4.5, Opus 4.1, and Opus 4"* and *"Sonnet 4.x rate limit is a total limit that applies to combined traffic across Sonnet 4.6, Sonnet 4.5, and Sonnet 4."* On 429 you get a `retry-after` header — respect it exactly.

**The cache_control economics are the single biggest cost lever.** Per Anthropic's "Prompt caching" docs: *"5-minute cache write tokens are 1.25 times the base input tokens price · 1-hour cache write tokens are 2 times the base input tokens price · Cache read tokens are 0.1 times the base input tokens price"*. And critically, per the "Rate limits" docs: *"For most Claude models, only uncached input tokens count towards your ITPM rate limits."* This means a high cache-read ratio **multiplies your effective throughput**, not just lowers your bill.

The codebase already places `cache_control: ephemeral` breakpoints on the last tool definition and the few-shots block — this is the right pattern. **Specify `ttl: "1h"` explicitly** on the prefix that should outlive the 5-minute default (since the default was silently changed from 1h to 5m around March 2026, per the documented regression in anthropics/claude-code Issue #46829):

```ts
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  system: [
    { type: "text", text: SYSTEM_PROMPT },
    { type: "text", text: TOOL_DEFINITIONS,
      cache_control: { type: "ephemeral", ttl: "1h" } },   // 1h breakpoint
    { type: "text", text: FEW_SHOTS,
      cache_control: { type: "ephemeral" } },              // 5m breakpoint
  ],
  messages: [/* dynamic per-document */],
});
```

Anthropic's stated rule (per Amazon Bedrock's "Prompt caching" docs, which mirror Anthropic's): *"Cache entries with longer TTL must appear before shorter TTLs (i.e., a 1-hour cache entry must appear before any 5-minute cache entries)."* The order above is correct.

**Cache hit ratio ≥60% target**: monitor `response.usage.cache_read_input_tokens / (cache_read + uncached + cache_creation)` per call and aggregate. The most common reason for a cache miss when you didn't expect one is a non-deterministic value in the prefix (timestamp, request ID, even a stray whitespace from prompt assembly). Audit your prompt-builder for byte-stability of the prefix.

**Message Batches API for nightly evals**: 50% discount on input AND output, processes within 24 h, has its own RPM/queue limits separate from interactive rate limits. Per Anthropic's batch-processing docs and announcement: up to 100,000 requests per batch (256 MB JSON limit). The 50% discount **stacks** with cache reads (so cached batch input = 0.5 × 0.1 × base = 5% of base price). For ituri-sitrep's nightly evals, this is a no-brainer:

- All eval requests go through `/v1/messages/batches`.
- Use a consistent system prompt across batch items so cache-warm hits (first item warms, subsequent items hit cache within the batch — within the 5-min window in typical batch processing).
- Results expire after 29 days; copy to Supabase Storage or a permanent table immediately on completion.

**Kill switch architecture (Edge Config + Postgres trigger via pg_net):** the existing design is correct. Refinements:

- Read latency on Vercel Edge Config (per Vercel's Edge Config docs): *"Most lookups return in 5 ms or less, and 99% of reads will return under 15 ms."* The kill-switch check belongs at the *start* of `/api/inngest` and any Server Action that may dispatch an LLM call — cheap enough to do unconditionally.
- The pg_net + trigger path that *writes* to Edge Config has a propagation delay — per Vercel docs: *"When updating an item in your Edge Config, it may take up to 10 seconds for the update to be globally propagated. You should avoid using Edge Configs for frequently updated data or data that needs to be accessed immediately after updating."* Don't rely on it for fine-grained per-request budget enforcement; use it as a circuit breaker (binary: "stop dispatching new LLM jobs").
- Track real-time spend in Postgres (`audit.llm_traces`) with a generated cost column (input_tokens × cost_per_input + output_tokens × cost_per_output, etc.). Sum on insert via a small per-day rollup table updated by the same trigger. When the daily rollup crosses a threshold, the trigger flips the Edge Config flag via pg_net.

**Graceful degradation when approaching caps:**
1. At 80% of daily cap → Inngest functions reduce concurrency to half via `concurrency` override.
2. At 95% → drop low-priority extraction (e.g., re-extracts of already-published documents) using Inngest's `priority` field.
3. At 100% → kill switch flips; in-flight calls finish, new dispatches are paused with a clear log line; the UI shows a "data ingestion temporarily paused" badge.
4. The next day at 00:00 UTC the daily rollup resets and the kill switch flips back automatically (via the same pg_cron-driven check).

---

## Recommendations (Staged)

### Stage 1 — Quick wins (1–2 days)
1. **Co-locate the Vercel function region with Supabase** (Project Settings → Functions → Region). If iad1 ≠ Supabase region, this is the single biggest win.
2. **Enable Fluid Compute** if not already (default for new projects since April 2025, but verify).
3. **Audit every RLS policy** for (a) `(select auth.uid())` wrapping and (b) explicit `TO authenticated` / `TO anon`. The Supabase linter's `0003_auth_rls_initplan` warning is your worklist.
4. **Set `prepare: false` in postgres.js** wherever Inngest functions connect via port 6543.
5. **Switch Anthropic `cache_control` breakpoints to `ttl: "1h"`** on the stable tool/system prefix; keep `5m` on the few-shots block.
6. **Add Vercel WAF rate-limit rules** for `/api/mvt`, `/api/inngest`, `/auth/*` (see table above).
7. **Confirm `lucide-react` and other libraries are auto-optimized** (Next.js does this by default in 16) and check the bundle analyzer for any local barrel re-exports defeating the optimization.

### Stage 2 — Schema and pipeline improvements (1–2 weeks)
1. **Add `geom_3857` generated stored column** to `geo.admin1`/`admin2` and refactor `internal.mvt` to read it directly. Skip the per-tile `ST_Transform`.
2. **Use `ST_TileEnvelope(z,x,y, margin => 64.0/4096)`** in the `&&` filter to safely use GIST.
3. **Migrate `source_quotes.embedding` to halfvec** (or add a sibling halfvec column + index, deprecate the float vector after validation). Recall validation: pick 500 known-relevant pairs, sweep `ef_search`, confirm recall stays ≥0.95.
4. **Enable `hnsw.iterative_scan = 'relaxed_order'`** in any RPC that filters before vector search.
5. **Wrap upstream fetches in Inngest functions with `throttle` per host** — replace in-process p-throttle.
6. **Add `INCLUDE (count_value, source_quote_id, status)` to the partial index** on `case_counts`.
7. **Set up `pg_cron` to refresh `geo.zone_geom_z6/z10` CONCURRENTLY** on the cadence appropriate to admin-boundary update frequency (likely weekly).
8. **Disable RLS on append-only audit tables** (`audit.llm_traces`, `audit.extraction_runs`, `audit.agent_actions`).

### Stage 3 — Architectural and observability (1–2 months)
1. **Native declarative partitioning by month** for `audit.llm_traces` and `audit.agent_actions`; pg_partman or pg_cron for partition lifecycle.
2. **Move nightly evals to the Message Batches API**; 50% discount stacks with prompt caching.
3. **Implement the spend-tracking rollup table + pg_net trigger → Edge Config kill switch** if not already; test the trip-and-recover path in staging.
4. **Adopt PPR for editorial pages** behind `cacheComponents: true`; wrap dynamic regions in Suspense; emit `cacheTag("outbreak", id)` from `"use cache"` functions.
5. **Pre-render or cache MVT tiles for the most-viewed outbreaks** (those with sustained traffic) to Supabase Storage / Vercel Blob; have the route handler check Storage first, fall back to the RPC on miss.

### Benchmarks/thresholds that should change the plan
- Tile QPS **>50 RPS sustained** → evaluate Martin or pre-rendered tiles to Storage.
- Embedding row count **>20 M** → consider partitioned HNSW indexes by outbreak or time; reconsider `m` (raise to 24 or 32) only if recall on real queries drops below target.
- LLM monthly spend approaching the Anthropic tier ceiling → request Tier 4+ via Anthropic sales; do *not* circumvent by using multiple orgs.
- Tile cache hit ratio (CDN) **<70%** → investigate cache key (`Vary` header, query strings, auth cookies leaking into MVT requests).

---

## Caveats

1. **Sources for specific Anthropic per-tier RPM/ITPM/OTPM numbers** are mostly secondary (Morph, Respan, AI Free API summaries); Anthropic's official table at `platform.claude.com/docs/en/api/rate-limits` renders client-side and is the canonical reference. Pull the current numbers from there before you make tier-purchase decisions.
2. **Next.js 16 was released October 21, 2025**, with 16.2 in March 2026 introducing further changes (`updateTag` API refinement, `proxy.ts` consolidation). Some details (e.g., whether `optimizePackageImports` remains under `experimental` or moves to top-level) may have shifted between 16.0 and 16.x — verify against the version pinned in `apps/web/package.json` before applying. The Next.js docs page still labels `optimizePackageImports` as *"This feature is currently experimental and subject to change, it's not recommended for production"* even though `lucide-react` is on the default-optimized list.
3. **Vercel WAF rate-limit pricing** scales by region; per-region counters mean global enforcement requires either calibrating the limit downward or using the `@vercel/firewall` SDK with a Redis-backed global counter.
4. **Fluid Compute's in-function concurrency** is a behavior change: any module-level mutable state in the codebase becomes shared across concurrent requests. Audit before assuming it's safe to enable broadly.
5. **Supavisor named-prepared-statement support in transaction mode is newer behavior**; the safe default of `prepare: false` remains correct, but you can experiment with `prepare: true` in a non-production environment to measure the published 15–250% throughput delta if your query mix benefits.
6. **PostGIS parallelism** depends on planner cost estimates and `max_parallel_workers_per_gather`. Supabase's defaults are reasonable but not workload-tuned; if `EXPLAIN` shows `Workers Planned: 0` on large tile queries, that's the lever.
7. **The 1-hour `cache_control` TTL** is supported on the Claude API, AWS Bedrock, Vertex AI, and Microsoft Foundry; if you fail over to Bedrock specifically, verify TTL support on the Bedrock-deployed model (per anthropics/claude-code Issue #32671, some clients hardcode the 5-min default and silently ignore the `ttl` argument).
8. The choice of HNSW `m=16, ef_construction=64` is optimal as a starting point but **must be validated against a real recall benchmark on the actual French infectious-disease corpus**; published numbers are mostly from English benchmarks. The AWS Aurora "67×" headline figure for pgvector 0.7 specifically refers to binary quantization on top of halfvec, not halfvec alone — halfvec alone gives the 50% storage saving with negligible recall impact, and that is the recommended default for ituri-sitrep.