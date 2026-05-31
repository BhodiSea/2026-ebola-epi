import "server-only";

import { documents, extractionRuns } from "@ituri/db";
import { desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";

export interface UnextractedDocument {
  id: string;
  publishedAt: Date | null;
  url: string;
}

export async function listUnextractedDocuments(limit = 100): Promise<UnextractedDocument[]> {
  return db
    .select({ id: documents.id, publishedAt: documents.publishedAt, url: documents.url })
    .from(documents)
    .leftJoin(extractionRuns, eq(extractionRuns.documentId, documents.id))
    .where(isNull(extractionRuns.id))
    .orderBy(desc(documents.publishedAt))
    .limit(limit);
}
