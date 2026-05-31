import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FIXTURE_HTML = readFileSync(
  path.resolve(import.meta.dirname, "./fixtures/africa-cdc.html"),
  "utf8",
);

const ALLOW_ALL_ROBOTS = "User-agent: *\nAllow: /\n";
const CRON_RE = /^[\d*,/\s-]+$/;

// rss-parser uses Node's http/https (not global fetch), so we vi.mock it directly.
// mockParseURL is module-level so individual tests can override it with mockRejectedValueOnce.
const RSS_ITEMS = [
  {
    title: "Ebola Bundibugyo Outbreak Update – DRC Ituri Province",
    link: "https://africacdc.org/news/ebola-bundibugyo-outbreak-update-drc/",
    pubDate: "Tue, 20 May 2026 08:00:00 +0000",
  },
  {
    title: "Africa CDC Board Meeting Summary 2026",
    link: "https://africacdc.org/news/board-meeting-2026/",
    pubDate: "Mon, 18 May 2026 12:00:00 +0000",
  },
];

const mockParseURL = vi.fn().mockResolvedValue({ items: RSS_ITEMS });

vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(() => ({ parseURL: mockParseURL })),
}));

const STUB_HTML = `<!DOCTYPE html><html><head><title>Loading…</title></head><body><div id="app"></div></body></html>`;

function makeFetchMock(opts: { return304?: boolean } = {}) {
  return async (url: string) => {
    await Promise.resolve();
    const u = new URL(url);
    if (u.pathname === "/robots.txt") {
      return new Response(ALLOW_ALL_ROBOTS, { status: 200 });
    }
    if (opts.return304 === true) {
      // new Response(body, {status: 304}) is invalid per spec; return a plain mock object.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- partial mock; 304 Response can't be constructed via `new Response(body, {status:304})` per Fetch spec
      return {
        status: 304,
        ok: false,
        headers: { get: () => null },
        text: async () => "",
      } as unknown as Response;
    }
    return new Response(FIXTURE_HTML, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  };
}

describe("africaCDCAdapter metadata", () => {
  it("has correct sourceSlug", async () => {
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    expect(africaCDCAdapter.sourceSlug).toBe("africa-cdc");
  });

  it("has correct throttleKey", async () => {
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    expect(africaCDCAdapter.throttleKey).toBe("africacdc.org");
  });

  it("has valid cron pollInterval", async () => {
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    expect(africaCDCAdapter.pollInterval).toMatch(CRON_RE);
  });
});

describe("africaCDCAdapter.poll()", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetchMock({}));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns only outbreak-relevant items", async () => {
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    const items = await africaCDCAdapter.poll();
    expect(items.length).toBe(1);
    expect(items[0]?.url).toContain("ebola-bundibugyo");
  });

  it("returns [] on RSS parse error", async () => {
    mockParseURL.mockRejectedValueOnce(new Error("network error"));
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    const items = await africaCDCAdapter.poll();
    expect(items).toEqual([]);
  });

  it("does not match articles whose title/link contain only 'disease' with no specific outbreak keyword", async () => {
    mockParseURL.mockResolvedValueOnce({
      items: [
        {
          title: "Non-communicable disease prevention in Africa 2026",
          link: "https://africacdc.org/news/ncd-disease-prevention-2026/",
          pubDate: "Tue, 20 May 2026 08:00:00 +0000",
        },
      ],
    });
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    const items = await africaCDCAdapter.poll();
    expect(items).toEqual([]);
  });
});

describe("africaCDCAdapter.fetch()", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetchMock({}));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns skipped:false with sha256 Buffer on 200", async () => {
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    const result = await africaCDCAdapter.fetch(
      "https://africacdc.org/news/ebola-bundibugyo-outbreak-update-drc/",
    );
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.sha256).toBeInstanceOf(Buffer);
    expect(result.sha256.length).toBe(32);
  });

  it("returns skipped:true on 304", async () => {
    vi.stubGlobal("fetch", makeFetchMock({ return304: true }));
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    const result = await africaCDCAdapter.fetch(
      "https://africacdc.org/news/ebola-bundibugyo-outbreak-update-drc/",
    );
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("304 Not Modified");
  });
});

describe("africaCDCAdapter.parse()", () => {
  it("returns fullText and language:en for full article HTML", async () => {
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    const result = await africaCDCAdapter.parse({
      rawContent: FIXTURE_HTML,
      mimeType: "text/html",
    });
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.fullText).toContain("Bundibugyo");
    expect(result.fullText.length).toBeGreaterThan(0);
    expect(result.language).toBe("en");
  });

  it("returns skipped:true with reason chromium_required for JS-rendered stub", async () => {
    const { africaCDCAdapter } = await import("../sources/africa-cdc.js");
    const result = await africaCDCAdapter.parse({ rawContent: STUB_HTML, mimeType: "text/html" });
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("chromium_required");
  });
});
