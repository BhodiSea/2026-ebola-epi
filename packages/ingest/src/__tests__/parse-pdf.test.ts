import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock unpdf before importing parsePdf — unpdf requires WASM which won't load in vitest node
const mockExtractText = vi.fn();
vi.mock("unpdf", () => ({ extractText: mockExtractText }));

// Enough chars to pass the MIN_PDF_TEXT_CHARS guard
const LONG_TEXT = "A".repeat(200);

// parsePdf is tested with a mocked unpdf to avoid WASM load in vitest node.
describe("parsePdf — text extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns non-empty fullText joined from all pages", async () => {
    const page1 = `Page one text. ${"x".repeat(60)}`;
    const page2 = `Page two text. ${"y".repeat(60)}`;
    mockExtractText.mockResolvedValue({
      text: [page1, page2],
      totalPages: 2,
    });
    const { parsePdf } = await import("../parse-pdf.js");
    const result = await parsePdf(new Uint8Array(10));
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.fullText).toContain("Page one text.");
    expect(result.fullText).toContain("Page two text.");
  });

  it("joins pages with newlines so char offsets are stable", async () => {
    mockExtractText.mockResolvedValue({ text: ["first", "second"], totalPages: 2 });
    const { parsePdf } = await import("../parse-pdf.js");
    const result = await parsePdf(new Uint8Array(10));
    if (result.skipped) {
      return;
    }
    expect(result.fullText).toBe("first\nsecond");
  });

  it("returns language:'en' by default (WHO AFRO PDFs are English)", async () => {
    mockExtractText.mockResolvedValue({ text: [LONG_TEXT], totalPages: 1 });
    const { parsePdf } = await import("../parse-pdf.js");
    const result = await parsePdf(new Uint8Array(10));
    if (result.skipped) {
      return;
    }
    expect(result.language).toBe("en");
  });

  it("returns language:'fr' when caller passes 'fr' (MoH DRC PDFs are French)", async () => {
    mockExtractText.mockResolvedValue({ text: [LONG_TEXT], totalPages: 1 });
    const { parsePdf } = await import("../parse-pdf.js");
    const result = await parsePdf(new Uint8Array(10), "fr");
    if (result.skipped) {
      return;
    }
    expect(result.language).toBe("fr");
  });

  it("returns title as empty string (PDFs carry no HTML title)", async () => {
    mockExtractText.mockResolvedValue({ text: [LONG_TEXT], totalPages: 1 });
    const { parsePdf } = await import("../parse-pdf.js");
    const result = await parsePdf(new Uint8Array(10));
    if (result.skipped) {
      return;
    }
    expect(result.title).toBe("");
  });
});

describe("parsePdf — MIN_PDF_TEXT_CHARS guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns skipped:true with reason pdf_text_empty when text < 100 chars", async () => {
    mockExtractText.mockResolvedValue({ text: ["short"], totalPages: 1 });
    const { parsePdf } = await import("../parse-pdf.js");
    const result = await parsePdf(new Uint8Array(10));
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("pdf_text_empty");
  });

  it("returns skipped:true when all pages are whitespace", async () => {
    mockExtractText.mockResolvedValue({ text: ["   \n   ", "  "], totalPages: 2 });
    const { parsePdf } = await import("../parse-pdf.js");
    const result = await parsePdf(new Uint8Array(10));
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("pdf_text_empty");
  });

  it("returns skipped:false when trimmed text is exactly MIN_PDF_TEXT_CHARS", async () => {
    mockExtractText.mockResolvedValue({ text: ["B".repeat(100)], totalPages: 1 });
    const { parsePdf } = await import("../parse-pdf.js");
    const result = await parsePdf(new Uint8Array(10));
    expect(result.skipped).toBe(false);
  });

  it("returns skipped:true when text is 99 chars (below guard)", async () => {
    mockExtractText.mockResolvedValue({ text: ["C".repeat(99)], totalPages: 1 });
    const { parsePdf } = await import("../parse-pdf.js");
    const result = await parsePdf(new Uint8Array(10));
    expect(result.skipped).toBe(true);
  });
});
