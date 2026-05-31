# Phase 7 exit gate — WAF / Arcjet protection

**Gate:** Arcjet bot and attack protection is active in production, and the `/evidence/[quote-id]` route is gated by the Arcjet middleware.

**Roadmap reference:** G3 in [docs/ROADMAP.md](../../ROADMAP.md#g3----confirm-waf--arcjet--vercel-botid).

## How to record evidence

1. Confirm `ARCJET_KEY` is set for the `production` environment:

```bash
vercel env ls production | grep ARCJET_KEY
```

2. Confirm the `/evidence/[quote-id]` route is gated via `apps/web/lib/arcjet.ts`. Look for an `aj.protect()` call in the route handler or middleware.

3. Optionally enable **Vercel BotID** in the dashboard under **Security → Bot Protection**.

4. Capture the Arcjet dashboard config (blocked bots, rate-limit rules) or paste the relevant `arcjet.ts` configuration snippet.

## Result

> **Status:** ⚠️ Pending — not yet recorded.
>
> Replace this block with:
> - Confirmation that `ARCJET_KEY` is set in production env
> - The Arcjet config or dashboard screenshot description
> - Whether Vercel BotID is enabled (yes/no)
> - Timestamp: YYYY-MM-DD HH:MM UTC
