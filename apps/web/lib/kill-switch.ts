import "server-only";

import { get } from "@vercel/edge-config";

import { env } from "@/lib/env";

export const KILL_SWITCH_ERROR = "KILL_SWITCH_ACTIVE: extraction disabled by daily cost cap";

export type ExtractionCapacity = "full" | "low_priority_only" | "paused" | "reduced";

/**
 * Throws KILL_SWITCH_ACTIVE when extraction_enabled is false in Edge Config.
 * Safe no-op (resolves) when EDGE_CONFIG env is unset (dev / CI / test).
 */
export async function assertExtractionEnabled(): Promise<void> {
  if (!edgeConfigReady()) {
    return;
  }
  if ((await get<boolean>("extraction_enabled")) === false) {
    throw new Error(KILL_SWITCH_ERROR);
  }
}

/**
 * Returns the current extraction capacity tier based on Edge Config values.
 *
 * Tiers (based on extraction_spend_ratio):
 *  ≥ 0.95 → low_priority_only (back-fills and re-extracts deferred)
 *  ≥ 0.80 → reduced           (informational; concurrency not yet auto-throttled)
 *  < 0.80 → full
 *  disabled → paused           (hard circuit breaker)
 *
 * Safe default is "full" when EDGE_CONFIG is unset.
 */
export async function getExtractionCapacity(): Promise<ExtractionCapacity> {
  if (!edgeConfigReady()) {
    return "full";
  }

  const [enabled, ratioStr] = await Promise.all([
    get<boolean>("extraction_enabled"),
    get<string>("extraction_spend_ratio"),
  ]);

  if (enabled === false) {
    return "paused";
  }

  const ratio = Number.parseFloat(ratioStr ?? "0");
  if (Number.isNaN(ratio)) {
    return "full";
  }
  if (ratio >= 0.95) {
    return "low_priority_only";
  }
  if (ratio >= 0.8) {
    return "reduced";
  }
  return "full";
}

/** Returns true only when the Edge Config connection string is configured. */
function edgeConfigReady(): boolean {
  return env.EDGE_CONFIG !== undefined;
}
