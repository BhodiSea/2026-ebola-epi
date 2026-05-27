# The `.claude/` Apparatus for `ituri-sitrep`: A Reference-Grade Blueprint

**TL;DR**

- **Ship a full apparatus, but layered.** Root `CLAUDE.md` (≤ 200 lines, hard rules only) + nested per-package `CLAUDE.md` + one project plugin under `.claude/` containing `skills/`, `agents/`, `commands/`, `hooks/`, `settings.json`, `specs/`, `plans/`, and `references/`. The official Claude Code docs say verbatim "Keep CLAUDE.md under 200 lines" and Anthropic's best-practices guide tells you to keep it "short and human-readable" and "treat it like code." This is the exact pattern MakerKit's `next-supabase-saas-kit-turbo`, `anthropics/skills`, `vercel/ai`'s `skills/use-ai-sdk/`, and `vercel/next-forge` v6 use today.
- **Enforce TDD with hooks, not exhortation.** A `PreToolUse` hook on `Write|Edit|MultiEdit` that blocks writes to `*.ts|*.tsx` without a sibling `*.test.ts` change in the session; a `PostToolUse` hook that runs Biome + `vitest --related --run`; a `Stop` hook that refuses session end while `biome ci`, `tsc --noEmit`, or `vitest --run` is red. Instructions in `CLAUDE.md` alone drift after `/compact`; hooks (`exit 2`) do not — they block actions even under `--dangerously-skip-permissions`.
- **Honest pushback: cut ~30% of the wish-list.** A solo MD-student does not need `/onboard`, `/branch`, `/perf`, `@docs-writer`, or a 12-deep `CLAUDE.md` hierarchy on day one. Ship six commands, four agents, four skills, and four hooks. Add the rest only after the third repeated problem they would have solved. The biggest performative-apparatus trap is hierarchical `CLAUDE.md` files that duplicate root content and drift — keep the leaves _short_ and _delta-only_.

---

## Key Findings

1. **Hierarchy and discovery (verified against Anthropic docs, May 2026).** Claude Code merges, in order of precedence: managed policy (`/etc/claude-code/CLAUDE.md` or `/Library/Application Support/ClaudeCode/CLAUDE.md`) → user-global `~/.claude/CLAUDE.md` → project root `./CLAUDE.md` (or `./.claude/CLAUDE.md`) → personal-local `./CLAUDE.local.md` (gitignored) → child `CLAUDE.md` files loaded **on demand** when Claude reads files in those subtrees. Parent files in a monorepo are also picked up automatically. The `@path/to/file.md` import syntax supports up to 5 levels of recursion and is the right composition primitive.

