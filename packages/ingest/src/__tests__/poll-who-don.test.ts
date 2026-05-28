import { afterEach, describe, expect, it, vi } from "vitest";

// rss-parser uses Node's https module, not global fetch — stub at the module level.
vi.mock("rss-parser", () => ({
  default: class {
    async parseURL(_url: string) {
      await Promise.resolve();
      return {
        items: [
          {
            link: "https://example.com/don-001",
            title: "DON 001",
            pubDate: "Mon, 01 Jan 2026 00:00:00 +0000",
          },
          {
            // no pubDate — must be filtered out
            link: "https://example.com/don-002",
            title: "DON 002 — no date",
          },
          {
            // no link — must be filtered out
            title: "DON 003 — no link",
            pubDate: "Tue, 02 Jan 2026 00:00:00 +0000",
          },
        ],
      };
    }
  },
}));

describe("pollWHODON", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("drops items with no pubDate", async () => {
    const { pollWHODON } = await import("../sources/who-don.js");
    const result = await pollWHODON();
    // Only the first item qualifies; items without pubDate or link are filtered.
    expect(result).toHaveLength(1);
  });

  it("drops items with no link", async () => {
    const { pollWHODON } = await import("../sources/who-don.js");
    const result = await pollWHODON();
    expect(result.every((item) => item.url.length > 0)).toBe(true);
  });

  it("sets publishedAt to ISO string derived from pubDate", async () => {
    const { pollWHODON } = await import("../sources/who-don.js");
    const result = await pollWHODON();
    expect(result[0]?.publishedAt).toBe(new Date("Mon, 01 Jan 2026 00:00:00 +0000").toISOString());
  });

  it("sets sourceSlug to who-don on every item", async () => {
    const { pollWHODON } = await import("../sources/who-don.js");
    const result = await pollWHODON();
    expect(result[0]?.sourceSlug).toBe("who-don");
  });
});
