// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@ituri/extract", () => ({ MODEL_SONNET: "claude-sonnet-4-6" }));
vi.mock("@/inngest/lib/persist-extraction", () => ({
  anthropic: { messages: { create: vi.fn() } },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const dbChain = vi.hoisted(() => {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn().mockResolvedValue([]),
    innerJoin: vi.fn(),
    limit: vi.fn().mockResolvedValue([]),
    set: vi.fn(),
    values: vi.fn(),
    onConflictDoNothing: vi.fn().mockResolvedValue({}),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  return chain;
});

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => dbChain),
    update: vi.fn(() => dbChain),
    insert: vi.fn(() => dbChain),
  },
}));

vi.mock("@ituri/db", () => ({
  sources: { id: "id", slug: "slug", url: "url", metadata: "metadata" },
  agentActions: {},
  documents: {
    id: "id",
    fullText: "full_text",
    publishedAt: "published_at",
    ingestedAt: "ingested_at",
    sourceId: "source_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ a, b })),
  desc: vi.fn(),
  inArray: vi.fn(),
}));

// ─── computeLineDiff (multiset diff) ─────────────────────────────────────────
// The old Set-based implementation deduplicates lines before diffing, so a line
// that appears 3× in old and 2× in new produces an empty diff. The multiset
// implementation correctly shows one removal.

describe("computeLineDiff (multiset diff)", () => {
  it("detects removal when a repeated line's count decreases", async () => {
    const { computeLineDiff } = await import("@/inngest/lib/maintenance");
    // old: "data" appears twice; new: "data" appears once
    // Set-based: both sets contain "data" → empty diff (bug)
    // Multiset: 2 – 1 = 1 removal → "- data"
    const diff = computeLineDiff("header\ndata\ndata\nfooter", "header\ndata\nfooter");
    expect(diff).toContain("- data");
    expect(diff).not.toContain("+ data");
  });

  it("detects addition when a repeated line's count increases", async () => {
    const { computeLineDiff } = await import("@/inngest/lib/maintenance");
    const diff = computeLineDiff("header\nfooter", "header\nnew\nnew\nfooter");
    expect(diff).toContain("+ new");
  });

  it("returns empty string when content is identical", async () => {
    const { computeLineDiff } = await import("@/inngest/lib/maintenance");
    expect(computeLineDiff("same\ncontent", "same\ncontent")).toBe("");
  });

  it("returns empty string for two empty strings", async () => {
    const { computeLineDiff } = await import("@/inngest/lib/maintenance");
    expect(computeLineDiff("", "")).toBe("");
  });
});

// ─── checkAndFixLinkRot — fetch timeout ──────────────────────────────────────
// headAllSources got AbortSignal.timeout(10_000) in the first red-team pass;
// checkAndFixLinkRot was missed. The HEAD request can hang indefinitely.

describe("checkAndFixLinkRot", () => {
  it("passes a 10-second AbortSignal to every HEAD request", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    dbChain.orderBy.mockResolvedValueOnce([
      { id: "src-1", slug: "who-don", url: "https://www.who.int/" },
    ]);
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: { get: vi.fn().mockReturnValue(null) },
    });

    const { checkAndFixLinkRot } = await import("@/inngest/lib/maintenance");
    await checkAndFixLinkRot();

    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    timeoutSpy.mockRestore();
    vi.clearAllMocks();
    vi.resetModules();
  });
});
