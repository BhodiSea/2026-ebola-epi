import { describe, expect, it } from "vitest";

import { shouldReconcile } from "../shared.js";

describe("shouldReconcile", () => {
  it("returns true for 100 vs 80 — 25% relative difference at the threshold", () => {
    expect(shouldReconcile(100, 80)).toBe(true);
  });

  it("returns false for 100 vs 90 — 11% relative difference, below threshold", () => {
    expect(shouldReconcile(100, 90)).toBe(false);
  });

  it("returns true for 142 vs 108 — exit-gate synthetic reconciliation values", () => {
    expect(shouldReconcile(142, 108)).toBe(true);
  });

  it("is symmetric — order of arguments does not matter", () => {
    expect(shouldReconcile(80, 100)).toBe(shouldReconcile(100, 80));
    expect(shouldReconcile(108, 142)).toBe(shouldReconcile(142, 108));
  });

  it("returns false when either value is 0 (division-by-zero guard)", () => {
    expect(shouldReconcile(0, 100)).toBe(false);
    expect(shouldReconcile(100, 0)).toBe(false);
    expect(shouldReconcile(0, 0)).toBe(false);
  });

  it("returns false for identical values", () => {
    expect(shouldReconcile(50, 50)).toBe(false);
  });
});
