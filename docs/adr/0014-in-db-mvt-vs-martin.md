# ADR-0014 — In-database MVT via ST_AsMVT vs external tile server (Martin/pg_tileserv)

**Status:** Accepted  
**Date:** 2026-05-28  
**Deciders:** Thomas Nicklin

## Context and Problem Statement

Phase 5 needs to serve Mapbox Vector Tiles from the `geo.zone_geom_z6 / z10` materialized views and `public.case_counts` (joined to `geo.admin2` for centroid generation). Options are: (a) a Postgres function (`ST_AsMVT`) exposed via a Vercel Route Handler; (b) an external tile server (Martin or pg_tileserv) deployed alongside the Next.js app; or (c) a pre-tiled static CDN (tiles generated offline and uploaded to Vercel Blob).

Constraints: the case_counts layer must reflect `superseded_by IS NULL` filtering and an optional `outbreak_id` parameter — the tile content is dynamic by outbreak selection. The geo layer is relatively static (changes only after a new geo migration).

## Decision Drivers

* Dynamic filtering by `outbreak_id` without re-seeding tiles
* Zero new infrastructure at current scale (< 50 RPS sustained tile QPS forecast)
* `SECURITY DEFINER` isolation so the tile function cannot be used to exfiltrate unfiltered `case_counts`
* Compatible with Vercel Fluid Compute (Node.js runtime, not Edge)
* Reversible: if QPS grows, we can migrate to Martin without changing the client URL structure

## Considered Options

1. **`internal.mvt(z,x,y,outbreak_id)` SECURITY DEFINER Postgres function + Vercel Route Handler**
2. Martin tile server (Rust, self-hosted on Fly.io or Railway)
3. pg_tileserv (Go, self-hosted)
4. Pre-tiled static CDN (Vercel Blob, offline tile generation)

## Decision Outcome

**Chosen option: in-database `ST_AsMVT` via Route Handler.** At the forecast QPS (< 50 RPS) the in-DB approach runs well inside Fluid Compute's warm-instance concurrency model — dozens of concurrent tile RPCs per instance. The Route Handler returns `Cache-Control: public, max-age=86400, s-maxage=604800, immutable`, so the Vercel Edge CDN absorbs repeat requests. A versioned route segment (`/api/mvt/[v]/…`) allows instant CDN cache busting when geometry changes without invalidating all cached tiles. The `internal.mvt` SECURITY DEFINER function in the non-exposed `internal` schema ensures tile content is computed with a controlled `search_path` and cannot be called directly via PostgREST.

**Migration trigger:** If sustained tile QPS exceeds 50 RPS in Vercel function metrics, evaluate Martin deployed on Fly.io (`fra1` if Supabase is in Frankfurt). The versioned URL structure accommodates a zero-downtime migration (update the Route Handler to proxy Martin, keep the same client URL).

### Positive Consequences

* No new infrastructure. The Postgres instance already handles the query workload from other routes.
* `outbreak_id` filtering is a simple SQL parameter — no tile re-generation needed when the user switches outbreaks.
* `SECURITY DEFINER` in `internal` schema gives fine-grained grant control (anon can call `public.mvt` wrapper; cannot call `internal.mvt` directly).
* Tile size stays well under 500 KB at all zoom levels because we select only `(code, name, geom_3857)` into `ST_AsMVT` — no `SELECT *`.

### Negative Consequences

* Each cache miss hits Postgres. For a zoomed-out globe view with hundreds of tiles, this could spike connection count on the Supabase pooler. Mitigated by the aggressive CDN cache headers.
* `ST_AsMVT` is `PARALLEL SAFE` since PostGIS 3.0, but parallelism requires `max_parallel_workers_per_gather >= 2` in the Supabase project settings. Must verify after real geometry is loaded.
* If the outbreak layer is frequently updated (many new `case_counts` inserts), cache-busting via `?ts=` or publishing a new tile version may be needed. Phase 6 publish step will call `revalidateTag("map:tiles")`.

## Alternatives Considered

**Martin (Rust tile server):** Excellent performance at high QPS; supports `ST_AsMVT` natively. Requires deploying and operating a separate service (Fly.io), coordinating TLS, and managing secrets. Overkill at < 50 RPS. Documented as the migration path if QPS grows.

**pg_tileserv:** Similar to Martin; Go-based, simpler config. Same operational overhead concern. No advantage over Martin at this scale. Rejected.

**Pre-tiled static CDN:** Cannot filter by `outbreak_id` at runtime — would require one tile set per outbreak. Geo layer is manageable but case-count layer changes daily. Rejected due to staleness and tile proliferation.

## Links

* Phase 5 spec: `docs/v1/phase-5-map-command-center.md` §MVT Route Handler, §PostGIS performance
* Performance research: `research/performance.md` §1.4, §1.5, §2.1
* ADR-0013 (MapLibre + deck.gl): `docs/adr/0013-maplibre-deckgl-interleaved-overlays.md`
* Martin docs: https://martin.maplibre.org/
