# Architecture Decision Records

Format: [MADR 4.0](https://adr.github.io/madr/). One decision per file.

Per `AGENTS.md` rule 11, every architectural decision and every new top-level
dependency requires an ADR landed before the implementing PR.

## Index

| #    | Title                                                        | Status   |
| ---- | ------------------------------------------------------------ | -------- |
| 0001 | [Adopt Biome 2 for lint and format](0001-adopt-biome-2.md)   | Accepted |
| 0002 | [Adopt Vitest 3 as the test runner](0002-adopt-vitest-3.md)  | Accepted |
| 0003 | [Use pglast (Python) to validate SQL migrations](0003-use-pglast-for-sql-validation.md) | Accepted |
| 0004 | [Adopt zod and @t3-oss/env-nextjs for runtime + env validation](0004-adopt-zod-and-t3-env.md) | Accepted |
| 0005 | [Hybrid Biome 2 + ESLint for type-aware linting](0005-hybrid-biome-eslint-type-aware-linting.md) | Accepted |
| 0006 | [Hard numeric caps in lint config](0006-hard-numeric-caps-lint-config.md) | Accepted |
| 0007 | [pnpm 10 + monorepo directory staging](0007-pnpm-10-monorepo-directory-staging.md) | Accepted |
| 0008 | [Adopt @t3-oss/env-nextjs for environment validation](0008-adopt-t3-env-nextjs.md) | Accepted |
| 0009 | [Defer EpiNow2 Rt nowcasting to v2](0009-defer-modal-epinow2-to-v2.md) | Accepted |
| 0010 | [Adopt @arcjet/next for bot and attack protection](0010-adopt-arcjet-next.md) | Accepted |
| 0011 | [Visx for editorial timelines](0011-visx-editorial-timelines.md) | Accepted |
| 0012 | [Fuse.js for client-side source search](0012-fusejs-client-source-search.md) | Accepted |
| 0013 | [MapLibre GL JS + deck.gl interleaved overlays](0013-maplibre-deckgl-interleaved-overlays.md) | Accepted |
| 0014 | [In-database MVT via ST_AsMVT vs external tile server](0014-in-database-mvt-st-asmvt.md) | Accepted |
| 0015 | [unpdf for WASM PDF parsing in the ingest package](0015-unpdf-wasm-pdf-parsing.md) | Accepted |
| 0016 | [Edge Config kill-switch dependencies](0016-edge-config-kill-switch.md) | Accepted |
| 0017 | [Observability stack: langfuse-vercel, @vercel/otel, @sentry/nextjs](0017-observability-stack.md) | Accepted |
| 0018 | [promptfoo as extraction eval harness](0018-promptfoo-extraction-eval-harness.md) | Accepted |
| 0019 | [Upstash Redis for per-IP / per-org rate limiting](0019-upstash-redis-rate-limiting.md) | Accepted |
| 0020 | [Defer five Priority-tier source adapters to post-Phase 9](0020-defer-priority-adapters-to-post-phase-9.md) | Accepted |

## Lifecycle

`Proposed` → `Accepted` → (`Superseded by ADR-NNNN` / `Deprecated`).

Move from Proposed to Accepted only after the implementing PR is merged.
Never edit an Accepted ADR in place — write a new one that supersedes it.
