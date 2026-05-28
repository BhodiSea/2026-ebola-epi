import "server-only";
import { createHash } from "node:crypto";

import Anthropic from "@anthropic-ai/sdk";
import {
  admin1,
  admin2,
  agentActions,
  anthropicUsageLog,
  auditLlmTraces,
  caseCounts,
  documents,
  extractionRuns,
  outbreaks,
  sourceQuotes,
  sources,
} from "@ituri/db";
import type { ExtractionRow, ExtractionUsage } from "@ituri/extract";
import {
  buildExtractionParams,
  computePromptVersionHash,
  MODEL,
  parseExtractionResponse,
} from "@ituri/extract";
import type { WhodonItem } from "@ituri/ingest";
import { fetchAndParseDocument, pollWHODON } from "@ituri/ingest";
import { ExtractionRunId } from "@ituri/shared";
import { and, asc, eq, sql } from "drizzle-orm";

import { inngest } from "../client";
import { WHO_DON_FN_CONFIG } from "./who-don-config";
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

// ─── types ────────────────────────────────────────────────────────────────────

/** Return type of fetchDocument — must be JSON-serialisable (step.run memoises via JSON). */
interface FetchedDocument {
  readonly documentId: string;
  readonly fullText: string;
  readonly inputDocSha256Hex: string;
  readonly publishedAtIso: string;
  readonly pvHash: string;
}

interface RowMid {
  admin2Code: null | string;
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

// Typed wrapper so step.ai.wrap infers Promise<Anthropic.Message> (not APIPromise).
async function createMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  return anthropic.messages.create(params);
}

// ─── database helpers ─────────────────────────────────────────────────────────

/**
 * Fetch + hash + idempotency check.
 * Returns null when the (document, promptVersionHash) pair was already extracted.
 * Returns JSON-serialisable metadata when extraction is needed.
 */
async function fetchDocument(item: WhodonItem, sourceId: string): Promise<FetchedDocument | null> {
  const { sha256, fullText } = await fetchAndParseDocument(item.url);
  const documentId = await upsertDocument({
    fullText,
    publishedAt: new Date(item.publishedAt),
    sha256,
    sourceId,
    url: item.url,
  });
  const pvHash = computePromptVersionHash();
  const inputDocSha256Hex = createHash("sha256").update(fullText).digest("hex");
  const alreadyRows: { id: string }[] = await db
    .select({ id: extractionRuns.id })
    .from(extractionRuns)
    .where(
      and(eq(extractionRuns.documentId, documentId), eq(extractionRuns.promptVersionHash, pvHash)),
    )
    .limit(1);
  if (alreadyRows[0]) {
    return null;
  }
  return { documentId, fullText, inputDocSha256Hex, publishedAtIso: item.publishedAt, pvHash };
}

async function insertExtractionInTransaction(tx: Tx, params: TxParams): Promise<void> {
  const intermediates: RowMid[] = [];
  const sqIds: string[] = [];

  for (const row of params.rows) {
    // eslint-disable-next-line no-await-in-loop
    const outbreakId = await upsertOutbreak(tx, row, params.publishedAt);
    let admin2Code: null | string = null;
    if (row.admin1_name !== undefined) {
      // admin1_name from extraction schema is the health-zone / zone-de-santé name
      // eslint-disable-next-line no-await-in-loop
      admin2Code = await resolveAdmin2Code(tx, row.country_iso3, row.admin1_name);
      if (admin2Code === null) {
        // eslint-disable-next-line no-await-in-loop
        await tx.insert(agentActions).values({
          agent: "ingest-who-don",
          action: "admin2_unmatched",
          payload: { adminName: row.admin1_name, countryIso3: row.country_iso3 },
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
    intermediates.push({ outbreakId, sqId: sq.id, admin2Code, row });
  }

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

  for (const { outbreakId, sqId, admin2Code, row } of intermediates) {
    // eslint-disable-next-line no-await-in-loop
    await tx.insert(caseCounts).values({
      outbreakId,
      asOf: new Date(row.as_of),
      admin2Code,
      metric: row.metric,
      value: row.value,
      sourceQuoteId: sqId,
      extractionRunId: params.extractionRunId,
      modelId: params.modelId,
      promptVersionHash: params.pvHash,
    });
  }
}

/**
 * Parse, verify, and persist an extraction result.
 * rawMsg comes from step.ai.wrap and is JSON-deserialised; Buffer fields are
 * reconstructed from hex before the DB insert.
 */
async function persistExtraction(
  doc: FetchedDocument,
  rawMsg: Pick<Anthropic.Message, "content" | "usage">,
): Promise<void> {
  const { rows, toolSchemaHash, usage } = parseExtractionResponse(rawMsg, doc.fullText);
  const extractionRunId = ExtractionRunId.parse(crypto.randomUUID());
  await db.transaction(async (tx) => {
    await insertExtractionInTransaction(tx, {
      documentId: doc.documentId,
      extractionRunId,
      inputDocSha256: Buffer.from(doc.inputDocSha256Hex, "hex"),
      modelId: MODEL,
      publishedAt: new Date(doc.publishedAtIso),
      pvHash: doc.pvHash,
      rows,
      toolSchemaHash,
      usage,
    });
  });
  // durationMs: null — the LLM call happened inside step.ai.wrap; Inngest tracks its duration.
  await db.insert(auditLlmTraces).values({
    extractionRunId,
    traceId: crypto.randomUUID(),
    spanId: crypto.randomUUID(),
    name: "extraction",
    agentName: "extract",
    modelId: MODEL,
    promptVersionHash: doc.pvHash,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    durationMs: null,
  });
  // Cost kill-switch source (backend.md §467): Phase 7 adds pg_net trigger.
  await db.insert(anthropicUsageLog).values({
    extractionRunId,
    modelId: MODEL,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
  });
}

async function resolveAdmin2Code(
  tx: Tx,
  countryIso3: string,
  name: string,
): Promise<null | string> {
  const rows: { code: string }[] = await tx
    .select({ code: admin2.code })
    .from(admin2)
    .innerJoin(admin1, eq(admin2.admin1Code, admin1.code))
    .where(
      and(eq(admin1.countryIso3, countryIso3), eq(sql`lower(${admin2.name})`, name.toLowerCase())),
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

// ─── step helpers ─────────────────────────────────────────────────────────────

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

// ─── Inngest function ─────────────────────────────────────────────────────────

export const ingestWHODON = inngest.createFunction(
  WHO_DON_FN_CONFIG,
  { cron: "*/30 * * * *" },
  async ({ step }) => {
    const items = await step.run("poll-rss", async () => pollWHODON());
    const sourceId = await step.run("resolve-source-id", async () => resolveSourceId());

    for (const item of items) {
      const stepId = createHash("sha256").update(item.url).digest("hex").slice(0, 16);

      // eslint-disable-next-line no-await-in-loop
      const doc = await step.run(`fetch-${stepId}`, async () => fetchDocument(item, sourceId));
      if (!doc) {
        continue;
      }

      // LLM call via step.ai.wrap: input is tracked + editable in Inngest UI,
      // OTel trace ID propagates to Langfuse spans (Phase 7).
      // eslint-disable-next-line no-await-in-loop
      const rawMsg = await step.ai.wrap(
        `extract-${stepId}`,
        createMessage,
        buildExtractionParams(doc.fullText),
      );

      // Parse, verify substring, persist — outside the LLM trace span.
      // eslint-disable-next-line no-await-in-loop
      await step.run(`persist-${stepId}`, async () => persistExtraction(doc, rawMsg));
    }
  },
);
