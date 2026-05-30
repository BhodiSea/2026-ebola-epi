// @vitest-environment node
// Lint fixes: refactored mock helpers to avoid nested ternaries (unicorn/no-nested-ternary).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only before importing the module under test.
vi.mock("server-only", () => ({}));

const KILL_SWITCH_ACTIVE_PREFIX = /^KILL_SWITCH_ACTIVE:/;

// Mock @vercel/edge-config
const mockGet = vi.fn();
vi.mock("@vercel/edge-config", () => ({ get: mockGet }));

// Mock env so EDGE_CONFIG can be controlled per-test.
const mockEnv = vi.hoisted(() => ({ EDGE_CONFIG: undefined as string | undefined }));
vi.mock("@/lib/env", () => ({ env: mockEnv }));

describe("KILL_SWITCH_ERROR constant", () => {
  it("starts with the KILL_SWITCH_ACTIVE prefix (matched by extract-document.ts error catch)", async () => {
    const { KILL_SWITCH_ERROR } = await import("@/lib/kill-switch");
    expect(KILL_SWITCH_ERROR).toMatch(KILL_SWITCH_ACTIVE_PREFIX);
  });
});

describe("assertExtractionEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.EDGE_CONFIG = "https://edge-config.vercel.com/ecfg_test?token=tok";
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("resolves (does not throw) when extraction_enabled is true", async () => {
    mockGet.mockResolvedValue(true);
    const { assertExtractionEnabled } = await import("@/lib/kill-switch");
    await expect(assertExtractionEnabled()).resolves.toBeUndefined();
  });

  it("throws KILL_SWITCH_ACTIVE when extraction_enabled is false", async () => {
    mockGet.mockResolvedValue(false);
    const { assertExtractionEnabled } = await import("@/lib/kill-switch");
    await expect(assertExtractionEnabled()).rejects.toThrow("KILL_SWITCH_ACTIVE");
  });

  it("resolves (safe default) when EDGE_CONFIG is not set", async () => {
    mockEnv.EDGE_CONFIG = undefined;
    const { assertExtractionEnabled } = await import("@/lib/kill-switch");
    await expect(assertExtractionEnabled()).resolves.toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });
});

type EdgeConfigValue = boolean | null | string;

/** Build a mock Edge Config responder without nested ternaries. */
function makeEdgeConfigMock(enabled: boolean, ratio: string): (key: string) => EdgeConfigValue {
  const values: Record<string, EdgeConfigValue> = {
    extraction_enabled: enabled,
    extraction_spend_ratio: ratio,
  };
  return (key: string): EdgeConfigValue => values[key] ?? null;
}

describe("getExtractionCapacity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.EDGE_CONFIG = "https://edge-config.vercel.com/ecfg_test?token=tok";
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns "paused" when extraction_enabled is false', async () => {
    mockGet.mockImplementation(makeEdgeConfigMock(false, "0.5"));
    const { getExtractionCapacity } = await import("@/lib/kill-switch");
    expect(await getExtractionCapacity()).toBe("paused");
  });

  it('returns "low_priority_only" when ratio >= 0.95', async () => {
    mockGet.mockImplementation(makeEdgeConfigMock(true, "0.96"));
    const { getExtractionCapacity } = await import("@/lib/kill-switch");
    expect(await getExtractionCapacity()).toBe("low_priority_only");
  });

  it('returns "reduced" when ratio >= 0.80 and < 0.95', async () => {
    mockGet.mockImplementation(makeEdgeConfigMock(true, "0.85"));
    const { getExtractionCapacity } = await import("@/lib/kill-switch");
    expect(await getExtractionCapacity()).toBe("reduced");
  });

  it('returns "full" when ratio < 0.80', async () => {
    mockGet.mockImplementation(makeEdgeConfigMock(true, "0.5"));
    const { getExtractionCapacity } = await import("@/lib/kill-switch");
    expect(await getExtractionCapacity()).toBe("full");
  });

  it('returns "full" when ratio is not a number (NaN guard)', async () => {
    mockGet.mockImplementation(makeEdgeConfigMock(true, "bad"));
    const { getExtractionCapacity } = await import("@/lib/kill-switch");
    expect(await getExtractionCapacity()).toBe("full");
  });

  it('returns "full" (safe default) when EDGE_CONFIG is not set', async () => {
    mockEnv.EDGE_CONFIG = undefined;
    const { getExtractionCapacity } = await import("@/lib/kill-switch");
    expect(await getExtractionCapacity()).toBe("full");
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns "reduced" when ratio is exactly 0.80 boundary', async () => {
    mockGet.mockImplementation(makeEdgeConfigMock(true, "0.80"));
    const { getExtractionCapacity } = await import("@/lib/kill-switch");
    expect(await getExtractionCapacity()).toBe("reduced");
  });
});
