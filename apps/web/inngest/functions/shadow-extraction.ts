import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { caseCounts, extractionRuns, shadowResults } from "@ituri/db";
import { buildExtractionParams, parseExtractionResponse } from "@ituri/extract";
import { desc, eq } from "drizzle-orm";

import { inngest } from "../client";
import { evaluateCapacity } from "../lib/capacity-guard";
import type { FieldVariances } from "../lib/field-variances";
import { computeFieldVariances } from "../lib/field-variances";
import { SHADOW_EXTRACTION_FN_CONFIG, SHADOW_EXTRACTION_TRIGGER } from "./shadow-extraction-config";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getExtractionCapacity } from "@/lib/kill-switch";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

async function createMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  return anthropic.messages.create(params);
}

// ─── Inngest function ─────────────────────────────────────────────────────────

export const shadowExtraction = inngest.createFunction(
  SHADOW_EXTRACTION_FN_CONFIG,
  SHADOW_EXTRACTION_TRIGGER,
  async ({ event, step }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const { documentId, fullText, candidatePromptVersion } = event.data as {
      candidatePromptVersion: string;
      documentId: string;
      fullText: string;
    };

    // Shadow runs are low-priority: re-evaluate on every attempt; not memoized.
    const capacity = await getExtractionCapacity();
    const guard = evaluateCapacity(capacity, "low");
    if (!guard.proceed) {
      return { skipped: true, reason: guard.skipReason };
    }

    // Run candidate prompt extraction (best-effort; no anomaly checks; no writes to case_counts).
    const rawMsg = await step.ai.wrap(
      "shadow-extract",
      createMessage,
      buildExtractionParams(fullText, "candidate"),
    );

    const computeResult = await step.run(
      "compute-variances",
      async (): Promise<{ productionRunId: null | string; variances: FieldVariances }> => {
        // Parse candidate rows (substring verify may throw — let Inngest retry once).
        const { rows: candidateRows } = parseExtractionResponse(rawMsg, fullText);

        // Load latest production extraction_runs for this document.
        const runRows = await db
          .select({ id: extractionRuns.id })
          .from(extractionRuns)
          .where(eq(extractionRuns.documentId, documentId))
          .orderBy(desc(extractionRuns.createdAt))
          .limit(1);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Drizzle uuid column inferred as any in step.run context
        const productionRunId = runRows[0]?.id ?? null;

        // Load production case_counts metric+value for that run.
        // case_counts does not store pathogen_icd11/country_iso3; key is metric+as_of only.
        const prodCounts =
          productionRunId === null
            ? []
            : await db
                .select({
                  metric: caseCounts.metric,
                  value: caseCounts.value,
                  asOf: caseCounts.asOf,
                })
                .from(caseCounts)
                .where(eq(caseCounts.extractionRunId, productionRunId));

        const prodRows = prodCounts.map((r) => ({
          metric: r.metric,
          // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors RowInput snake_case API contract
          as_of: r.asOf instanceof Date ? r.asOf.toISOString().slice(0, 10) : String(r.asOf),
          value: r.value,
        }));

        return {
          variances: computeFieldVariances(candidateRows, prodRows),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Drizzle uuid column inferred as any in step.run context
          productionRunId,
        };
      },
    );

    // Write to audit.shadow_results — idempotent via the (document_id, candidate_version) unique index.
    await step.run("persist-shadow", async () => {
      await db
        .insert(shadowResults)
        .values({
          documentId,
          candidateVersion: candidatePromptVersion,
          productionRunId: computeResult.productionRunId,
          fieldVariances: computeResult.variances,
        })
        .onConflictDoNothing();
    });

    return {
      documentId,
      candidateVersion: candidatePromptVersion,
      mismatchedRows: computeResult.variances.mismatchedRows,
    };
  },
);
