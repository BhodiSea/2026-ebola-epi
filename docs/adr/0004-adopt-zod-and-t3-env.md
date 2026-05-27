# ADR-0004: Adopt zod and @t3-oss/env-nextjs for runtime + env validation

- **Status:** Proposed
- **Date:** 2026-05-27
- **Deciders:** @BhodiSea
- **Consulted:** `.claude/references/anti-patterns.md`, `AGENTS.md` (tech stack
  table: zod 4), `biome.json` (`style/noNonNullAssertion`)
- **Tags:** validation, env, top-level-dep
- **Discovered during:** Pass B execution. The Supabase template uses
  `process.env.NEXT_PUBLIC_SUPABASE_URL!` non-null assertions at 6 sites
  across `lib/supabase/{client,proxy,server}.ts`. Biome's
  `style/noNonNullAssertion` rule flags them, matching the AGENTS.md
  anti-pattern ban. To unblock Pass B without scope creep, the rule was
  downgraded to `warn`. This ADR is the formal follow-up to land the
  proper fix and flip the rule back to `error`.

## Context and Problem Statement

`AGENTS.md` rule 10 bans `any`, non-boolean `!!`, and `@ts-ignore`.
The same rule list (and `.claude/references/anti-patterns.md` under
"Process") flags `process.env.X!` non-null assertions: they silently
crash at runtime when an env var is missing, which is precisely the
failure mode Sentry will see in production at 3am.

`AGENTS.md`'s tech-stack table declares **zod 4** as the schema layer.
zod is not yet installed but will be required pervasively: every
Anthropic tool input schema (derived via `zodToJsonSchema`), every
Server Action input boundary (via `next-safe-action`), every parse at
a system boundary, and the branded ID types (`SitrepId`,
`SourceQuoteId`, etc.) described in CLAUDE.md.

`@t3-oss/env-nextjs` is a tiny wrapper over zod that splits server vs
client env, validates at module load, and gives the rest of the codebase
typed reads (`env.NEXT_PUBLIC_SUPABASE_URL` — string, never null).

Both are top-level deps → ADR per rule 11.

## Decision Drivers

- Replace 6 `process.env.X!` callsites with typed reads from a validated
  env object, so a missing env var fails at startup with a useful error,
  not at request time with a `TypeError: Cannot read URL of undefined`.
- Establish zod as the schema primitive now, so every downstream PR
  (extraction schemas, RLS helpers, Server Action inputs) can cite this
  ADR rather than re-debating.
- Keep the diff small and reversible: one new `lib/env.ts`, ~30 lines.
- Flip `biome.json` `noNonNullAssertion` back to `error` so the rule
  catches future drift.

## Considered Options

1. **zod + @t3-oss/env-nextjs** (chosen). Server/client env split,
   typed reads, validated at import.
2. **zod alone, hand-rolled env helper.** Slightly less ceremony, but
   we reimplement what t3-env already does well (build-time vs
   runtime split, `NEXT_PUBLIC_*` enforcement, edge-runtime aware).
3. **valibot** instead of zod. Smaller bundle, faster. But the rest of
   the stack (Anthropic tool schemas via `zod-to-json-schema`,
   `next-safe-action`, Drizzle-zod integration) is zod-centric.
   Switching costs more than it saves here.
4. **No env validation, keep `!` assertions.** Status quo + downgraded
   Biome rule. Cheapest, but leaves rule 10 unenforced and ships the
   3am-crash failure mode to production.

## Decision Outcome

**Chosen: Option 1 — zod + @t3-oss/env-nextjs.**

Concrete changes:

1. **Install** — `npm install zod @t3-oss/env-nextjs`. zod ships as a
   runtime dep (not devDep) because it's imported from app code.
2. **Add `lib/env.ts`** at root:
   ```ts
   import { createEnv } from '@t3-oss/env-nextjs';
   import { z } from 'zod';

   export const env = createEnv({
     server: {
       SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
     },
     client: {
       NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
     },
     runtimeEnv: {
       SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
       NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
     },
     skipValidation: !!process.env.SKIP_ENV_VALIDATION,
   });
   ```
   The `SUPABASE_SERVICE_ROLE_KEY` is server-side and optional today
   (not yet used). It will become required when the first server-only
   module that needs admin access lands; that PR moves it from
   `optional()` to `min(1)`.
3. **Swap callsites** in `lib/supabase/{client,proxy,server}.ts`:
   `process.env.NEXT_PUBLIC_SUPABASE_URL!` → `env.NEXT_PUBLIC_SUPABASE_URL`
   (drop the `!`, drop the `process.env.` prefix, add `import { env }
   from '@/lib/env'`).
4. **Drop the `hasEnvVars` helper** in `lib/utils.ts` — t3-env's
   validation makes it redundant (a missing var would now fail at
   startup, not silently). The `if (!hasEnvVars) return supabaseResponse`
   guard in `lib/supabase/proxy.ts` either deletes (if t3-env validation
   runs first) or stays as a deliberate "skip until provisioned"
   gate (in which case it consults the env object).
5. **Flip Biome rule back** — `biome.json`:
   `style.noNonNullAssertion: warn` → `error`.
6. **Add a smoke test** — `lib/env.test.ts` that imports `env` with
   `SKIP_ENV_VALIDATION=1` and asserts the keys exist.
7. **Update `lib/utils.ts`'s `hasEnvVars`** export removal triggers
   knock-on edits in any consumer (probably the home page tutorial).
   Land those in the same commit.

## Consequences

**Positive:**
- Rule 10 of `AGENTS.md` becomes hook-enforced again.
- Startup-time validation replaces request-time `TypeError`.
- zod is in place for every subsequent ADR (Anthropic tools,
  next-safe-action boundaries, etc.).

**Negative:**
- Two new top-level deps.
- A small refactor of the Supabase clients.
- Knock-on edit if `hasEnvVars` is consumed by tutorial pages.

**Neutral:**
- `@t3-oss/env-nextjs` is a thin wrapper; if it ever feels heavy,
  superseding it with a hand-rolled equivalent is ~20 lines.

## Validation

```bash
npm run lint        # 0 errors, 0 noNonNullAssertion warnings
npm run typecheck   # clean
npm test            # includes lib/env.test.ts smoke test
npm run build       # succeeds
```

Plus a deliberate negative test: temporarily unset
`NEXT_PUBLIC_SUPABASE_URL` and run `npm run dev` — should fail at
startup with a t3-env validation error, not at first request with a
runtime crash.

## Out of scope for this ADR

- Branded ID types (`SitrepId`, `SourceQuoteId`, etc.). They use zod
  but land with the first migration/schema PR.
- Server Action validation via `next-safe-action`. Separate ADR
  when the first Server Action lands.
- zod schema-derived Anthropic tool schemas. Lands with the first
  extraction PR.
