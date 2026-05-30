import "server-only";

import { anthropicUsageLog } from "@ituri/db";
import { computeCost } from "@ituri/extract";

import { db } from "@/lib/db";

export interface UsageLogParams {
  batchDiscount?: boolean;
  cacheCreationInputTokens?: null | number;
  cacheReadInputTokens?: null | number;
  extractionRunId?: null | string;
  inputTokens: number;
  modelId: string;
  outputTokens: number;
}

/**
 * Insert one row into audit.anthropic_usage_log with cost_usd populated.
 * DRY helper for the extraction, reconcile, and triage call sites.
 *
 * The snake_case usage object is constructed internally to satisfy the
 * ExtractionUsage type expected by computeCost (Anthropic SDK naming).
 */
export async function logAnthropicUsage(params: UsageLogParams): Promise<void> {
  /* eslint-disable @typescript-eslint/naming-convention -- Anthropic SDK uses snake_case; computeCost requires this shape */
  const sdkUsage = {
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cache_read_input_tokens: params.cacheReadInputTokens ?? null,
    cache_creation_input_tokens: params.cacheCreationInputTokens ?? null,
  };
  /* eslint-enable @typescript-eslint/naming-convention */
  const costUsd = computeCost(
    sdkUsage,
    params.modelId,
    params.batchDiscount === true ? { batchDiscount: true } : {},
  );

  await db.insert(anthropicUsageLog).values({
    extractionRunId: params.extractionRunId ?? null,
    modelId: params.modelId,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cacheReadInputTokens: params.cacheReadInputTokens ?? 0,
    cacheCreationInputTokens: params.cacheCreationInputTokens ?? 0,
    costUsd: String(costUsd),
  });
}
