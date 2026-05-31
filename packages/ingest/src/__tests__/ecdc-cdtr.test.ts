import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ecdcCDTRAdapter } from "../sources/ecdc-cdtr.js";

const FIXTURE = readFileSync(
  path.resolve(import.meta.dirname, "./fixtures/ecdc-cdtr.html"),
  "utf8",
);

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
