import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@ituri/db", () => ({
  documents: { id: "documents.id", url: "documents.url", publishedAt: "documents.publishedAt" },
  extractionRuns: { id: "extractionRuns.id", documentId: "extractionRuns.documentId" },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  isNull: vi.fn(),
  desc: vi.fn(),
}));

const mockLimit = vi.fn();
const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
vi.mock("@/lib/db", () => ({ db: { select: mockSelect } }));

describe("listUnextractedDocuments", () => {
  it("returns rows when query resolves", async () => {
    const row = {
      id: "uuid-1",
      url: "https://example.com/sitrep",
      publishedAt: new Date("2026-05-01"),
    };
    mockLimit.mockResolvedValue([row]);
    const { listUnextractedDocuments } = await import("../unextracted-documents");
    const result = await listUnextractedDocuments();
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("uuid-1");
  });

  it("returns empty array when no unextracted documents", async () => {
    mockLimit.mockResolvedValue([]);
    const { listUnextractedDocuments } = await import("../unextracted-documents");
    expect(await listUnextractedDocuments()).toEqual([]);
  });

  it("uses leftJoin to find documents without extraction_runs", async () => {
    mockLimit.mockResolvedValue([]);
    const { listUnextractedDocuments } = await import("../unextracted-documents");
    await listUnextractedDocuments();
    expect(mockLeftJoin).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it("respects an optional limit argument", async () => {
    mockLimit.mockResolvedValue([]);
    const { listUnextractedDocuments } = await import("../unextracted-documents");
    await listUnextractedDocuments(50);
    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});
