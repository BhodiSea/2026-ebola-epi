## 1. The analytical layers (the "dots")

A case-count choropleth answers "where and how many." Research-grade situational awareness answers four harder questions the sitreps don't: *where might the next spillover or introduction be*, *who is beyond the reach of care*, *where will transmission follow people*, and *where are we blind*. Those map to the layers below.

### A. Zoonotic spillover-risk covariates

The ecology literature is consistent on what predicts filovirus spillover: rainfall (seasonality and driest-quarter rainfall are repeatedly the single strongest predictors), temperature seasonality, and — critically for a dynamic tool — anthropogenic land-use change and forest fragmentation at the wildland-human interface. Rainfall seasonality, rainfall of the driest quarter, temperature seasonality and mean annual rainfall together contributed more than 75% of an Ebola/Marburg niche model for Uganda. Anthropogenic land-use change facilitates filovirus emergence by altering the human–reservoir interface, and Ebola spillover risk rises near the overlapping range edges of fruit-bat reservoirs and primate amplifying hosts and in heterogeneous, recently-converted landscapes. Bunia and Mongbwalu sit in exactly the Albertine Rift fragmentation-and-mining context these models flag.

Sources (all open):
- **CHIRPS v3** precipitation (daily near-real-time + reanalysis) — via Google Earth Engine or the Climate Hazards Center; the V3 daily near-real-time product is now in the GEE catalog. CHIRPS V3 daily reanalysis (ERA5-based) and near-real-time (IMERG-based) are both available.
- **ERA5 / ERA5-Land** temperature & precip reanalysis — Copernicus Climate Data Store (free) or GEE.
- **Hansen Global Forest Change** (annual forest loss/gain, 30 m) and **ESA WorldCover** (10 m land cover) + **Dynamic World** (near-real-time land cover) — all in GEE / Microsoft Planetary Computer.
- **Reservoir/host ranges**: **GBIF** occurrence records (mostly CC0/CC-BY) for *Rousettus*, *Hypsignathus*, *Epomops* and primate genera, plus IUCN range polygons, to compute "distance-to-reservoir-range-edge" rasters as in the spillover literature.

### B. Environmental-anomaly / spillover-timing triggers

Distinct from the static risk surface: *anomalies* (precipitation departure, NDVI greening/browning, land-surface-temperature, fire activity) are the timing signal that ecological models associate with spillover windows. NDVI (MODIS/VIIRS), land-surface temperature (MODIS LST), active fire and burned area (VIIRS/MODIS MCD64A1), and JRC surface-water dynamics are all in the GEE and MPC catalogs and cheap to turn into rolling anomaly layers.

### C. Population denominators & settlement

Every rate needs a denominator, and the epicentre's denominators are unusually uncertain (displacement, informal mining settlements).
- **WorldPop** 100 m population (CC-BY) — your README already has the 1 km; go to 100 m + age/sex structure (CFR and care demand are age-structured).
- **GHSL** (Global Human Settlement Layer, Copernicus, open) for built-up area and settlement classification.
- **GRID3 DRC** settlement extents + health-zone polygons (CC-BY) — you have the polygons; add settlement points.
- **Meta High-Resolution Settlement Layer** (CC-BY, on HDX) for ~30 m population where WorldPop is coarse. (Note: Meta's *movement/mobility* range maps were a COVID-era product and have largely been discontinued — don't design around them.)

### D. Human mobility & forced displacement (incl. cross-border)

This is the layer most absent from the sitreps and most predictive of spread, given 273k IDPs and confirmed introductions to Goma, Kampala, and South Kivu.
- **IOM DTM API v3.0** — aggregated IDP figures at admin 0/1/2, now with displacement *drivers, origins, and sex*, P-coded to OCHA boundaries. DTM API v3.0 (released 22 August 2025) adds drivers, origins and sex, with all administrative boundaries P-coded from OCHA's COD database. **Licensing caveat:** DTM materials are for non-commercial use only, with no right to resell, redistribute, or create derivative works, and require crediting IOM/DTM as the source. Treat it exactly like ACLED — display aggregated overlays with attribution, never export raw, never include in a researcher-tier CSV.
- **UNHCR** refugee/returnee figures — cleanest via **HDX HAPI** (below).
- **OSM road network** (Geofabrik DRC/Uganda extracts, ODbL) — the substrate for both the access-friction surface (E) and displacement-corridor inference.
- **WHO/OSM points of entry & border crossings** — for the Uganda corridor; the Ituri→Kampala chain makes formal and informal PoEs a first-class entity.

