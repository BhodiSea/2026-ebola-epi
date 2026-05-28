# ituri-sitrep

A public situational-awareness companion for the 2026 Ituri Bundibugyo virus (BDBV) outbreak.

Auto-ingests publicly released WHO Disease Outbreak News, WHO AFRO weekly external sitreps, Africa CDC epidemic intelligence reports, ECDC threat assessment briefs, ReliefWeb updates, ACLED conflict events, and Pathoplexus/Nextstrain genomic releases. Extracts structured numbers with LLM-assisted parsing, anchors every figure to its source sentence, and renders a health-zone-level map with a temporal scrubber and an entity-centric drill-down.

Built solo on weekends by an MD student at UWA. Open-source under MIT (code) and CC-BY 4.0 (derived data).

---

## ⚠️ Scope and honesty

**This is not an operational response tool.** It is a public-information aggregator and a portfolio/teaching artifact. Specifically:

- **No PHI, no line-list data, no contact-graph reconstruction.** Only published aggregate figures from WHO, AFRO, Africa CDC, ECDC, ReliefWeb, MoH press releases, and equivalent.
- **Not affiliated with WHO, AFRO, Africa CDC, ECDC, DRC MSP, Uganda MoH, MSF, IFRC, NCCTRC/AUSMAT, or any UN/AU agency.**
- **Not a forecasting platform.** Any Rt or projection panels are pre-computed offline and clearly marked as such; nothing on this site should be cited as authoritative against the WHO DON or DRC MoH press releases.
- **Numbers lag and disagree.** WHO DON, AFRO sitrep, ECDC TAB, US CDC HAN, and DRC MoH press statements diverge by days and tens of cases. This site shows all of them with timestamps and does not pick a "winner."

If you are a journalist, public health trainee, or member of the public looking for a fast read of the current state of the outbreak — this is for you. If you are a field epidemiologist needing an operational tool — use Go.Data, SORMAS, or DHIS2 Tracker.

---

## What this is

A single-outbreak, public-data situational awareness viewer:

- **Map landing.** GRID3 DRC health-zone polygons, coloured by suspected case totals as of the most recent sitrep. Temporal scrubber over the outbreak timeline. ACLED conflict-event overlay (toggleable). Health facility points from HOT OSM.
- **Entity-centric drill-down.** Click a health zone → side panel with case timeseries by source, listed facilities, ACLED events in the past 30 days, and links to every sitrep that mentioned the zone.
- **Source-grounded numbers.** Hover any figure on the page → tooltip showing the verbatim sentence from the source document, the document URL, and the extraction timestamp. Click → opens the document at the relevant section.
- **Document explorer.** Reverse-chronological feed of ingested documents (DONs, AFRO sitreps, ECDC TABs, ReliefWeb updates) with extracted summaries, key numbers, and a diff against the previous document from the same source.
- **Phylogeny panel.** Nextstrain BDBV build embedded via Auspice JSON when available; otherwise a placeholder with a link to virological.org.
- **"What changed?" brief.** A daily LLM-generated summary of changes across all sources in the last 24 h, with provenance for every claim.

## What this is not

- Not a contact-tracing tool.
- Not a transmission-chain reconstruction tool.
- Not a forecasting model.
- Not a replacement for the WHO DON, AFRO sitrep, or DRC MSP press releases.

---

## Stack

| Layer          | Choice                                                      | Why                                                                                        |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Frontend       | Next.js 15 (App Router), React 19, TypeScript               | App Router server components keep the map shell familiar                                   |
| Styling        | Tailwind CSS + shadcn/ui                                    | Standard                                                                                   |
| Map            | MapLibre GL JS + deck.gl                                    | Vector tiles from PostGIS via `pg_tileserv` patterns; deck.gl for layered overlays         |
| Database       | Supabase (Postgres 16) + PostGIS + pgvector                 | Spatial polygons, JSONB for semi-structured sitrep extracts, pgvector for sitrep retrieval |
| Storage        | Supabase Storage                                            | Raw PDFs, sitrep snapshots                                                                 |
| Auth           | Supabase Auth (read-only public; researcher tier optional)  | RLS-enforced                                                                               |
| Ingestion      | Inngest + Vercel Fluid Compute                              | Durable job queue with per-source `throttle`; Fluid Compute removes cold-start latency     |
| LLM extraction | Anthropic Claude 4.x — Sonnet 4.6 (extraction), Haiku 4.5 (triage), Opus 4.7 (reconciliation); Batch API for nightly evals | Prompt-cached with explicit `ttl: "1h"`; Batch API gives 50 % discount on evals           |
| Heavy compute  | Modal (Python) for derived geospatial layers + optional Rt panels | Offline pipeline emits COG/PMTiles to Supabase Storage; Rt panels are v2               |
| Hosting        | Vercel                                                      | Standard                                                                                   |

