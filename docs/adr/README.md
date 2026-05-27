# Architecture Decision Records

Format: [MADR 4.0](https://adr.github.io/madr/). One decision per file.

Per `AGENTS.md` rule 11, every architectural decision and every new top-level
dependency requires an ADR landed before the implementing PR.

## Index

| #    | Title                                                        | Status   |
| ---- | ------------------------------------------------------------ | -------- |
| 0001 | [Adopt Biome 2 for lint and format](0001-adopt-biome-2.md)   | Proposed |
| 0002 | [Adopt Vitest 3 as the test runner](0002-adopt-vitest-3.md)  | Proposed |
| 0003 | [Use pglast (Python) to validate SQL migrations](0003-use-pglast-for-sql-validation.md) | Proposed |
| 0004 | [Adopt zod and @t3-oss/env-nextjs for runtime + env validation](0004-adopt-zod-and-t3-env.md) | Proposed |

## Lifecycle

`Proposed` → `Accepted` → (`Superseded by ADR-NNNN` / `Deprecated`).

Move from Proposed to Accepted only after the implementing PR is merged.
Never edit an Accepted ADR in place — write a new one that supersedes it.
