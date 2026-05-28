import "server-only";
import { createHash } from "node:crypto";

import Anthropic from "@anthropic-ai/sdk";
import {
  admin1,
  agentActions,
  auditLlmTraces,
  caseCounts,
  documents,
  extractionRuns,
  outbreaks,
  sourceQuotes,
  sources,
} from "@ituri/db";
import type { ExtractionRow, ExtractionUsage } from "@ituri/extract";
import { computePromptVersionHash, MODEL, runExtraction, verifySubstring } from "@ituri/extract";
import type { WhodonItem } from "@ituri/ingest";
import { fetchAndParseDocument, pollWHODON } from "@ituri/ingest";
import { ExtractionRunId } from "@ituri/shared";
import { and, asc, eq, sql } from "drizzle-orm";

import { inngest } from "../client";
import type { Tx } from "@/lib/db";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

interface DocumentParams {
  readonly fullText: string;
  readonly publishedAt: Date;
  readonly sha256: Buffer;
  readonly sourceId: string;
  readonly url: string;
}

interface RowMid {
  admin1Code: null | string;
  outbreakId: string;
  row: ExtractionRow;
  sqId: string;
}

interface TxParams {
  readonly documentId: string;
  readonly extractionRunId: string;
  readonly inputDocSha256: Buffer;
  readonly modelId: string;
  readonly publishedAt: Date;
  readonly pvHash: string;
  readonly rows: readonly ExtractionRow[];
  readonly toolSchemaHash: string;
  readonly usage: ExtractionUsage;
}

async function insertExtractionInTransaction(tx: Tx, params: TxParams): Promise<void> {
  // Phase 1: resolve outbreaks + admin1, insert source_quotes.
  // case_counts cannot be inserted until extraction_runs exists (non-deferrable FK), so we collect
  // intermediate results here and defer the case_counts inserts to phase 3.
  const intermediates: RowMid[] = [];
  const sqIds: string[] = [];

  for (const row of params.rows) {
    // eslint-disable-next-line no-await-in-loop
    const outbreakId = await upsertOutbreak(tx, row, params.publishedAt);
    let admin1Code: null | string = null;
    if (row.admin1_name !== undefined) {
      // eslint-disable-next-line no-await-in-loop
      admin1Code = await resolveAdmin1Code(tx, row.country_iso3, row.admin1_name);
      if (admin1Code === null) {
        // eslint-disable-next-line no-await-in-loop
        await tx.insert(agentActions).values({
          agent: "ingest-who-don",
          action: "admin1_unmatched",
          payload: { admin1Name: row.admin1_name, countryIso3: row.country_iso3 },
        });
      }
    }
    // eslint-disable-next-line no-await-in-loop
    const sqRows: { id: string }[] = await tx
      .insert(sourceQuotes)
      .values({
        documentId: params.documentId,
        charStart: row.source_quote.char_start,
        charEnd: row.source_quote.char_end,
        quoteText: row.source_quote.quote_text,
      })
      .returning({ id: sourceQuotes.id });
    const sq = sqRows[0];
    if (!sq) {
      throw new Error("source_quote insert returned no row");
    }
    sqIds.push(sq.id);
    intermediates.push({ outbreakId, sqId: sq.id, admin1Code, row });
  }

  // Phase 2: extraction_runs must be inserted before case_counts (non-deferrable FK).
  await tx.insert(extractionRuns).values({
    id: params.extractionRunId,
    documentId: params.documentId,
    modelId: params.modelId,
    promptVersionHash: params.pvHash,
    toolSchemaHash: params.toolSchemaHash,
    inputDocSha256: params.inputDocSha256,
    cacheReadInputTokens: params.usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: params.usage.cache_creation_input_tokens ?? 0,
    inputTokens: params.usage.input_tokens,
    outputTokens: params.usage.output_tokens,
    rowsExtracted: params.rows.length,
    rowsVerified: params.rows.length,
    sourceQuoteIds: sqIds,
  });

  // Phase 3: case_counts — extraction_run_id FK now resolves.
  for (const { outbreakId, sqId, admin1Code, row } of intermediates) {
    // eslint-disable-next-line no-await-in-loop
    await tx.insert(caseCounts).values({
      outbreakId,
      asOf: new Date(row.as_of),
      admin1Code,
      metric: row.metric,
      value: row.value,
      sourceQuoteId: sqId,
      extractionRunId: params.extractionRunId,
      modelId: params.modelId,
      promptVersionHash: params.pvHash,
    });
  }
}

