/* eslint-disable max-lines -- persist-extraction orchestrates multiple DB steps; split would require a context object */
import "server-only";

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
import { computeCost, MODEL, parseExtractionResponse } from "@ituri/extract";
import { ExtractionRunId } from "@ituri/shared";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";

import type { AnomalyEscalation } from "@/inngest/lib/anomaly";
import { detectAnomalies } from "@/inngest/lib/anomaly";
import type { Tx } from "@/lib/db";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// ─── types ────────────────────────────────────────────────────────────────────

export interface DivergedPair {
  asOf: string;
  existingId: string;
  metric: string;
  newId: string;
  outbreakId: string;
}

export interface DocumentParams {
  readonly fullText: string;
  readonly publishedAt: Date;
  readonly sha256: Buffer;
  readonly sourceId: string;
  readonly url: string;
}

/** JSON-serialisable: returned by fetchDocument step, memoised by Inngest via JSON. */
export interface FetchedDocument {
  readonly documentId: string;
  readonly fullText: string;
  readonly inputDocSha256Hex: string;
  readonly publishedAtIso: string;
  readonly pvHash: string;
  readonly sourceSlug: string;
}

export interface TxParams {
  readonly documentId: string;
  readonly extractionRunId: string;
  readonly inputDocSha256: Buffer;
  readonly modelId: string;
  readonly publishedAt: Date;
  readonly pvHash: string;
  readonly rows: readonly ExtractionRow[];
  readonly sourceSlug: string;
  readonly toolSchemaHash: string;
  readonly usage: ExtractionUsage;
}

// ─── Anthropic client (singleton for this module) ─────────────────────────────

export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface PersistResult {
  escalations: AnomalyEscalation[];
  extractionRunId: string;
}

// ─── database helpers ─────────────────────────────────────────────────────────

/**
 * Apply superseded_by on the loser row within a transaction.
 * Guards: loser != winner, loser.superseded_by IS NULL (idempotent).
 */
export async function applySupersede(opts: {
  agentSlug: string;
  loserId: string;
  reason: string;
  winnerId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(caseCounts)
      .set({ supersededBy: opts.winnerId })
      .where(
        and(
          eq(caseCounts.id, opts.loserId),
          ne(caseCounts.id, opts.winnerId),
          isNull(caseCounts.supersededBy),
        ),
      );
    await tx.insert(agentActions).values({
      agent: opts.agentSlug,
      action: "superseded",
      subjectTable: "case_counts",
      subjectId: opts.loserId,
      payload: { winnerId: opts.winnerId, loserId: opts.loserId, reason: opts.reason },
    });
  });
}

/** Typed wrapper so step.ai.wrap infers Promise<Anthropic.Message>, not APIPromise. */
export async function createMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  return anthropic.messages.create(params);
}

/**
 * Detect case_counts rows from a DIFFERENT source that diverge by ≥25% from any
 * rows written by the given extraction run. Uses LEAST(a,b) as the denominator
 * so shouldReconcile(142,108) = true (31.5% relative difference).
 */
export async function detectDivergence(extractionRunId: string): Promise<DivergedPair[]> {
  const rows = await db.execute<{
    asOf: string;
    existingId: string;
    metric: string;
    newId: string;
    outbreakId: string;
  }>(sql`
    with new_rows as (
      select
        cc.id,
        cc.outbreak_id,
        cc.metric,
        cc.as_of::text   as as_of,
        cc.value,
        cc.admin2_code,
        d.source_id
      from public.case_counts cc
      join audit.extraction_runs er on er.id = cc.extraction_run_id
      join public.documents       d  on d.id  = er.document_id
      where cc.extraction_run_id = ${extractionRunId}::uuid
        and cc.superseded_by is null
    )
    select
      n.id              as "newId",
      o.id              as "existingId",
      n.outbreak_id::text as "outbreakId",
      n.metric,
      n.as_of           as "asOf"
    from new_rows n
    join public.case_counts        o   on  o.outbreak_id = n.outbreak_id
                                       and o.metric      = n.metric
                                       and o.as_of       = n.as_of::date
                                       and o.superseded_by is null
                                       and o.id <> n.id
                                       and (n.admin2_code is not distinct from o.admin2_code)
    join audit.extraction_runs     oer on oer.id = o.extraction_run_id
    join public.documents          od  on od.id  = oer.document_id
    where od.source_id <> n.source_id
      and least(n.value, o.value) > 0
      and abs(n.value - o.value)::numeric
            / least(n.value, o.value)::numeric >= 0.25
  `);
  return rows.map((r) => ({
    newId: r.newId,
    existingId: r.existingId,
    outbreakId: r.outbreakId,
    metric: r.metric,
    asOf: r.asOf,
  }));
}

