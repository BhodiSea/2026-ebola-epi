# ituri-sitrep — Claude Code rules

@AGENTS.md
@.claude/references/anti-patterns.md

## Claude-specific notes (deltas on top of AGENTS.md)

The full mission, hard rules, stack, and conventions live in `AGENTS.md` —
imported above and authoritative. This file adds only Claude-specific guidance.

## Models & effort

- Pinned alias: `opusplan` (Opus 4.7 in plan mode, Sonnet 4.6 for execution).
- Effort: `xhigh` for plan mode — see `.claude/settings.json`.
- Switch with `/model sonnet` or `/model opus` only when you have a reason.

## Workflow

1. `/spec <slug>` — author or read `.claude/specs/<slug>.md`. Plan mode only.
2. `/plan <slug>` — author `.claude/plans/<slug>.md` from the spec.
3. `/tdd <slug>` — delegates to `@test-writer` sub-agent; isolates context.
4. `/migration <slug>` — scaffold a raw SQL migration; runs `pglast-migration-validator`.
5. `/rls <table>` — generate four-policy RLS; delegates to `@rls-auditor`.
6. `/extract <slug>` — scaffold zod + tool + prompt + runner + gold set.
7. `/ship` — sequential preflight gate; refuses on first failure.

## Sub-agents (separate context windows)

- `@reviewer` — strict diff review against hard rules. Use after any code change
  touching `app/**`, `lib/**`, future `packages/**` or `supabase/**`.
- `@rls-auditor` — Postgres specialist; pgTAP + EXPLAIN ANALYZE on policy changes.
- `@extraction-engineer` — verifies prompt caching, provenance, tool-schema chain.
- `@test-writer` — TDD-first; writes the failing test in isolation.
- `@security-auditor` — secrets, authn/authz, Server→Client leaks, supply chain.
  Use after auth, server-action, route-handler, env, or dependency changes.
- `@perf-auditor` — RSC/Client split, bundles, DB plans, prompt-cache ratio.
  Use after rendering-boundary, query, or LLM-call changes.

## MCP servers

- Project-scoped config at `.mcp.json` (committed). Today: Supabase MCP server
  in `--read-only` mode, parameterised by `${SUPABASE_PROJECT_REF}` and
  `${SUPABASE_ACCESS_TOKEN}`. Populate both in your shell (or `.env.local`,
  which is gitignored) before starting Claude Code; until then the server
  fails to start and Claude continues without it.

## Skills (progressive disclosure)

- `pglast-migration-validator` — validate `supabase/migrations/**.sql` files.
- `source-quote-extractor` — extract `(char_start, char_end, text, sha256)`
  quotes from sitrep PDFs with offset verification.

## Hooks (deterministic enforcement — see `.claude/hooks/`)

PreToolUse on Write/Edit/MultiEdit:

- `tdd-guard.sh` — blocks source edits without a test file touched recently.
- `no-phi.sh` — blocks writes containing PHI tells (Patient X, DOB, SSN, MRN).
- `no-service-role.sh` — blocks `SUPABASE_SERVICE_ROLE_KEY` in client paths.

PostToolUse on Write/Edit/MultiEdit:

- `biome-check.sh` — runs Biome + related Vitest on edited TS; pglast on SQL.

Stop:

- `ship-gate.sh` — refuses session end while quality gates are red.

UserPromptSubmit:

- `prompt-submit.sh` — nudges `/spec` when a feature request lacks a spec.

When a hook blocks you, **read the stderr message before retrying**. If you
think the rule is wrong, raise it in the conversation — do not paper over it
with a trivial test edit unless you genuinely have new behavior to test.

## Prompt caching

When you write or modify any Anthropic call in this repo:

- Order is always `tools → system → messages`.
- Set `cache_control: { type: 'ephemeral' }` on the **last** static block
  (typically the last few-shot example), not on the user message.
- Bump `prompt_version_hash` whenever the system prompt, few-shot block, or
  tool schema changes. The hash is computed from
  `sha256(system + few_shot + JSON.stringify(tool))`.
- See `.claude/references/prompt-caching.md` for details and invalidators.

## Plan mode discipline

- Write plans into `.claude/plans/<slug>.md`. Do not put implementation
  decisions only in chat.
- Never start coding before the plan exists and has been reviewed.
- Use sub-agents for noisy exploration so the main thread stays clean.

## Per-area navigation (current single-app layout)

- Next.js app & routes: `app/CLAUDE.md`
- Shared client utilities & Supabase clients: `lib/`
- Forthcoming monorepo packages: see `.claude/references/architecture.md`

## Style

- Be terse. State results and decisions. Do not narrate deliberation.
- File references as clickable markdown links: `[file.ts:42](app/file.ts#L42)`.
- Do not summarize the diff at the end of a turn; the user can read it.
- Do not add comments that restate code. Comments belong on non-obvious WHY.

## When in doubt

Drop into plan mode and ask. The cost of a 30-second clarification is far
less than the cost of a wrong-direction implementation.