---

## Data sources

All sources are public and used within their stated terms. Every source row in the database carries a `license_tier` (`open` / `display_only` / `noncommercial_verified` / `excluded`); see the [License posture](#license-posture) section below.

| Source | Format | Cadence | Licence tier | Notes |
|--------|--------|---------|-------------|-------|
| WHO Disease Outbreak News (DON602, DON603, …) | HTML + PDF | ~weekly | open (CC-BY-NC-SA 3.0 IGO) | Primary numeric source |
| WHO AFRO Weekly External Situation Report | PDF | weekly | open (CC-BY-NC-SA 3.0 IGO) | Most granular health-zone breakdown |
| Africa CDC Epidemic Intelligence Weekly Report | PDF | weekly | open (Africa CDC terms) | Continental view |
| ECDC Threat Assessment Brief | HTML | as updated | open (CC-BY 4.0) | Cleanest structured updates |
| ReliefWeb | RSS + HTML | continuous | open (per-publisher) | OCHA, UNFPA, IFRC flash updates |
| DRC MSP press releases | HTML/PDF | irregular | open (public domain) | When available |
| Uganda MoH press releases | HTML/PDF | irregular | open (public domain) | When available |
| ACLED conflict events | API (JSON) | daily | display_only (academic non-redistribution) | Aggregated overlays only; no raw export; requires registration |
| HDX HAPI | API (JSON) | as updated | open (CC-BY-IGO) | Keyless API; one call unlocks IPC food security, INFORM Risk Index, OCHA Financial Tracking Service, and UNHCR refugee/IDP figures |
| IOM DTM v3.0 | API (JSON) | as updated | display_only (non-commercial, no derivatives) | Admin-2 IDP figures with drivers, origins, and sex breakdown |
| UCDP Candidate Events | API (JSON) | monthly | open (CC-BY) | Redistributable conflict baseline; ACLED is the display-only overlay |
| GRID3 DRC Health Zones | GeoJSON | static | open (CC-BY 4.0) | Health-zone polygons; superseded at admin-2 by GRID3 settlement extents |
| HOT OSM healthsites.io | API | daily | open (ODbL, share-alike) | Facility points for travel-time-to-ETU denominator |
| WorldPop DRC 100 m + age/sex | GeoTIFF | static | open (CC-BY 4.0) | Population denominators at 100 m resolution; supersedes 1 km |
| GHSL + Meta HRSL | GeoTIFF | static | open (CC-BY) | Built-up area and settlement classification |
| NCBI Virus / GenBank | API | as released | open (public domain) | BDBV sequences from INRB Kinshasa and CPHL Kampala |
| ProMED-mail | Web | irregular | display_only (ISID copyright on post text) | Link + headline + own summary only; verbatim post text is not reproduced |
| HealthMap | API | continuous | open (public alerts) | Aggregated epidemic-intelligence alert feed |
| EC MediSys | RSS | continuous | open | EU media-monitoring RSS |
| Pathoplexus | Web + downloads | as released | restricted_use (embargo-respected) | First 2026 BDBV genomes from INRB + CPHL — ingest is read-only; respect publication embargo |
| Nextstrain BDBV build | Auspice JSON | as updated | open (CC-BY 4.0) | Embedded phylogeny panel |
| Virological.org | Forum posts | irregular | open (per-author) | Andrew Rambaut BEAST analyses, INRB sequence notes |

**Sources deliberately excluded:**

- **GISAID** — login-gated; redistribution incompatible.
- **EIOS** — WHO Member-state restricted.
- **BlueDot / Metabiota / commercial signal feeds** — paywalled.
- **Any line-list data** — ethically out of scope for a solo developer, regardless of obtainability.
- **Social-media scraped content beyond HealthMap/ProMED** — signal-to-noise too low; ethically thorny.

---

## License posture

Every `sources` row carries a `license_tier` column enforced at the database level. The three tiers in use:

| Tier | Definition | Examples | Export policy |
|------|------------|---------|---------------|
| `open` | CC-BY, CC0, ODbL, public domain — no redistribution restriction | WHO DON, UCDP, GRID3, WorldPop, HOT OSM | Included in researcher-tier CSV export |
| `display_only` | Terms prohibit redistribution, require registration, or restrict derivatives | ACLED, IOM DTM, ProMED post text | Aggregated overlays with attribution; excluded from all CSV exports and derived rasters |
| `noncommercial_verified` | Non-commercial permitted; acceptable for build-time compute but not for hosting | Google Earth Engine (Phase 9 offline pipeline only) | Used in Phase 9 pipeline; output COG/PMTiles published as open |

`excluded` tier is reserved for sources incompatible with any public-good use: GISAID, EIOS, commercial feeds.

Researcher-tier CSV export (`/api/export`) always filters `WHERE license_tier = 'open'`. `display_only` sources appear only as rendered overlays with attribution text; they are never included in any downloaded dataset.

---

## Method

### Ingestion

An Inngest function fires on a per-source schedule (or on demand). For each source it:

1. Fetches the latest document (RSS / API / scrape), respecting per-host `throttle` limits.
2. Issues a conditional GET (`If-None-Match` / `If-Modified-Since`) if a prior `etag` / `last_modified` exists; `304 Not Modified` short-circuits the rest of the run and consumes zero LLM tokens.
3. Stores the raw artifact in Supabase Storage.
4. Records a row in `documents` with `source`, `url`, `fetched_at`, `content_hash`, `mime_type`, `license`, `etag`, `last_modified`.
5. Dispatches an extraction event.

PDFs are parsed with `pdfplumber` (text) and `pdf2image` + Claude vision (tables/figures when text extraction is unreliable).

### LLM extraction

For each new document, Claude is prompted with a strict JSON schema (`schemas/sitrep-extract.json`) covering:

- `cases_by_health_zone[]` — `{ health_zone, province, suspected, confirmed, deaths_suspected, deaths_confirmed, as_of_date }`
- `contacts` — `{ listed, under_follow_up, follow_up_pct, as_of_date }`
- `vaccination` — `{ vaccine, doses_administered, target_population, as_of_date }` (currently null — no licensed BDBV vaccine)
- `response_indicators` — `{ etus_operational, beds, healthcare_worker_cases, healthcare_worker_deaths }`
- `alerts_and_events` — short list of newly described events
- `source_quotes[]` — for **every** extracted figure, the verbatim sentence(s) supporting it, with character offsets into the source document

The schema includes a `confidence` field per record and a `model_version` field per extraction. Extractions are versioned, never overwritten. A weekly cron diff-checks new extractions against the previous run for the same document hash to detect model drift.

### Provenance

Every figure rendered in the UI carries a `source_quote_id` foreign key. The hover tooltip and "Open source" interaction are the single most important features of this project — they are what separates this from dashboard tourism. **If you contribute a feature that displays a number without a `source_quote_id`, the PR will be rejected.**

### Validation

A small held-out gold set of hand-extracted sitrep numbers (`tests/gold/` — currently 12 documents, growing) is used to monitor extraction drift. CI runs extraction against the gold set on every PR and fails if accuracy drops below threshold.

### Derived geospatial layers (Phase 9)

Six derived rasters — spillover-risk surface, care-access-deficit surface, displacement-corridor risk, response-impedance hotspots, surveillance-latency map, and environmental-anomaly watch — are built by an offline Modal/GEE/Microsoft Planetary Computer pipeline on a weekly cron. The pipeline emits COG and PMTiles to Supabase Storage; the web app serves those statically from versioned paths. Nothing is computed at request time.

Every pixel traces back to named input layers and the script SHA that produced it, recorded in `internal.derived_layers`. See [`docs/v1/phase-9-computed-geospatial-layers.md`](docs/v1/phase-9-computed-geospatial-layers.md).

### Heavy compute (optional, v2)

Bayesian Rt nowcasting and branching-process scenario panels on Modal (Python: `EpiNow2` via `rpy2`, or `epinowcast`) are deferred to v2. **Nothing on this site is a live forecast.** Any future panels will be dated and labelled "pre-computed; not authoritative."

---

## Repository layout

```
.
├── apps/
│   └── web/                      # Next.js App Router (Vercel + Fluid Compute)
│       ├── app/
│       │   ├── (public)/
│       │   │   ├── page.tsx              # Map landing (/today)
│       │   │   ├── zone/[code]/page.tsx  # Health zone drill-down
│       │   │   ├── document/[id]/page.tsx
│       │   │   ├── brief/[date]/page.tsx # Daily "what changed?" brief
│       │   │   └── methods/page.tsx      # Methods, limits, citations
│       │   └── api/
│       │       ├── mvt/[v]/[z]/[x]/[y]/ # Versioned PostGIS MVT tiles
│       │       └── inngest/              # Inngest event endpoint
│       ├── inngest/                      # Inngest function definitions
│       ├── lib/                          # Supabase client, RLS-aware queries
│       └── proxy.ts                      # Next.js 16 proxy (replaces middleware.ts)
├── packages/
│   ├── db/                       # Drizzle schema + generated types
│   ├── extract/                  # Claude extraction: zod → tool → prompt → runner
│   └── ingest/                   # Source adapters + adapter registry
├── infra/
│   └── modal/                    # Python offline pipeline (derived geospatial layers)
├── supabase/
│   ├── migrations/               # SQL migrations (dollar-quoted, pglast-validated)
│   ├── seed/                     # Static reference data (GRID3 polygons, source rows)
│   └── tests/                    # pgTAP test suite
├── evals/                        # promptfoo config + gold-set extraction checks
├── .github/workflows/
│   ├── ci.yml                    # Lint, typecheck, vitest, pgtap, gold-set eval
│   ├── derived-layers.yml        # Weekly Modal pipeline for computed geospatial layers
│   └── deploy.yml
├── docs/
│   ├── v1/                       # Phase specs (phases 0–9)
│   └── adr/                      # Architecture Decision Records (MADR 4.0)
└── research/                     # Authoritative research inputs (read-only)
    ├── data.md                   # Data layer inventory + licensing analysis
    ├── performance.md            # PostGIS, caching, rate-limiting patterns
    └── copy.md                   # Voice guide, copy templates, JSON-LD
```

---

## Running locally

### Prerequisites

- Node 22 LTS, pnpm 10+
- Supabase CLI (`brew install supabase/tap/supabase`)
- Docker (for local Supabase)
- Python 3.11+ (for Modal / GEE derived-layers pipeline; not required for the web app)
- An Anthropic API key
- An Inngest account (free tier sufficient for dev)
- An ACLED account (free for academic use) if you want the conflict overlay

### Setup

```bash
git clone https://github.com/<you>/ituri-sitrep
cd ituri-sitrep
pnpm install
cp .env.example .env.local           # fill in keys (see below)

supabase start                        # local Supabase
supabase db reset                     # apply migrations + seed (GRID3 polygons, source registry)

pnpm dev                              # Next.js on :3000
```

### Python toolchain (SQL validation)

`supabase/migrations/**.sql` files must parse with `pglast` (AGENTS.md rule 6).
Once per checkout:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pglast --version            # >= 6.0
```

`npm run db:lint` runs the validator over every migration. The
`biome-check.sh` hook also calls `pglast` on every `.sql` write.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL_TRIAGE=claude-haiku-4-5-20251001      # triage / cheap routing
ANTHROPIC_MODEL_EXTRACT=claude-sonnet-4-6             # schema-strict extraction
ANTHROPIC_MODEL_RECONCILE=claude-opus-4-7             # multi-source reconciliation

INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

UPSTASH_REDIS_REST_URL=               # for inbound rate limiting (L2)
UPSTASH_REDIS_REST_TOKEN=

ACLED_API_KEY=
ACLED_EMAIL=

MAPLIBRE_STYLE_URL=                   # any vector style; default is in-repo
```

### One-shot ingest (for testing)

```bash
pnpm tsx scripts/ingest-once.ts --source=who-don --since=2026-05-15
pnpm tsx scripts/extract-document.ts --id=<document_id>
```

### Running the gold-set check

```bash
pnpm test:gold
```

---

## Deployment

The reference deployment is on Vercel + Supabase Cloud. Ingestion runs via Inngest (cloud-hosted, free tier covers development cadence). The weekly derived-layers pipeline runs on Modal and is optional.

Cost envelope (informational, single-developer scale):

- Supabase Pro: $25/mo
- Vercel Hobby/Pro: $0–20/mo
- Anthropic API: ~$5–15/mo at current sitrep cadence (Haiku-dominant, cached)
- Inngest: $0/mo at hobby scale
- Upstash Redis: $0/mo at hobby scale
- Modal (derived layers): $0–10/mo
- ACLED: free (academic)

---

## Roadmap

Phase specs live in [`docs/v1/`](docs/v1/). Phases 0–2 are implemented.

### v1 — shipped / in progress

| Phase | Summary | Status |
|-------|---------|--------|
| 0 | Monorepo, CI/CD, Vercel + Supabase scaffold | ✅ shipped |
| 1 | Postgres schema, RLS, pgTAP test suite | ✅ shipped |
| 2 | WHO DON ingest → Anthropic-cached extraction → `audit.llm_traces` | ✅ shipped |
| 3 | Design system, provenance UI, voice & microcopy library | planned |
| 4 | Editorial surfaces: map landing, zone drill-down, document explorer, daily brief | planned |
| 5 | Map command centre: MVT tiles, PostGIS perf, deck.gl terrain | planned |
| 6 | Multi-source adapters (HDX HAPI, IOM DTM, UCDP, WorldPop, GHSL, …) + license tiers | planned |
| 7 | Evals, kill switch, layered rate limiting, Batch API back-fill | planned |
| 8 | Mobile polish, a11y, JSON-LD structured data, SEO/GEO | planned |
| 9 | Computed geospatial layers (offline Modal/GEE pipeline) | planned |

### v2 — deferred

- Bayesian Rt nowcasting (Modal + EpiNow2)
- Cesium globe view and 3D city photogrammetry
- Full French + Swahili localisation
- Multi-tenant Mastra + Qdrant for cross-outbreak retrieval
- Pathoplexus genomic tab full UI (embargo-respected read-only ingest in v1)

---

## Contributing

Solo project for now. PRs are welcome once Stage 1 is shipped. Two hard rules:

1. **No PHI, no line-list data, ever.** Even if a source publishes it accidentally, this repo does not ingest it.
2. **Every rendered figure must have a `source_quote_id`.** No exceptions.

If you maintain Go.Data, SORMAS, DHIS2 Tracker, Epiverse-TRACE, or Global.health and any of this is reusable upstream: please open an issue. The right home for the LLM sitrep-extraction logic may be an Epiverse-TRACE-compatible R package (working name: `{sitrepr}`), not this web UI.

---

## Research notes

The three documents below are the authoritative source for the design decisions folded into each phase spec. They are inputs, not deliverables — do not edit them.

| Document | Covers |
|----------|--------|
| [`research/data.md`](research/data.md) | Data layer inventory, derived geospatial products, 3D map recommendation, offline GEE/MPC/CDSE compute architecture, three-tier licensing matrix |
| [`research/performance.md`](research/performance.md) | PostGIS MVT optimisations, Next.js 16 proxy patterns, Anthropic cache TTL fix, Inngest throttle, layered rate limiting, Fluid Compute audit |
| [`research/copy.md`](research/copy.md) | OWID voice register, page-level copy templates, JSON-LD schema.org markup, GEO/AI-Overviews discoverability, ICD-11 code reference |

---

## Citation

If you use any extracted data from this project in academic work, please cite the original WHO/AFRO/ECDC/MoH documents, not this site. This project is a convenience layer; it is not the source of truth.

If you want to acknowledge the extraction pipeline specifically:

```
Nicklin, T. (2026). ituri-epi: a public situational awareness companion
for the 2026 Ituri Bundibugyo virus outbreak.
https://github.com/BhodiSea/2026-ebola-epi
```

---

## Acknowledgements

This project would not exist without the public-good work of:

- **WHO, WHO AFRO, Africa CDC, ECDC, US CDC, DRC MSP, Uganda MoH** for releasing structured outbreak information under permissive terms.
- **INRB Kinshasa and the Central Public Health Laboratories, Kampala** for releasing the first 2026 BDBV genomes openly via Virological.org and Pathoplexus.
- **Andrew Rambaut, Trevor Bedford, and the Nextstrain team** for the phylogenetic infrastructure.
- **Epiverse-TRACE, RECON, and Global.health** for setting the standard of open, reproducible outbreak analytics — this project tries to be a good neighbour to that community.
- **GRID3, HOT OSM, WorldPop, OCHA HDX, ACLED** for the geospatial scaffolding that makes any DRC analysis possible.
- **MSF, IFRC, and the DRC Red Cross** — building a desk tool is easy; staffing an ETU in Ituri is not.

---

## Author

Thomas Nicklin — MD candidate, University of Western Australia. Software engineering background; interests in infectious-disease epidemiology, global health, and field-deployed outbreak investigation.

This is a side project, built on weekends, and should be evaluated as such.

---

## Licence

- Code: **MIT**
- Derived data (extracts, schemas, gold set): **CC-BY 4.0**
- Upstream data: per source (see [`docs/data-sources.md`](docs/data-sources.md))

Upstream restrictions are respected: ACLED data is not redistributed; Pathoplexus Restricted-Use genomes are not republished; GISAID and EIOS are not used.
