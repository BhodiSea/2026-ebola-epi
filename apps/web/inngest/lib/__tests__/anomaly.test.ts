// @vitest-environment node
// WS1: AnomalyParams.metric narrowed from string → MetricLiteral; existing tests cover computeZScore/computeCfrRatio.
import { describe, expect, it, vi } from "vitest";

import { computeCfrRatio, computeZScore } from "../anomaly";

vi.mock("server-only", () => ({}));

// ── computeZScore ─────────────────────────────────────────────────────────────

describe("computeZScore", () => {
  it("returns null when fewer than 3 prior values (insufficient data)", () => {
    expect(computeZScore([], 100)).toBeNull();
    expect(computeZScore([100], 200)).toBeNull();
    expect(computeZScore([100, 110], 200)).toBeNull();
  });

  it("returns null when stddev is 0 (all identical prior values)", () => {
    expect(computeZScore([100, 100, 100], 100)).toBeNull();
    expect(computeZScore([50, 50, 50, 50], 200)).toBeNull();
  });

  it("returns a z-score > 4 for an extreme outlier", () => {
    // mean=100, stddev~5, new=130 → z≈6
    const z = computeZScore([95, 100, 105, 98, 102], 130);
    expect(z).not.toBeNull();
    expect(z!).toBeGreaterThan(4);
  });

  it("returns a z-score < 4 for a value within normal range", () => {
    const z = computeZScore([95, 100, 105, 98, 102], 103);
    expect(z).not.toBeNull();
    expect(Math.abs(z!)).toBeLessThan(4);
  });

  it("returns negative z for a value below the mean", () => {
    const z = computeZScore([100, 110, 105, 108], 50);
    expect(z).not.toBeNull();
    expect(z!).toBeLessThan(0);
  });

  it("exact z=0 when new value equals the mean", () => {
    const z = computeZScore([100, 110, 120], 110);
    expect(z).not.toBeNull();
    expect(z!).toBeCloseTo(0, 5);
  });

  it("returns > 4 for a single extreme point with diverse prior series", () => {
    // Realistic epidemic series: cases slowly rising; then sudden spike
    const prior = [142, 158, 163, 171, 178, 185, 190];
    const z = computeZScore(prior, 600);
    expect(z).not.toBeNull();
    expect(z!).toBeGreaterThan(4);
  });
});

// ── computeCfrRatio ───────────────────────────────────────────────────────────

describe("computeCfrRatio", () => {
  it("returns the correct ratio for deaths / confirmed cases", () => {
    expect(computeCfrRatio(8, 10)).toBe(0.8);
    expect(computeCfrRatio(9, 10)).toBe(0.9);
    expect(computeCfrRatio(10, 10)).toBe(1);
  });

  it("returns a value < 0.80 when CFR is below the threshold", () => {
    expect(computeCfrRatio(7, 10)).toBe(0.7);
    expect(computeCfrRatio(1, 100)).toBe(0.01);
  });

  it("returns 0 when deaths is 0", () => {
    expect(computeCfrRatio(0, 100)).toBe(0);
  });

  it("returns 0 (not Infinity) when confirmed cases is 0 (safeguard)", () => {
    expect(computeCfrRatio(8, 0)).toBe(0);
  });

  it("returns 1.0 for a 100% CFR", () => {
    expect(computeCfrRatio(50, 50)).toBe(1);
  });

  it("handles fractional deaths (rounding not applied — caller decides)", () => {
    // 3 deaths out of 7 cases = 0.4286…
    expect(computeCfrRatio(3, 7)).toBeCloseTo(3 / 7);
  });
});