### E. Healthcare-access friction → travel-time-to-ETU

This is one of the strongest dot-connecting layers and it's directly buildable. The **Malaria Atlas Project friction surface** (Weiss et al. 2018/2020) is CC-BY 4.0 and on GEE. It combines OSM and Google roads, railways, rivers, topography and land cover into a per-pixel travel-speed "friction surface," then runs least-cost-path to compute travel time to the nearest facility. The published surface is generic; the research-grade move is to **re-run the least-cost-path against the actual set of operational ETUs/treatment centres as they're announced in sitreps** (via the `malariaAtlas` R package or `GOSTNetsRaster` in Python), then overlay WorldPop to derive *population beyond 2 h / 6 h of a functioning ETU* per health zone. That is a vulnerability metric no sitrep publishes, and it updates every time an ETU opens or a road is cut. (Pleasing detail: the friction surface was co-produced by MAP at Oxford with Telethon Kids Institute in Perth — one of your shortlisted institutes.)

### F. Health-system capacity & response footprint

- **HOT OSM healthsites.io** (ODbL) — facility points, which you have.
- **OCHA Financial Tracking Service** funding flows (via HAPI) as a proxy for response scale-up.
- ETU/bed counts and healthcare-worker cases/deaths — already in your extraction schema; the HCW-death signal (four so far) is a leading indicator of nosocomial amplification and IPC failure, worth surfacing as its own entity.
- **HeRAMS** (WHO health-resources availability) exists but is typically access-restricted; don't design around it.

### G. Food security, nutrition & vulnerability

- **IPC / Integrated Food Security Phase Classification** — via HAPI, and notably **public domain** (see matrix). Acute food insecurity correlates with care-seeking delay and population movement.
- **INFORM Risk Index** (CC-BY, via HAPI) — a ready-made multi-hazard vulnerability composite at admin level.
- **FEWS NET** and **WFP** price/market data for finer-grained signals.

### H. Conflict & access-impedance

Your README uses ACLED but its terms forbid redistribution. The open complement is **UCDP**: all UCDP datasets are CC-BY 4.0 — free to use and redistribute with citation — and a JSON API provides programmatic access, including the **UCDP Candidate Events Dataset** with monthly near-real-time global releases at no more than a month's lag (April 2026 = v26.0.4). The tradeoff is resolution: UCDP counts fatal organized violence only and lags ACLED's daily, broader event coverage. So: **UCDP Candidate as the redistributable baseline conflict layer (safe for your researcher-tier export), ACLED as a display-only high-resolution overlay.** The dot-connecting product is conflict events intersected with health-facility locations and ETU catchments → "response-impedance hotspots."

### I. Genomic & phylogenetic

Pathoplexus, Nextstrain, and Virological.org are already correctly scoped, with GISAID correctly excluded. Add **NCBI Virus / GenBank** for any openly-deposited BDBV sequences. Respect the Pathoplexus Restricted-Use embargo as you've stated.

### J. Event-based surveillance & signal latency

The outbreak's own timeline is the argument for this layer: WHO was alerted on 5 May to an unexplained high-mortality illness, but BDBV confirmation only came on 14 May after the right assay was used — a ~9-day signal-to-confirmation gap. Within your fixed constraints:
- **ProMED-mail** — free; open to all sources and free to users, it serves as a human-moderated early-warning system feeding >32,000 subscribers. ISID holds copyright on post text, so **link and headline + your own summary only — no full-text republication**.
- **HealthMap** — an automated NLP aggregator of news, eyewitness and official sources that visualizes alerts on a map; public alerts are usable.
- **EC MediSys** (JRC Medical Information System) — public media aggregator with open RSS; a clean automated complement.
- **Africa CDC Event-Based Surveillance** and the WHO DON feed you already ingest.

The derived metric: **per-health-zone signal-to-confirmation latency** (earliest open mention vs first official confirmation). It's both operationally useful (blind-spot detection) and an excellent teaching artifact about surveillance lag.

---

## 2. The derived products that make it "research-grade"

