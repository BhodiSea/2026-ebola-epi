// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { CapacityGuardResult } from "@/inngest/lib/capacity-guard";
import { evaluateCapacity } from "@/inngest/lib/capacity-guard";

describe("evaluateCapacity", () => {
  it('returns proceed:false + skipReason "kill_switch_paused" when capacity is "paused"', () => {
    const result: CapacityGuardResult = evaluateCapacity("paused", "high");
    expect(result.proceed).toBe(false);
    expect(result.skipReason).toBe("kill_switch_paused");
  });

  it('returns proceed:false + skipReason "low_priority_deferred" when capacity is "low_priority_only" and kind is "low"', () => {
    const result = evaluateCapacity("low_priority_only", "low");
    expect(result.proceed).toBe(false);
    expect(result.skipReason).toBe("low_priority_deferred");
  });

  it('returns proceed:true when capacity is "low_priority_only" and kind is "high" (high-priority extraction continues)', () => {
    const result = evaluateCapacity("low_priority_only", "high");
    expect(result.proceed).toBe(true);
  });

  it('returns proceed:true + no skipReason when capacity is "full"', () => {
    const result = evaluateCapacity("full", "high");
    expect(result.proceed).toBe(true);
    expect(result.skipReason).toBeUndefined();
  });
});
