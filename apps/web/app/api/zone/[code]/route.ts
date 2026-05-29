import { SourceQuoteId } from "@ituri/shared";
import { z } from "zod";

import type { ZoneDateFigure, ZoneFigure } from "@/lib/map/zone-detail-response";
import { serializeQuote } from "@/lib/provenance/serialize-quote";
import { getDocumentsForZone } from "@/lib/queries/documents";
import { getSourceQuoteById } from "@/lib/queries/source-quotes";
import type { ZoneDateMetric, ZoneMetric } from "@/lib/queries/zone-detail";
import { getZoneEpiSeries, getZoneRawRows, getZoneStatTotals } from "@/lib/queries/zone-detail";

export const runtime = "nodejs";

const RequestSchema = z.object({
  code: z.string().regex(/^[A-Z0-9-]{1,32}$/i),
  outbreakId: z.uuid(),
  window: z.enum(["7d", "30d", "90d", "all"]).default("all"),
});

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const url = new URL(req.url);
  const parsed = RequestSchema.safeParse({
    code,
    outbreakId: url.searchParams.get("outbreak_id") ?? undefined,
    window: url.searchParams.get("window") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  const { code: zoneCode, outbreakId, window } = parsed.data;

  const [totals, series, documents, rawRows] = await Promise.all([
    getZoneStatTotals(outbreakId, zoneCode, window),
    getZoneEpiSeries(outbreakId, zoneCode, window),
    getDocumentsForZone(outbreakId, zoneCode),
    getZoneRawRows(outbreakId, zoneCode),
  ]);

  const [confirmed, deaths, firstDetected] = await Promise.all([
    resolveFigure(totals.confirmed),
    resolveFigure(totals.deaths),
    resolveDateFigure(totals.firstDetected),
  ]);

  const sourceCount = new Set(documents.map((d) => d.source.slug)).size;

  return Response.json(
    {
      code: zoneCode,
      totals: { confirmed, deaths, cfr: totals.cfr, firstDetected },
      series,
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        url: d.url,
        publishedAt: d.publishedAt,
        source: { name: d.source.name, slug: d.source.slug, licenseTier: d.source.licenseTier },
      })),
      rawRows,
      sourceCount,
    },
    // Public published aggregates; short CDN cache, refreshes when new extractions land.
    {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
    },
  );
}

async function resolveDateFigure(metric: ZoneDateMetric): Promise<ZoneDateFigure> {
  const resolved = await resolveQuote(metric.quoteId);
  return { value: metric.value, quote: resolved.quote, description: resolved.description };
}

async function resolveFigure(metric: ZoneMetric): Promise<ZoneFigure> {
  const resolved = await resolveQuote(metric.quoteId);
  return { value: metric.value, quote: resolved.quote, description: resolved.description };
}

async function resolveQuote(
  quoteId: null | string,
): Promise<Pick<ZoneFigure, "description" | "quote">> {
  if (quoteId === null) {
    return { quote: null, description: null };
  }
  const parsed = SourceQuoteId.safeParse(quoteId);
  if (!parsed.success) {
    return { quote: null, description: null };
  }
  const row = await getSourceQuoteById(parsed.data);
  if (row === null) {
    return { quote: null, description: null };
  }
  return serializeQuote(row);
}
