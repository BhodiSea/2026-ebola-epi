import { afterEach, describe, expect, it, vi } from "vitest";

// rss-parser uses Node's https module, not global fetch — stub at the module level.
vi.mock("rss-parser", () => ({
  default: class {
    async parseURL(_url: string) {
      await Promise.resolve();
      return {
        items: [
          {
            // true DON sitrep at the correct WHO path — the ONLY URL that should survive
            link: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON-001",
            title: "Disease Outbreak News: Bundibugyo virus disease in DRC",
            pubDate: "Mon, 01 Jan 2026 00:00:00 +0000",
          },
          {
            // press release at /news/item/ — has outbreak keyword in title but wrong path
            link: "https://www.who.int/news/item/17-05-2026-epidemic-of-ebola-bundibugyo-virus",
            title: "Ebola epidemic in DRC",
            pubDate: "Mon, 01 Jan 2026 00:00:00 +0000",
          },
          {
            // WHA daily update — wrong path, no outbreak keyword — rejected either way
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
    // Only the DON sitrep at /emergencies/disease-outbreak-news/ qualifies.
    // The /news/item/ press release is rejected by the path allow-list; others by missing pubDate/link.
    expect(result).toHaveLength(1);
  });

  it("rejects /news/item/ press releases even when they contain outbreak keywords", async () => {
    const { pollWHODON } = await import("../sources/who-don.js");
    const result = await pollWHODON();
    const pressReleaseUrl =
      "https://www.who.int/news/item/17-05-2026-epidemic-of-ebola-bundibugyo-virus";
    expect(result.some((item) => item.url === pressReleaseUrl)).toBe(false);
  });

  it("accepts DON sitreps at /emergencies/disease-outbreak-news/ paths", async () => {
    const { pollWHODON } = await import("../sources/who-don.js");
    const result = await pollWHODON();
    const donUrl = "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON-001";
    expect(result.some((item) => item.url === donUrl)).toBe(true);
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