These composites are the actual differentiator — each fuses ≥2 layers into something no upstream source publishes, and each carries provenance back to its inputs (consistent with your `source_quote_id` discipline, extended to "derivation provenance" for computed layers):

1. **Spillover-risk surface** — rainfall seasonality + driest-quarter rainfall + recent forest loss + distance-to-reservoir-range-edge, as a pre-computed raster flagging ecologically primed zones (offline, dated, "not a forecast").
2. **Care-access-deficit surface** — WorldPop × travel-time-to-nearest-*operational*-ETU; recomputed whenever an ETU opens or a road/bridge is reported cut.
3. **Displacement-corridor risk** — IDP origin→destination flows (DTM) along the OSM road graph, intersected with active case zones and PoEs, highlighting the Ituri→North Kivu→Uganda axis.
4. **Response-impedance hotspots** — conflict events (UCDP/ACLED) within facility/ETU catchments.
5. **Surveillance-latency map** — as above.
6. **Environmental-anomaly watch** — rolling precip/NDVI/LST anomalies over high-risk zones.

---

## 3. The 3D map: recommendation

You picked "evaluate and recommend," and the evaluation produces a fairly decisive answer, driven by one fact most people miss: **Google's Photorealistic 3D Tiles are metro-only.** Because the photogrammetry is expensive, coverage is limited to major cities; if a city isn't covered you must request it from Google. Mongbwalu, Fataki, Logo and most Ituri health zones have no photorealistic mesh, and even Bunia is doubtful. It's also a paid, commercially-licensed Google Maps Platform product: it requires a billing account and API key, prohibits caching, and mandates on-screen attribution, with a per-session pricing model. For a rural epicentre that is precisely the wrong tool, and it sits awkwardly against your otherwise open/CC-BY licensing posture.

What actually delivers the "Google Earth" feel for this geography is **terrain + draped imagery + your overlays**, which you can do entirely with open data inside your existing deck.gl/MapLibre stack:

- **Terrain**: **Copernicus GLO-30 DEM** (~30 m global digital surface model, ESA open licence with an Airbus/DLR attribution string), available as Terrarium/quantized-mesh tiles. Open Terrarium-PNG DEM tiles combining Copernicus GLO-30 are MIT-packaged and ready for MapLibre GL and CesiumJS with no server-side processing, and keyless services exist that inject attribution automatically.
- **Rendering, two clean paths:**
  - *Stay in deck.gl/MapLibre (lowest friction, recommended):* MapLibre supports raster-DEM terrain natively; deck.gl's `Tile3DLayer`/`TerrainExtension` with `operation: 'terrain+draw'` lets you drape your health-zone choropleth, ETU points and conflict overlays onto the terrain surface. deck.gl's terrain controller picks elevation from a pickable 3D layer so the camera follows the terrain. Drape a recent cloud-free Sentinel-2 composite or Esri/Bing imagery over the DEM.
  - *Switch the map page to CesiumJS (if you want a true globe):* Cesium ion bundles Cesium World Terrain, Bing Aerial imagery, Sentinel-2 imagery and OSM Buildings, usable in CesiumJS via open 3D Tiles/WMTS, and CesiumJS 1.130+ can drape imagery layers directly onto 3D Tiles. Heavier, but batteries-included, and deck.gl can interoperate.
- **Optional Google toggle:** if you want a photorealistic close-up of Bunia/Goma/Kampala specifically, add Google Photorealistic 3D Tiles as a clearly-labelled, off-by-default city toggle via deck.gl's `Tile3DLayer` (requires deck.gl 8.9.13+, an API key, and proper attribution), and document its commercial licensing separately. Don't make it the base map.

Recommendation: **Copernicus GLO-30 terrain + Sentinel-2 drape, rendered in your existing deck.gl/MapLibre stack via TerrainExtension.** It's open, attribution-clean, works for rural zones, and avoids adding a paid commercial dependency. Reserve Cesium for a v2 globe view and Google's mesh for an optional city flourish.

---

## 4. Earth-observation compute architecture

The biggest licensing nuance in the whole stack is **Google Earth Engine**: it's free for academic, education and noncommercial use, while commercial users need a paid Google Cloud subscription, and from 27 April 2026 all noncommercial projects must select a quota tier or default to the Community Tier. Your project is plainly noncommercial (MIT, no ads, public findings), so it qualifies — but a *public-facing site making live per-user GEE calls* invites the "is this operational/commercial?" question and the quota ceiling.

