import { describe, expect, it } from "vitest";

import { MODEL_HAIKU, MODEL_OPUS, MODEL_SONNET } from "../models.js";
import { computeCost } from "../pricing.js";

const baseUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

describe("computeCost", () => {
  it("prices input tokens at the correct per-token rate for Sonnet", () => {
    const cost = computeCost({ ...baseUsage, input_tokens: 1_000_000 }, MODEL_SONNET);
    // Sonnet input: $3 / 1M tokens = $3.000000 → 4dp
    expect(cost).toBe(3);
  });

  it("prices output tokens correctly", () => {
    const cost = computeCost({ ...baseUsage, output_tokens: 1_000_000 }, MODEL_SONNET);
    // Sonnet output: $15 / 1M tokens
    expect(cost).toBe(15);
  });

  it("prices cache_read_input_tokens at the cache-read rate (0.1× input)", () => {
    const cost = computeCost({ ...baseUsage, cache_read_input_tokens: 1_000_000 }, MODEL_SONNET);
    // Sonnet cache-read: $0.30 / 1M tokens = 0.1 × $3
    expect(cost).toBe(0.3);
  });

  it("prices cache_creation_input_tokens at the 1h TTL cache-write rate (~1.25× input)", () => {
    const cost = computeCost(
      { ...baseUsage, cache_creation_input_tokens: 1_000_000 },
      MODEL_SONNET,
    );
    // Sonnet cache-write (1h): $3.75 / 1M tokens = 1.25 × $3
    expect(cost).toBe(3.75);
  });

  it("prices each bucket independently and sums them", () => {
    const cost = computeCost(
      {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 200,
        cache_creation_input_tokens: 80,
      },
      MODEL_SONNET,
    );
    // input: 100 * 3/1e6 = 0.0003
    // output: 50 * 15/1e6 = 0.00075
    // cacheRead: 200 * 0.3/1e6 = 0.00006
    // cacheWrite: 80 * 3.75/1e6 = 0.0003
    const expected = Math.round((0.0003 + 0.000_75 + 0.000_06 + 0.0003) * 1e4) / 1e4;
    expect(cost).toBe(expected);
  });

  it("supports Opus model", () => {
    const cost = computeCost({ ...baseUsage, input_tokens: 1_000_000 }, MODEL_OPUS);
    // Opus input: $15 / 1M tokens
    expect(cost).toBe(15);
  });

  it("supports Haiku model", () => {
    const cost = computeCost({ ...baseUsage, input_tokens: 1_000_000 }, MODEL_HAIKU);
    // Haiku input: $0.80 / 1M tokens
    expect(cost).toBe(0.8);
  });

  it("halves the total when batchDiscount is true", () => {
    const full = computeCost({ ...baseUsage, input_tokens: 1_000_000 }, MODEL_SONNET);
    const batch = computeCost({ ...baseUsage, input_tokens: 1_000_000 }, MODEL_SONNET, {
      batchDiscount: true,
    });
    expect(batch).toBe(full / 2);
  });

  it("throws for an unknown model ID", () => {
    expect(() => computeCost({ ...baseUsage, input_tokens: 100 }, "claude-does-not-exist")).toThrow(
      "Unknown model",
    );
  });

  it("returns 0 for all-zero usage", () => {
    expect(computeCost(baseUsage, MODEL_SONNET)).toBe(0);
  });

  it("rounds to exactly 4 decimal places", () => {
    // 1 token of Sonnet input = 3/1e6 = 0.000003 → rounds to 0.0000
    // Use a quantity that produces a result needing rounding
    const cost = computeCost({ ...baseUsage, input_tokens: 1 }, MODEL_SONNET);
    const dp = cost.toString().split(".")[1]?.length ?? 0;
    expect(dp).toBeLessThanOrEqual(4);
  });

  it("treats null/absent cache tokens as 0", () => {
    // null is valid per the ExtractionUsage type; absent properties exercise the ?? 0 fallback.
    const cost = computeCost(
      {
        input_tokens: 100,
        output_tokens: 0,
        cache_read_input_tokens: null,
        // cache_creation_input_tokens intentionally omitted to test ?? 0 fallback
      },
      MODEL_SONNET,
    );
    const costZero = computeCost({ ...baseUsage, input_tokens: 100 }, MODEL_SONNET);
    expect(cost).toBe(costZero);
  });
});
