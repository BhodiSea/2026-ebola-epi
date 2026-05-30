// @vitest-environment node
// Guard: every adapter in ADAPTER_REGISTRY must have a valid 5-field cron expression.
// This catches invalid pollIntervals on new adapters at CI time, not at Inngest deploy time.
import { describe, expect, it } from "vitest";

import { ADAPTER_REGISTRY } from "../registry.js";

// eslint-disable-next-line security/detect-unsafe-regex
const FIVE_FIELD_CRON = /^(\S+ ){4}\S+$/;
const HOSTNAME_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/;

describe("ADAPTER_REGISTRY", () => {
  it("is non-empty", () => {
    expect(Object.keys(ADAPTER_REGISTRY).length).toBeGreaterThan(0);
  });

  it.each(
    Object.entries(ADAPTER_REGISTRY),
  )("%s: pollInterval is a valid 5-field cron expression", (_slug, adapter) => {
    expect(adapter.pollInterval).toMatch(FIVE_FIELD_CRON);
  });

  it.each(
    Object.entries(ADAPTER_REGISTRY),
  )("%s: sourceSlug matches registry key", (slug, adapter) => {
    expect(adapter.sourceSlug).toBe(slug);
  });

  it.each(
    Object.entries(ADAPTER_REGISTRY),
  )("%s: throttleKey is a non-empty hostname string", (_slug, adapter) => {
    expect(adapter.throttleKey).toMatch(HOSTNAME_RE);
  });
});
