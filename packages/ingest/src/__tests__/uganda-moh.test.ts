import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LISTING_HTML = readFileSync(
  path.resolve(import.meta.dirname, "./fixtures/uganda-moh.html"),
  "utf8",
);

// Enough body text for Readability to extract successfully.
const PRESS_RELEASE_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Ebola Sudan Update | Uganda MoH</title></head>
<body>
<article class="press-release">
  <h1>Ebola Sudan Virus Disease – Kasese District Update</h1>
  <time datetime="2026-05-20">May 20, 2026</time>
  <div class="content">
    <p>As of 20 May 2026, Uganda has confirmed 3 cases of Ebola Sudan Virus Disease in Kasese District,
    bordering the Democratic Republic of Congo. The Uganda Virus Research Institute (UVRI) confirmed the
    diagnosis on 19 May 2026 following rapid field investigation.</p>
    <p>The Ministry of Health has activated the National Emergency Operations Centre and deployed rapid
    response teams. Contact tracing has identified 47 contacts currently under 21-day monitoring. No
    cases have been confirmed in Kampala or other districts at this time.</p>
    <p>The public is advised to avoid contact with suspected cases and to report any symptoms to the
    nearest health facility. Updates will be issued every 48 hours.</p>
  </div>
</article>
</body>
</html>`;

const ALLOW_ALL_ROBOTS = "User-agent: *\nAllow: /\n";
const CRON_RE = /^[\d*,/\s-]+$/;
const ABSOLUTE_URL_RE = /^https?:\/\//;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T/;

function makeHtmlFetchMock(listingHtml: string, articleHtml = PRESS_RELEASE_HTML) {
  return async (url: string) => {
    await Promise.resolve();
    const u = new URL(url);
    if (u.pathname === "/robots.txt") {
      return new Response(ALLOW_ALL_ROBOTS, { status: 200 });
    }
    if (u.pathname.startsWith("/press-releases")) {
      return new Response(listingHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response(articleHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };
}

describe("ugandaMOHAdapter metadata", () => {
  it("has correct sourceSlug", async () => {
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    expect(ugandaMOHAdapter.sourceSlug).toBe("uganda-moh");
  });

  it("has correct throttleKey", async () => {
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    expect(ugandaMOHAdapter.throttleKey).toBe("health.go.ug");
  });

  it("has valid cron pollInterval", async () => {
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    expect(ugandaMOHAdapter.pollInterval).toMatch(CRON_RE);
  });
});

describe("ugandaMOHAdapter.poll()", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeHtmlFetchMock(LISTING_HTML));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns only outbreak-relevant items", async () => {
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    const items = await ugandaMOHAdapter.poll();
    // ebola + marburg match; malaria does not
    expect(items.length).toBe(2);
    const urls = items.map((i) => i.url);
    expect(urls.some((u) => u.includes("ebola-sudan"))).toBe(true);
    expect(urls.some((u) => u.includes("marburg"))).toBe(true);
    expect(urls.some((u) => u.includes("malaria"))).toBe(false);
  });

  it("returns items with absolute URLs", async () => {
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    const items = await ugandaMOHAdapter.poll();
    for (const item of items) {
      expect(item.url).toMatch(ABSOLUTE_URL_RE);
    }
  });

  it("returns items with publishedAt ISO strings", async () => {
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    const items = await ugandaMOHAdapter.poll();
    for (const item of items) {
      expect(() => new Date(item.publishedAt)).not.toThrow();
      expect(item.publishedAt).toMatch(ISO_DATE_RE);
    }
  });

  it("throws when listing HTML has no article elements (selector empty — site structure change)", async () => {
    vi.stubGlobal(
      "fetch",
      makeHtmlFetchMock(`<!DOCTYPE html><html><body><p>No articles here.</p></body></html>`),
    );
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    await expect(ugandaMOHAdapter.poll()).rejects.toThrow("uganda_moh_selector_empty");
  });

  it("returns [] when listing has no outbreak keyword matches", async () => {
    vi.stubGlobal(
      "fetch",
      makeHtmlFetchMock(
        `<!DOCTYPE html><html><body>
          <article><h2><a href="/2026/malaria-update/">Malaria Update</a></h2></article>
          <article><h2><a href="/2026/nutrition-report/">Nutrition Report</a></h2></article>
        </body></html>`,
      ),
    );
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    const items = await ugandaMOHAdapter.poll();
    expect(items).toEqual([]);
  });
});

describe("ugandaMOHAdapter.fetch()", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeHtmlFetchMock(LISTING_HTML));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns skipped:false with sha256 Buffer on 200", async () => {
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    const result = await ugandaMOHAdapter.fetch(
      "https://www.health.go.ug/2026/ebola-sudan-virus-disease-kasese-district-update/",
    );
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.sha256).toBeInstanceOf(Buffer);
    expect(result.sha256.length).toBe(32);
  });

  it("returns skipped:true on 304", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      await Promise.resolve();
      const u = new URL(url);
      if (u.pathname === "/robots.txt") {
        return new Response(ALLOW_ALL_ROBOTS, { status: 200 });
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- partial mock; 304 Response can't be constructed via `new Response(body, {status:304})` per Fetch spec
      return {
        status: 304,
        ok: false,
        headers: { get: () => null },
        text: async () => "",
      } as unknown as Response;
    });
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    const result = await ugandaMOHAdapter.fetch(
      "https://www.health.go.ug/2026/ebola-sudan-virus-disease-kasese-district-update/",
    );
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("304 Not Modified");
  });
});

describe("ugandaMOHAdapter.parse()", () => {
  it("returns fullText with English content and language:en", async () => {
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    const result = await ugandaMOHAdapter.parse({
      rawContent: PRESS_RELEASE_HTML,
      mimeType: "text/html",
    });
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.fullText).toContain("Uganda");
    expect(result.language).toBe("en");
  });

  it("returns skipped:true with readability_parse_failed for minimal HTML", async () => {
    const { ugandaMOHAdapter } = await import("../sources/uganda-moh.js");
    const result = await ugandaMOHAdapter.parse({
      rawContent: "<!DOCTYPE html><html><head></head><body></body></html>",
      mimeType: "text/html",
    });
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("readability_parse_failed");
  });
});
