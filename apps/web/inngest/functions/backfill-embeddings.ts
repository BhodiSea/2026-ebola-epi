import "server-only";

import { openai } from "@ai-sdk/openai";
import { agentActions, sourceQuotes } from "@ituri/db";
import { embedMany } from "ai";
import { asc, eq, isNull } from "drizzle-orm";

import { inngest } from "../client";
import type { Tx } from "@/lib/db";
import { db } from "@/lib/db";

export const BACKFILL_EMBEDDINGS_TRIGGER = {
  event: "source.quotes.embedding.backfill.requested",
} as const;

export const BACKFILL_EMBEDDINGS_CRON = {
  cron: "0 2 * * *",
} as const;

const BATCH_SIZE = 100;
// Prevent materialising the full table in heap; next trigger picks up the rest.
const MAX_QUOTES = 10_000;

// --- embedBatch (exported for unit testing) ------------------------------------

export async function embedBatch(batch: { id: string; quoteText: string }[]): Promise<number> {
  const model = openai.embedding("text-embedding-3-small");
  const { embeddings } = await embedMany({
    model,
    values: batch.map((q) => q.quoteText),
    // text-embedding-3-small supports configurable dimensions; 1024 matches the HNSW index.
    providerOptions: { openai: { dimensions: 1024 } },
  });
  await db.transaction(async (tx: Tx) => {
    for (const [j, quote] of batch.entries()) {
      // eslint-disable-next-line no-await-in-loop -- sequential writes within a transaction
      await tx
        .update(sourceQuotes)
        .set({ embedding: embeddings[j] })
        .where(eq(sourceQuotes.id, quote.id));
    }
  });
  return batch.length;
}

// --- embedQuotes (exported for no-key unit test) ------------------------------

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
    .where(isNull(sourceQuotes.embedding))
    .orderBy(asc(sourceQuotes.id))
    .limit(MAX_QUOTES);

  if (quotes.length === 0) {
    return { updated: 0 };
  }

  let updated = 0;
  for (let i = 0; i < quotes.length; i += BATCH_SIZE) {
    // eslint-disable-next-line no-await-in-loop -- sequential batches avoid parallel OOM
    updated += await embedBatch(quotes.slice(i, i + BATCH_SIZE));
  }
  return { updated };
}

// --- backfillEmbeddings (Inngest function) ------------------------------------

export const backfillEmbeddings = inngest.createFunction(
  { id: "backfill-embeddings", retries: 2 },
  [BACKFILL_EMBEDDINGS_TRIGGER, BACKFILL_EMBEDDINGS_CRON],
  async ({ step }) => {
    const key = process.env.OPENAI_API_KEY;
    if (key === undefined || key.length === 0) {
      await step.run("record-embedding-skipped", async () => {
        await db.insert(agentActions).values({
          agent: "backfill-embeddings",
          action: "embedding_skipped_no_key",
          payload: {},
        });
      });
      return { skipped: true, reason: "no_openai_key" } as const;
    }

    // Fetch outside step.run — cheap SELECT; on retry, re-fetch is desirable
    // because rows already embedded by completed batches will have non-NULL embeddings
    // and won't appear, naturally shrinking the work set.
    const quotes = await db
      .select({ id: sourceQuotes.id, quoteText: sourceQuotes.quoteText })
      .from(sourceQuotes)
      .where(isNull(sourceQuotes.embedding))
      .orderBy(asc(sourceQuotes.id))
      .limit(MAX_QUOTES);

    if (quotes.length === 0) {
      return { updated: 0 };
    }

    let updated = 0;
    for (let i = 0; i < quotes.length; i += BATCH_SIZE) {
      const batch = quotes.slice(i, i + BATCH_SIZE);
      // eslint-disable-next-line no-await-in-loop -- Inngest steps must be sequential for memoisation
      const count = await step.run(`embed-batch-${i}`, async () => embedBatch(batch));
      updated += count;
    }
    return { updated };
  },
);
