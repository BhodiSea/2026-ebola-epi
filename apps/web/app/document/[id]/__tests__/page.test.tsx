import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/queries/documents", () => ({
  getDocumentById: vi.fn(),
}));

vi.mock("@/lib/queries/figures", () => ({
  getFiguresForDocument: vi.fn(),
}));

vi.mock("@/components/provenance/figure", () => ({
  Figure: vi.fn(() => null),
}));

const MOCK_DOC = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "WHO DON Sitrep #42",
  url: "https://who.int/sitrep-42",
  publishedAt: "2026-04-01T00:00:00Z",
  ingestedAt: "2026-04-01T12:00:00Z",
  source: {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "who-don",
    name: "WHO DON",
    trustScore: "0.95",
    licenseTier: "open",
  },
};

const MOCK_FIGURES = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    value: 142,
    asOf: "2026-04-01",
    metric: "confirmed",
    sourceQuoteId: "44444444-4444-4444-4444-444444444444",
    quote: {
      text: "Confirmed cases rose to 142.",
      charStart: 0,
      charEnd: 27,
    },
  },
];

describe("/document/[id] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a default async function", async () => {
    const mod = await import("../page");
    expect(typeof mod.default).toBe("function");
  });

  it("calls notFound when document does not exist", async () => {
    const { getDocumentById } = await import("@/lib/queries/documents");
    const { getFiguresForDocument } = await import("@/lib/queries/figures");
    vi.mocked(getDocumentById).mockResolvedValue(null);
    vi.mocked(getFiguresForDocument).mockResolvedValue([]);

    const { default: DocumentPage } = await import("../page");
    await expect(
      DocumentPage({ params: Promise.resolve({ id: "does-not-exist" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders without throwing when document exists", async () => {
    const { getDocumentById } = await import("@/lib/queries/documents");
    const { getFiguresForDocument } = await import("@/lib/queries/figures");
    vi.mocked(getDocumentById).mockResolvedValue(MOCK_DOC);
    vi.mocked(getFiguresForDocument).mockResolvedValue([]);

    const { default: DocumentPage } = await import("../page");
    const result = await DocumentPage({ params: Promise.resolve({ id: MOCK_DOC.id }) });
    expect(result).toBeTruthy();
  });

  it("calls getFiguresForDocument with the document id", async () => {
    const { getDocumentById } = await import("@/lib/queries/documents");
    const { getFiguresForDocument } = await import("@/lib/queries/figures");
    vi.mocked(getDocumentById).mockResolvedValue(MOCK_DOC);
    vi.mocked(getFiguresForDocument).mockResolvedValue(MOCK_FIGURES);

    const { default: DocumentPage } = await import("../page");
    await DocumentPage({ params: Promise.resolve({ id: MOCK_DOC.id }) });
    expect(vi.mocked(getFiguresForDocument)).toHaveBeenCalledWith(MOCK_DOC.id);
  });
});
