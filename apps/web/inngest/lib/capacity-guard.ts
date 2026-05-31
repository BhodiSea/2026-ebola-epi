import type { ExtractionCapacity } from "@/lib/kill-switch";

export interface CapacityGuardResult {
  proceed: boolean;
  skipReason?: string;
}

/**
 * Pure decision function for the four-tier extraction capacity model.
 * Returns what to do — callers handle the Inngest side-effects (logging, events, notifications).
 *
 * kind "high"  = new documents from trusted sources; proceeds through low_priority_only.
 * kind "low"   = back-fills, re-extracts, shadow runs; deferred at low_priority_only.
 */
export function evaluateCapacity(
  capacity: ExtractionCapacity,
  kind: "high" | "low",
): CapacityGuardResult {
  if (capacity === "paused") {
    return { proceed: false, skipReason: "kill_switch_paused" };
  }
  if (capacity === "low_priority_only" && kind === "low") {
    return { proceed: false, skipReason: "low_priority_deferred" };
  }
  return { proceed: true };
}
