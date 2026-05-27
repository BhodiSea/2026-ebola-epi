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
| Ingestion      | GitHub Actions (cron, every 6 h)                            | No always-on worker; cron is sufficient given sitrep cadence                               |
| LLM extraction | Anthropic Claude (Haiku for bulk, Sonnet for schema-strict) | Stable structured-output behaviour; cost-effective                                         |
| Heavy compute  | Modal (Python) for any Rt / branching-process runs          | Offloaded from Vercel; results persisted to Supabase                                       |
| Hosting        | Vercel                                                      | Standard                                                                                   |

---

## Data sources

All sources are public and used within their stated terms. Licensing varies and is recorded per-document in the `documents` table.

| Source                                         | Format                | Cadence     | Licence                          | Notes                                                                                          |
| ---------------------------------------------- | --------------------- | ----------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| WHO Disease Outbreak News (DON602, DON603, …)  | HTML + occasional PDF | ~weekly     | CC-BY-NC-SA 3.0 IGO              | Primary numeric source                                                                         |
| WHO AFRO Weekly External Situation Report      | PDF                   | weekly      | CC-BY-NC-SA 3.0 IGO              | Most granular health-zone breakdown                                                            |
| Africa CDC Epidemic Intelligence Weekly Report | PDF                   | weekly      | Africa CDC terms                 | Continental view                                                                               |
| ECDC Threat Assessment Brief                   | HTML                  | as updated  | CC-BY 4.0                        | Cleanest structured updates                                                                    |
| ReliefWeb                                      | RSS + HTML            | continuous  | Per-publisher                    | OCHA, UNFPA, IFRC flash updates                                                                |
| DRC MSP press releases                         | HTML/PDF              | irregular   | Public domain (DRC)              | When available                                                                                 |
| Uganda MoH press releases                      | HTML/PDF              | irregular   | Public domain (UG)               | When available                                                                                 |
| ACLED conflict events                          | API (JSON)            | daily       | ACLED Terms of Use (academic)    | **Requires registration; redistribution prohibited** — aggregated overlays only, no raw export |
| HDX HAPI                                       | API (JSON)            | as updated  | CC-BY-IGO                        | Boundaries, population                                                                         |
| GRID3 DRC Health Zones                         | GeoJSON               | static      | CC-BY 4.0                        | Health-zone polygons (CIESIN/Columbia, 2022)                                                   |
| HOT OSM healthsites                            | API                   | daily       | ODbL                             | Facility points                                                                                |
| WorldPop DRC 1 km                              | GeoTIFF               | static      | CC-BY 4.0                        | Population denominators                                                                        |
| Pathoplexus                                    | Web + downloads       | as released | Restricted Use (initial release) | First BDBV genomes from INRB + CPHL — respect publication embargo                              |
| Nextstrain BDBV build                          | Auspice JSON          | as updated  | CC-BY 4.0                        | Embedded phylogeny                                                                             |
| Virological.org                                | Forum posts           | irregular   | Per-author                       | Andrew Rambaut BEAST analyses, INRB updates                                                    |

**Sources deliberately excluded:**

- **GISAID** — login-gated; redistribution incompatible.
- **EIOS** — WHO Member-state restricted.
- **BlueDot / Metabiota / commercial signal feeds** — paywalled.
- **Any line-list data** — ethically out of scope for a solo developer, regardless of obtainability.
- **Social-media scraped content beyond what HealthMap publishes** — signal-to-noise too low; ethically thorny.

---

## Method

### Ingestion

A GitHub Actions workflow runs every 6 hours. For each source it:

1. Fetches the latest document (RSS / API / scrape).
2. Hashes the content; skips if unchanged.
3. Stores the raw artifact in Supabase Storage.
4. Records a row in `documents` with `source`, `url`, `fetched_at`, `content_hash`, `mime_type`, `licence`.
5. Triggers extraction.

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

### Heavy compute (optional, Stage 3)

Bayesian Rt nowcasting and branching-process scenario panels run on Modal (Python: `EpiNow2` via `rpy2`, or `epinowcast`). Results are written back to Supabase and rendered as static panels. **Nothing on this site is a live forecast.** Panels are dated and labelled "pre-computed; not authoritative."

---

## Repository layout

