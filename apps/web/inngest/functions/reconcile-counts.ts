import "server-only";
import { createHash } from "node:crypto";

import Anthropic from "@anthropic-ai/sdk";
import {
  agentActions,
  auditLlmTraces,
  caseCounts,
  documents,
  extractionRuns,
  incidents,
  sourceQuotes,
  sources,
} from "@ituri/db";
import type { ReconcileCandidate, ReconcileInput } from "@ituri/extract";
import {
  buildReconcileParams,
  computeReconcilePromptHash,
  MODEL_OPUS,
  parseReconcileResponse,
} from "@ituri/extract";
import { and, eq, isNull, ne } from "drizzle-orm";

import { inngest } from "../client";
import { evaluateCapacity } from "../lib/capacity-guard";
import { logAnthropicUsage } from "../lib/usage-log";
import { RECONCILE_COUNTS_FN_CONFIG, RECONCILE_COUNTS_TRIGGER } from "./pipeline-fn-config";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getExtractionCapacity } from "@/lib/kill-switch";
import { notifyKillSwitch, notifySlack } from "@/lib/notify";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface ReconcileRequestedData {
  readonly asOf: string;
  readonly metric: string;
  readonly outbreakId: string;
  readonly pairKey: string;
  readonly rowAId: string;
  readonly rowBId: string;
}

// --- types for the reconcile.requested event ---------------------------------

interface LoadedPair {
  a: ReconcileCandidate & { asOf: string; metric: string; outbreakId: string };
  b: ReconcileCandidate & { asOf: string; metric: string; outbreakId: string };
  stale: false;
}

interface StalePair {
  stale: true;
}

// eslint-disable-next-line perfectionist/sort-modules -- grouped with audit helpers, not with event types
interface AuditParams {
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly promptVersionHash: string;
}

// --- DB helper — load both rows + trust + quote + published ------------------

/** Stable pairKey from two case_counts IDs: sha256(min:max).slice(0,32) */
export function makePairKey(idA: string, idB: string): string {
  const [min, max] = idA < idB ? [idA, idB] : [idB, idA];
  return createHash("sha256").update(`${min}:${max}`).digest("hex").slice(0, 32);
}
async function createOpusMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  return anthropic.messages.create(params);
}

async function loadReconcilePair(data: ReconcileRequestedData): Promise<LoadedPair | StalePair> {
  // Load both rows in one query, joining to source for trust_score and document for published_at
  const rows = await db
    .select({
      ccId: caseCounts.id,
      outbreakId: caseCounts.outbreakId,
      metric: caseCounts.metric,
      asOf: caseCounts.asOf,
      value: caseCounts.value,
      supersededBy: caseCounts.supersededBy,
      quoteText: sourceQuotes.quoteText,
      publishedAt: documents.publishedAt,
      trustScore: sources.trustScore,
      sourceSlug: sources.slug,
    })
    .from(caseCounts)
    .innerJoin(sourceQuotes, eq(caseCounts.sourceQuoteId, sourceQuotes.id))
    .innerJoin(extractionRuns, eq(caseCounts.extractionRunId, extractionRuns.id))
    .innerJoin(documents, eq(extractionRuns.documentId, documents.id))
    .innerJoin(sources, eq(documents.sourceId, sources.id))
    .where(and(eq(caseCounts.id, data.rowAId), isNull(caseCounts.supersededBy)))
    .limit(1);

  const rowBResult = await db
    .select({
      ccId: caseCounts.id,
      outbreakId: caseCounts.outbreakId,
      metric: caseCounts.metric,
      asOf: caseCounts.asOf,
      value: caseCounts.value,
      supersededBy: caseCounts.supersededBy,
      quoteText: sourceQuotes.quoteText,
      publishedAt: documents.publishedAt,
      trustScore: sources.trustScore,
      sourceSlug: sources.slug,
    })
    .from(caseCounts)
    .innerJoin(sourceQuotes, eq(caseCounts.sourceQuoteId, sourceQuotes.id))
    .innerJoin(extractionRuns, eq(caseCounts.extractionRunId, extractionRuns.id))
    .innerJoin(documents, eq(extractionRuns.documentId, documents.id))
    .innerJoin(sources, eq(documents.sourceId, sources.id))
    .where(and(eq(caseCounts.id, data.rowBId), isNull(caseCounts.supersededBy)))
    .limit(1);

  const rA = rows[0];
  const rB = rowBResult[0];

  // If either row has been superseded since the event was emitted → stale no-op
  if (!(rA && rB)) {
    return { stale: true };
  }

  const toCandidate = (
    r: NonNullable<typeof rA>,
  ): ReconcileCandidate & { asOf: string; metric: string; outbreakId: string } => ({
    id: r.ccId,
    value: r.value,
    trustScore: r.trustScore,
    publishedAtIso: r.publishedAt?.toISOString() ?? new Date(0).toISOString(),
    quoteText: r.quoteText,
    sourceSlug: r.sourceSlug,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    outbreakId: r.outbreakId,
    metric: r.metric,
    asOf: r.asOf instanceof Date ? r.asOf.toISOString().slice(0, 10) : String(r.asOf),
  });

  return { stale: false, a: toCandidate(rA), b: toCandidate(rB) };
}

