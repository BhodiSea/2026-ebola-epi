// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockPersistExtraction = vi.fn();
vi.mock("@/inngest/lib/persist-extraction", () => ({
  persistExtraction: mockPersistExtraction,
}));

const dbChain = vi.hoisted(() => {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    innerJoin: vi.fn(),
    values: vi.fn(),
    onConflictDoNothing: vi.fn().mockResolvedValue({}),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  return chain;
});

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => dbChain),
    insert: vi.fn(() => dbChain),
  },
}));

vi.mock("@ituri/db", () => ({
  batchResults: {},
  documents: {
    id: "id",
    fullText: "full_text",
    publishedAt: "published_at",
    sourceId: "source_id",
  },
  sources: { id: "id", slug: "slug" },
}));

vi.mock("@ituri/extract", () => ({
  buildExtractionParams: vi.fn(() => ({
    model: "mock",
    system: "mock",
    tools: [],
    messages: [],
  })),
  computePromptVersionHash: vi.fn(() => "hash-abc"),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  inArray: vi.fn(),
}));

// ─── persistBatchResults — publishedAt null guard ─────────────────────────────
// `documents.published_at` is nullable. The old code used `publishedAt ?? new Date()`
// as a fallback, silently stamping today as the publication date, corrupting every
// time-series query that touches back-filled rows. The fix is to skip documents
// that have no publishedAt rather than inventing a date.

describe("persistBatchResults", () => {
  it("skips persistExtraction when the document has no publishedAt", async () => {
    mockPersistExtraction.mockClear();
    // Audit insert resolves OK
    dbChain.onConflictDoNothing.mockResolvedValueOnce({});
    // Doc context select returns a document with publishedAt: null
    dbChain.where.mockResolvedValueOnce([
      {
        id: "doc-x",
        fullText: "who don text",
        publishedAt: null,
        sourceSlug: "who-don",
      },
    ]);

    const { persistBatchResults } = await import("@/inngest/lib/back-fill");
    await persistBatchResults("batch-123", [
      {
        custom_id: "backfill-doc-x",
        result: {
          type: "succeeded",
          message: {
            content: [
              {
                type: "tool_use",
                id: "tu1",
                name: "extract_case_counts",
                input: {},
              },
            ],
            usage: { input_tokens: 100, output_tokens: 50 },
          },
        },
      },
    ]);

    expect(mockPersistExtraction).not.toHaveBeenCalled();
  });

  it("skips persistExtraction for errored batch items regardless of publishedAt", async () => {
    mockPersistExtraction.mockClear();
    dbChain.onConflictDoNothing.mockResolvedValueOnce({});

    const { persistBatchResults } = await import("@/inngest/lib/back-fill");
    await persistBatchResults("batch-456", [
      {
        custom_id: "backfill-doc-y",
        result: { type: "errored" },
      },
    ]);

    expect(mockPersistExtraction).not.toHaveBeenCalled();
  });
});