```
.
├── app/                          # Next.js App Router
│   ├── (public)/
│   │   ├── page.tsx              # Map landing
│   │   ├── zone/[code]/page.tsx  # Health zone drill-down
│   │   ├── document/[id]/page.tsx# Source document explorer
│   │   ├── brief/page.tsx        # "What changed in 24h" brief
│   │   └── methods/page.tsx      # Methods, licence, caveats
│   └── api/
│       └── ingest/               # Manual re-trigger endpoints
├── lib/
│   ├── db/                       # Supabase client, RLS-aware queries
│   ├── extract/                  # Claude extraction prompts + schemas
│   ├── geo/                      # PostGIS helpers, MVT tile generation
│   └── parsers/                  # PDF / HTML / RSS adapters
├── supabase/
│   ├── migrations/               # SQL migrations (dollar-quoted, ON CONFLICT, pglast-validated)
│   └── seed/                     # Static reference data (GRID3 polygons, etc.)
├── modal/                        # Python heavy-compute jobs
├── schemas/                      # JSON Schemas for extracts
├── tests/
│   ├── gold/                     # Hand-extracted sitrep gold set
│   └── extract.test.ts
├── .github/workflows/
│   ├── ingest.yml                # 6-hourly cron
│   ├── ci.yml                    # Lint, type, test, gold-set check
│   └── deploy.yml
├── docs/
│   ├── design-notes.md           # Why not Palantir-style; trade-offs
│   ├── data-sources.md           # Per-source ingestion notes
│   └── threat-model.md           # Ethics, dual-use, data sovereignty
└── README.md
```

---

## Running locally

### Prerequisites

- Node 20+, pnpm 9+
- Supabase CLI (`brew install supabase/tap/supabase`)
- Docker (for local Supabase)
- Python 3.11+ (for Modal jobs and the gold-set check; not required for the web app)
- An Anthropic API key
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
ANTHROPIC_MODEL_BULK=claude-haiku-4-5-20251001
ANTHROPIC_MODEL_STRICT=claude-sonnet-4-6

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

The reference deployment is on Vercel + Supabase Cloud. The 6-hourly ingest runs as a GitHub Actions workflow with secrets injected from the repo. Modal is optional and only required if Stage 3 panels are enabled.

Cost envelope (informational, single-developer scale):

- Supabase Pro: $25/mo
- Vercel Hobby/Pro: $0–20/mo
- Anthropic API: ~$5–15/mo at current sitrep cadence (Haiku-dominant)
- Modal (if enabled): $0–10/mo
- ACLED: free (academic)

---

## Roadmap

### Stage 1 — Spine (target: 2 weekends)

- [ ] Next.js + Supabase + PostGIS scaffold
- [ ] GRID3 DRC health-zone polygons seeded
- [ ] Ingest: WHO DON, AFRO sitrep, ECDC TAB, ReliefWeb RSS
- [ ] Claude extraction → `case_aggregates` with `source_quotes`
- [ ] Map landing with health-zone choropleth + temporal scrubber
- [ ] Methods page

### Stage 2 — The features that distinguish (target: 2 weekends)

- [ ] Hover-anywhere source-quote tooltips with provenance
- [ ] Health-zone drill-down panel
- [ ] ACLED conflict overlay
- [ ] Document explorer with inter-document diffs
- [ ] Daily "what changed?" brief (Vercel AI SDK + Claude)
- [ ] Nextstrain BDBV embed
- [ ] Gold-set extraction validation in CI

### Stage 3 — Optional polish

- [ ] Pre-computed branching-process scenario panel (Modal)
- [ ] Researcher tier: authenticated export to tidy CSV (Global.health template)
- [ ] Short methods note submitted to _Wellcome Open Research_

---

## Contributing

Solo project for now. PRs are welcome once Stage 1 is shipped. Two hard rules:

1. **No PHI, no line-list data, ever.** Even if a source publishes it accidentally, this repo does not ingest it.
2. **Every rendered figure must have a `source_quote_id`.** No exceptions.

If you maintain Go.Data, SORMAS, DHIS2 Tracker, Epiverse-TRACE, or Global.health and any of this is reusable upstream: please open an issue. The right home for the LLM sitrep-extraction logic may be an Epiverse-TRACE-compatible R package (working name: `{sitrepr}`), not this web UI.

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