The clean resolution fits your existing Modal pattern exactly: **use GEE (or its alternatives) as an offline build-time engine** — compute the derived rasters (spillover surface, friction/access surface, anomalies), export as cloud-optimized GeoTIFFs / vector tiles to Supabase Storage + PostGIS, and have the web app serve *those*. GEE becomes a pipeline dependency, never a runtime one. That keeps licensing unambiguous, costs near zero, and latency low.

If you'd rather avoid GEE's commercial-tier ambiguity entirely, the license-clean substitute is **Microsoft Planetary Computer** + **Copernicus Data Space Ecosystem**: MPC's STAC API and catalog are free for anyone via pystac-client with standard open tools (xarray, rasterio, geopandas) and COG/Zarr formats, complementing Earth Engine rather than replacing its proprietary API, and CDSE offers free STAC, openEO and Sentinel Hub APIs over the Sentinel archive. Pragmatic call: **GEE for the curated derived layers it does uniquely well (Malaria Atlas friction surface, Hansen GFC, Dynamic World, least-cost-path), MPC/CDSE for raw Sentinel and reproducible Python pipelines on Modal** — both feeding the offline-precompute pattern.

---

## 5. Consolidated licensing/ethics matrix

Since "ethically unambiguous" is the binding constraint, here's the three-tier classification to bake into your `documents.licence` handling:

| Tier | Sources | Rule in your app |
|---|---|---|
| **Open / redistributable** (CC-BY, CC0, public domain) | UCDP (CC-BY), IPC food security (public domain), INFORM (CC-BY), WorldPop, GHSL, GRID3, Copernicus Sentinel + GLO-30 DEM, CHIRPS, MODIS/VIIRS/ERA5, Malaria Atlas friction surface (CC-BY), Meta HRSL (CC-BY), geoBoundaries, GBIF, HOT OSM (ODbL — share-alike) | Free to display, derive, and include in researcher-tier export, with attribution. ODbL derivatives stay share-alike. |
| **Display-with-attribution only — NO redistribution/derivatives/export** | ACLED, **IOM DTM** (non-commercial, no-derivatives), Pathoplexus Restricted-Use genomes, ProMED post text | Aggregated overlays only; never in CSV export; link rather than republish. DTM joins ACLED in this tier — note the no-derivatives clause is stricter than CC-BY-NC. |
| **Free-noncommercial (verify) / commercial** | Google Earth Engine (noncommercial-verified, offline only), Google Photorealistic 3D Tiles (paid, optional toggle) | Keep GEE as a build-time pipeline; document the Google 3D path as a separately-licensed optional feature. |
| **Excluded (correct)** | GISAID, EIOS, BlueDot/Metabiota, HeRAMS (restricted), any line-list/PHI | Unchanged. |

The one change I'd make to your current posture: **add IOM DTM to the same display-only tier as ACLED** (its no-derivative-works clause is easy to violate accidentally in a "derived data" CC-BY project), and **lead your conflict layer with UCDP** so you actually have a redistributable conflict dataset for the export feature.

---

## 6. What to wire first

If the goal is maximal awareness for minimal new surface area, the highest-leverage additions in order: (1) **HDX HAPI** — one keyless adapter gets you IPC, INFORM, OCHA funding, baseline population, and refugee/IDP figures, all P-coded (no account needed, just an app identifier); (2) **IOM DTM** displacement overlay (display-only); (3) the **travel-time-to-ETU access-deficit surface** (Malaria Atlas friction + WorldPop, recomputed on ETU changes); (4) **UCDP Candidate** as the redistributable conflict baseline; (5) the **Copernicus GLO-30 terrain + Sentinel-2 drape** 3D view; then (6) the **spillover-risk and anomaly** rasters as the offline GEE/MPC pipeline matures.

Two honest caveats worth keeping in the methods page. First, several of these (DTM admin-2 IDP figures, IPC phases, UCDP candidate events) update on weekly-to-monthly cadences and lag reality — the derived composites inherit that lag and must be dated, exactly as you already do for case numbers. Second, the spillover-risk and access-deficit surfaces are *decision-support context, not prediction*; label them as such, or you reintroduce the "dashboard tourism" failure mode your README is explicitly built to avoid.
