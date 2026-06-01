import "server-only";

import { caseCounts, documents, sourceQuotes, sources } from "@ituri/db";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";

export interface DocumentWithoutProvenance {
  id: string;
  sourceId: string;
  sourceSlug: string;
}

export interface ProvenanceCoverageStats {
  documentsMissingProvenance: number;
  percentVerified: number;
  totalPublished: number;
  withPlaceholderOffsets: number;
  withVerifiedOffsets: number;
}

export async function getDocumentsWithoutProvenance(
  limit = 50,
): Promise<DocumentWithoutProvenance[]> {
  return db
    .select({ id: documents.id, sourceId: documents.sourceId, sourceSlug: sources.slug })
    .from(documents)
    .innerJoin(sources, eq(sources.id, documents.sourceId))
    .leftJoin(sourceQuotes, eq(sourceQuotes.documentId, documents.id))
    .where(isNull(sourceQuotes.id))
    .limit(limit);
}

export async function getProvenanceCoverageStats(): Promise<ProvenanceCoverageStats> {
  const activeFilter = and(isNull(caseCounts.supersededBy), eq(caseCounts.status, "published"));

  const [totalRow] = await db.select({ count: count() }).from(caseCounts).where(activeFilter);

  const [verifiedRow] = await db
    .select({ count: count() })
    .from(caseCounts)
    .innerJoin(sourceQuotes, eq(sourceQuotes.id, caseCounts.sourceQuoteId))
    .where(and(activeFilter, gt(sourceQuotes.charEnd, 1)));

  const [placeholderRow] = await db
    .select({ count: count() })
    .from(caseCounts)
    .innerJoin(sourceQuotes, eq(sourceQuotes.id, caseCounts.sourceQuoteId))
    .where(and(activeFilter, eq(sourceQuotes.charStart, 0), sql`${sourceQuotes.charEnd} = 1`));

  const [missingDocsRow] = await db
    .select({ count: count() })
    .from(documents)
    .leftJoin(sourceQuotes, eq(sourceQuotes.documentId, documents.id))
    .where(isNull(sourceQuotes.id));

  const total = totalRow?.count ?? 0;
  const verified = verifiedRow?.count ?? 0;

  return {
    totalPublished: total,
    withVerifiedOffsets: verified,
    withPlaceholderOffsets: placeholderRow?.count ?? 0,
    documentsMissingProvenance: missingDocsRow?.count ?? 0,
    percentVerified: total === 0 ? 100 : Math.round((verified / total) * 1000) / 10,
  };
}
