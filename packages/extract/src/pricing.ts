// Anthropic token pricing (USD/token). Prices sourced 2026-05-29.
// https://www.anthropic.com/pricing
// cacheWrite is priced at the 1h TTL rate (AGENTS.md Rule 13 — all tools+system
// breakpoints use ttl:"1h"). This is a conservative estimate for cost tracking;
// the kill-switch is a circuit breaker, not a precise invoice.

import { MODEL_HAIKU, MODEL_OPUS, MODEL_SONNET } from "./models.js";
import type { ExtractionUsage } from "./run.js";

export interface ModelPrice {
  /** USD per cache-read input token (~0.1× input) */
  cacheRead: number;
  /** USD per cache-creation input token at 1h TTL (~1.25× input) */
  cacheWrite: number;
  /** USD per input token (uncached) */
  input: number;
  /** USD per output token */
  output: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  [MODEL_OPUS]: {
    input: 15 / 1_000_000,
    output: 75 / 1_000_000,
    cacheRead: 1.5 / 1_000_000,
    cacheWrite: 18.75 / 1_000_000,
  },
  [MODEL_SONNET]: {
    input: 3 / 1_000_000,
    output: 15 / 1_000_000,
    cacheRead: 0.3 / 1_000_000,
    cacheWrite: 3.75 / 1_000_000,
  },
  [MODEL_HAIKU]: {
    input: 0.8 / 1_000_000,
    output: 4 / 1_000_000,
    cacheRead: 0.08 / 1_000_000,
    cacheWrite: 1 / 1_000_000,
  },
};

export interface ComputeCostOptions {
  batchDiscount?: boolean;
}

/**
 * Compute the USD cost of one Anthropic API call.
 *
 * Anthropic's `input_tokens` already excludes cached and created tokens, so
 * each bucket is priced independently and summed. Result is rounded to 4 dp
 * to match the `numeric(10,4)` DB column.
 *
 * The 50% Message Batches discount stacks with caching and is applied to the
 * full sum when `opts.batchDiscount` is true.
 */
export function computeCost(
  usage: Pick<
    ExtractionUsage,
    "cache_creation_input_tokens" | "cache_read_input_tokens" | "input_tokens" | "output_tokens"
  >,
  modelId: string,
  opts: ComputeCostOptions = {},
): number {
  const price = MODEL_PRICES[modelId];
  if (price === undefined) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;

  const total =
    inputTokens * price.input +
    outputTokens * price.output +
    cacheRead * price.cacheRead +
    cacheWrite * price.cacheWrite;

  const discounted = opts.batchDiscount === true ? total / 2 : total;
  return Math.round(discounted * 1e4) / 1e4;
}
