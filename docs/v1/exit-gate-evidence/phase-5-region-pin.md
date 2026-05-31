# Phase 5 exit gate — Vercel function region pin

**Gate:** Vercel function region is pinned to match the Supabase project's deployment region, minimising DB round-trip latency from server functions.

**Roadmap reference:** G2 in [docs/ROADMAP.md](../../ROADMAP.md#g2----pin-vercel-function-region).

## How to record evidence

1. Open the Vercel project dashboard → **Settings** → **Functions** → **Regions**.
2. Pin the region to `iad1` (us-east-1) if the Supabase project is deployed in US East, or to the matching region.
3. Run the following CLI command and paste the output below:

```bash
vercel project ls --json | jq '.projects[] | {name: .name, regions: .nodeVersion}'
# or, if the CLI exposes function regions:
vercel inspect --json <deployment-url> | jq '.regions'
```

4. Record the timestamp and the region value.

## Result

> **Status:** ⚠️ Pending — not yet recorded.
>
> Replace this block with:
> - The region value (e.g. `iad1`)
> - CLI output or screenshot description
> - Timestamp: YYYY-MM-DD HH:MM UTC