// --- helpers -----------------------------------------------------------------

async function applyReconcileSupersede(
  winnerId: string,
  loserId: string,
  reason: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(caseCounts)
      .set({ supersededBy: winnerId })
      .where(
        and(
          eq(caseCounts.id, loserId),
          ne(caseCounts.id, winnerId),
          isNull(caseCounts.supersededBy),
        ),
      );
    await tx.insert(agentActions).values({
      agent: "reconcile-counts",
      action: "superseded",
      subjectTable: "case_counts",
      subjectId: loserId,
      payload: { winnerId, loserId, reason },
    });
  });
}

async function writeReconcileAudit(params: AuditParams): Promise<void> {
  await db.insert(auditLlmTraces).values({
    traceId: crypto.randomUUID(),
    spanId: crypto.randomUUID(),
    name: "reconcile",
    agentName: "reconcile-counts",
    modelId: MODEL_OPUS,
    promptVersionHash: params.promptVersionHash,
    cacheReadInputTokens: params.cacheReadInputTokens,
    cacheCreationInputTokens: params.cacheCreationInputTokens,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    durationMs: null,
  });
  await logAnthropicUsage({
    modelId: MODEL_OPUS,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cacheReadInputTokens: params.cacheReadInputTokens,
    cacheCreationInputTokens: params.cacheCreationInputTokens,
  });
}

// --- Inngest function ---------------------------------------------------------

export const reconcileCounts = inngest.createFunction(
  RECONCILE_COUNTS_FN_CONFIG,
  RECONCILE_COUNTS_TRIGGER,
  // eslint-disable-next-line max-statements -- Inngest handler orchestrates multiple steps; complexity is in coordination, not logic
  async ({ event, step }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const data = event.data as ReconcileRequestedData;
    // Compute outside steps so it is stable across Inngest retries.
    const reconcileHash = computeReconcilePromptHash();

    // Kill-switch: reconcile burns Opus tokens — re-evaluate on every attempt; not memoized.
    // Uses "low" priority: reconcile is downstream cleanup, not new ingestion.
    const capacity = await getExtractionCapacity();
    const guard = evaluateCapacity(capacity, "low");
    if (!guard.proceed) {
      if (capacity === "paused") {
        await step.run("alert-paused", async () => notifyKillSwitch(data.outbreakId));
      }
      return { skipped: true, reason: guard.skipReason };
    }

    const ctx = await step.run("load-pair", async () => loadReconcilePair(data));
    if (ctx.stale) {
      return { stale: true };
    }

    const input: ReconcileInput = {
      a: ctx.a,
      b: ctx.b,
      metric: data.metric,
      asOf: data.asOf,
    };

    const rawMsg = await step.ai.wrap("reconcile", createOpusMessage, buildReconcileParams(input));

    const { decision, usage } = await step.run("parse-reconcile", () =>
      parseReconcileResponse(rawMsg, input),
    );

    if (decision.escalate) {
      await step.run("write-incident-conflict", () =>
        db
          .insert(incidents)
          .values({
            class: "conflict_unresolvable",
            outbreakId: data.outbreakId,
            status: "open",
            detail: { rowAId: data.rowAId, rowBId: data.rowBId, reason: decision.reason },
          })
          .onConflictDoNothing(),
      );
      await step.run("notify-conflict", async () =>
        notifySlack(
          `Unresolvable conflict: outbreak ${data.outbreakId} — ${data.metric} on ${data.asOf}. Reason: ${decision.reason}`,
        ),
      );
      // Every Opus call — including escalations — must be recorded for cost tracking.
      await step.run("write-audit-escalation", async () =>
        writeReconcileAudit({
          promptVersionHash: reconcileHash,
          cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
          cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
        }),
      );
      return { escalated: true, reason: decision.reason };
    }

    // apply-supersede contains only the DB transaction. Audit writes live in the next
    // step so that a failure there cannot cause the transaction to re-run on retry
    // (the UPDATE is idempotent via the isNull guard; agentActions has no unique key).
    await step.run("apply-supersede", async () =>
      applyReconcileSupersede(decision.winner_id, decision.loser_id, decision.reason),
    );

    await step.run("write-audit", async () =>
      writeReconcileAudit({
        promptVersionHash: reconcileHash,
        cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
        cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
      }),
    );

    return { winner: decision.winner_id, loser: decision.loser_id };
  },
);
