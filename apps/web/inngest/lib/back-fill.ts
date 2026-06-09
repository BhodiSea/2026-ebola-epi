import "server-only";
import { createHash } from "node:crypto";

import type Anthropic from "@anthropic-ai/sdk";
import { batchResults, documents, sources } from "@ituri/db";
import { buildExtractionParams, computePromptVersionHash } from "@ituri/extract";
import { eq, inArray } from "drizzle-orm";

import type { FetchedDocument } from "./persist-extraction";
import { persistExtraction } from "./persist-extraction";
import { db } from "@/lib/db";

// --- types --------------------------------------------------------------------

export interface BatchRequest {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic Batch API field name
  custom_id: string;
  params: Anthropic.MessageCreateParamsNonStreaming;
}

export interface BatchResultItem {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic Batch API field name
  custom_id: string;
  result: {
    // `unknown` keeps this type JSON-round-trip safe (Inngest step serialization).
    // Callers that need the message shape cast via @ts-expect-error with reason.
    message?: unknown;
    type: "canceled" | "errored" | "expired" | "succeeded";
  };
}

const BACKFILL_PREFIX = /^backfill-/;

// --- buildBatchRequests -------------------------------------------------------

/**
 * Load documents from DB and build Anthropic Message Batches API request objects.
 * Uses the same extraction params (model, system, tools, cache_control) as live extraction.
 */
export async function buildBatchRequests(documentIds: string[]): Promise<BatchRequest[]> {
  if (documentIds.length === 0) {
    return [];
  }
  const docs = await db
    .select({ id: documents.id, fullText: documents.fullText })
    .from(documents)
    .where(inArray(documents.id, documentIds));

  return docs.map((doc) => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic Batch API field name
    custom_id: `backfill-${String(doc.id)}`,
    params: buildExtractionParams(doc.fullText),
  }));
}

// --- persistBatchResults ------------------------------------------------------

/**
 * Write each batch result to `audit.batch_results` (permanent storage — batch results
 * expire after 29 days on the Anthropic API). For succeeded results, route through the
 * same persist path as live extraction so rows get provenance, anomaly checks, and usage logging.
 */
export async function persistBatchResults(
  batchId: string,
  results: BatchResultItem[],
): Promise<void> {
  for (const item of results) {
    const documentId = item.custom_id.replace(BACKFILL_PREFIX, "");

    // ON CONFLICT DO NOTHING makes the step idempotent on Inngest replay.
    // eslint-disable-next-line no-await-in-loop
    await db
      .insert(batchResults)
      .values({
        batchId,
        customId: item.custom_id,
        documentId: documentId || null,
        result: item.result,
      })
      .onConflictDoNothing();

    if (item.result.type !== "succeeded" || item.result.message === undefined) {
      continue;
    }

    // Load doc context for the full persist path.
    // eslint-disable-next-line no-await-in-loop
    const docRows = await db
      .select({
        id: documents.id,
        fullText: documents.fullText,
        publishedAt: documents.publishedAt,
        sourceSlug: sources.slug,
      })
      .from(documents)
      .innerJoin(sources, eq(documents.sourceId, sources.id))
      .where(eq(documents.id, documentId));

    const docRow = docRows[0];
    if (!docRow) {
      continue;
    }

    // Skip rather than fabricate a publication date — a null publishedAt would
    // silently stamp today and corrupt every time-series query on back-filled rows.
    if (!docRow.publishedAt) {
      continue;
    }

    const pvHash = computePromptVersionHash();
    const inputDocSha256Hex = createHash("sha256").update(docRow.fullText).digest("hex");

    const fetchedDoc: FetchedDocument = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Drizzle branded id columns inferred as any in back-fill query context
      documentId: docRow.id,
      fullText: docRow.fullText,
      inputDocSha256Hex,
      publishedAtIso: docRow.publishedAt.toISOString(),
      pvHash,
      sourceSlug: docRow.sourceSlug,
    };

    // @ts-expect-error: message is deserialized from Inngest JSON round-trip — runtime shape matches Pick<Message, "content" | "usage">
    // eslint-disable-next-line no-await-in-loop
    await persistExtraction(fetchedDoc, item.result.message);
  }
}
