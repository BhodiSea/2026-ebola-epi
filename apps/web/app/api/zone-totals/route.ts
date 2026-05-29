import { z } from "zod";

import { getZoneTotalsAsOf } from "@/lib/queries/zone-detail";

export const runtime = "nodejs";

const RequestSchema = z.object({
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      // Reject well-formatted but impossible dates (e.g. 2026-13-45): parse and require it to
      // round-trip to the same string. Invalid ISO dates parse to NaN.
      const t = new Date(`${s}T00:00:00Z`).getTime();
      return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
    }),
  outbreakId: z.uuid(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = RequestSchema.safeParse({
    outbreakId: url.searchParams.get("outbreak_id") ?? undefined,
    asOf: url.searchParams.get("as_of") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  const totals = await getZoneTotalsAsOf(parsed.data.outbreakId, parsed.data.asOf);

  // Public published aggregates; short CDN cache, refreshes when new extractions land.
  return Response.json(totals, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
  });
}
