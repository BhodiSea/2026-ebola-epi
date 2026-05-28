# Phase 9 — Computed geospatial layers (offline pipeline)

## Goal

Build an offline compute pipeline that produces six derived geospatial products — spillover-risk surface, care-access-deficit surface, displacement-corridor risk, response-impedance hotspots, surveillance-latency map, and environmental-anomaly watch — and serves them as Cloud-Optimized GeoTIFFs (COG), Vector MVT, and PMTiles from Supabase Storage. The web app consumes these as static assets; no GEE or Modal calls happen at request time. At the end of this phase, the `/map` command center shows all six layers as toggleable overlays, each clearly dated and labelled "Context — not a forecast," and the CI pipeline regenerates them on a weekly schedule.

---

## Entry preconditions

- Phase 8 exit gate met: Lighthouse ≥ 95, WCAG 2.2 AA, external screen-reader pass.
- Phase 6 source adapters live: HDX HAPI, IOM DTM, UCDP Candidate, GRID3, HOT OSM healthsites, WorldPop.
- Phase 5 map command center live: LayerRail accepts new layer registrations; `/api/mvt/[v]/[z]/[x]/[y]` versioned route in place.
- Google Earth Engine noncommercial access approved **or** a Microsoft Planetary Computer (MPC) token obtained — see §"GEE vs MPC split" below. GEE noncommercial is no longer self-serve: apply at earthengine.google.com/noncommercial. Until approved, all six derived products can be computed solely via MPC + CDSE; only the Malaria Atlas friction surface uniquely benefits from GEE (and can fall back to a local raster from the `malariaAtlas` Python package).
- Modal account configured; `infra/modal/` directory committed with stub tasks.
- Supabase Storage bucket `derived-layers` created with public read access.

---

## Compute architecture

*Source: [`research/data.md`](../../research/data.md) §4.*

**Never make GEE or Modal calls at request time.** The web app serves only precomputed assets.

```
GitHub Actions (weekly cron)
  ↓ trigger
Modal Python task (infra/modal/)
  ↓ reads from
  ├── Google Earth Engine (noncommercial, build-time): friction surface, Hansen GFC, Dynamic World, CHIRPS, LST
  ├── Microsoft Planetary Computer (STAC): Sentinel-2, ERA5
  ├── Copernicus Data Space Ecosystem (openEO): Sentinel hub APIs
  ├── HDX HAPI API: IPC, IDP figures
  ├── IOM DTM API: displacement flows
  ├── UCDP Candidate API: conflict events
  ├── HOT OSM healthsites: ETU points
  └── Local GeoJSON (GBIF, IUCN range polygons, GRID3 admin2)
  ↓ emits to
  ├── Supabase Storage / Vercel Blob: COG rasters + PMTiles
  └── internal.derived_layers (Postgres): metadata rows
GitHub Actions: bump [v] version segment in source code on successful update
```