// eslint-disable-next-line max-lines-per-function, max-statements -- transaction helper orchestrates multiple DB inserts; extracting would require threading a transaction handle
export async function insertExtractionInTransaction(
  tx: Tx,
  params: TxParams,
): Promise<AnomalyEscalation[]> {
  const intermediates: {
    admin2Code: null | string;
    outbreakId: string;
    row: ExtractionRow;
    sqId: string;
  }[] = [];
  const sqIds: string[] = [];

  for (const row of params.rows) {
    // eslint-disable-next-line no-await-in-loop
    const outbreakId = await upsertOutbreak(tx, row, params.publishedAt);
    // eslint-disable-next-line no-await-in-loop
    const admin2Code = await resolveAndLogAdmin2(tx, row, params.sourceSlug);
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

  const escalations: AnomalyEscalation[] = [];

  for (const { outbreakId, sqId, admin2Code, row } of intermediates) {
    const asOf = new Date(row.as_of);
    // eslint-disable-next-line no-await-in-loop
    const signals = await detectAnomalies(tx, {
      outbreakId,
      asOf,
      metric: row.metric,
      value: row.value,
      admin2Code,
    });
    // Autonomy flip: rows always publish immediately; anomaly signals are recorded
    // via escalation_class for audit, but do not gate publication.
    const escalationClass = signals.length > 0 ? ("anomaly" as const) : null;
    // eslint-disable-next-line no-await-in-loop
    const inserted: { id: string }[] = await tx
      .insert(caseCounts)
      .values({
        outbreakId,
        asOf,
        admin2Code,
        metric: row.metric,
        value: row.value,
        sourceQuoteId: sqId,
        extractionRunId: params.extractionRunId,
        modelId: params.modelId,
        promptVersionHash: params.pvHash,
        status: "published",
        escalationClass,
      })
      .returning({ id: caseCounts.id });
    const caseCountId = inserted[0]?.id;
    if (caseCountId === undefined) {
      throw new Error("caseCounts insert returned no row");
    }
    if (signals.length > 0) {
      escalations.push({ caseCountId, outbreakId, signals });
    }
  }

  await insertUsageLogInTx(tx, params);
  return escalations;
}

/**
 * Idempotency check: returns true when an extraction_runs row already exists
 * for (documentId, pvHash), meaning extraction can be skipped.
 */
export async function isAlreadyExtracted(documentId: string, pvHash: string): Promise<boolean> {
  const rows: { id: string }[] = await db
    .select({ id: extractionRuns.id })
    .from(extractionRuns)
    .where(
      and(eq(extractionRuns.documentId, documentId), eq(extractionRuns.promptVersionHash, pvHash)),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Parse, verify, and persist an extraction result.
 * Returns the extraction_run_id and any anomaly escalations for held rows.
 */
export async function persistExtraction(
  doc: FetchedDocument,
  rawMsg: Pick<Anthropic.Message, "content" | "usage">,
): Promise<PersistResult> {
  const { rows, toolSchemaHash, usage } = parseExtractionResponse(rawMsg, doc.fullText);
  const extractionRunId = ExtractionRunId.parse(crypto.randomUUID());
  const escalations = await db.transaction(async (tx) =>
    insertExtractionInTransaction(tx, {
      documentId: doc.documentId,
      extractionRunId,
      inputDocSha256: Buffer.from(doc.inputDocSha256Hex, "hex"),
      modelId: MODEL,
      publishedAt: new Date(doc.publishedAtIso),
      pvHash: doc.pvHash,
      rows,
      sourceSlug: doc.sourceSlug,
      toolSchemaHash,
      usage,
    }),
  );
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
  return { extractionRunId, escalations };
}

export async function resolveAdmin2Code(
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

export async function resolveSourceId(slug: string): Promise<string> {
  const rows: { id: string }[] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new Error(`source '${slug}' missing from public.sources; run seed`);
  }
  return row.id;
}

export async function upsertDocument(params: DocumentParams): Promise<string> {
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

export async function upsertOutbreak(tx: Tx, row: ExtractionRow, onsetDate: Date): Promise<string> {
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

async function insertUsageLogInTx(tx: Tx, params: TxParams): Promise<void> {
  const costUsd = computeCost(
    {
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic API field names
      input_tokens: params.usage.input_tokens,
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic API field names
      output_tokens: params.usage.output_tokens,
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic API field names
      cache_read_input_tokens: params.usage.cache_read_input_tokens ?? null,
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic API field names
      cache_creation_input_tokens: params.usage.cache_creation_input_tokens ?? null,
    },
    params.modelId,
  );
  await tx.insert(anthropicUsageLog).values({
    extractionRunId: params.extractionRunId,
    modelId: params.modelId,
    inputTokens: params.usage.input_tokens,
    outputTokens: params.usage.output_tokens,
    cacheReadInputTokens: params.usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: params.usage.cache_creation_input_tokens ?? 0,
    costUsd: String(costUsd),
  });
}

async function resolveAndLogAdmin2(
  tx: Tx,
  row: ExtractionRow,
  sourceSlug: string,
): Promise<null | string> {
  if (row.admin1_name === undefined) {
    return null;
  }
  const code = await resolveAdmin2Code(tx, row.country_iso3, row.admin1_name);
  if (code === null) {
    await tx.insert(agentActions).values({
      agent: `ingest-${sourceSlug}`,
      action: "admin2_unmatched",
      payload: { adminName: row.admin1_name, countryIso3: row.country_iso3 },
    });
  }
  return code;
}