2. **Length is a hard quality signal, even when "not optimizing for tokens."** Anthropic's docs say verbatim: _"For each line, ask: 'Would removing this cause Claude to make mistakes?' If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"_ The official Claude Code docs at `code.claude.com/docs/en/features-overview` state explicitly: _"Keep CLAUDE.md under 200 lines."_ This is **community consensus rather than a hard cutoff** — Shareuhack's May 2026 analysis (citing HumanLayer's research and high-vote Reddit threads) puts it this way: _"There's no hard cutoff where 201 lines causes collapse, but the degradation trend is real. Past that threshold, degradation is uniformly distributed — every low-value rule added dilutes the compliance probability of every high-value rule equally."_ HumanLayer estimates frontier LLMs reliably follow only ~150–200 discrete instructions before adherence degrades.

3. **AGENTS.md vs CLAUDE.md (May 2026 ground truth):** Claude Code **still does not natively read AGENTS.md** as of May 2026. The standard workaround is either `ln -s AGENTS.md CLAUDE.md` or a one-line `@AGENTS.md` import inside CLAUDE.md. **Recommendation for `ituri-sitrep`:** ship both — `AGENTS.md` is the cross-tool source of truth (Codex, Cursor, Copilot, Gemini all read it), `CLAUDE.md` is Claude-specific deltas (hooks integration, slash command index, prompt-cache rules), and root `CLAUDE.md` opens with `@AGENTS.md` to compose them.

4. **Commands → Skills migration is in flight.** Per Anthropic's docs (Claude Code v2.1.101+, April 2026): _"Custom slash commands have been merged into skills. Both approaches create commands you can invoke with `/command-name`. If a skill and a command share the same name, the skill takes precedence."_ Old `.claude/commands/*.md` still works, but new work should go in `.claude/skills/<name>/SKILL.md`. We use both deliberately: **commands** for thin, single-purpose, deterministic prompts; **skills** when you want progressive disclosure (`SKILL.md` body + `references/*.md` loaded on demand) and/or auto-invocation by description match.

5. **Sub-agents are real isolation, not just a prompt template.** Each sub-agent runs in its own context window and returns only a summary, which is exactly what you want for `@reviewer`, `@rls-auditor`, and `@extraction-engineer` so noisy exploration doesn't pollute the main thread.

6. **Hooks are the only deterministic enforcement layer.** `PreToolUse` exit code 2 blocks the action even under `--dangerously-skip-permissions`. This is how you enforce "no PHI," "no service-role key on client," "RLS wrapped `(select auth.uid())`," "tests-first" — at the _infrastructure_ level, not the model's politeness.

7. **TDD-strict is the right default for this project; but use `nizos/tdd-guard` rather than rolling your own.** It intercepts Write/Edit/MultiEdit before they run, blocks implementation without a failing test, prevents over-implementation, and integrates with Vitest's reporter. The bash-hook approach below is fine to start but `tdd-guard` is what staff engineers at the bar you set would expect.

8. **Model defaults (April 2026 forward).** Opus 4.7 was released April 16, 2026; the API's `opus` alias and the Enterprise/pay-as-you-go default both flipped from Opus 4.6 to 4.7 on **April 23, 2026** (a distinct, later date). The `opusplan` alias automatically uses Opus for plan mode and Sonnet 4.6 for execution. **For `ituri-sitrep`, pin `opusplan` in `.claude/settings.json`** — Opus 4.7 for architecture/planning, Sonnet 4.6 for the bulk of code generation, with `effort: xhigh` for plan mode.

9. **Spec-driven workflow leader has shifted.** `Pimzino/claude-code-spec-workflow` (3.6k stars on GitHub, May 2026) is still functional but explicitly in maintenance mode per the repo's README; the maintainer's active project is the MCP version (`Pimzino/spec-workflow-mcp`). The other 2026 leaders are `github/spec-kit` (now an official Anthropic plugin) and `bmad-code-org/BMAD-METHOD`. For `ituri-sitrep`, **use `github/spec-kit`'s four-phase pattern (Constitution → Specify → Plan → Tasks)** but vendor it into `.claude/specs/` and `.claude/plans/` rather than adopting a heavyweight framework.

10. **Reference-grade exemplars to copy from:**
    - `anthropics/skills` — SKILL.md frontmatter + progressive disclosure with `references/<domain>.md`; quote from `skill-creator/SKILL.md`: _"Keep SKILL.md under 500 lines; if you're approaching this limit, add an additional layer of hierarchy."_
    - `anthropics/claude-plugins-official` — canonical plugin layout (`.claude-plugin/plugin.json` + `commands/` + `agents/` + `skills/` + `.mcp.json`)
    - `anthropics/claude-cookbooks` — `.claude/commands/` shared between local dev and GitHub Actions CI (`/link-review`, `/model-check`, `/notebook-review`)
    - `vercel/ai`'s `skills/use-ai-sdk/` — verbatim: _"Always fetch the current model list before writing code. Never use model IDs from memory — they may be outdated."_ Plus per-provider `references/<provider>.md` layout.
    - `vercel/next-forge` v6 (March 2026) — installable next-forge skill documenting the Turborepo `keys.ts` + `@t3-oss/env-nextjs` Zod env validation pattern
    - **MakerKit `next-supabase-saas-kit-turbo`** — closest match to your stack; hierarchical `AGENTS.md` per package + thin `CLAUDE.md` that imports it via `@AGENTS.md` + Claude Code skills `/postgres-supabase-expert` (database/RLS guidance) and `/server-action-builder` (Next.js Server Actions)
    - `darraghh1/my-claude-setup` — concrete Next.js+Supabase+TS `.claude/{agents,hooks,skills,rules}` scaffold with file-driven `blocked-commands.json` security model

---

## Details

### 0. Final `.claude/` directory tree (the deliverable)

```
ituri-sitrep/
├── AGENTS.md                     # cross-tool source of truth (Codex/Cursor/Copilot/Gemini read this)
├── CLAUDE.md                     # Claude-only; opens with @AGENTS.md import
├── CLAUDE.local.md               # gitignored personal overrides
├── .claude/
│   ├── settings.json             # checked in: hooks, model, statusLine, permissions
│   ├── settings.local.json       # gitignored personal overrides
│   ├── mcp.json                  # Supabase + GitHub + Sentry MCP servers
│   ├── commands/                 # thin prompt templates (legacy, still supported)
│   │   ├── spec.md
│   │   ├── tdd.md
│   │   ├── migration.md
│   │   ├── rls.md
│   │   ├── extract.md
│   │   ├── ship.md
│   │   ├── adr.md
│   │   └── review.md
│   ├── skills/                   # progressive-disclosure capabilities
│   │   ├── pglast-migration-validator/SKILL.md
│   │   ├── rls-policy-writer/SKILL.md
│   │   ├── source-quote-extractor/SKILL.md
│   │   ├── supabase-types-regen/SKILL.md
│   │   └── prompt-versioner/SKILL.md
│   ├── agents/                   # isolated sub-agents (separate context windows)
│   │   ├── reviewer.md
│   │   ├── migration-engineer.md
│   │   ├── rls-auditor.md
│   │   ├── extraction-engineer.md
│   │   ├── test-writer.md
│   │   └── security-auditor.md
│   ├── hooks/                    # deterministic enforcement
│   │   ├── tdd-guard.sh          # PreToolUse: block writes without sibling test edit
│   │   ├── biome-check.sh        # PostToolUse: biome check + vitest --related
│   │   ├── ship-gate.sh          # Stop: refuse end while quality gates red
│   │   ├── no-phi.sh             # PreToolUse: block obvious PHI patterns
│   │   ├── no-service-role.sh    # PreToolUse: block service-role key in apps/web/**
│   │   └── prompt-submit.sh      # UserPromptSubmit: inject /spec expectation
│   ├── specs/                    # human-authored product specs (one file per feature)
│   │   ├── _template.md
│   │   └── README.md
│   ├── plans/                    # Claude-authored technical plans (one file per feature)
│   │   ├── _template.md
│   │   └── README.md
│   └── references/               # curated context loaded on demand via @-import
│       ├── architecture.md       # condensed architecture from prior research
│       ├── anti-patterns.md      # forbidden patterns (any, @ts-ignore, etc.)
│       ├── rls-performance.md    # Supabase RLS playbook
│       ├── prompt-caching.md     # Anthropic caching pattern reference
│       ├── drizzle-cheatsheet.md
│       └── pgvector-postgis.md
├── apps/web/CLAUDE.md            # Next.js 15 specifics
├── packages/db/CLAUDE.md
├── packages/extract/CLAUDE.md
├── packages/shared/CLAUDE.md
├── packages/ingest/CLAUDE.md
├── packages/ui/CLAUDE.md
├── packages/geo/CLAUDE.md
├── packages/observability/CLAUDE.md
├── supabase/CLAUDE.md
├── supabase/functions/CLAUDE.md
├── tests/e2e/CLAUDE.md
└── docs/adr/CLAUDE.md
```

Note: `commands/` and `skills/` deliberately coexist. Thin one-shot prompts (`/ship`) are commands; capabilities that need their own reference docs (`source-quote-extractor` with regex patterns + WHO sitrep examples) are skills.

---

### 1. Root `CLAUDE.md` (paste verbatim)

```markdown
# ituri-sitrep — Claude Code rules

@AGENTS.md
@.claude/references/anti-patterns.md

## Mission (do not violate)

ituri-sitrep is a reference-grade situational-awareness platform that extracts
structured outbreak signals from **public** WHO/AFRO/ECDC/ReliefWeb/MoH sitreps
and renders them with first-class provenance. Every rendered figure is traceable
to a quoted source span.

It is NOT a clinical system. It is NOT for PHI. It is NOT a substitute for
expert judgment.

## Hard rules (NEVER do these — hooks will block you)

- **NEVER** ingest, store, or display PHI. Sources are public sitreps only.
- **NEVER** render a numeric figure in the UI without a `source_quote_id` FK.
- **NEVER** import `@supabase/supabase-js` with a service-role key under `apps/web/**`.
- **NEVER** import `@anthropic-ai/sdk` in a Client Component or browser bundle.
- **NEVER** write an RLS policy that calls `auth.uid()` un-wrapped. Always
  `(select auth.uid())`. Always `TO authenticated` explicit. `FOR ALL` is banned.
- **NEVER** write a migration without dollar-quoting, `IF NOT EXISTS`, and
  `ON CONFLICT DO NOTHING` where applicable. `pglast` must parse it.
- **NEVER** inline-string an Anthropic tool schema. Source: zod → JSON Schema.
- **NEVER** commit code where `biome ci`, `tsc --noEmit`, or `vitest --run` is red.
- **NEVER** use `any`, `!!`, or `@ts-ignore` without a `// @ts-expect-error: <reason>`.
- **NEVER** start implementation before a plan exists in `.claude/plans/`.

## Architecture

Next.js 15 App Router monorepo on pnpm + Turborepo. Apps:

- `apps/web` — RSC-first, server actions via next-safe-action, MapLibre client islands
- `supabase/functions/*` — Deno edge functions (ingest + extract scheduling)

Packages: `db` (Drizzle query layer + raw SQL migrations as source of truth),
`extract` (zod schemas + Anthropic tool use), `shared` (runtime-agnostic types),
`ingest` (source fetchers), `ui` (shadcn-style), `geo` (PostGIS helpers),
`observability` (Sentry/Axiom/Langfuse wiring).

## Tech stack reference

| Layer         | Choice                                                         | Notes                                                      |
| ------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| Runtime       | Node 22 LTS / Deno (edge fns)                                  |                                                            |
| Framework     | Next.js 15 App Router                                          | RSC default; `'use client'` minimal                        |
| DB            | Postgres 16 via Supabase                                       | RLS always on                                              |
| Query layer   | Drizzle                                                        | query only — never `db.execute(sql\`...\`)` for migrations |
| Migrations    | raw SQL files in `supabase/migrations/`                        | source of truth                                            |
| Schemas       | zod 4                                                          | single source for DB cols, server actions, Anthropic tools |
| Lint/format   | Biome 2 + ESLint flat (typescript-eslint v8 strictTypeChecked) |                                                            |
| Tests         | Vitest 3 + Playwright + pgTAP                                  | TDD enforced via hooks                                     |
| LLM           | Anthropic SDK with explicit prompt caching                     | Opus 4.7 / Sonnet 4.6                                      |
| Observability | Sentry (OTel) + Axiom + Langfuse                               |                                                            |

## Workflows

### Default loop (TDD-strict; this is enforced by hooks)

1. `/spec <feature>` — write or read a spec in `.claude/specs/`
2. `/plan <feature>` — Claude writes plan in `.claude/plans/` for human review
3. `/tdd <feature>` — red → green → refactor (sub-agent isolated)
4. `/ship` — preflight: biome ci + tsc + vitest + e2e + pgtap

Architecture changes require an ADR: `/adr <title>`.

### Commands you'll use most

- `pnpm dev` — turbo dev across apps/web + functions
- `pnpm lint` — biome ci + eslint (run before `/ship`)
- `pnpm typecheck` — tsc --noEmit across workspace
- `pnpm test` — vitest --run; prefer `pnpm test -- --related` during loops
- `pnpm db:migrate` — apply pending raw SQL migrations
- `pnpm db:types` — regen Drizzle + generated TS types
- `pnpm pgtap` — run pgTAP RLS test suite

## Per-package navigation

- DB / migrations / RLS → `packages/db/CLAUDE.md`, `supabase/CLAUDE.md`
- LLM extraction pipeline → `packages/extract/CLAUDE.md`
- Pure shared types (Deno-safe) → `packages/shared/CLAUDE.md`
- Next.js routes / server actions → `apps/web/CLAUDE.md`
- Deno edge functions → `supabase/functions/CLAUDE.md`
- E2E tests → `tests/e2e/CLAUDE.md`
- ADRs → `docs/adr/CLAUDE.md`

## Style

- Imperative voice. No "you may want to."
- Branded IDs everywhere: `SitrepId`, `SourceQuoteId`, `ExtractionRunId`.
- File names: `kebab-case.ts`; types and components: `PascalCase`; functions: `camelCase`.
- Each file ≤ 400 LoC; each function ≤ 75 LoC; cyclomatic ≤ 12; cognitive ≤ 15; depth ≤ 4; max 3 params.

## When in doubt

Ask in plan mode. Don't guess. Don't add a dependency without an ADR.
```

This file is ~150 lines, deliberately under the official Anthropic threshold.

---

### 2. Per-package `CLAUDE.md` (the six that matter most)

Each is short and _delta-only_ — it assumes the root is loaded. No duplication.

#### `apps/web/CLAUDE.md`

````markdown
# apps/web — Next.js 15 App Router

@../../.claude/references/architecture.md#frontend

## Rendering rules

- **Default = Server Component.** A file is a Client Component **only** if it has `'use client'` at the top, and `'use client'` is allowed only when the component needs hooks, browser APIs, or interactivity.
- Map components live under `components/map/**` and are the _only_ place MapLibre runs. They are leaves; never wrap an MapLibre component around server data fetching.
- `cookies()`, `headers()`, `searchParams` are async in Next 15. Always `await`.

## Data fetching

- RSC fetches via `lib/supabase/server.ts` (uses `@supabase/ssr` server client). Never the browser client in an RSC.
- Client components: `lib/supabase/client.ts` (anon key only).
- Service-role key: **never** in this app. Use a Deno edge function or an internal API route under `supabase/functions/`.
- Every component that renders a numeric/factual figure receives `sourceQuoteId: SourceQuoteId` as a required prop. There is a `FigureWithSource` wrapper — use it.

## Server actions

- All mutations go through `next-safe-action`. Define `actionClient` in `lib/actions/client.ts` with auth middleware:

  ```ts
  export const authedAction = createSafeActionClient().use(async ({ next }) => {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ActionError("UNAUTHENTICATED");
    return next({ ctx: { user, supabase } });
  });
  ```
````

- Every action has `.inputSchema(z.object(...))`. Never trust types at runtime.
- After mutations: `revalidatePath` over `revalidateTag` unless data lives behind ≥3 URLs.

## Route handlers

- Only when something can't be a server action (webhooks, file streams, third-party callbacks).
- Same zod-validation discipline as actions.

## Forbidden in this app

- `process.env.SUPABASE_SERVICE_ROLE_KEY` — hook blocks the write.
- Importing `@anthropic-ai/sdk` — hook blocks the write.
- Storing PHI — there should be no PHI to store; if you encounter it, refuse.
- `useEffect` for data fetching. Use RSC or `useQuery`.

````

#### `packages/db/CLAUDE.md`

```markdown
# packages/db — Drizzle query layer (raw SQL migrations are the source of truth)

@../../.claude/references/rls-performance.md
@../../.claude/references/drizzle-cheatsheet.md

## Migration workflow (raw SQL is canonical)
1. Author the migration as `supabase/migrations/<timestamp>_<slug>.sql`.
2. Validate it with `pnpm db:validate` (calls the `pglast-migration-validator` skill).
3. Apply locally: `supabase db reset` (idempotent).
4. Regenerate Drizzle types: `pnpm db:types`.
5. Drizzle schema in `src/schema/*.ts` is *generated/aligned* with the SQL — never the other way around.

Drizzle is used for **queries only**, not migrations. `drizzle-kit push` is banned in this repo.

## Hard rules
- Every table with user data has `enable row level security`. New tables without RLS are blocked at PR time by pgTAP.
- Every fact-bearing row (`outbreaks`, `case_counts`, `events`) carries `source_quote_id uuid not null references source_quotes(id)`.
- Use branded ID types in TS (`SitrepId & {__brand:'SitrepId'}`); UUIDs in DB.

## RLS conventions (enforced by `@rls-auditor`)
```sql
create policy "outbreaks_select_authenticated"
  on public.outbreaks
  for select
  to authenticated
  using ((select auth.uid()) is not null);
````

- Wrap `auth.uid()` in `(select ...)` — Supabase's official troubleshooting guide reports "Improvement seen over 100x on large tables" when this trick is combined with an index on the policy column, because wrapping causes Postgres to run an initPlan that caches the value per statement instead of calling the function on each row.
- One policy per (table, action). **Never** `for all`.
- `TO authenticated` is mandatory; omitting it implicitly applies to `anon` and `public`.
- Index every column referenced in a USING/WITH CHECK clause.

## pgvector / PostGIS

- pgvector dimension cap: 2000 for HNSW. OpenAI `text-embedding-3-small` (1536 dims) fits comfortably.
- HNSW index: `using hnsw (embedding vector_cosine_ops)`. Cosine for semantic.
- PostGIS: SRID **always 4326** (WGS84). Use `geography(Point, 4326)`, not raw `geometry`.

## Source quotes

- `source_quotes(id, sitrep_id, page, char_start, char_end, text, sha256)` — `(sitrep_id, char_start, char_end)` is unique.
- Any extracted fact MUST link to a `source_quote_id`. If the LLM can't pin a span, the row is rejected.

````

#### `packages/extract/CLAUDE.md`

```markdown
# packages/extract — Anthropic LLM extraction pipeline

@../../.claude/references/prompt-caching.md

## Schema discipline (the single biggest source of bugs)
The zod schema is **the** source of truth:
```ts
// schemas/outbreak.ts
export const OutbreakExtract = z.object({...}).strict();
export type OutbreakExtract = z.infer<typeof OutbreakExtract>;
export const outbreakTool: Anthropic.Tool = {
  name: 'record_outbreak',
  input_schema: zodToJsonSchema(OutbreakExtract) as Anthropic.ToolInputSchema,
};
````

**Never** hand-write the JSON Schema. **Never** `JSON.stringify` a zod schema into a prompt. If the schema changes, the tool changes, and `prompt_version_hash` MUST bump.

## Prompt caching (Anthropic best practice)

Order matters: `tools → system → messages`. Cached prefix is everything before the `cache_control` breakpoint.

- **One breakpoint** at the end of the static tool + system + few-shot block.
- Place `cache_control: {type: 'ephemeral'}` on the **last static block** (typically the last few-shot example), NOT on the user message.
- Per Anthropic's official pricing docs: "A cache hit costs 10% of the standard input price, which means caching pays off after just one cache read for the 5-minute duration (1.25× write), or after two cache reads for the 1-hour duration (2× write)." Use 5-min default for extraction.
- **Cache invalidators to fear:** changing tool schemas, swapping models (Opus 4.7 ↔ Sonnet 4.6 = new cache lane), reordering tools, adding/removing images, changing `tool_choice`.

## Per-extraction wiring

```ts
const msg = await anthropic.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 4096,
  system: [
    { type: "text", text: SYSTEM_PROMPT },
    {
      type: "text",
      text: FEW_SHOT_EXAMPLES,
      cache_control: { type: "ephemeral" },
    },
  ],
  tools: [outbreakTool],
  tool_choice: { type: "tool", name: "record_outbreak" },
  messages: [{ role: "user", content: sitrepText }],
});
```

## Provenance is first-class

Every extraction writes an `extraction_runs` row BEFORE writing any extracted facts:

```ts
const run = await db
  .insert(extractionRuns)
  .values({
    id: extractionRunId,
    sitrepId,
    modelId: "claude-opus-4-7",
    promptVersionHash: sha256(
      SYSTEM_PROMPT + FEW_SHOT_EXAMPLES + JSON.stringify(outbreakTool),
    ),
    cacheReadInputTokens: msg.usage.cache_read_input_tokens,
    cacheCreationInputTokens: msg.usage.cache_creation_input_tokens,
    startedAt: new Date(),
  })
  .returning();
```

Every extracted fact carries `extraction_run_id` and `source_quote_id`. The LLM tool schema must require `char_start`/`char_end` in the source PDF — if the model can't supply them, the extraction is rejected.

## Gold set & evals

- `tests/gold-set/*.json` — ground-truth extractions for known sitreps.
- `pnpm eval` runs promptfoo against the gold set; CI blocks merges that regress F1.
- Adding a new gold example uses the `/skill gold-set-curator`.

## Forbidden

- Inline-stringing a tool schema into a prompt.
- Using `JSON.parse(msg.content)` — always use `tool_use` blocks.
- Calling Anthropic from a Client Component or RSC. Edge functions or server-only modules only.

````

#### `packages/shared/CLAUDE.md`

```markdown
# packages/shared — runtime-agnostic, Deno-safe

This package is **copied** into `supabase/functions/_shared/generated/` by a build step.
Therefore:

- **No Node built-ins.** No `node:fs`, `node:path`, `node:crypto`. Use Web Crypto.
- **No npm-only packages.** Anything imported here must be available on JSR or via `npm:` specifier in Deno.
- **No env access.** Pure functions and branded types only.
- **No side effects at import time.**

If you need a Node-only helper, it lives in `packages/db` or `packages/ingest`, not here.

## What does live here
- Branded ID types (`SitrepId`, `SourceQuoteId`, `ExtractionRunId`, …).
- Zod schemas shared between extract and db.
- Pure date/string utilities.
- Error classes that can be thrown and caught across runtimes.

## Hard rules
- `tsconfig` extends `@tsconfig/strictest` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `erasableSyntaxOnly`.
- Public API is in `src/index.ts`. Nothing is exported by accident.
````

#### `supabase/CLAUDE.md`

````markdown
# supabase/ — migrations, RLS, branching

@../.claude/references/rls-performance.md

## Migration anatomy (mandatory)

Filename: `YYYYMMDDHHMMSS_<slug>.sql`. Contents:

```sql
-- migration: add_outbreaks
-- description: adds outbreaks table with RLS
begin;

create table if not exists public.outbreaks (
  id uuid primary key default gen_random_uuid(),
  source_quote_id uuid not null references public.source_quotes(id),
  pathogen text not null,
  ...
);

alter table public.outbreaks enable row level security;

create policy "outbreaks_select_authenticated"
  on public.outbreaks for select to authenticated
  using ((select auth.uid()) is not null);

create index if not exists outbreaks_source_quote_id_idx
  on public.outbreaks (source_quote_id);

commit;
```
````

- Always wrap in `begin; ... commit;`.
- Always `IF NOT EXISTS` / `IF EXISTS`.
- Always dollar-quote function bodies: `$$ ... $$ language plpgsql`.
- Always `pglast` validate (the `/migration` command runs this).

## Branching workflow

1. `supabase branches create <slug>` (requires Supabase paid plan).
2. Migrations apply to the branch; preview Vercel deploy uses branch URL.
3. PR merge triggers `supabase db push` against main.

## pgTAP

Every RLS policy has a pgTAP test in `tests/pgtap/<table>_rls.test.sql`. CI runs `pg_prove`.

````

#### `supabase/functions/CLAUDE.md`

```markdown
# supabase/functions — Deno edge functions

## Runtime quirks
- **Deno**, not Node. No `process.env` — use `Deno.env.get()`.
- **No bare specifiers**. Use `npm:`, `jsr:`, or `https://` URLs explicitly.
  ```ts
  import { z } from 'npm:zod@4';
  import Anthropic from 'npm:@anthropic-ai/sdk@^0.30';
````

- Shared code: `_shared/generated/` is a **copy** of `packages/shared` produced by `pnpm build:shared`. Don't edit `_shared/generated/` by hand.

## Long jobs

Use `EdgeRuntime.waitUntil(promise)` so the response returns immediately and the work continues:

```ts
EdgeRuntime.waitUntil(extractAndStore(sitrepId));
return new Response("queued", { status: 202 });
```

## Fetch with retry

All outbound HTTP goes through `_shared/fetch.ts` which implements exponential backoff and jitter. Never call `fetch` directly.

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are set as function secrets, never in `.env.local`.
- Logs go to Axiom via `_shared/logger.ts`. Never `console.log` PII (we should have no PII, but defense-in-depth).

````

#### Other per-package files (sketch)

`packages/ingest/CLAUDE.md` — one fetcher per source under `src/sources/<source>/index.ts`; SHA-256 content hashing; respect `robots.txt`; rate-limit via `p-throttle`; PDF parsing through `unpdf`.

`packages/ui/CLAUDE.md` — shadcn pattern; Tailwind class order via Biome's `useSortedClasses`; **no business logic**; every numeric figure prop requires `sourceQuoteId`.

`packages/geo/CLAUDE.md` — PostGIS helpers; SRID 4326 always; MVT generation via `ST_AsMVT`; H3 helpers for choropleth aggregation.

`packages/observability/CLAUDE.md` — pino-based logger that fans out to Sentry, Axiom, and Langfuse; `withSpan(name, fn)` helper for OTel spans; redact `authorization`, `cookie`, `set-cookie` automatically.

`tests/e2e/CLAUDE.md` — Playwright; page object model under `pages/`; auth state cached in `.auth/` (gitignored); `test.describe.serial` only for migration smoke tests; `expect.toHaveScreenshot` for map rendering with `maxDiffPixelRatio: 0.01`.

`docs/adr/CLAUDE.md` — MADR 4.0 format; one decision per file; status: `proposed | accepted | superseded`; ADRs are immutable once accepted (supersede by adding a new one).

---

### 3. `.claude/commands/` — the six that earn their place

#### `.claude/commands/spec.md`

```markdown
---
argument-hint: <feature-slug>
description: Author or read a product spec under .claude/specs/. Enters plan mode.
allowed-tools: Read, Write, Glob, Grep, Bash(git status:*)
---

Read `.claude/specs/_template.md` first. If `.claude/specs/$ARGUMENTS.md`
already exists, summarize it and ask what to clarify. Otherwise, create it,
filling out:

1. Mission — what problem does this solve, for whom, and what is NOT in scope?
2. Source data — which WHO/AFRO/ECDC/ReliefWeb feeds? Existing or new?
3. UI surface — which routes? What does the figure look like? Each figure must have a `source_quote_id`.
4. Data model — new tables/columns? RLS implications?
5. Extraction — does this require a new prompt/tool? New gold-set entries?
6. Acceptance — concrete checks (number of rows, RLS test, screenshot diff).
7. Non-goals.

DO NOT WRITE CODE. Stop after the spec is written and a human has reviewed it.
Then suggest `/plan $ARGUMENTS`.
````

#### `.claude/commands/tdd.md`

```markdown
---
argument-hint: <feature-slug>
description: Strict red→green→refactor TDD loop, sub-agent isolated.
allowed-tools: Read, Write, Edit, Bash(pnpm test*:*), Bash(pnpm typecheck:*)
context: fork
---

You are running the TDD loop for `$ARGUMENTS`. The spec is in
`.claude/specs/$ARGUMENTS.md` and the plan in `.claude/plans/$ARGUMENTS.md`.
Read both before writing anything.

## Phase 1 — RED (delegate to @test-writer)

Use the @test-writer sub-agent. Pass it the smallest acceptance criterion
from the plan. The sub-agent returns:

- test file path
- the failing output from `pnpm test -- --related <test-file> --run`
- a 1-line summary of what the test verifies

**Do NOT proceed until you have observed a real failure.** A syntax error is
not a real failure. A failure because the function under test does not exist yet
IS a real failure.

## Phase 2 — GREEN

Write the minimum implementation to make the failing test pass. No extra
features. No gold-plating. If you find yourself adding code not required by
the test, STOP and add a new test first.

Run `pnpm test -- --related <test-file> --run` and `pnpm typecheck`. Both must pass.

## Phase 3 — REFACTOR

Now (and only now), improve the implementation. Re-run tests after every
non-trivial change. The PostToolUse hook will also enforce this.

## Stop conditions

- All acceptance criteria from the plan have a green test.
- `pnpm lint && pnpm typecheck && pnpm test --run` is green.
- Then suggest `/ship`.
```

#### `.claude/commands/migration.md`

```markdown
---
argument-hint: <slug>
description: Scaffold a new Supabase migration with pglast validation.
allowed-tools: Read, Write, Bash(pnpm db:validate:*), Bash(supabase db reset:*)
---

Create `supabase/migrations/$(date +%Y%m%d%H%M%S)_$ARGUMENTS.sql` following the
template in `supabase/CLAUDE.md`. Then:

1. Run `pnpm db:validate` (calls the `pglast-migration-validator` skill).
2. If validation passes, run `supabase db reset` locally and confirm the
   migration applies cleanly.
3. Add a pgTAP test in `tests/pgtap/$ARGUMENTS_rls.test.sql` if RLS changed.
4. Regenerate types: `pnpm db:types`.
5. Show the diff. DO NOT push to main without human review.

Forbidden:

- Editing past migrations. Create a new migration that fixes the issue.
- Skipping `pglast` validation.
- Adding a table without `enable row level security` and at least one policy.
```

#### `.claude/commands/rls.md`

```markdown
---
argument-hint: <table-name>
description: Generate RLS policies for a table following project conventions.
allowed-tools: Read, Write, Grep
---

Read `packages/db/CLAUDE.md` and `.claude/references/rls-performance.md` first.

For table `public.$ARGUMENTS`, generate four separate policies (SELECT, INSERT,
UPDATE, DELETE) following these mandatory conventions:

1. Each policy is `to authenticated` (never omit `to`).
2. `auth.uid()` is always wrapped: `(select auth.uid())`.
3. The column referenced in the USING/WITH CHECK clause must be indexed; if
   not, add a `create index if not exists` statement.
4. `for all` is forbidden — emit four policies even if their logic is identical.
5. After generating SQL, add the corresponding pgTAP test cases in
   `tests/pgtap/$(ARGUMENTS)_rls.test.sql` that exercise each policy from the
   client SDK perspective (authenticated user A can see own row; user B cannot;
   anon gets empty result).

Then delegate to the @rls-auditor sub-agent to verify performance via
`EXPLAIN (ANALYZE, BUFFERS)` against a 10k-row seed.
```

#### `.claude/commands/extract.md`

```markdown
---
argument-hint: <extract-slug>
description: Scaffold a new LLM extraction prompt, schema, tool, and gold-set entry.
allowed-tools: Read, Write, Bash(pnpm eval:*)
---

Read `packages/extract/CLAUDE.md` and `.claude/references/prompt-caching.md`.

Create the following files for `$ARGUMENTS`:

1. `packages/extract/src/schemas/$ARGUMENTS.ts` — zod schema (`.strict()`).
2. `packages/extract/src/tools/$ARGUMENTS.ts` — `zodToJsonSchema` → `Anthropic.Tool`.
3. `packages/extract/src/prompts/$ARGUMENTS.ts` — system prompt + few-shot
   examples block. Use **explicit prompt caching**: place
   `cache_control: { type: 'ephemeral' }` on the **last** few-shot block.
4. `packages/extract/src/runners/$ARGUMENTS.ts` — `runExtract$ARGUMENTS(sitrepId)`
   that writes an `extraction_runs` row BEFORE the API call and stamps every
   extracted fact with the resulting `extraction_run_id` and `source_quote_id`.
5. `packages/extract/tests/gold-set/$ARGUMENTS/*.json` — at least 3 ground-truth
   examples covering edge cases.
6. `packages/extract/tests/$ARGUMENTS.test.ts` — vitest tests including
   schema-roundtrip, tool-schema-validity, and gold-set assertions.

Forbidden:

- Inline-stringing the JSON Schema.
- Calling Anthropic from anywhere other than a runner.
- Omitting `prompt_version_hash` on the extraction_runs row.
- Trusting tool_use input without re-validating with the zod schema.

Finish by running `pnpm eval -- --extract $ARGUMENTS` and reporting F1 vs gold.
```

#### `.claude/commands/ship.md`

```markdown
---
description: Final preflight before merge. Blocks on any failure.
allowed-tools: Bash(pnpm:*), Bash(gh:*), Bash(git:*)
---

Run the full quality gate sequentially, stopping at the first failure:

1. `git status --porcelain` — there must be no untracked migration files.
2. `pnpm lint` — biome ci + eslint.
3. `pnpm typecheck` — tsc --noEmit across the workspace.
4. `pnpm test --run` — vitest, full suite.
5. `pnpm pgtap` — RLS test suite.
6. `pnpm exec playwright test` — E2E (skip if `--fast` arg given).
7. `pnpm knip` — unused exports/deps.
8. `pnpm exec gitleaks detect --no-banner`.
9. `pnpm audit --prod --audit-level=high`.
10. `pnpm eval -- --check-regressions` — gold-set F1 must not regress.

If anything fails, print the failure and STOP. Do NOT push. Do NOT open a PR.
Report exactly which gate failed.

If all gates pass, then and only then:

- `git push` to the feature branch
- `gh pr create --fill --draft` if no PR exists yet
- Print the PR URL and stop.
```

---

### 4. `.claude/agents/` — sub-agents (system prompts for the four most important)

#### `.claude/agents/reviewer.md`

```markdown
---
name: reviewer
description: Use proactively after any code generation touching apps/web, packages/db, packages/extract, or supabase/. Strict reviewer that audits against CLAUDE.md hard rules and project hard caps.
tools: Read, Grep, Glob, Bash(git diff:*), Bash(pnpm lint:*), Bash(pnpm typecheck:*)
model: claude-opus-4-7
---

You are a staff engineer doing a strict review. You do not write code. You
produce a structured findings report.

For every change in `git diff HEAD`, verify against the project hard rules from
the root `CLAUDE.md`:

🔴 BLOCKING — must fix before merge:

- PHI present in new code or fixtures
- `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/**`
- `@anthropic-ai/sdk` imported in a client bundle
- An RLS policy that doesn't wrap `auth.uid()` in `(select ...)`
- A new table without RLS enabled
- A migration without dollar-quoting / IF NOT EXISTS
- A UI component rendering a numeric figure without `sourceQuoteId` prop
- `any`, `!!` (non-boolean), `@ts-ignore` without rationale
- A file > 400 LoC, function > 75 LoC, cyclomatic > 12, depth > 4
- Missing test for new behavior

🟡 WARN — should fix:

- Server actions without `next-safe-action` wrapper
- `useEffect` for data fetching
- Tailwind classes not sorted
- Missing JSDoc on exported public API

🟢 SUGGEST — nice to have:

- Naming inconsistencies
- Repeated literals that could be constants

Output exactly this structure:

## 🔴 BLOCKING (N)

- <file:line> <one-line description> → <fix>

## 🟡 WARN (N)

- ...

## 🟢 SUGGEST (N)

- ...

## ✅ Passes

- <category>: <evidence>

If 🔴 count > 0, tell the main agent to stop and fix before continuing.
```

#### `.claude/agents/rls-auditor.md`

```markdown
---
name: rls-auditor
description: Use after any RLS policy change. Audits both correctness (via client SDK round-trip) and performance (via EXPLAIN ANALYZE).
tools: Read, Bash(supabase:*), Bash(psql:*), Bash(pnpm pgtap:*)
model: claude-sonnet-4-6
---

You are a Postgres + Supabase specialist. For every changed policy in this diff:

1. **Correctness.** Run the pgTAP suite in `tests/pgtap/<table>_rls.test.sql`.
   It must include: authenticated owner can SELECT own rows; authenticated
   non-owner cannot; anon role gets empty result; INSERT requires WITH CHECK
   to pass for own user_id; service_role bypasses RLS.

2. **Performance.** Generate a 10k-row seed for the affected table.
   Run `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` for a representative query.
   Verify:
   - `(select auth.uid())` shows as InitPlan (one-shot), not as repeated function calls.
   - The column in the policy is indexed (look for Index Scan, not Seq Scan).
   - p95 query time on 10k rows < 25ms.

3. **Anti-patterns to refuse:**
   - `for all` (multi-action) — split into four policies.
   - Bare `auth.uid()` without subquery wrap.
   - Omitted `to authenticated` — implicit `public` is a security bug.
   - Policy that joins through another table without a `security definer` helper.

Output: a report with EXPLAIN plan excerpts, pgTAP result, and a 🔴/🟡/🟢 summary.
```

#### `.claude/agents/extraction-engineer.md`

```markdown
---
name: extraction-engineer
description: Use when modifying any prompt, tool schema, or extraction runner. Verifies provenance, caching, and gold-set health.
tools: Read, Edit, Bash(pnpm eval:*), Bash(pnpm test:*)
model: claude-opus-4-7
---

You are the LLM extraction lead. For every change touching `packages/extract/**`:

1. Verify the chain: zod schema → `zodToJsonSchema` → Anthropic tool. No hand-written JSON Schema.
2. Verify `prompt_version_hash` is computed from `system + few_shot + tool_schema` and stamped on every `extraction_runs` row.
3. Verify the `cache_control` breakpoint placement: on the LAST static block, not the user message.
4. Verify provenance: every extracted fact has `source_quote_id` and `extraction_run_id`. The tool schema enforces `char_start`/`char_end` as required fields.
5. Run `pnpm eval -- --extract <slug>` against the gold set. Report F1, precision, recall vs baseline. If F1 drops > 2 points, flag as blocking.
6. Verify cache effectiveness: `usage.cache_read_input_tokens / (cache_read + input)` should be > 0.7 after the first warm call.

Refuse to approve a change that:

- Removes `prompt_version_hash`.
- Inline-strings the tool schema.
- Trusts `tool_use.input` without re-validating with the zod schema.
- Adds an extraction without a corresponding gold-set entry.
```

#### `.claude/agents/test-writer.md`

```markdown
---
name: test-writer
description: TDD specialist invoked by /tdd. Writes the failing test first, in isolation from any implementation context.
tools: Read, Write, Bash(pnpm test:*)
model: claude-sonnet-4-6
---

You are a test-first specialist. You receive: (1) a feature slug, (2) the
acceptance criterion to test. You do NOT see the implementation; do NOT
hypothesize about how it will be implemented.

Process:

1. Identify the smallest testable unit that captures the criterion.
2. Write a Vitest test that exercises the public API contract.
3. Run `pnpm test -- --related <file> --run` and capture the failure output.
4. The failure MUST be of the form "X is not a function" or "module not found",
   meaning the implementation does not exist yet. A syntax error or import
   typo is NOT a valid RED — fix the test.
5. Return: test file path, failure output verbatim, one-line description.

If the test passes immediately, the implementation already exists or the
criterion is already covered — escalate to the orchestrator with this info,
do not write a passing test.
```

The remaining agents (`migration-engineer.md`, `security-auditor.md`, `perf-auditor.md`, `docs-writer.md`) follow the same template structure; they are intentionally not expanded here because (per the Caveats) `@docs-writer` and `@perf-auditor` are marginal value for a solo developer.

---

### 5. `.claude/skills/` — when you need progressive disclosure

Two high-leverage skills, in full. Others (`supabase-types-regen`, `changeset-writer`, `adr-scaffolder`, `gold-set-curator`, `prompt-versioner`) follow this template.

#### `.claude/skills/pglast-migration-validator/SKILL.md`

```markdown
---
name: pglast-migration-validator
description: Validate a Supabase SQL migration file with pglast before commit. Use whenever a file under supabase/migrations/ is created or edited, even if not explicitly asked. Triggers on .sql files, migration generation, schema changes.
allowed-tools: Read, Bash(pnpm exec pglast:*), Bash(pnpm db:validate:*)
---

# pglast migration validator

When invoked, validate the most recently changed file under
`supabase/migrations/**.sql` against the project's parsing and convention checks.

## Steps

1. Identify the target file (from `$ARGUMENTS` or `git status --porcelain`).
2. Run: `pnpm exec pglast --check <file>` (this calls our wrapper that uses
   `pglast.parser.parse_sql` via node-bindings).
3. Apply conventions check in `references/conventions.md`:
   - Wrapped in `begin;` / `commit;`.
   - Every `create table` has a matching `alter table ... enable row level security`.
   - Every policy is `to authenticated` and wraps `auth.uid()`.
   - Function bodies are dollar-quoted.
   - All identifiers lowercase with underscores.
4. If any check fails, exit non-zero with a structured error report.

## Output format

✓ pglast parse OK
✗ convention: outbreaks table missing `enable row level security`
✗ convention: policy `outbreaks_select` does not wrap auth.uid()

## References

- `references/conventions.md` — full convention list
- `references/common-gotchas.md` — dollar-quoting, function search_path, etc.
```

#### `.claude/skills/source-quote-extractor/SKILL.md`

```markdown
---
name: source-quote-extractor
description: Extract source quotes with char_start/char_end offsets from WHO/AFRO/ECDC sitrep PDFs. Use whenever the user mentions ingesting a sitrep, extracting quotes, building provenance, or backfilling source_quotes.
allowed-tools: Read, Write, Bash(pnpm exec tsx:*)
---

# Source-quote extractor

For every sitrep ingested, every numeric or factual claim that will be rendered
in the UI MUST have a corresponding `source_quotes` row with exact char offsets
into the canonical text of the PDF.

## Steps

1. Read `references/pdf-extraction.md` for `unpdf` setup.
2. Extract canonical text with `extractText(buf, { mergePages: true })`.
3. Compute SHA-256 of the text.
4. For each candidate span (the LLM extraction will name them via tool use):
   - Use the LLM-returned `char_start` / `char_end`.
   - Verify `text.substring(char_start, char_end)` matches what the LLM claimed.
   - If mismatch > 5 chars Levenshtein, reject the extraction.
5. Insert `source_quotes` row with `(sitrep_id, char_start, char_end, text, sha256)`.
6. Return the `source_quote_id` to be stamped on the fact rows.

## Gotchas

- PDFs with two-column layouts: `unpdf` mergePages with column heuristics may
  reorder text. Always verify the substring before trusting the offsets.
- Some sitreps embed tables as images — those need OCR. Use `references/ocr.md`.
- Never trust LLM-returned offsets without the substring check above.
```

---

### 6. `.claude/settings.json` and `.claude/hooks/` — deterministic enforcement

#### `.claude/settings.json`

```json
{
  "model": "opusplan",
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-6",
    "CLAUDE_CODE_EFFORT_LEVEL": "xhigh"
  },
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(supabase:*)",
      "Bash(git diff:*)",
      "Bash(git status:*)",
      "Bash(gh pr*:*)",
      "Read",
      "Glob",
      "Grep",
      "Edit",
      "Write"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
      "Bash(supabase db push:*)"
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "bash ${CLAUDE_PROJECT_DIR}/.claude/hooks/statusline.sh"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/tdd-guard.sh"
          },
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/no-phi.sh"
          },
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/no-service-role.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/biome-check.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/ship-gate.sh"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/subagent-cleanup.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/prompt-submit.sh"
          }
        ]
      }
    ]
  },
  "includeCoAuthoredBy": false,
  "outputStyle": "concise"
}
```

#### `.claude/hooks/tdd-guard.sh`

```bash
#!/usr/bin/env bash
# PreToolUse hook: block Write|Edit|MultiEdit on source files
# without a sibling test edit in this session.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
session_id=$(echo "$input" | jq -r '.session_id // empty')
ts=$(date +%s)
state_dir="${CLAUDE_PROJECT_DIR}/.claude/.tdd-state/${session_id}"
mkdir -p "$state_dir"

# Allow edits to test files, config, docs, migrations, references.
case "$file_path" in
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*tests/pgtap/*) touch "$state_dir/last-test-edit"; exit 0 ;;
  *.md|*.json|*.yaml|*.yml|*supabase/migrations/*|*.sql) exit 0 ;;
  *.claude/*|*docs/*|*.github/*) exit 0 ;;
esac

# Source code edit. Require a test edit within the last 10 minutes of this session.
case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx)
    if [[ -f "$state_dir/last-test-edit" ]]; then
      last=$(stat -f %m "$state_dir/last-test-edit" 2>/dev/null || stat -c %Y "$state_dir/last-test-edit")
      if (( ts - last < 600 )); then exit 0; fi
    fi
    cat >&2 <<EOF
TDD-GUARD: Refusing to edit $file_path.
No test file was edited in the last 10 minutes of this session.

Project rule (root CLAUDE.md): tests are written BEFORE implementation.

Next steps:
  1. Identify the smallest behavior to implement.
  2. Write or edit a *.test.ts that exercises it (it should fail).
  3. THEN edit the implementation.

If this is intentional (e.g., refactor with existing tests), edit the test
file with a trivial change (a comment) to register it for this session.
EOF
    exit 2
    ;;
esac

exit 0
```

#### `.claude/hooks/biome-check.sh`

```bash
#!/usr/bin/env bash
# PostToolUse: biome check + related vitest tests on the touched file.
set -euo pipefail
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx)
    cd "${CLAUDE_PROJECT_DIR}"
    if ! pnpm exec biome check --apply "$file_path" >/dev/null 2>&1; then
      echo "biome failures on $file_path:" >&2
      pnpm exec biome check "$file_path" >&2 || true
      exit 2
    fi
    if ! pnpm exec vitest --related --run "$file_path" >/dev/null 2>&1; then
      echo "related vitest tests failed for $file_path:" >&2
      pnpm exec vitest --related --run "$file_path" >&2 || true
      exit 2
    fi
    ;;
  *.sql)
    if ! pnpm exec pglast --check "$file_path" >/dev/null 2>&1; then
      echo "pglast failed:" >&2
      pnpm exec pglast --check "$file_path" >&2 || true
      exit 2
    fi
    ;;
esac
exit 0
```

#### `.claude/hooks/ship-gate.sh`

```bash
#!/usr/bin/env bash
# Stop hook: refuse to end the session while quality gates are red.
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR}"

fail=0
pnpm lint        --silent || { echo "✗ lint failed"      >&2; fail=1; }
pnpm typecheck   --silent || { echo "✗ typecheck failed" >&2; fail=1; }
pnpm test --run  --silent || { echo "✗ vitest failed"    >&2; fail=1; }

if (( fail )); then
  cat >&2 <<EOF
SHIP-GATE: refusing to end session with red quality gates.
Run \`/ship\` for the full gate, or fix the failing checks above first.
EOF
  # Exit 2 in Stop hook forces Claude to keep working.
  exit 2
fi
exit 0
```

(Plus shorter `no-phi.sh` that greps for SSN/MRN/DOB patterns in inserted text; `no-service-role.sh` that refuses `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/**`; `prompt-submit.sh` that adds _"Have you read `.claude/specs/<feature>.md`? If this is a new feature, run `/spec` first."_ when the prompt contains feature-request keywords without a spec reference.)

---

### 7. `.claude/specs/_template.md` and `.claude/plans/_template.md`

```markdown
# Spec: <feature-name>

**Status:** draft | reviewed | implemented
**Owner:** <you>
**Date:** YYYY-MM-DD

## Mission

One paragraph. What problem? For whom? What success looks like.

## Sources & data

Which WHO/AFRO/ECDC/ReliefWeb feeds? Existing tables or new?

## UI surface

Routes, components, screenshots/wireframes. Every rendered figure → `source_quote_id`.

## Data model

New tables/columns/policies. RLS implications.

## Extraction

New prompt/tool? Gold-set entries (≥ 3).

## Acceptance

Concrete checks: row counts, RLS tests, screenshot diffs, F1 thresholds.

## Non-goals

What this feature does NOT do.

## Open questions
```

```markdown
# Plan: <feature-name>

**Spec:** `.claude/specs/<feature>.md`
**Status:** draft | approved | executed

## Approach

2–4 paragraphs of the design. Trade-offs considered. Why this approach.

## Migrations

1. `YYYYMMDDHHMMSS_<slug>.sql` — <description>

## Code changes (in TDD order)

1. **RED:** test file `<path>` covers <criterion>
2. **GREEN:** implementation in `<path>`
3. **REFACTOR:** any cleanup
   (repeat for each criterion)

## Risks & rollback

What can go wrong. How to undo.

## Estimate

S/M/L; rough hours.
```

---

### 8. `.claude/references/` — curated context loaded on demand

Six files, each ≤ 200 lines, each `@`-imported from the relevant per-package CLAUDE.md:

- **`architecture.md`** — condensed architecture report from prior research: tech-stack table, monorepo layout, request lifecycle, runtime boundaries, deployment topology.
- **`anti-patterns.md`** — the forbidden list, each with a 1-line "why" and "instead": `any`, `!!`, `@ts-ignore` without rationale, `useEffect` for fetching, `db.execute(sql\`...\`)`for migrations, bare`auth.uid()`, etc.
- **`rls-performance.md`** — distilled from Supabase's official "RLS Performance and Best Practices" troubleshooting guide: wrap `auth.uid()` in `(select ...)`, always index policy columns, separate SELECT/INSERT/UPDATE/DELETE, prefer `team_id in (select team_id from team_user where user_id = (select auth.uid()))` over join-in-USING.
- **`prompt-caching.md`** — order: tools → system → messages; place `cache_control` on the last static block; invalidators (tool changes, model swap, image add/remove, `tool_choice` changes); usage reporting via `cache_read_input_tokens` / `cache_creation_input_tokens`; 5-min vs 1-hour trade-off.
- **`drizzle-cheatsheet.md`** — `vector({ dimensions: 1536 })`, `index('cosine_index').using('hnsw', col.op('vector_cosine_ops'))`, `geometry({ type: 'point', srid: 4326 })`, `extensionsFilters: ['postgis']` in `drizzle.config.ts`.
- **`pgvector-postgis.md`** — HNSW max 2000 dims; cosine for semantic; SRID 4326 always; `ST_AsMVT` for tile generation; H3 helpers.

**Why `.claude/references/` and not `docs/`?** Anything Claude should pull _on demand_ lives under `.claude/` because that signals to humans-reading-the-repo "this is agent context." Things humans need (READMEs, ADRs, runbooks) live under `docs/`. There's some overlap; that's fine — `docs/adr/CLAUDE.md` `@`-imports the architecture doc rather than duplicating it.

---

### 9. AGENTS.md vs CLAUDE.md decision

Ship **both** files. They are NOT duplicates:

- `AGENTS.md` is the **universal, cross-tool source of truth** — Codex, Cursor, Copilot CLI, Gemini CLI, Windsurf all read it. It contains the project mission, hard rules, commands, conventions. ~150–200 lines.
- `CLAUDE.md` is **Claude-specific deltas**: `@AGENTS.md` import line, slash-command index, hook integration notes, prompt-caching guidance, sub-agent invocation patterns. ~50–100 lines on top.

This is exactly the pattern MakerKit's `next-supabase-saas-kit-turbo` uses and is the prevailing 2026 best practice. Do not `ln -s AGENTS.md CLAUDE.md` — that loses the ability to add Claude-specific deltas. Use the `@AGENTS.md` import.

---

### 10. Integration with Cursor / Codex / VS Code

- `.cursor/rules/` for Cursor scoped rules (the v2 format; `.cursorrules` is deprecated).
- `AGENTS.md` covers Codex CLI and Copilot CLI without further work.
- For VS Code Copilot Chat: a thin `.github/copilot-instructions.md` that does _only_ `Read AGENTS.md before responding.`
- Avoid duplicating rules across all four — they will drift. Make `AGENTS.md` the source and have every tool-specific file delegate to it.

---

### 11. Continuous maintenance — how CLAUDE.md evolves

- After every PR that introduces a new convention, the author updates the relevant `CLAUDE.md` file _in the same PR_. The `@reviewer` agent flags a missing update if a new pattern appears without rule support.
- Quarterly review: run a small `scripts/claude-md-drift.ts` script that greps the repo for patterns that aren't documented and patterns documented but not used.
- Treat `CLAUDE.md` like code: every change in a PR, reviewed, with a one-line justification. Anthropic's docs are explicit: _"Treat CLAUDE.md like code: review it when things go wrong, prune it regularly, and test changes by observing whether Claude's behavior actually shifts."_
- Version the rules implicitly via git history. No need for a CHANGELOG of the rules unless the team grows beyond ~5 people.

---

### 12. A first-PR walkthrough using this apparatus

Feature: _"Render an EVD case-counts choropleth for North Kivu province, sourced from WHO AFRO sitreps."_

1. **`/spec evd-nk-choropleth`** — Claude reads the template and writes `.claude/specs/evd-nk-choropleth.md`. You review and edit. UI: `app/(map)/outbreaks/evd/nk/page.tsx`. Data: existing `outbreaks` + new `case_counts_by_admin1` view. Acceptance: ≥ 95% admin1 coverage; F1 ≥ 0.85 on gold set; pgTAP RLS green; screenshot diff < 0.01.

2. **`/plan evd-nk-choropleth`** — Claude writes `.claude/plans/evd-nk-choropleth.md`. Migrations: create view + index. Code changes in TDD order: (1) gold set ground truth → extraction tests → extraction runner → extracted-fact insertion → view → MVT route → React component. You approve.

3. **`/migration add_case_counts_by_admin1`** — Claude scaffolds the SQL, `pnpm db:validate` passes via the `pglast-migration-validator` skill. You inspect the diff. `supabase db reset` applies.

4. **`/extract evd_case_counts`** — Claude creates the zod schema, tool, prompt with `cache_control` breakpoint, runner that writes `extraction_runs` and stamps `source_quote_id`. Three gold-set examples added. `pnpm eval` reports F1 = 0.89 vs baseline 0.84 — pass.

5. **`/tdd evd-nk-choropleth`** — Sub-agent `@test-writer` writes the RED test for the MVT route handler. The PreToolUse `tdd-guard.sh` blocks the first attempt to edit the route handler because no test edit yet — good. After the test is written and confirmed failing, Claude implements. `biome-check.sh` runs on every save and surfaces a `noUnusedVariables` it auto-fixes. Component is built; `@reviewer` flags that the choropleth component doesn't accept `sourceQuoteId` on its tooltip — BLOCKING. Fixed. `@rls-auditor` runs against the new view, confirms `(select auth.uid())` is wrapped and the GIST index is hit.

6. **`/ship`** — All ten gates pass. Push, draft PR opened by `gh pr create --fill --draft`. Manual review and merge.

End-to-end: ~3 hours instead of ~6, with no shortcuts on quality.

---

## Recommendations

**Phase 1 (do this week, 4–6 hours):**

1. Drop the directory tree from §0 verbatim. Empty per-package `CLAUDE.md` files first; fill them as you encounter each subtree.
2. Paste the root `CLAUDE.md`, `apps/web/CLAUDE.md`, `packages/db/CLAUDE.md`, `packages/extract/CLAUDE.md`, `supabase/CLAUDE.md` from §1–§2.
3. Drop the six commands (`/spec`, `/plan`, `/tdd`, `/migration`, `/rls`, `/extract`, `/ship`) from §3 into `.claude/commands/`.
4. Drop `.claude/settings.json` and the three core hooks (`tdd-guard.sh`, `biome-check.sh`, `ship-gate.sh`) from §6.
5. Add `nizos/tdd-guard` as an upgrade path: keep the bash hook for now; migrate when you hit your second false-positive.

**Phase 2 (when you hit friction):**

- Add `@reviewer` and `@rls-auditor` sub-agents.
- Add the `pglast-migration-validator` and `source-quote-extractor` skills.
- Add `.claude/references/*.md` (curated context).
- Set up Supabase MCP via `.claude/mcp.json` pointing at `https://mcp.supabase.com/mcp?project_ref=<ref>&read_only=true` for read-only dev.

**Phase 3 (when the project crosses 50k LoC or you onboard collaborators):**

- Add `@perf-auditor` and `@security-auditor` sub-agents.
- Add `/eval`, `/perf`, `/security`, `/deps` commands.
- Ship `AGENTS.md` if you start using Codex/Cursor alongside Claude Code.
- Wire `.claude/commands/` to GitHub Actions via `anthropics/claude-code-action@v1` (copy the pattern from `anthropics/claude-cookbooks`).

**Benchmarks that change the recommendation:**

- If you find yourself manually re-running `pnpm typecheck` ≥ 3 times per session, the PostToolUse hook isn't catching enough — extend it to run `tsc --noEmit -p apps/web` on .tsx edits.
- If `@reviewer` produces > 3 false-positive BLOCKING calls in a week, prune its rules. The cost of false BLOCKING is higher than the cost of one missed convention violation.
- If your root `CLAUDE.md` crosses 250 lines, move sections to `.claude/references/` and `@`-import. The official Claude Code docs are explicit: "Keep CLAUDE.md under 200 lines."

---

## Caveats — honest pushback on the wish-list

1. **Hierarchical `CLAUDE.md` files are a real drift risk.** I recommend them in §2 because monorepo packages genuinely diverge (Deno vs Node, RSC vs Drizzle), but the marginal value of `packages/ui/CLAUDE.md` and `packages/geo/CLAUDE.md` is small. Start with five files, not twelve. Add the others only when you ship code in those subtrees and find Claude making subtree-specific mistakes.

2. **Some commands are overkill for a solo developer.** `/onboard`, `/branch`, `/component`, `/server-action`, `/route-handler` are templates a solo dev usually doesn't need codified — by the time you would, the codebase has enough exemplars that "copy the nearest one" works as well as a slash command. Ship them only if you find yourself doing each pattern ≥ 5 times.

3. **TDD-strict hooks create real friction.** The `tdd-guard.sh` will, occasionally, block you from a legitimate refactor that doesn't change behavior. The "edit any test file with a trivial change" escape hatch is intentional but ugly. If you find yourself in that escape hatch > 2x per day, the rule is wrong; relax to "writes to source code without ANY test file in the changed-set" rather than "without a recent test edit." `nizos/tdd-guard` handles this more gracefully via session-state tracking and a Vitest reporter integration.

4. **The `@docs-writer` agent is mostly performative.** ADRs are short enough that you should write them yourself; runbooks need real understanding of incidents, which Claude doesn't have. Cut it.

5. **`/perf` is a wrapper around four commands that you should just run yourself.** Cut until you have ≥ 1 Core Web Vitals regression.

6. **Spec-driven development is genuinely valuable here, but don't adopt `bmad-method` or even Pimzino's full workflow.** The four-phase `Constitution → Specify → Plan → Tasks` of `github/spec-kit`, vendored into your `.claude/specs/` and `.claude/plans/` templates, is enough. Heavyweight frameworks add ceremony without proportional quality gain for a single MD-student developer.

7. **Don't put the architecture report in `CLAUDE.md`.** Put it in `.claude/references/architecture.md` and `@`-import where needed. The community pattern is clear: per Shareuhack's analysis (May 2026), "past the 200-line threshold, degradation is uniformly distributed — every low-value rule added dilutes the compliance probability of every high-value rule equally." Keep CLAUDE.md lean.

8. **The reference-grade bar is partly aspirational.** Staff engineers at Vercel, Supabase, Linear, etc., do NOT all ship `.claude/` directories in their public repos as of May 2026. The closest exemplars are `anthropics/skills`, `anthropics/claude-cookbooks`, `vercel/ai`'s `skills/use-ai-sdk/`, `vercel/next-forge` v6's installable skill, and MakerKit's `next-supabase-saas-kit-turbo`. This blueprint synthesizes what those do; it is not a copy of any single existing exemplar.

9. **Prompt caching is the highest single-line ROI in the entire apparatus.** Per Anthropic's official pricing docs: "A cache hit costs 10% of the standard input price, which means caching pays off after just one cache read for the 5-minute duration (1.25× write), or after two cache reads for the 1-hour duration (2× write)." A 5-line change in `packages/extract/` — adding `cache_control: { type: 'ephemeral' }` to the last static block — saves ~80% of input tokens and ~50% of TTFB on a repetitive extraction pipeline. Do this before you finish setting up half the slash commands.

10. **One genuine risk: the `/ship` gate at the Stop hook will be annoying.** It refuses to let you end the session if `tsc` or `vitest` is red. That is the _point_ — Anthropic's docs describe this as the canonical fix for the trust-then-verify gap: _"a PostToolUse or Stop hook that runs the test command before 'done' can complete."_ But you will hate it the first three times. Don't disable it; fix the failing test.
