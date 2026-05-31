# apps/web/lib — shared utilities

Server-only by default. Never import from a Client Component without a `'use client'` boundary.

## Key modules

| Path | Purpose |
|---|---|
| `supabase/` | `createBrowserClient` / `createServerClient` wrappers (`@supabase/ssr`). Use `server.ts` in RSCs and Server Actions; `client.ts` only when browser interactivity requires a live subscription. |
| `queries/` | Typed Drizzle query helpers — always go through these, never raw `.from()` in components. |
| `actions/` | `next-safe-action` server actions. All mutations live here. |
| `provenance/` | Source-quote offset resolution and quote-card data assembly. Every figure rendered in the UI traces back to a function in this directory. |
| `map/` | Map data helpers — MVT URL builders, deck.gl layer factories, geoBoundaries utilities. |
| `env.ts` | `@t3-oss/env-nextjs` schema — the only place env vars are accessed. Never use `process.env.X` directly outside this file. |
| `arcjet.ts` | Arcjet bot/attack protection instance. Import and call `aj.protect()` in route handlers that gate sensitive data. |
| `db.ts` | Drizzle client initialised against `POSTGRES_URL_NON_POOLING`. Query-only — no DDL. |
| `kill-switch.ts` | Edge Config kill-switch reader (ADR-0016). Reads the `EDGE_CONFIG` env var. |

## Rules

- No `SUPABASE_SERVICE_ROLE_KEY` anywhere in this directory — the `no-service-role.sh` hook will block it.
- `env.ts` is the canonical env contract. Adding a new env var requires updating both `env.ts` and `.env.example`.
- Query helpers in `queries/` must have corresponding Vitest tests in `__tests__/`.