**GEE vs MPC split (pragmatic):**
- **GEE for** (if approved): Malaria Atlas friction surface (`malariaAtlas` Python package), Hansen Global Forest Change, Dynamic World ("near-real-time" land cover — this is the product's official name), least-cost-path computation, CHIRPS and MODIS product composites.
- **MPC/CDSE for** (primary path, no application required): raw Sentinel-2 COG/Zarr, ERA5 reanalysis, pystac-client workflows, COG tile generation. Hansen GFC and CHIRPS are also available on MPC, so the pipeline is fully functional without GEE.
- **Fallback**: If GEE approval is pending, replace the Malaria Atlas friction surface with the downloadable COG from the Malaria Atlas Project website (`malariaatlas.org/data-downloads`). The six derived products do not hard-require GEE.

---

## Schema / migrations

**`supabase/migrations/<timestamp>_derived_layers.sql`** — derivation provenance table:

```sql
begin;

create schema if not exists internal;

create table if not exists internal.derived_layers (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text,
  inputs        jsonb not null default '[]'::jsonb,
  -- inputs: array of { source: string, layer: string, version: string, url: string }
  script_sha    text not null,
  -- sha256 of the Modal task source file that produced this layer
  produced_at   timestamptz not null default now(),
  valid_until   timestamptz,
  storage_url   text not null,
  -- COG: "s3://derived-layers/{slug}/{version}.tif"
  -- PMTiles: "s3://derived-layers/{slug}/{version}.pmtiles"
  tile_url      text,
  -- public HTTPS URL for tile serving (e.g. "/api/tiles/derived/{slug}/{z}/{x}/{y}")
  format        text not null check (format in ('cog', 'pmtiles', 'mvt')),
  version       text not null,
  -- matches the [v] segment in the MVT route for cache-busting
  label         text not null,
  -- shown in LayerRail: "Context — not a forecast. Last updated {produced_at}."
  created_at    timestamptz not null default now()
);

-- RLS on the internal table (service role writes only).
-- Do NOT grant USAGE on schema internal to anon/authenticated — init_schemas.sql
-- revokes it broadly.  Instead expose via a public SECURITY INVOKER view below.
alter table internal.derived_layers enable row level security;
create policy "derived_layers_service_only_insert"
  on internal.derived_layers for insert to service_role with check (true);

-- Public read shim — consistent with the public.mvt → internal.mvt pattern in Phase 5.
create or replace view public.derived_layers
  with (security_invoker = true)
as
  select id, slug, name, description, inputs, produced_at, valid_until,
         storage_url, tile_url, format, version, label, created_at
  from internal.derived_layers;

grant select on public.derived_layers to anon, authenticated;

commit;
```

---

## Deliverables

### Six derived products

*Source: [`research/data.md`](../../research/data.md) §2.*

All six layers carry the label **"Context — not a forecast"** in the LayerRail and in the map inspector tooltip. Each is dated to its `produced_at` timestamp.

---

#### 1. Spillover-risk surface

**Inputs:** CHIRPS v3 precipitation (rainfall seasonality, driest-quarter rainfall), ERA5 temperature seasonality, Hansen Global Forest Change (recent loss), GBIF occurrence records for *Rousettus*, *Hypsignathus*, *Epomops*, *Pteropus*, IUCN range polygons for the same genera.

**Method:** Logistic regression / MaxEnt niche model. Compute:
- Rainfall seasonality (coefficient of variation of monthly CHIRPS) as 1 km raster.
- Driest-quarter rainfall (min of rolling 3-month sums).
- Forest loss in the past 5 years from Hansen GFC.
- Distance-to-nearest-reservoir-range-edge (rasterise GBIF convex hulls, compute Euclidean distance).

Combine via a pre-fitted model (weights from the Plowright et al. / Pigott et al. literature). Output as a 1 km COG raster, values [0,1], 5-class Jenks classification.

**Labelling in UI:** "Ecological spillover risk — pre-computed offline raster. Based on rainfall seasonality, recent forest loss, and proximity to fruit-bat reservoir ranges. Not a forecast."

---

#### 2. Care-access-deficit surface

**Inputs:** WorldPop 100m constrained mosaic + age/sex structure. HOT OSM healthsites (operational ETU points — updated whenever an ETU opens or is reported closed in a WHO sitrep). Malaria Atlas Project friction surface (Weiss et al. 2020, CC-BY 4.0).

**Method:** Least-cost-path from each 100m population cell to the nearest operational ETU. Use `GOSTNetsRaster` or the `malariaAtlas` Python package for the least-cost-path computation on the MAP friction surface. Compute:
- Travel time in minutes to nearest operational ETU, 100m resolution.
- Aggregate to health zone: population-weighted mean travel time; population > 2h from ETU; population > 6h from ETU.

Output as 100m COG raster (travel time in minutes) + admin-zone vector PMTiles (population-weighted summary statistics per zone).

**Re-run trigger:** whenever a WHO sitrep or HOT OSM update changes the set of operational ETU points. Wire via the Inngest `who-afro` adapter: on extraction of a new ETU event, emit `derived_layer/care-access-deficit.stale` — CI workflow picks this up within 24h.

**Labelling in UI:** "Estimated travel time to nearest operational ETU — based on Malaria Atlas Project friction surface, WorldPop 100m, and confirmed operational ETU locations. Recomputed within 24h of ETU status changes."

---

#### 3. Displacement-corridor risk

**Inputs:** IOM DTM v3.0 admin-2 origin→destination flows. OSM road network (Geofabrik DRC + Uganda extracts, ODbL). Active case zones (current `case_counts` with non-null `admin1_code`). WHO/OSM points of entry and border crossings.

**Method:** Map DTM flows onto the OSM road graph. Weight flow volume by:
- Overlap with active case zones (flows originating from zones with confirmed cases).
- Proximity to formal and informal PoEs.

Output as a vector PMTiles layer: edges weighted by risk-weighted displacement volume, node circles at PoEs.

**Critical corridor:** Ituri → North Kivu → Uganda axis. The DTM v3.0 release (August 2025) adds displacement drivers and origins — filter for conflict-driven displacement from Ituri health zones.

**Labelling in UI:** "Estimated displacement corridors (IOM DTM admin-2, display-only) — arrows show conflict-driven IDP flows weighted by overlap with active case zones. IOM DTM data may not be redistributed; this layer is display-only."

---

#### 4. Response-impedance hotspots

**Inputs:** UCDP Candidate Events (CC-BY, monthly). ACLED (display-only, high-resolution). HOT OSM healthsites (ETU catchments — 2h travel-time isochrones from the care-access-deficit pipeline). `geo.admin2` health zone polygons.

**Method:**
- Buffer each ETU with a 2h travel-time isochrone (from the care-access-deficit output).
- Intersect UCDP conflict events with isochrones → count events per isochrone.
- Intersect ACLED events for a richer display-only view.
- Classify isochrones: no events, low (1–3), moderate (4–10), high (>10) in the past 90 days.

Output as PMTiles vector layer (isochrone polygons, classified by event count) + aggregated admin-zone statistics.

**Labelling in UI:** "Response-impedance hotspots — armed-group events (UCDP Candidate) within 2h travel time of operational ETUs, past 90 days. UCDP data is CC-BY; ACLED events displayed for context only (non-redistributable)."

---

#### 5. Surveillance-latency map

**Inputs:** ProMED-mail archives (link + headline + own summary only; ISID copyright on post text). HealthMap public alerts. EC MediSys open RSS. Africa CDC EBS feed. WHO DON publication timestamps. WHO AFRO sitrep publication timestamps. `public.documents.published_at` and `public.case_counts.as_of`.

**Method:**
- For each health zone in the active outbreak: find the earliest ProMED / HealthMap / MediSys mention of that zone and the first official WHO/AFRO confirmation of cases there.
- Compute lag in days: `official_confirmation_date - earliest_open_mention_date`.
- Where earliest open mention predates WHO confirmation, the zone is "surveillance-lagged."

Output as PMTiles vector layer (admin-zone polygons, coloured by lag in days: green = ≤3d, yellow = 4–7d, orange = 8–14d, red = >14d).

**Labelling in UI:** "Surveillance latency — days between earliest open media/signal mention and first official WHO confirmation per health zone. Green = fast confirmation; red = slow. Useful for identifying surveillance blind spots. Methodology: research/data.md §1.J."

---

#### 6. Environmental-anomaly watch

**Inputs:** CHIRPS v3 near-real-time precipitation. MODIS NDVI (Terra MOD13A2, 16-day composite). MODIS Land Surface Temperature (MOD11A2, 8-day). VIIRS active fire (VNP14A1). ERA5 land for baseline climatology.

**Method:** Rolling 12-week z-score for each variable against a 10-year baseline at 500m–1km resolution, clipped to the outbreak region (± 5° bbox of active health zones). Flag cells where any variable z > 2 as "anomalous."

Update cadence: weekly, triggered by the same GitHub Actions cron as other layers.

Output as 1km COG raster (multi-band: precip anomaly z, NDVI anomaly z, LST anomaly z, fire anomaly z) + a simplified admin-zone vector summary (mean anomaly per zone).

**Labelling in UI:** "Environmental anomaly watch — rolling 12-week z-score for precipitation, vegetation index, land surface temperature, and fire activity. Positive values indicate above-baseline conditions associated with increased spillover risk windows in the literature. Not a forecast."

---

## CI/CD — `derived-layers.yml`

```yaml
# .github/workflows/derived-layers.yml
name: Derived layer pipeline
on:
  schedule:
    - cron: "0 2 * * 1"   # Weekly, Monday 02:00 UTC
  workflow_dispatch:       # Manual trigger

jobs:
  run-pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with: { python-version: "3.13" }

      - name: Install Modal + dependencies
        run: pip install modal geopandas rasterio pystac-client xarray rio-cogeo malariaAtlas

      - name: Authenticate Modal
        env:
          MODAL_TOKEN_ID:     ${{ secrets.MODAL_TOKEN_ID }}
          MODAL_TOKEN_SECRET: ${{ secrets.MODAL_TOKEN_SECRET }}
        run: modal token set --token-id $MODAL_TOKEN_ID --token-secret $MODAL_TOKEN_SECRET

      - name: Run derived layers pipeline
        env:
          GEE_SERVICE_ACCOUNT_KEY: ${{ secrets.GEE_SERVICE_ACCOUNT_KEY }}
          SUPABASE_URL:            ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          IOM_DTM_APP_ID:          ${{ secrets.IOM_DTM_APP_ID }}
        run: modal run infra/modal/derived_layers.py

      - name: Bump tile version and commit
        if: success()
        run: |
          VERSION="layers_$(date +%Y%m%d)"
          sed -i "s/DERIVED_TILE_VERSION=.*/DERIVED_TILE_VERSION=${VERSION}/" apps/web/.env.local.example
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git config user.name "github-actions[bot]"
          git commit -am "chore(derived-layers): bump to ${VERSION}" || echo "No changes to commit"
```

---

## Code — Modal pipeline scaffold

**`infra/modal/derived_layers.py`** — top-level entrypoint:

```python
import modal
import ee  # earthengine-api

app = modal.App("ituri-sitrep-derived-layers")

image = modal.Image.debian_slim().pip_install(
    "earthengine-api", "geopandas", "rasterio", "pystac-client",
    "xarray", "rio-cogeo", "malariaAtlas", "requests",
)

@app.function(image=image, secrets=[modal.Secret.from_name("ituri-sitrep")])
def run_care_access_deficit():
    """Recompute travel-time-to-ETU surface."""
    # 1. Fetch operational ETU points from HOT OSM (updated by Phase 6 adapter)
    # 2. Load MAP friction surface from GEE
    # 3. Run least-cost-path (malariaAtlas or GOSTNetsRaster)
    # 4. Export as COG to Supabase Storage
    # 5. Upsert internal.derived_layers row
    ...

@app.function(image=image, secrets=[modal.Secret.from_name("ituri-sitrep")])
def run_spillover_risk():
    """Recompute spillover-risk surface."""
    ...

@app.function(image=image, secrets=[modal.Secret.from_name("ituri-sitrep")])
def run_env_anomaly_watch():
    """Recompute environmental anomaly z-scores."""
    ...

# Add one function per derived layer. Wire them in a pipeline with Modal's dag support.
```

---

## Web app integration

### LayerRail registration

Query `internal.derived_layers` on the `/map` page server component and pass rows to `<LayerRail>`:

```ts
// apps/web/app/map/page.tsx
const derivedLayers = await db.select().from(internalDerivedLayers).where(
  isNotNull(internalDerivedLayers.tileUrl)
);
// Pass to LayerRail as a new "Derived" layer group.
```

### Tile serving for COG rasters

For COG rasters (not PMTiles), add a thin route handler that streams bytes from Supabase Storage via a signed URL:

```
apps/web/app/api/tiles/derived/[slug]/[z]/[x]/[y]/route.ts
```

Or use PMTiles directly in MapLibre (no route handler needed — MapLibre can read PMTiles from a public URL via `pmtiles://` protocol + the `protomaps/maplibre-pmtiles` plugin).

### UI labelling

Every derived layer card in `<LayerRail>` shows:
1. Layer name.
2. `produced_at` timestamp formatted as "Context — updated {relativeTime}."
3. A link to the methodology section on `/methods#derived-layers`.
4. A warning badge: "Not a forecast."

---

## Tests

### Vitest

**`infra/modal/__tests__/registry.test.ts`** — asserts that all six slugs are present in the `DERIVED_LAYER_SLUGS` constant and that each has a corresponding Modal function.

### pgTAP

**`supabase/tests/010-derived-layers.sql`**:
```sql
-- internal.derived_layers table exists
select has_table('internal', 'derived_layers', 'internal.derived_layers exists');
-- unique index on slug
select has_index('internal', 'derived_layers', 'derived_layers_slug_key', 'unique index on slug');
-- format check constraint fires
select throws_ok(
  $$insert into internal.derived_layers (slug, name, inputs, script_sha, storage_url, format, version, label)
    values ('test', 'Test', '[]'::jsonb, 'abc123', 'http://example.com/test.xyz', 'invalid', 'v1', 'Test')$$,
  '23514',
  null,
  'invalid format rejected'
);
```

### Integration

After a manual pipeline run, assert:
```bash
psql -c "SELECT count(*) FROM internal.derived_layers" 
# Expected: 6 (one per layer)

for url in $(psql -tA -c "SELECT storage_url FROM internal.derived_layers"); do
  curl -I "$url" | grep -q "200 OK" || echo "FAIL: $url"
done
# Expected: all 200 OK
```

---

## Verification

```bash
# 1. pgTAP
supabase test db
# Expected: test 010 passes.

# 2. Manual pipeline run (local stub — no GEE required)
modal run infra/modal/derived_layers.py --detach
# Expected: all six Modal functions complete; internal.derived_layers has 6 rows.

# 3. Tile serving
curl -I "$(psql -tA -c "SELECT tile_url FROM internal.derived_layers WHERE slug='care-access-deficit'")"
# Expected: 200 OK, Content-Type: application/vnd.mapbox-vector-tile or image/tiff

# 4. /map shows derived layers
pnpm dev
# Navigate to /map → LayerRail → expand "Derived" group.
# Toggle "Care-access-deficit" layer.
# Expected: raster overlay appears on map; tooltip on hover shows label "Context — not a forecast."
# Inspector: click a zone polygon; Overview tab shows care-access summary statistics.

# 5. Layer labelling
# For each derived layer card in LayerRail, assert:
# - "Context — not a forecast" badge is visible.
# - "Updated {date}" is present.
# - No forecast language in the layer description.
```

---

## Exit gate

All six derived layers present in `internal.derived_layers` with non-null `storage_url` and `tile_url`; all six render as toggleable overlays in `/map` LayerRail labelled "Context — not a forecast" with correct `produced_at` dates; the CI pipeline regenerates them weekly without manual intervention.

---

## Research cross-references

- [data.md §1 — The analytical layers](../../research/data.md#1-the-analytical-layers-the-dots)
- [data.md §2 — The six derived products](../../research/data.md#2-the-derived-products-that-make-it-research-grade)
- [data.md §3 — 3D map recommendation](../../research/data.md#3-the-3d-map-recommendation)
- [data.md §4 — Earth-observation compute architecture](../../research/data.md#4-earth-observation-compute-architecture)
- [data.md §5 — Licensing/ethics matrix](../../research/data.md#5-consolidated-licensingethics-matrix)
- [data.md §6 — What to wire first](../../research/data.md#6-what-to-wire-first)

---

## Out of scope

- Cesium globe view (v2).
- Google Photorealistic 3D Tiles city toggle (v2).
- Modal / EpiNow2 Rt nowcasting (v2; ADR-0009).
- Terrain exaggeration / hillshade from Copernicus GLO-30 beyond the Phase 5 `raster-dem` layer (already shipped in Phase 5 as the Terrarium DEM source).
- Real-time GEE calls from the web app at request time — **prohibited**. All GEE usage is build-time only.
- GBIF occurrence download automation (seed the GBIF convex-hull GeoJSON manually from a one-time download at `https://www.gbif.org/occurrence/download`; do not design around a GBIF automated pull until the pipeline is mature).
