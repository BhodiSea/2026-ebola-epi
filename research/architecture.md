# Reference-Grade Architecture for `ituri-sitrep` — A Next.js 15 + Supabase Public-Health Companion (May 2026)

A senior engineer at Vercel, Supabase, Linear, Stripe, or Plaid would accept this repo as exemplary if you ship the stack below: **pnpm + Turborepo monorepo, Next.js 15 App Router with strict Server-Component boundaries, Supabase via `@supabase/ssr` + raw SQL migrations + RLS, Drizzle as a type-only schema mirror, Biome 2 for lint/format, Vitest + Playwright + pgTAP for tests, Sentry (OTel) + Axiom for observability, Anthropic prompt-caching with zod-derived tool schemas, and ADRs in MADR format from commit one.** Anything more bespoke is theatre; anything less is hobby code.

## TL;DR

- **One opinionated stack:** pnpm workspaces + Turborepo, Next.js 15 App Router (Server Components by default, `next-safe-action` for mutations), `@supabase/ssr` with the new publishable/secret key model, **raw SQL migrations as the source of truth + Drizzle for typed query building only**, Biome 2 for lint/format, Vitest 3 + Playwright + pgTAP, Sentry (which now consumes OpenTelemetry natively in Next.js) plus Axiom for log drains, Anthropic Claude with explicit `cache_control` breakpoints and JSON-Schema strict tool use, MADR ADRs from day one. React Compiler 1.0 **on** — per the React team's release post by Lauren Tan, Joe Savona, and Mofei Zhang (react.dev/blog, 7 October 2025): _"React Compiler 1.0 is available today. Compiler-powered lint rules ship in eslint-plugin-react-hooks's recommended and recommended-latest preset."_
- **Two places of honest pushback:** (1) "Pure Supabase, App-Router-only" creates real friction — Deno Edge Functions are awkward to share code with from a pnpm/Node monorepo; the accepted pattern in 2026 is a copy-step into `supabase/functions/_shared/generated/` or publishing to JSR, and several production teams (per `supabase/cli` Discussion #23239) have abandoned Edge Functions for Hono-on-Workers precisely because of this. Design your shared package to be runtime-agnostic so you can move compute later. (2) RLS as your _only_ authorization layer leaks through joins and gets slow fast — you must wrap auth functions in `(select …)` so Postgres uses an initPlan, index every policy column, and prefer `security definer` helpers for cross-table joins.
- **The non-negotiables for a "world-class" repo:** typed contracts everywhere (zod 4 schemas as the _single_ source — DB column generation, Anthropic tool schemas, Server Action validation, Edge Function I/O all derive from the same zod object); every rendered figure carries `source_quote_id` FK enforced at the schema level _and_ in TypeScript via branded types; Supabase Branching wired to GitHub PRs so every PR gets an ephemeral Postgres; provenance, extraction prompt version, and model fingerprint stamped on every row.

## Key Findings

### 1. Monorepo: pnpm workspaces + Turborepo. Not Nx.

For a solo dev on weekends with **5–15 packages** scaling to a small team, the Vercel-aligned consensus in 2026 is unambiguous: **pnpm workspaces + Turborepo**. Nx is technically more powerful (distributed task execution, code generators, module-boundary enforcement, Nx Cloud's free remote cache vs Vercel's paid one — and Nx's `nx configure-ai-agents` one-command setup is a real differentiator if you go heavy on Claude Code/Cursor) but PkgPulse's 2026 guidance is unambiguous: _"1–3 devs: neither — npm workspaces with a Makefile is enough; 3–15 devs: Turborepo wins on simplicity; 15+: revisit Nx."_ You're in the Turborepo band, you're deploying on Vercel where remote cache is free for personal accounts, and Turborepo's `turbo.json` is ~20 lines vs Nx's project-graph cognitive overhead. **Pick Turborepo. Don't look back.** Bun workspaces and Moon are not credible alternatives for a Vercel-deployed Next.js app in 2026.

### 2. Next.js 15 App Router: Server Components by default, `next-safe-action` for mutations

The shift since 2024: Server Components are the default; Client Components are an explicit cost. Use Server Actions for _all_ mutations — never call Supabase from the browser for anything that touches authoritative data — and wrap every action with **`next-safe-action`**, which provides Standard Schema v1 validation (zod 4, valibot, arktype all work), composable middleware (auth, rate limit, observability), typed `useAction` / `useOptimisticAction` hooks, and clean handling of validation/server/navigation errors. Theo Browne, the next-forge team, and Makerkit have all converged on this library since mid-2025. **Do not use tRPC** — App Router Server Actions plus `next-safe-action` is the post-tRPC pattern. React Compiler 1.0 ships with Next.js 15.3.1+ via SWC; **enable it** and remove your `useMemo`/`useCallback` boilerplate.

### 3. Supabase: `@supabase/ssr` with the new key model; raw SQL migrations win

`@supabase/auth-helpers-nextjs` is dead. Use **`@supabase/ssr`** with `createBrowserClient` / `createServerClient` and the new **publishable (`sb_publishable_…`) / secret (`sb_secret_…`) keys** — per Supabase's own docs, _"the older anon and service_role keys will work until the end of 2026 but we strongly encourage switching to and using the new publishable (sb_publishable_xxx) and secret (sb_secret_xxx) keys now."_ Cookie-handling boilerplate is now a 30-line `lib/supabase/{client,server,middleware}.ts` triple that Supabase publishes verbatim in their Next.js quickstart.

**For migrations: keep your raw SQL + pglast validation pipeline.** Drizzle is excellent for _query building_ against PostGIS (native `geometry('point')` types) and pgvector (native `vector(dim)` with `l2Distance`/`cosineDistance` operators), but using Drizzle Kit as your migration source for a PostGIS-heavy app is masochism — Drizzle does not auto-create the extension (the docs explicitly say _"as for now, Drizzle doesn't create extension automatically, so you need to create it manually"_), has limited support for PostGIS-specific DDL (triggers, materialized views, RLS policies, custom operator classes), and Drizzle migrations are noisier and harder to review than handwritten SQL. The 2026 best practice for a Supabase + PostGIS + pgvector app is: **raw SQL in `supabase/migrations/` as the schema source of truth, `supabase gen types typescript` for row types, and Drizzle as a typed query layer (`drizzle-orm` only, not `drizzle-kit`) that mirrors the schema for compile-time safety.**

### 4. RLS: real, performant, defense-in-depth — but with three rules

Per Supabase's own performance docs (and the GaryAustin1/RLS-Performance benchmarks they ship): (1) **Wrap every `auth.uid()` / `auth.jwt()` / `security definer` call in `(select …)`** so Postgres runs an initPlan once per statement instead of once per row — _"this method works well for JWT functions like `auth.uid()` and `auth.jwt()` as well as `security definer` Functions. Wrapping the function causes an initPlan to be run by the Postgres optimizer, which allows it to 'cache' the results per-statement"_. (2) **Index every column referenced in a USING/WITH CHECK clause** — the Supabase docs report _"improvement seen over 100x on large tables"_ from just this. (3) **Always specify `TO authenticated`** on policies — don't leave the role list empty; per Supabase, _"this does not improve the query performance for the signed in user [but] does eliminate 'anon' users without taxing the database to process the rest of the RLS policy."_ For multi-table joins, prefer a `STABLE SECURITY DEFINER` helper function returning the visible ID set, then `id = ANY(select my_helper())` in the policy — flatter plans, no recursive RLS evaluation. Test policies through the client SDK, never the SQL Editor (which bypasses RLS). And per the Supabase AI prompt, **don't use `FOR ALL`**: _"Instead separate into 4 separate policies for select, insert, update, and delete."_

### 5. Validation: zod 4 (not valibot, not arktype) — for one specific reason

For a server-heavy app where bundle size on the client is not the bottleneck, **zod 4** wins on ecosystem (tRPC, next-safe-action, drizzle-zod, react-hook-form, hono — every meaningful library has a zod resolver). Zod 4's JIT compilation closed the runtime-perf gap with valibot to roughly 2.1× (per PkgPulse's March 2026 100K-object benchmark: Valibot at 85ms vs Zod v4 at 180ms; a separate DEV Community 1M-iteration test reports ~1.7×, 820ms vs 1,380ms). On raw throughput, Zod v4 trails ArkType by approximately 15× in the same PkgPulse benchmark (ArkType 12ms vs Zod 180ms across 100K complex-object validations) — irrelevant at typical API throughput, where 180ms across 100K validations means ~1.8µs per call. Valibot's 90% bundle-size win (1.37KB vs Zod's 17.7KB for a login form, per Valibot's own published benchmark) matters for Cloudflare Workers and browser-shipped validators; for an outbreak dashboard that validates LLM output server-side, it doesn't. **Use zod 4. Use `z.brand<"SourceQuoteId">()` for IDs.** Drive Anthropic tool schemas from zod via `zod-to-json-schema`.

### 6. Linting: Biome 2. Format: Biome 2. Done.

In 2026 the new-project consensus has flipped. Biome v2 ("Biotype") added type-aware linting via its own inference engine — no `tsc` invocation needed — and the rule-coverage gap to ESLint+typescript-eslint is now small enough that for a greenfield project, you save real time. Biome's official adopter list on biomejs.dev includes AWS, Google, Microsoft, Canonical, Cloudflare, Coinbase, Comcast, Discord, the Node.js project itself, Slack, Socket, Uniswap, Vercel, and Astro — that is the social proof that matters. One `biome.json`, one binary, lint and format in <1s on this repo. **Add `eslint-plugin-react-hooks@latest` separately** — this is the one ESLint plugin you still need, because per the React team's React Compiler 1.0 post, _"Compiler-powered lint rules ship in eslint-plugin-react-hooks's recommended and recommended-latest preset … We recommend everyone upgrade today. If you have already installed eslint-plugin-react-compiler, you can now remove it and use eslint-plugin-react-hooks@latest."_

### 7. Testing: Vitest 3 + Playwright + pgTAP + Promptfoo

- **Unit/component:** Vitest 3 with `happy-dom` (not jsdom — 2–3× faster, sufficient for everything except Canvas which you mock).
- **E2E:** Playwright. State of JS 2025 (released January 2026) shows Playwright satisfaction at 91% vs Cypress at 72% — the widest gap ever — and npm download trends bear this out: Playwright at roughly 33M weekly downloads in early 2026 versus Cypress at ~6.5M, climbing to about 47.9M weekly for Playwright by May 2026. Native parallel sharding is free; Cypress parallel requires paid Cypress Cloud.
- **SQL/RLS:** **pgTAP** via the Supabase CLI's `supabase test db`. The CLI ships `pg_prove` and the TAP harness. Use Basejump's `supabase-test-helpers` to spin up users and run tests _as_ an authenticated user — this is the only way to actually catch RLS leaks.
- **LLM extraction:** **Promptfoo** (declarative YAML, CI-first, free, runs Anthropic + JSON-Schema strict tool use natively, includes red-teaming). Braintrust is better at collaborative prompt iteration but is closed-source and paid; Langfuse is best for production observability but has a more complex CI setup. For a solo open-source project: Promptfoo for CI evals + Langfuse self-hosted (MIT) for production traces is the right combo.
- **Property-based:** `fast-check` on the source-quote extraction normalizer (canonicalizing locations, dates, numbers under provenance).
- **Coverage target:** 80% lines on `packages/extract` and `packages/db`, 60% on the app, hard-gate at 50% on a per-package basis via Vitest's `--coverage.thresholds.lines=50`. Higher is theatre.

### 8. Observability: Sentry (OpenTelemetry-native) + Axiom + Langfuse

Sentry's Next.js SDK _is_ OpenTelemetry under the hood — per Sentry's own docs: _"The Sentry SDK uses OpenTelemetry under the hood. This means that any OpenTelemetry instrumentation that emits spans will automatically be picked up by Sentry without any further configuration."_ You get one SDK that gives you errors, performance, source-mapped stack traces, and a clean OTel export path if you ever want to swap backends. For structured logs, ship via **Axiom** (`@axiomhq/js`) or a Vercel Log Drain — pino as the logger, JSON to stdout, drain to Axiom for query. For LLM-specific traces (prompt versions, token spend, eval scores correlated with model fingerprint), **Langfuse self-hosted** (Postgres + ClickHouse, MIT, OTel-compatible). Three planes — Sentry for app errors+perf, Axiom for raw logs, Langfuse for LLM — sounds heavy but each free tier is generous and each plane answers a question the others can't.

### 9. Security: Arcjet for app-layer protection, Vercel Firewall for L7, RLS as defense-in-depth

For a public dashboard that doesn't need user accounts beyond admin auth: **Arcjet** at the route-handler/server-action layer (rate limit, bot detection, shield) — more ergonomic than `@upstash/ratelimit` because it's a single SDK that does shield + bot + rate-limit with one config and integrates cleanly with next-safe-action middleware. (Use `@upstash/ratelimit` if you'd rather keep state in Redis and pay nothing — it's perfectly fine; Arcjet is the upgrade.) Vercel Firewall (free tier) for L7 IP/geo rules. For secrets: **Vercel project env vars** are fine; Doppler/Infisical are over-engineered for a solo project. **Rotate the Anthropic key every 90 days via GitHub Actions secret rotation**, never expose it in a client component, and use the Anthropic SDK only inside Server Actions, Route Handlers, or Edge Functions. CSP: nonce-based with `strict-dynamic` set in `middleware.ts` — Next.js 15 has known footguns with App Router + nonces (the `await headers()` requirement, CVE-2026-44581 around malformed nonces from cache poisoning) so pin Next.js to a version ≥ the latest patch and follow the with-strict-csp example exactly.

### 10. CI/CD: GitHub Actions + Supabase Branching + Changesets

Supabase Branching (Pro plan) is the killer feature: every PR gets an ephemeral Postgres with your migrations applied and seed.sql run. Wire it via the official GitHub integration — _"every time a change is pushed to GitHub, the migrations within the ./supabase/migrations folder are run against the Preview Branch."_ Vercel preview deployments auto-bind to the branch URL via the Supabase-Vercel integration that populates per-deployment env vars. Releases: **Changesets** — semantic-release is too clever for a monorepo with internal-only packages; release-please is fine for a single app, worse for a polyrepo-mindset on top of a monorepo. Hooks: **Lefthook** (Go binary, single YAML, replaces Husky+lint-staged). Commitlint with Conventional Commits. **Renovate** (not Dependabot) for dep PRs — Renovate's monorepo support and group/schedule rules are vastly better. **Socket.dev** for supply-chain alerts on every install. **CodeQL** in GitHub Advanced Security (free for public repos).

### 11. The LLM extraction subsystem — schema-driven, prompt-cached, provenance-stamped

This is the core IP of the project and deserves its own architecture:

- **Single source of schema truth:** one `zod` object per extracted entity (e.g., `CaseCountSchema`, `ZoneSituationSchema`). From that, derive:
  - JSON Schema for Anthropic's strict tool use (`output_config.format: json_schema` + `strict: true`, available since the `structured-outputs-2025-11-13` beta).
  - DB column generators via `drizzle-zod` or a custom codegen.
  - Next.js Server Action validators via `next-safe-action`.
  - OpenAPI for any public read API you publish.
- **Prompts as code:** `.prompt.md` files in `packages/prompts/`, each with frontmatter (`model`, `version`, `cache_breakpoints`, `expected_schema`). A tiny loader resolves them, interpolates parameters, and emits a content hash that goes into the DB row as `prompt_version_hash`.
- **Prompt caching:** Anthropic's 2025 simplification removed the manual breakpoint dance for most cases — _"when you set a cache breakpoint, Claude automatically reads from your longest previously cached prefix"_ — but for your case (system prompt + a stable source-document block + a varying user instruction), set an **explicit `cache_control` breakpoint at the end of the source document** so the document is the cache target, not the instruction. Per Anthropic's official prompt caching docs (confirmed in CloudZero's May 2026 pricing analysis): **cache reads are 0.1× the standard input price (a 90% discount), 5-minute cache writes are 1.25× base input price, and 1-hour cache writes are 2× base.** Per the Anthropic announcement: _"reducing costs by up to 90% and latency by up to 85% for long prompts."_
- **Provenance:** every extracted row stores `(source_doc_id, source_quote_id, char_start, char_end, prompt_version_hash, model_id, extracted_at, extraction_run_id)`. The `source_quote_id` FK is **NOT NULL** on every figures table. UI hover-to-quote works because the FK is enforced.
- **Reproducibility:** an `extraction_runs` table records the model fingerprint (e.g., `claude-sonnet-4-6@2026-04-01`), the prompt hash, input doc SHA, and the tool-schema hash. Re-running v3.2 against v3.2 inputs should be byte-identical (modulo model nondeterminism, which you control by `temperature: 0` for extraction).
- **Cost tracking:** Helicone or Langfuse middleware on every `anthropic.messages.create` call; weekly Vercel cron that posts spend-per-source-type to a Slack webhook. Hard kill-switch in Vercel Edge Config (a feature flag) that disables all extraction if daily spend > $X.

### 12. The Deno/Node monorepo seam — the genuinely hard part

Sharing TypeScript between Supabase Edge Functions (Deno) and Next.js (Node) inside a single pnpm workspace is unresolved at the tooling level. Supabase's official guidance is the narrow `_shared/` convention inside `supabase/functions/`: per their AI prompt, _"if you are reusing utility methods between Edge Functions, add them to `supabase/functions/_shared` and import using a relative path. Do NOT have cross dependencies between Edge Functions."_ A Supabase maintainer in Discussion #30291 acknowledged the gap: _"The right way to deal with shared dependencies will be to support Deno workspaces. It's something we want to support in the near future!"_ — tracking issue `supabase/cli#3047` is still open.

**The accepted 2026 pattern for serious teams:**

1. Put runtime-agnostic code (zod schemas, pure functions, generated DB types) in `packages/shared/` with **zero Node built-ins**. Allow only `zod` and standard Web APIs.
2. Add a `prebuild` script (`pnpm db:sync`) that **copies** `packages/shared/src/**/*.ts` to `supabase/functions/_shared/generated/` and commits the copy to `.gitignore`. Run it before `supabase functions serve` and in CI before `supabase functions deploy`.
3. Pin every external dep in `supabase/functions/deno.json` via explicit `npm:` or `jsr:` specifiers — **never bare imports**. Per Supabase's AI prompt: _"Do NOT use bare specifiers when importing dependencies. If you need to use an external dependency, make sure it's prefixed with either `npm:` or `jsr:`."_
4. Add `.vscode/settings.json` with `"deno.enablePaths": ["supabase/functions"]` so the Deno LSP doesn't fight the TS server in the rest of the repo (this is necessary; see `supabase/cli#1303` "Edge functions are nearly impossible to write if project directory is a monorepo").
5. **Long-term option:** publish `packages/shared` to JSR. Supabase already publishes `@supabase/supabase-js` to JSR; the registry is TypeScript-native and works in both Deno and Node. JSR has no private scopes yet, so this only works if you're OK publishing public.
6. **Do not** try `npm:@yourorg/shared` pointing at a pnpm `workspace:*` symlink — the Supabase CLI's deploy bundler does not reliably resolve those (see `supabase/cli#4927`).

**Honest pushback:** if you find yourself wanting non-trivial shared business logic in Edge Functions, you have outgrown them. Multiple production teams in `supabase/cli` Discussion #23239 have moved to Hono on Cloudflare Workers for exactly this reason. Keep Edge Functions narrow: webhook receivers, cron-triggered ingestion, Slack notifications. The big extraction pipeline runs as a Vercel Cron + Server Action chain inside the Next.js app where the monorepo seam doesn't exist.

**Edge Function invocation from Server Actions:** use the cookie-bound server client created with `@supabase/ssr` so the user JWT auto-forwards. Per Supabase docs, _"it's safe to trust `getUser()` because it sends a request to the Supabase Auth server every time to revalidate the Auth token."_ Distinguish `FunctionsHttpError` (4xx/5xx from the function — body is on `error.context`), `FunctionsRelayError` (network/relay; retry candidate), and `FunctionsFetchError` (unreachable; retry candidate). `supabase.functions.invoke()` has **no built-in retries**; wrap with `fetch-retry` (`retryOn: [408, 425, 429, 500, 502, 503, 504]`) and pass the custom fetch to `createClient`. Use `EdgeRuntime.waitUntil(promise)` for fire-and-forget work; propagate `x-request-id` for distributed tracing; ship Sentry via `npm:@sentry/deno`.

### 13. PostGIS conventions

- **SRID 4326 everywhere.** Geometry, not geography, unless you're computing distances on a globe scale (you're not — DRC/Uganda fits in a UTM zone or two). `geography` is slower and has fewer operators.
- **Vector tiles via `ST_AsMVT` RPC, not pg_tileserv.** A `mvt(z int, x int, y int)` Postgres function returning `bytea`, exposed through a Next.js Route Handler that sets `Content-Type: application/x-protobuf` and `Cache-Control: public, max-age=86400, s-maxage=604800, immutable`. This keeps the auth model unified (RLS applies), avoids running a second server (pg_tileserv), and lets you compose multi-layer tiles with `string_agg(ST_AsMVT(...) || ...)`. Martin is the fastest pg-backed tile server in independent benchmarks but it's a separate service; pg_tileserv is great but redundant with PostgREST when you can just `rpc('mvt', {z, x, y})`. Tegola is fine but Go-deploy overhead.
- **Health zone polygons stored in a `geo` schema**, materialized view for simplified-by-zoom geometries (`zone_geom_z6`, `zone_geom_z10`), refreshed nightly.

### 14. pgvector: HNSW, not IVFFlat

In 2026 the default is unambiguous: **HNSW**. The pgvector README itself states _"an HNSW index creates a multilayer graph. It has better query performance than IVFFlat (in terms of speed-recall tradeoff)"_ and the production-blog consensus (BigData Boutique, DEV Community, Alex Jacobs) is that HNSW absorbs inserts without quality loss while IVFFlat needs periodic full rebuilds as your distribution shifts. Use cosine distance for normalized OpenAI/Voyage embeddings, L2 for Anthropic's (when they ship a first-party embedding API) — confirm per model. Start with `m=16, ef_construction=64`; raise `ef_search` at query time for higher recall. For hybrid search on source quotes, combine `tsvector` full-text rank with HNSW similarity via Reciprocal Rank Fusion in a SQL function — no Python needed.

## Details

### Recommended directory tree

```
ituri-sitrep/
├── .changeset/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      # lint, typecheck, test, build (matrix: node 22)
│   │   ├── e2e.yml                     # Playwright against preview URL
│   │   ├── db-test.yml                 # supabase start + pgTAP
│   │   ├── llm-eval.yml                # promptfoo against gold set, nightly
│   │   └── release.yml                 # changesets publish
│   ├── CODEOWNERS
│   └── dependabot.yml -> renovate.json
├── .vscode/
│   ├── settings.json                   # deno.enablePaths scoped to supabase/functions
│   └── extensions.json                 # biome, denoland, vitest, playwright
├── .devcontainer/
│   └── devcontainer.json               # supabase CLI, node 22, deno 2
├── .editorconfig
├── .nvmrc                              # 22
├── apps/
│   └── web/                            # Next.js 15 app
│       ├── app/
│       │   ├── (public)/               # route group
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx            # landing
│       │   │   └── methods/page.tsx
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx
│       │   │   ├── map/page.tsx        # MapLibre + deck.gl
│       │   │   ├── zones/[zone]/page.tsx
│       │   │   └── @sidebar/           # parallel route for filters
│       │   ├── api/
│       │   │   ├── mvt/[z]/[x]/[y]/route.ts
│       │   │   ├── ingest/route.ts     # signed webhook from cron
│       │   │   └── og/[slug]/route.ts  # @vercel/og social cards
│       │   ├── layout.tsx
│       │   ├── opengraph-image.tsx
│       │   ├── robots.ts
│       │   ├── sitemap.ts
│       │   └── manifest.ts
│       ├── components/                 # app-specific UI only
│       ├── lib/
│       │   ├── supabase/{client,server,middleware}.ts
│       │   ├── safe-action.ts          # next-safe-action client
│       │   └── env.ts                  # zod-validated process.env via t3-env
│       ├── middleware.ts               # CSP nonce + Supabase session refresh
│       ├── instrumentation.ts          # Sentry + OTel registration
│       ├── biome.json                  # extends ../../biome.json
│       ├── next.config.ts
│       └── package.json
├── packages/
│   ├── ui/                             # shadcn-style component library, Tailwind, dark mode
│   ├── db/                             # drizzle schema + generated supabase types
│   │   ├── src/
│   │   │   ├── schema/                 # drizzle table defs mirroring SQL
│   │   │   ├── types.gen.ts            # supabase gen types output (committed)
│   │   │   └── client.ts
│   │   └── package.json
│   ├── shared/                         # runtime-agnostic; consumed by Deno via copy
│   │   ├── src/
│   │   │   ├── schemas/                # zod 4 objects
│   │   │   ├── ids.ts                  # branded id types
│   │   │   └── provenance.ts           # source_quote_id helpers
│   │   └── package.json
│   ├── extract/                        # LLM extraction pipeline
│   │   ├── src/
│   │   │   ├── prompts/                # .prompt.md files
│   │   │   ├── anthropic.ts            # client w/ prompt caching wrapper
│   │   │   ├── tools/                  # zod -> json-schema -> Anthropic tool defs
│   │   │   └── runner.ts
│   │   └── package.json
│   ├── ingest/                         # source-specific fetchers (WHO, AFRO, ReliefWeb, ACLED, HDX, Pathoplexus)
│   │   ├── src/sources/{who-dons,afro-sitrep,ecdc-tab,reliefweb,acled,hdx,pathoplexus}.ts
│   │   └── package.json
│   ├── geo/                            # PostGIS helpers, MVT, projection utils
│   ├── observability/                  # pino logger, Sentry init, Langfuse wrapper
│   ├── config-biome/                   # shared biome.json base
│   ├── config-ts/                      # shared tsconfig bases
│   └── config-tailwind/
├── services/
│   └── extraction-worker/              # optional: standalone Node worker if Vercel cron is insufficient
├── supabase/
│   ├── config.toml
│   ├── seed.sql                        # deterministic fixtures for branches & local
│   ├── migrations/                     # raw SQL, validated by pglast in CI
│   ├── tests/                          # pgTAP files
│   └── functions/
│       ├── deno.json                   # single root deno.json (community pattern)
│       ├── _shared/
│       │   ├── cors.ts
│       │   ├── supabase-admin.ts
│       │   └── generated/              # gitignored; populated by pnpm db:sync
│       ├── on-source-update/index.ts   # webhook → extract enqueue
│       ├── nightly-refresh/index.ts    # cron
│       └── slack-alert/index.ts
├── tooling/
│   ├── scripts/
│   │   ├── sync-shared-to-deno.ts      # copies packages/shared → supabase/functions/_shared/generated
│   │   ├── gen-db-types.ts             # supabase gen types typescript
│   │   └── pglast-validate.ts          # parses every migration file
│   └── seed-data/                      # CSVs from HDX, ACLED snapshots for local
├── docs/
│   ├── adr/                            # MADR format, see §ADRs
│   ├── architecture.md
│   ├── data-sources.md
│   ├── runbook.md
│   └── prompt-versioning.md
├── biome.json                          # root config
├── lefthook.yml
├── turbo.json
├── tsconfig.base.json                  # @tsconfig/strictest + moduleResolution: bundler
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### Locked-in library picks (versions accurate to May 2026)

| Concern               | Pick                                                            | One-line justification                                                                                                                                           |
| --------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime               | Node 22.x, Deno 2.x                                             | Node 22 is the active LTS; Deno 2 is what Supabase Edge runs.                                                                                                    |
| Package manager       | pnpm 10.x                                                       | Strict, fast, workspace-native; Vercel and Supabase both first-class.                                                                                            |
| Monorepo orchestrator | Turborepo 2.x                                                   | Vercel-aligned, free remote cache, 20-line config.                                                                                                               |
| Framework             | Next.js 15.5+                                                   | App Router only; Server Actions + Route Handlers; React Compiler via SWC.                                                                                        |
| React                 | 19.2                                                            | Stable; Server Components, useOptimistic, useActionState production-ready.                                                                                       |
| Lint+format           | Biome 2.3+                                                      | Type-aware lint without `tsc`; 491 rules; single config; production-proven at AWS, Google, Microsoft, Cloudflare, Vercel, Discord, Slack, Node.js, Astro, et al. |
| React Hooks lint      | eslint-plugin-react-hooks (recommended preset)                  | Only ESLint plugin needed; ships React Compiler rules per the React team.                                                                                        |
| Validation            | zod 4                                                           | Best ecosystem; JIT-compiled in v4; `z.brand` for IDs.                                                                                                           |
| DB query              | drizzle-orm latest                                              | Type-safe queries over Supabase; PostGIS + pgvector native.                                                                                                      |
| DB migrations         | Raw SQL via supabase CLI + pglast validator                     | Source of truth; PostGIS-friendly; reviewable diffs.                                                                                                             |
| Auth + DB client      | @supabase/ssr + @supabase/supabase-js v2.10+                    | Cookie-based SSR; new publishable/secret keys.                                                                                                                   |
| Server actions        | next-safe-action v9+                                            | Standard Schema v1 (zod/valibot/arktype), middleware, typed hooks.                                                                                               |
| Forms                 | react-hook-form + @hookform/resolvers/zod                       | Battle-tested; useActionState alone for simple cases.                                                                                                            |
| Map                   | maplibre-gl 5.x + deck.gl 9.x                                   | Open-source; tiled layers + WebGL overlays.                                                                                                                      |
| LLM SDK               | @anthropic-ai/sdk latest                                        | Native prompt caching; strict structured outputs since 2025-11.                                                                                                  |
| Unit test             | vitest 3.x                                                      | Standard; jest is legacy.                                                                                                                                        |
| Browser test          | playwright 1.5x                                                 | Cross-browser; native sharding; State of JS 2025 satisfaction 91% vs Cypress 72%.                                                                                |
| DB test               | pgTAP via `supabase test db` + Basejump's supabase-test-helpers | Only credible way to test RLS.                                                                                                                                   |
| LLM eval              | promptfoo + langfuse                                            | CI evals + production traces; both free/OSS.                                                                                                                     |
| Tracing               | @sentry/nextjs (OTel-native)                                    | One SDK for errors, perf, source maps; OTel-compatible.                                                                                                          |
| Logs                  | pino + @axiomhq/js                                              | JSON logs to Axiom; cheap; queryable.                                                                                                                            |
| Rate limit/bot        | @arcjet/next (or @upstash/ratelimit)                            | Shield + bot + rate-limit; integrates with next-safe-action middleware.                                                                                          |
| Feature flags         | Vercel Edge Config + Vercel Flags SDK                           | Free, low-latency, no extra vendor.                                                                                                                              |
| Hooks                 | lefthook                                                        | Go binary, one YAML, replaces Husky + lint-staged.                                                                                                               |
| Dep updates           | Renovate (Mend)                                                 | Monorepo-aware; groupings; schedule.                                                                                                                             |
| Releases              | @changesets/cli                                                 | Monorepo-first; explicit changelog; no clever guesses.                                                                                                           |
| Dead-code             | knip                                                            | Auto-detects Next.js, Vitest, Turborepo; replaces ts-prune.                                                                                                      |
| Env validation        | @t3-oss/env-nextjs                                              | zod-validated server/client env at build time.                                                                                                                   |
| Docs                  | astro + starlight (in /docs)                                    | Optional later; for now Markdown ADRs are enough.                                                                                                                |

### TypeScript config

Root `tsconfig.base.json` extends `@tsconfig/strictest` plus:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "skipLibCheck": true,
    "incremental": true
  }
}
```

`moduleResolution: "bundler"` is correct for Next.js 15 (which is the bundler) and pnpm workspaces — `nodenext` causes more friction than it solves in apps. Project references (`"references": [{ "path": "../db" }]`) only where build times demand it; for ~10 packages, just rely on Turborepo's task graph + per-package `tsc --noEmit` in CI.

### ADRs to ship in v1 (MADR format)

Use **MADR 4.0** (Markdown Architectural Decision Records) — Nygard's original 5-section format is too thin for cross-cutting decisions; MADR's "considered options, decision drivers, consequences" structure forces honest tradeoff capture. File names: `docs/adr/0001-monorepo-tool.md` etc.

1. **0001 — Use pnpm workspaces + Turborepo (not Nx).**
2. **0002 — App Router-only; no Pages Router, no tRPC.**
3. **0003 — Raw SQL migrations as the schema source of truth; Drizzle for queries only.**
4. **0004 — RLS as defense-in-depth; application-layer authz in Server Actions.**
5. **0005 — Provenance is a first-class schema concern: `source_quote_id` is NOT NULL on every figures table.**
6. **0006 — Anthropic Claude as the only LLM; explicit `cache_control` breakpoints; strict structured outputs.**
7. **0007 — Vector tiles via PostGIS `ST_AsMVT` RPC, not a separate tile server.**
8. **0008 — Biome 2 for lint+format; eslint-plugin-react-hooks the only retained ESLint plugin.**
9. **0009 — Sentry (OTel-native) + Axiom + Langfuse as the three observability planes.**
10. **0010 — Supabase Branching is the staging environment; no separate "staging" project.**
11. **0011 — Deno/Node code sharing via copy-on-build, not workspace symlinks or JSR.**
12. **0012 — No PHI, no line-list data; every public figure has a verifiable public source.**

### Anti-patterns to refuse (with one-line reasons)

- **`getServerSideProps`, `getStaticProps`, Pages Router** — App Router has been default since Next.js 13.4; using Pages in a 2026 greenfield is a tell.
- **Calling `supabase.from(...).select(...)` in a Client Component for anything authoritative** — exposes anon key, bypasses Server-Component caching, leaks RLS semantics.
- **`useEffect(() => { fetch(...) }, [])` for initial data** — that's an `async` Server Component now.
- **`@supabase/auth-helpers-nextjs`** — deprecated; use `@supabase/ssr`.
- **Service-role / secret key in client code, in NEXT*PUBLIC*, or anywhere a build artifact ships** — instant fail in code review.
- **`SELECT *` from RLS-protected tables in Server Components without re-applying the filter** — per Supabase's RLS performance doc, _"explicit filters [in addition to RLS] allow PostgreSQL to use indexes more effectively"_; RLS alone is a worse query plan.
- **`auth.uid() = user_id` policies without `(select auth.uid())`** — kills performance; the wrapping is per Supabase's own benchmarks.
- **RLS policies with `FOR ALL`** — Supabase's AI prompt says _"Don't use `FOR ALL`. Instead separate into 4 separate policies for select, insert, update, and delete"_; auditability and performance both improve.
- **Class instances passed across the Server/Client boundary** — only plain-serializable values (FormData, primitives, arrays, plain objects) survive the RSC payload.
- **`Date` from Postgres returned as a string and used `new Date(s)` in 8 places** — pick `mode: 'date'` once in Drizzle and stop.
- **Passing the anon/publishable key to a Server Component** — Server Components should use the cookie-bound server client; the browser client is for Client Components.
- **Mixing `auth-helpers` and `ssr` in the same app** — per Supabase's own troubleshooting docs, _"don't use both auth-helpers-nextjs and @supabase/ssr packages in the same application to avoid running into authentication issues."_
- **Embedding the same migration timestamp on two branches without renaming** — breaks `supabase db push`; Supabase docs explicitly call this out.
- **Putting `SECURITY DEFINER` functions in `public` if `public` is in your exposed schemas** — they become callable from PostgREST and bypass RLS by design. Per Supabase docs: _"Security-definer functions should never be created in a schema in the 'Exposed schemas' inside your API settings."_
- **CSP without nonces or with `unsafe-inline`** — Next.js 15 inline hydration scripts will break under strict CSP without a nonce; configure middleware to inject one and use `strict-dynamic`.
- **`set -e`-style "just retry" loops around Anthropic calls** — `FunctionsHttpError` ≠ `FunctionsRelayError` ≠ `FunctionsFetchError`; only retry transient classes; never retry non-idempotent extraction without an idempotency key.

### The 15 things a Linear/Vercel/Plaid staff reviewer will flag in a typical Next.js + Supabase repo

1. **Anon/publishable key passed to a Server Component** that should use the cookie-bound server client.
2. **No `(select …)` wrapping** around `auth.uid()` in RLS — kills perf at scale.
3. **No indexes on RLS columns** — the single biggest performance regression vector.
4. **Server Actions without authZ checks**, only authN — IDOR waiting to happen. Per Next.js's own data-security guide: _"Beyond authentication (is the user logged in?), remember to check authorization (does this user have permission to act on this specific resource?). This prevents Insecure Direct Object Reference (IDOR) vulnerabilities."_
5. **TypeScript types treated as runtime guarantees** — every Server Action input must hit a zod schema; types are erased.
6. **Generated DB types not committed** — drift between branches; reviews can't see schema changes.
7. **No `revalidatePath`/`revalidateTag` after mutations** — UI shows stale cached data and you blame React.
8. **`unstable_cache` without a stable key derivation** — cache poisoning between users.
9. **Client Components for sensitive reads** — leaks data shape through the network panel and bypasses RLS-aware caching.
10. **No `EXPLAIN ANALYZE` traces checked in for hot policies** — reviewer asks "did you test this with 100k rows?" and the answer is no.
11. **`createClient()` called inside a loop / per-request without memoization** — connection pool exhaustion under load.
12. **Webhook handlers without signature verification** — Supabase Storage and database webhooks both sign payloads; verify them.
13. **`process.env.X!` non-null assertions everywhere** instead of validated env via `@t3-oss/env-nextjs`.
14. **No source maps uploaded to Sentry** — production stack traces are useless.
15. **One giant `migrations/00000000_init.sql`** instead of small reviewable diffs.

### The "first-PR green checklist"

A senior reviewer expects all of these to be green on PR #1:

- `pnpm install` → lockfile committed, no postinstall warnings, no `peerDependencies` red.
- `pnpm typecheck` → zero errors across all packages.
- `pnpm lint` (biome check) → zero warnings; `biome ci` in GitHub Actions.
- `pnpm test` → vitest passes; coverage report uploaded as artifact.
- `pnpm test:db` → pgTAP green against the local Supabase stack.
- `pnpm test:rls` → RLS policies pass for each role (anon, authenticated, service); enforced by Basejump helpers.
- `pnpm build` → Next.js production build, bundle analyzer artifact, Speed Insights baseline captured.
- `pnpm knip` → zero unused exports, files, dependencies.
- `pnpm e2e` → Playwright against the Vercel preview URL passes a smoke set (load map, click zone, hover figure, see source quote).
- `pnpm eval:llm` → Promptfoo against the gold set; pass threshold per metric defined in `promptfoo.config.yaml`.
- Supabase Branching preview is green: migrations applied, seed loaded, no advisor warnings on the Performance/Security advisors.
- `pglast` validates every migration file.
- Renovate config present; Dependabot disabled.
- `lefthook.yml` runs `biome check --staged` and `gitleaks protect` pre-commit, `typecheck` + `knip` pre-push.
- One MADR ADR per non-trivial choice; every PR that changes architecture updates or adds an ADR.
- README has a one-paragraph TL;DR, a quickstart, a data-sources table, and a link to `docs/architecture.md`.
- `.env.example` lists every variable with a comment; `@t3-oss/env-nextjs` validates them at startup.

## Recommendations

**Immediate (this weekend):**

1. Initialize from `npx create-next-app@latest -e with-supabase`, then promote to a pnpm workspace by moving the generated app into `apps/web/` and creating `pnpm-workspace.yaml`. Add Turborepo with `npx turbo init`.
2. Drop Biome 2 in at the root; delete ESLint _except_ for `eslint-plugin-react-hooks@latest` (enable its `recommended` preset for the React Compiler rules).
3. Wire `@supabase/ssr` with the new publishable/secret keys, exactly per the official Next.js quickstart. Delete any `auth-helpers` reference.
4. Write ADRs 0001–0005 _before_ writing application code. Force yourself to articulate decisions.
5. Set up Lefthook + Conventional Commits + Changesets in the same PR.

**Week 1:**

6. Migrate your existing SQL into `supabase/migrations/`. Add `pglast`-based validation to `tooling/scripts/pglast-validate.ts` and to CI.
7. Add Drizzle as the typed query layer; commit `packages/db/src/types.gen.ts` (from `supabase gen types typescript`) and the Drizzle schema mirror; check both in CI.
8. Stand up the `packages/shared/` zod schemas with branded IDs (`SourceQuoteId`, `ZoneCode`, `ExtractionRunId`); write the `tooling/scripts/sync-shared-to-deno.ts` copy step.
9. Wire Sentry (OTel-mode) + pino + Axiom Log Drain. Source-maps to Sentry on every deploy via the Next.js Sentry plugin.
10. Turn on Supabase Branching against your GitHub repo; verify preview branches get migrations + seed.

**Weeks 2–3:**

11. Build the extraction pipeline: prompt files, zod tool schemas, prompt-cache wrapper, `extraction_runs` table, Langfuse integration.
12. Add Promptfoo gold-set evals (~30 hand-curated WHO DON snippets with known correct extractions); run in CI weekly.
13. Wire next-safe-action with auth + rate-limit (Arcjet) middleware; one client, used everywhere.
14. Ship the MVT route handler; benchmark `ST_AsMVT` query times with `EXPLAIN ANALYZE`; add HNSW index on `source_quotes.embedding`.
15. Set strict CSP with nonce + strict-dynamic in middleware; verify with the Mozilla Observatory.

**Benchmarks that change the plan:**

- If extraction spend > $50/month with prompt caching enabled, move to batch API (50% discount) or downshift to Haiku for the easy fields.
- If RLS query plans show seq-scan on policy columns, you missed indexes — go fix before more features.
- If Edge Function code-sharing pain exceeds two hours/week, move that function to a Next.js Route Handler or Cron and shrink Supabase Edge Functions to webhooks only.
- If Turborepo cache hit-rate < 70% on CI, your task `inputs` are wrong — tune before adding more packages.
- If the map TTI is > 2.5 s on 3G Fast emulation, cook tiles offline and serve as static `bytea` from object storage; don't keep paying for dynamic `ST_AsMVT` calls.

## Caveats

- **"Pure Supabase, App-Router-only" has known friction** with serious LLM workloads: Edge Functions (Deno) and the rest of your code (Node, pnpm) don't share types cleanly — there's an open Supabase CLI issue (#3047) tracking Deno-workspace support, and the maintainer comment in Discussion #30291 confirms it's not solved. The mitigation above (copy-on-build) works; if it stops working as the project grows, move the heavy lifting into a Next.js Route Handler or a small Hono service on Cloudflare Workers — the same `packages/shared` zod schemas port directly. This is a known escape valve and the architecture above is designed for that move.
- **Supabase Branching is a Pro-plan feature** (≈$25/mo). For a solo open-source project, that is the single best ROI line item in the budget — but if you stay on Free, fall back to a `staging` Supabase project + a `dev` project, both managed via the CLI from the same `migrations/` directory. The migration story is identical; you lose only the PR-level isolation.
- **React Compiler is stable but not magic.** Per Steve Kinney's guide, _"the compiler assumes the Rules of React. Components must be pure/idempotent, props/state treated as immutable, and side effects kept out of render. If your code violates these, the compiler either skips optimizing or you can see runtime weirdness."_ Enable, then run the `react-compiler-healthcheck` tool and fix any flagged components before shipping.
- **CSP with nonces forces dynamic rendering.** Per Next.js docs, _"Static optimization and Incremental Static Regeneration (ISR) are disabled"_ when you use nonces, and _"Partial Prerendering (PPR) is incompatible with nonce-based CSP since static shell scripts won't have access to the nonce."_ For a data-heavy dashboard this is fine (everything is dynamic anyway); for marketing pages, render those without a nonce (and without inline scripts) so they can be statically optimized.
- **`pgvector` HNSW expects the graph in RAM.** On Supabase's smallest tier, this is your limit for embeddings — count rows × dimensions × 4 bytes and pick your tier accordingly. Going to disk-backed HNSW (pgvector 0.8+) helps but is still slower than in-memory.
- **The 2026 LLM tooling landscape changes monthly.** Promptfoo/Langfuse/Braintrust capabilities shift fast; reassess every quarter. The architecture above puts the LLM behind a small interface so swapping the observability backend is a one-file change.
- **Anthropic prompt-caching minimum-token thresholds vary by model.** Per Spring AI's analysis of Anthropic's docs, _"Claude 3.7 Sonnet requires at least 1,024 tokens per cache checkpoint, while Claude Opus 4.5, Claude Opus 4.6, Claude Haiku 4.5, and Claude Sonnet 4.5 require at least 4,096 tokens per cache checkpoint."_ Short prompts won't cache regardless of `cache_control`. Build your prompts to always include the source document inline; never split a document across requests.
- **Honest open question — does pgvector scale to the size of all WHO/AFRO/ECDC archival text you'll eventually index?** Probably yes for this project (low five figures of quotes). If it grows past a few million vectors, a dedicated vector DB (Qdrant, Turbopuffer) becomes a serious option — but defer that decision until you measure recall and p95 latency degrading on real queries.
- **No PHI, no line-list data** is a project rule, not just a policy choice — make it a CI check: a regex scan over every ingested document for PHI tells (e.g., "Patient X", "DOB:", phone-number formats), failing the build if any match in a non-archival code path. This is cheaper than a privacy review later.
