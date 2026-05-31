# Data sources — license attribution

This page records the upstream license for every data source used by ituri-sitrep. Every row in `public.sources` carries a `license_tier` enforced at the database level; the tiers are defined in [README.md § License posture](../README.md#license-posture).

| Source | License | Tier | Notes |
|--------|---------|------|-------|
| WHO Disease Outbreak News | CC-BY-NC-SA 3.0 IGO | `open` | Numeric figures are facts; copyright attaches to the full text |
| WHO AFRO Weekly External Sitrep | CC-BY-NC-SA 3.0 IGO | `open` | |
| Africa CDC Epidemic Intelligence Weekly Report | Africa CDC open terms | `open` | |
| ECDC Threat Assessment Brief | CC-BY 4.0 | `open` | |
| ReliefWeb | Per-publisher (OCHA, UNFPA, IFRC) | `open` | OCHA content is CC-BY-IGO |
| DRC MSP press releases | Public domain (government) | `open` | |
| Uganda MoH press releases | Public domain (government) | `open` | |
| ACLED conflict events | Academic non-redistribution | `display_only` | Aggregated overlays only; no raw CSV export; requires ACLED registration |
| HDX HAPI | CC-BY-IGO | `open` | Keyless API |
| IOM DTM v3.0 | Non-commercial, no derivatives | `display_only` | Admin-2 IDP figures |
| UCDP Candidate Events | CC-BY | `open` | Redistributable conflict baseline |
| GRID3 DRC Health Zones | CC-BY 4.0 | `open` | Health-zone polygons |
| HOT OSM healthsites.io | ODbL (share-alike) | `open` | Facility points |
| WorldPop DRC 100 m | CC-BY 4.0 | `open` | Population denominators |
| GHSL + Meta HRSL | CC-BY | `open` | Built-up area classification |
| NCBI Virus / GenBank | Public domain | `open` | BDBV sequences |
| ProMED-mail | ISID copyright on post text | `display_only` | Link + headline only; verbatim post text not reproduced |
| HealthMap | Public alerts | `open` | Aggregated epidemic-intelligence feed |
| EC MediSys | Open | `open` | EU media-monitoring RSS |
| Pathoplexus | Restricted use (embargo-respected) | `display_only` | Read-only ingest; publication embargo respected |
| Nextstrain BDBV build | CC-BY 4.0 | `open` | Embedded phylogeny panel |
| Virological.org | Per-author | `open` | Andrew Rambaut analyses, INRB sequence notes |

## Sources excluded

| Source | Reason |
|--------|--------|
| GISAID | Login-gated; redistribution incompatible |
| EIOS | WHO Member-state restricted |
| BlueDot / Metabiota / commercial signal feeds | Paywalled |
| Any line-list data | Ethically out of scope |
