import "server-only";

import { openai } from "@ai-sdk/openai";
import { agentActions, sourceQuotes } from "@ituri/db";
import { embedMany } from "ai";
import { eq, isNull } from "drizzle-orm";

import { inngest } from "../client";
import { db } from "@/lib/db";

export const BACKFILL_EMBEDDINGS_TRIGGER = {
  event: "source.quotes.embedding.backfill.requested",
} as const;

const BATCH_SIZE = 100;

// --- embedQuotes (exported for unit testing) ----------------------------------

export async function embedQuotes(): Promise<
  { reason: "no_openai_key"; skipped: true } | { updated: number }
> {
  const key = process.env.OPENAI_API_KEY;
  if (key === undefined || key.length === 0) {
    await db.insert(agentActions).values({
      agent: "backfill-embeddings",
      action: "embedding_skipped_no_key",
      payload: {},
    });
    return { skipped: true, reason: "no_openai_key" };
  }

  const quotes = await db
    .select({ id: sourceQuotes.id, quoteText: sourceQuotes.quoteText })
    .from(sourceQuotes)
    .where(isNull(sourceQuotes.embedding));

  if (quotes.length === 0) {
    return { updated: 0 };
  }

  const model = openai.embedding("text-embedding-3-small");
  let updated = 0;

  for (let i = 0; i < quotes.length; i += BATCH_SIZE) {
    const batch = quotes.slice(i, i + BATCH_SIZE);
    // eslint-disable-next-line no-await-in-loop
    const { embeddings } = await embedMany({
      model,
      values: batch.map((q) => q.quoteText),
      // text-embedding-3-small supports configurable dimensions; 1024 matches the HNSW index.
      providerOptions: { openai: { dimensions: 1024 } },
    });
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      batch.map(async (q, j) =>
        db.update(sourceQuotes).set({ embedding: embeddings[j] }).where(eq(sourceQuotes.id, q.id)),
      ),
    );
    updated += batch.length;
  }

  return { updated };
}

// --- backfillEmbeddings (Inngest function) ------------------------------------

export const backfillEmbeddings = inngest.createFunction(
  { id: "backfill-embeddings", retries: 2 },
  BACKFILL_EMBEDDINGS_TRIGGER,
  async ({ step }) => step.run("embed-null-quotes", async () => embedQuotes()),
);
