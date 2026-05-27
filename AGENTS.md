# ituri-sitrep — agent rules (cross-tool source of truth)

This file is the universal rules document. Codex, Cursor, Copilot, Gemini, and
Claude Code all read it. Claude reads it via `@AGENTS.md` from `CLAUDE.md`.

## Mission

ituri-sitrep is a public situational-awareness companion for the 2026 Ituri
Bundibugyo virus outbreak. It ingests **publicly released** sitreps (WHO DON,
WHO AFRO, Africa CDC, ECDC, ReliefWeb, MoH press releases, ACLED, HDX,
Pathoplexus/Nextstrain), extracts structured signals with LLM assistance,
anchors every figure to the verbatim source sentence, and renders a
health-zone-level map with provenance-first UI.

It is NOT a clinical system. It is NOT a forecasting platform. It is NOT a
substitute for the WHO DON or DRC MSP press release.

## Hard rules (never violate — many are hook-enforced)

1. **No PHI, no line-list data, no contact-graph reconstruction.** Aggregate
   public figures only. If a source publishes PHI accidentally, refuse to
   ingest it. The `no-phi.sh` hook blocks obvious tells in writes.
2. **Every rendered figure carries a `source_quote_id` FK.** No exceptions.
   A UI component that renders a numeric/factual figure without a
   `sourceQuoteId` prop is a blocking review comment.
3. **No service-role key in client code.** `SUPABASE_SERVICE_ROLE_KEY` may
   only appear in server-only modules. The `no-service-role.sh` hook
   blocks writes that violate this.
4. **No `@anthropic-ai/sdk` in Client Components or browser bundles.**
   Anthropic calls run inside Server Actions, Route Handlers, server-only
   modules, or Supabase Edge Functions.
5. **RLS policies always wrap `auth.uid()` in `(select auth.uid())`,
   always specify `TO authenticated`, and never use `FOR ALL`.** Split into
   four policies (SELECT, INSERT, UPDATE, DELETE) even if logic repeats.
6. **Raw SQL is the migration source of truth.** Migrations live in
   `supabase/migrations/<YYYYMMDDHHMMSS>_<slug>.sql`, wrapped in
   `begin; … commit;`, dollar-quoted function bodies, `IF NOT EXISTS` on
   creates, `ON CONFLICT` on seed inserts. `pglast` must parse them.
   Drizzle is a query layer only — `drizzle-kit push` is banned.
7. **Anthropic tool schemas are derived from zod**, never hand-written
   JSON Schema. `prompt_version_hash` is stamped on every `extraction_runs`
   row. The chain: `zod schema → zod-to-json-schema → Anthropic.Tool`.
8. **TDD is the default.** Write a failing test first. The `tdd-guard.sh`
   hook blocks source edits when no test has been touched recently.
9. **Quality gates are blocking.** No commits with red `lint`, `typecheck`,
   `vitest`, or `pgtap`. The `ship-gate.sh` Stop hook enforces this.
10. **`any`, non-boolean `!!`, and `@ts-ignore` are banned.** If you need
    `@ts-expect-error`, include a one-line `<reason>` immediately after.
11. **Architecture changes require an ADR** in `docs/adr/` (MADR 4.0).
    No new top-level dependency without an ADR.
12. **`getServerSideProps`, `getStaticProps`, Pages Router, and
    `@supabase/auth-helpers-nextjs` are forbidden.** App Router + `@supabase/ssr` only.

## Tech stack (target — see `.claude/references/architecture.md` for full table)

| Layer        | Choice                                                           |
| ------------ | ---------------------------------------------------------------- |
| Runtime      | Node 22 LTS, Deno 2 (edge functions)                             |
| Package mgr  | pnpm 10 (monorepo target)                                        |
| Framework    | Next.js 15 App Router, React 19                                  |
| DB           | Postgres 16 via Supabase + PostGIS + pgvector                    |
| Auth/client  | `@supabase/ssr` with new publishable/secret keys                 |
| Query layer  | Drizzle (query only)                                             |
| Migrations   | raw SQL + pglast validation                                      |
| Schemas      | zod 4                                                            |
| Lint/format  | Biome 2 + `eslint-plugin-react-hooks@latest` (only ESLint plugin)|
| Tests        | Vitest 3 + Playwright + pgTAP                                    |
| Server acts  | next-safe-action                                                 |
| LLM          | Anthropic Claude (Opus 4.7, Sonnet 4.6) with prompt caching      |
| Observability| Sentry (OTel) + Axiom + Langfuse                                 |
| Map          | MapLibre GL JS + deck.gl                                         |

The repo is currently a single Next.js app from the `with-supabase` template.
The monorepo migration (apps/web + packages/*) is planned but not done.
Treat paths below as today's reality.

## Workflow loop (TDD-strict)

1. `/spec <feature>` — write or read a product spec in `.claude/specs/`.
2. `/plan <feature>` — write a technical plan in `.claude/plans/`.
3. `/tdd <feature>` — red → green → refactor, delegated to `@test-writer`.
4. `/ship` — full preflight gate (lint, typecheck, test, pgtap, e2e, knip,
   gitleaks, audit, eval).

Architecture changes also require `/adr <title>` before code.

## Commands you'll use most

- `npm run dev` — Next.js dev server on :3000.
- `npm run lint` — ESLint (until Biome lands).
- `npm run build` — Next.js production build.

Once the monorepo migration lands, these become `pnpm dev`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm db:migrate`, `pnpm db:types`, `pnpm pgtap`.

## Code conventions

- Imperative voice in docs. No "you may want to."
- Branded ID types everywhere: `SitrepId`, `SourceQuoteId`, `ExtractionRunId`,
  `ZoneCode`, `OutbreakId`. Use `z.string().uuid().brand<"SourceQuoteId">()`.
- Filenames: `kebab-case.ts`. Types/components: `PascalCase`. Functions: `camelCase`.
- Each file ≤ 400 LoC. Each function ≤ 75 LoC. Cyclomatic ≤ 12. Cognitive ≤ 15.
  Max nesting depth 4. Max function params 3 (use an object beyond that).
- Server Components default. `'use client'` only when interactivity, hooks,
  or browser APIs are required.
- After mutations: `revalidatePath` over `revalidateTag` unless data lives
  behind ≥3 URLs.

## When in doubt

Stop and ask in plan mode. Don't guess at extraction schemas, RLS shapes, or
column types. Don't add a dependency without an ADR.

## See also

- Per-area notes: `app/CLAUDE.md`
- Curated context: `.claude/references/*.md`
- Slash commands: `.claude/commands/*.md`
- Sub-agents: `.claude/agents/*.md`
- Hooks (enforcement): `.claude/hooks/*.sh`
- Product README: `README.md`
- Full target architecture: `research/architecture.md`
- Full `.claude/` blueprint: `research/claude-code-arcitecture.md`
