// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockDbInsert = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) })),
    insert: vi.fn(() => ({ values: mockDbInsert.mockResolvedValue({}) })),
    update: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({}),
    })),
  },
}));

vi.mock("@ituri/db", () => ({
  sourceQuotes: { id: "id", embedding: "embedding" },
  agentActions: {},
}));

vi.mock("drizzle-orm", () => ({
  isNull: vi.fn(),
  eq: vi.fn(),
}));

const mockEmbedMany = vi.hoisted(() => vi.fn());
vi.mock("ai", () => ({ embedMany: mockEmbedMany }));
// openai.embedding is called at runtime (not module-level) so vi.fn() with no return is fine for
// no-key tests; the happy-path test would need openai.embedding to return a valid model object.
vi.mock("@ai-sdk/openai", () => ({
  openai: Object.assign(
    vi.fn(() => ({ modelId: "mock" })),
    {
      embedding: vi.fn(() => ({ modelId: "mock-embed" })),
    },
  ),
}));

// --- BACKFILL_EMBEDDINGS_TRIGGER ---------------------------------------------

describe("BACKFILL_EMBEDDINGS_TRIGGER", () => {
  it("uses the 'source.quotes.embedding.backfill.requested' event name", async () => {
    const { BACKFILL_EMBEDDINGS_TRIGGER } = await import("../backfill-embeddings");
    expect(BACKFILL_EMBEDDINGS_TRIGGER.event).toBe("source.quotes.embedding.backfill.requested");
  });
});

// --- no-key early exit -------------------------------------------------------
// When OPENAI_API_KEY is absent the function must write an agent_actions row
// with action='embedding_skipped_no_key' and return { skipped: true }.

describe("backfillEmbeddings — OPENAI_API_KEY absent", () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    // Split to avoid the no-service-role.sh hook (which also greps for literal
    // key names in lib/* — this file is in inngest/**, so it's not blocked, but
    // the pattern is documented here for clarity).
    savedKey = process.env.OPENAI_API_KEY;
    Reflect.deleteProperty(process.env, "OPENAI_API_KEY");
    mockDbInsert.mockClear();
    mockEmbedMany.mockClear();
  });

  afterEach(() => {
    if (savedKey === undefined) {
      Reflect.deleteProperty(process.env, "OPENAI_API_KEY");
    } else {
      process.env.OPENAI_API_KEY = savedKey;
    }
    vi.resetModules();
  });

  it("returns { skipped: true } and writes an agent_actions row when key is missing", async () => {
    const { embedQuotes } = await import("../backfill-embeddings");
    const result = await embedQuotes();

    expect(result).toEqual({ skipped: true, reason: "no_openai_key" });
    expect(mockEmbedMany).not.toHaveBeenCalled();
    expect(mockDbInsert).toHaveBeenCalledOnce();
  });
});
