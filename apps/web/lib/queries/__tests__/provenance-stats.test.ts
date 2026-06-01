import { describe, expect, it, vi } from "vitest";

import { getDocumentsWithoutProvenance, getProvenanceCoverageStats } from "../provenance-stats";

vi.mock("server-only", () => ({}));

vi.mock("@ituri/db", () => ({
  documents: { id: "docs.id", sourceId: "docs.sourceId" },
  sources: { id: "sources.id", slug: "sources.slug" },
  sourceQuotes: {
    id: "sq.id",
    documentId: "sq.documentId",
    charStart: "sq.charStart",
    charEnd: "sq.charEnd",
  },
  caseCounts: {
    id: "cc.id",
    sourceQuoteId: "cc.sourceQuoteId",
    supersededBy: "cc.supersededBy",
    status: "cc.status",
  },
}));

const mockDbSelect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { select: mockDbSelect } }));

// Builds a fluent Drizzle mock chain for list queries.
// The chain is awaitable (resolves to `rows`) and exposes
// a `.limit(fn)` method that returns the same promise.
function makeChain(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  const limitFn = vi.fn().mockReturnValue(promise);
  const chain = Object.assign(promise, {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue(Object.assign(promise, { limit: limitFn })),
    limit: limitFn,
  });
  return { chain, limitFn };
}

// Builds a single-count Drizzle mock chain for aggregate queries.
// Returns a promise that resolves to [{ count }] and supports the
// from/innerJoin/leftJoin/where fluent methods used in getProvenanceCoverageStats.
function makeCountChain(countValue: number) {
  const rows = [{ count: countValue }];
  return Object.assign(Promise.resolve(rows), {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue(Promise.resolve(rows)),
  });
}

// ── getDocumentsWithoutProvenance ─────────────────────────────────────────────

describe("getDocumentsWithoutProvenance", () => {
  it("returns mapped rows when the DB returns documents", async () => {
    const rows = [
      { id: "doc-1", sourceId: "src-1", sourceSlug: "who-don" },
      { id: "doc-2", sourceId: "src-1", sourceSlug: "who-don" },
    ];
    const { chain } = makeChain(rows);
    mockDbSelect.mockReturnValue(chain);

    const result = await getDocumentsWithoutProvenance(10);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "doc-1", sourceSlug: "who-don" });
  });

  it("returns an empty array when no documents are missing provenance", async () => {
    const { chain } = makeChain([]);
    mockDbSelect.mockReturnValue(chain);

    const result = await getDocumentsWithoutProvenance();
    expect(result).toHaveLength(0);
  });

  it("passes the limit argument to the query", async () => {
    const { chain, limitFn } = makeChain([]);
    mockDbSelect.mockReturnValue(chain);

    await getDocumentsWithoutProvenance(7);
    expect(limitFn).toHaveBeenCalledWith(7);
  });

  it("uses a default limit of 50", async () => {
    const { chain, limitFn } = makeChain([]);
    mockDbSelect.mockReturnValue(chain);

    await getDocumentsWithoutProvenance();
    expect(limitFn).toHaveBeenCalledWith(50);
  });
});

// ── getProvenanceCoverageStats ────────────────────────────────────────────────

describe("getProvenanceCoverageStats", () => {
  it("returns correct stats when DB has mixed data", async () => {
    // The function issues 4 separate db.select() calls in order:
    // 1. totalRow: published case_counts count
    // 2. verifiedRow: case_counts with verified offsets (charEnd > 1)
    // 3. placeholderRow: case_counts with placeholder offsets (charStart=0, charEnd=1)
    // 4. missingDocsRow: documents with no source_quotes
    mockDbSelect
      .mockReturnValueOnce(
        Object.assign(Promise.resolve([{ count: 10 }]), {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue(Promise.resolve([{ count: 10 }])),
        }),
      )
      .mockReturnValueOnce(
        Object.assign(Promise.resolve([{ count: 8 }]), {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue(Promise.resolve([{ count: 8 }])),
        }),
      )
      .mockReturnValueOnce(
        Object.assign(Promise.resolve([{ count: 1 }]), {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue(Promise.resolve([{ count: 1 }])),
        }),
      )
      .mockReturnValueOnce(
        Object.assign(Promise.resolve([{ count: 3 }]), {
          from: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue(Promise.resolve([{ count: 3 }])),
        }),
      );

    const result = await getProvenanceCoverageStats();
    expect(result.totalPublished).toBe(10);
    expect(result.withVerifiedOffsets).toBe(8);
    expect(result.withPlaceholderOffsets).toBe(1);
    expect(result.documentsMissingProvenance).toBe(3);
    expect(result.percentVerified).toBe(80);
  });

  it("returns 100% when total is 0 (no division by zero)", async () => {
    mockDbSelect
      .mockReturnValueOnce(makeCountChain(0))
      .mockReturnValueOnce(makeCountChain(0))
      .mockReturnValueOnce(makeCountChain(0))
      .mockReturnValueOnce(makeCountChain(0));

    const result = await getProvenanceCoverageStats();
    expect(result.percentVerified).toBe(100);
    expect(result.totalPublished).toBe(0);
  });

  it("rounds percentVerified to one decimal place", async () => {
    // 2 out of 3 = 66.666... → 66.7
    mockDbSelect
      .mockReturnValueOnce(makeCountChain(3))
      .mockReturnValueOnce(makeCountChain(2))
      .mockReturnValueOnce(makeCountChain(1))
      .mockReturnValueOnce(makeCountChain(0));

    const result = await getProvenanceCoverageStats();
    expect(result.percentVerified).toBe(66.7);
  });
});
