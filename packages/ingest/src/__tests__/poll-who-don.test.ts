import { afterEach, describe, expect, it, vi } from "vitest";

// rss-parser uses Node's https module, not global fetch — stub at the module level.
vi.mock("rss-parser", () => ({
  default: class {
    async parseURL(_url: string) {
      await Promise.resolve();
      return {
        items: [
          {
            link: "https://www.who.int/news/item/17-05-2026-epidemic-of-ebola-bundibugyo-virus",
            title: "Ebola epidemic in DRC",
            pubDate: "Mon, 01 Jan 2026 00:00:00 +0000",
          },
          {
            // WHA daily update — no outbreak keywords — must be filtered out
            link: "https://www.who.int/news/item/23-05-2026-seventy-ninth-world-health-assembly-daily-update",
            title: "Seventy-ninth World Health Assembly – Daily update",
            pubDate: "Fri, 23 May 2026 00:00:00 +0000",
          },
          {
            // no pubDate — must be filtered out
            link: "https://www.who.int/news/item/don-no-date",
            title: "DON no date",
          },
          {
            // no link — must be filtered out
            title: "DON no link",
            pubDate: "Tue, 02 Jan 2026 00:00:00 +0000",
          },
        ],
      };
    }
  },
}));

describe("WHO_DON_FEED_URL", () => {
  it("points to the WHO news RSS feed (DON-specific feed was deprecated in 2026)", async () => {
    const { WHO_DON_FEED_URL } = await import("../sources/who-don.js");
    expect(WHO_DON_FEED_URL).toBe("https://www.who.int/rss-feeds/news-english.xml");
  });
});

describe("pollWHODON", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("drops items with no pubDate", async () => {
    const { pollWHODON } = await import("../sources/who-don.js");
    const result = await pollWHODON();
    // Only the Ebola item qualifies: WHA item filtered by keyword, others by missing pubDate/link.
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
