# ADR-0013 — MapLibre GL JS + deck.gl interleaved overlays

**Status:** Accepted  
**Date:** 2026-05-28  
**Deciders:** Thomas Nicklin

## Context and Problem Statement

Phase 5 introduces the `/map` command center: a health-zone-level choropleth, centroid scatter layer, and admin1 outline overlays over a slippy-map base. The stack must be OSS-licensed, WebGL-capable, compatible with React 19/Next.js 16, and composable with the existing deck.gl-based overlay future (ACLED events, movement data). It also must respect z-order relative to MapLibre label layers so choropleth fills appear under road/place labels.

## Decision Drivers

* Open-source licence (no BSL, no per-user billing)
* WebGL compositing that respects label z-order ("interleaved" rendering)
* Maintained React 19 / concurrent-mode compatibility
* Pre-existing PostGIS MVT pipeline (vector tile source support required)
* Composable with future deck.gl overlay layers (ACLED, vaccination sites)

## Considered Options

1. **MapLibre GL JS ≥5 (base) + deck.gl ≥9 via `MapboxOverlay({interleaved:true})`**
2. Mapbox GL JS
3. Leaflet + deck.gl
4. Bare deck.gl `<DeckGL>` canvas (no raster base)

## Decision Outcome

**Chosen option: MapLibre GL JS + deck.gl interleaved overlays**, because MapLibre is MIT-licensed (forked from Mapbox GL JS v1 before BSL), deck.gl `@deck.gl/mapbox` provides first-class `MapboxOverlay` integration that renders deck layers inside the MapLibre render loop (interleaved), and both libraries already support the `@supabase/mvt` vector tile source via standard XYZ URL. The `MapboxOverlay({interleaved:true})` constructor ensures deck.gl layers are inserted between MapLibre symbol layers so choropleth fills do not obscure place labels.

### Positive Consequences

* MIT + Apache-2 licences throughout — no attribution or billing constraints.
* `interleaved: true` eliminates the z-fighting / label-occlusion issue that a separate canvas overlay would produce.
* deck.gl `GeoJsonLayer` and `ScatterplotLayer` are drop-in for Phase 6 ACLED event layer; no additional library swap.
* MapLibre ≥5 ships native `raster-dem` terrain support, enabling the Phase 5 optional Copernicus DEM toggle.

### Negative Consequences

* Adds ~220 kb gz to the `/map` route bundle (`maplibre-gl` ~140 kb + deck.gl core ~80 kb). Mitigated: `/map` has its own Next.js route segment; code is not included in any other route bundle.
* MapLibre + deck.gl initialisation is imperative; the `<MapPane>` component must be `'use client'` and manage refs carefully under React strict mode double-invoke.
* WebGL is unavailable in jsdom; map component tests must mock `maplibre-gl`.

## Alternatives Considered

**Mapbox GL JS:** BSL-licensed since v2. Requires a Mapbox access token and accepts Mapbox billing. Rejected — licence incompatibility with the project's open/CC-BY posture.

**Leaflet + deck.gl:** Leaflet uses CSS transforms (no WebGL). Cannot interleave deck.gl layers with base-map symbols. Performance degrades on high-density scatter layers. Rejected.

**Bare deck.gl `<DeckGL>`:** Renders on a separate canvas without a raster/vector base map. Loses built-in tile loading, attribution, and projection handling that MapLibre provides. Would require re-implementing vector tile loading. Rejected.

## Links

* Phase 5 spec: `docs/v1/phase-5-map-command-center.md` §MapPane
* MapLibre GL JS docs: https://maplibre.org/maplibre-gl-js/docs/
* deck.gl `MapboxOverlay` API: https://deck.gl/docs/api-reference/mapbox/mapbox-overlay
* ADR-0014 (in-DB MVT): `docs/adr/0014-in-db-mvt-vs-martin.md`