async function processDocument(item: WhodonItem, sourceId: string): Promise<void> {
  const { sha256, fullText } = await fetchAndParseDocument(item.url);
  const documentId = await upsertDocument({
    fullText,
    publishedAt: new Date(item.publishedAt),
    sha256,
    sourceId,
    url: item.url,
  });
  const pvHash = computePromptVersionHash();
  const inputDocSha256 = createHash("sha256").update(fullText).digest();
  const alreadyRows: { id: string }[] = await db
    .select({ id: extractionRuns.id })
    .from(extractionRuns)
    .where(
      and(eq(extractionRuns.documentId, documentId), eq(extractionRuns.promptVersionHash, pvHash)),
    )
    .limit(1);
  if (alreadyRows[0]) {
    return;
  }
  const extractionStartedAt = Date.now();
  const { rows, toolSchemaHash, usage } = await runExtraction(anthropic, fullText);
  const extractionDurationMs = Date.now() - extractionStartedAt;
  for (const row of rows) {
    if (!verifySubstring(fullText, row.source_quote)) {
      throw new Error(`substring_verify_fail: char_start=${row.source_quote.char_start}`);
    }
  }
  const extractionRunId = ExtractionRunId.parse(crypto.randomUUID());
  const publishedAt = new Date(item.publishedAt);
  await db.transaction(async (tx) => {
    await insertExtractionInTransaction(tx, {
      documentId,
      extractionRunId,
      inputDocSha256,
      modelId: MODEL,
      publishedAt,
      pvHash,
      rows,
      toolSchemaHash,
      usage,
    });
  });
  await db.insert(auditLlmTraces).values({
    extractionRunId,
    traceId: crypto.randomUUID(),
    spanId: crypto.randomUUID(),
    name: "extraction",
    agentName: "extract",
    modelId: MODEL,
    promptVersionHash: pvHash,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    durationMs: extractionDurationMs,
  });
}

async function resolveAdmin1Code(
  tx: Tx,
  countryIso3: string,
  name: string,
): Promise<null | string> {
  const rows: { code: string }[] = await tx
    .select({ code: admin1.code })
    .from(admin1)
    .where(
      and(eq(admin1.countryIso3, countryIso3), eq(sql`lower(${admin1.name})`, name.toLowerCase())),
    )
    .limit(1);
  return rows[0]?.code ?? null;
}

async function resolveSourceId(): Promise<string> {
  const rows: { id: string }[] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.slug, "who-don"))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new Error("who-don source missing from public.sources; run seed");
  }
  return row.id;
}

async function upsertDocument(params: DocumentParams): Promise<string> {
  const dupeRows: { id: string }[] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.sha256, params.sha256))
    .limit(1);
  if (dupeRows[0]) {
    return dupeRows[0].id;
  }
  const insRows: { id: string }[] = await db
    .insert(documents)
    .values({
      sourceId: params.sourceId,
      sha256: params.sha256,
      url: params.url,
      fullText: params.fullText,
      publishedAt: params.publishedAt,
    })
    .onConflictDoNothing()
    .returning({ id: documents.id });
  if (insRows[0]) {
    return insRows[0].id;
  }
  const fallbackRows: { id: string }[] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.sha256, params.sha256))
    .limit(1);
  if (!fallbackRows[0]) {
    throw new Error("document missing after conflict-safe insert");
  }
  return fallbackRows[0].id;
}

async function upsertOutbreak(tx: Tx, row: ExtractionRow, onsetDate: Date): Promise<string> {
  // Look up any existing outbreak for this pathogen-country pair first.
  // Without this, each article on a different date creates a separate outbreak row.
  const byPair = and(
    eq(outbreaks.pathogenIcd11, row.pathogen_icd11),
    eq(outbreaks.countryIso3, row.country_iso3),
  );
  const existingRows: { id: string; onsetDate: Date }[] = await tx
    .select({ id: outbreaks.id, onsetDate: outbreaks.onsetDate })
    .from(outbreaks)
    .where(byPair)
    .orderBy(asc(outbreaks.onsetDate))
    .limit(1);
  if (existingRows[0]) {
    if (onsetDate < existingRows[0].onsetDate) {
      await tx.update(outbreaks).set({ onsetDate }).where(eq(outbreaks.id, existingRows[0].id));
    }
    return existingRows[0].id;
  }
  const insRows: { id: string }[] = await tx
    .insert(outbreaks)
    .values({ pathogenIcd11: row.pathogen_icd11, countryIso3: row.country_iso3, onsetDate })
    .onConflictDoNothing()
    .returning({ id: outbreaks.id });
  if (insRows[0]) {
    return insRows[0].id;
  }
  // Race condition: another process inserted between our select and insert.
  const fallbackRows: { id: string; onsetDate: Date }[] = await tx
    .select({ id: outbreaks.id, onsetDate: outbreaks.onsetDate })
    .from(outbreaks)
    .where(byPair)
    .orderBy(asc(outbreaks.onsetDate))
    .limit(1);
  const found = fallbackRows[0];
  if (!found) {
    throw new Error("outbreak missing after conflict-safe upsert");
  }
  if (onsetDate < found.onsetDate) {
    await tx.update(outbreaks).set({ onsetDate }).where(eq(outbreaks.id, found.id));
  }
  return found.id;
}

export const ingestWHODON = inngest.createFunction(
  { id: "ingest-who-don", retries: 4, concurrency: { limit: 1 } },
  { cron: "*/30 * * * *" },
  async ({ step }) => {
    const items = await step.run("poll-rss", async () => pollWHODON());
    const sourceId = await step.run("resolve-source-id", async () => resolveSourceId());
    for (const item of items) {
      const stepId = createHash("sha256").update(item.url).digest("hex").slice(0, 16);
      // eslint-disable-next-line no-await-in-loop
      await step.run(`process-${stepId}`, async () => processDocument(item, sourceId));
    }
  },
);
