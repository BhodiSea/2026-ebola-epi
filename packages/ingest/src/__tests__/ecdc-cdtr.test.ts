import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { ecdcCDTRAdapter } from "../sources/ecdc-cdtr.js";

const mockEcdcParseURL = vi.fn().mockResolvedValue({ items: [] });
vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(() => ({ parseURL: mockEcdcParseURL })),
}));

const FIXTURE = readFileSync(
  path.resolve(import.meta.dirname, "./fixtures/ecdc-cdtr.html"),
  "utf8",
);

describe("ecdcCDTRAdapter.poll()", () => {
  it("throws when RSS parseURL fails", async () => {
    mockEcdcParseURL.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(ecdcCDTRAdapter.poll()).rejects.toThrow("ecdc-cdtr RSS feed unavailable");
  });
});

describe("ecdcCDTRAdapter", () => {
  it("has correct sourceSlug", () => {
    expect(ecdcCDTRAdapter.sourceSlug).toBe("ecdc-cdtr");
  });

  it("has correct throttleKey", () => {
    expect(ecdcCDTRAdapter.throttleKey).toBe("www.ecdc.europa.eu");
  });

  it("parse() extracts English text containing case count", async () => {
    const result = await ecdcCDTRAdapter.parse({ rawContent: FIXTURE, mimeType: "text/html" });
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.fullText).toContain("108");
    expect(result.fullText).toContain("Bundibugyo");
  });

  it("parse() sets language to en", async () => {
    const result = await ecdcCDTRAdapter.parse({ rawContent: FIXTURE, mimeType: "text/html" });
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.language).toBe("en");
  });

  it("parse() sets title from article heading", async () => {
    const result = await ecdcCDTRAdapter.parse({ rawContent: FIXTURE, mimeType: "text/html" });
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.title).toContain("CDTR");
  });
});
