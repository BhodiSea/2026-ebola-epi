import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(path.join(dirnameLocal, "fixtures/who-don.html"), "utf8");

// Red-team guard: pollWHODON must filter items with no link (empty link → TypeError in fetchAndParseDocument)
const ALLOW_ALL_ROBOTS = "User-agent: *\nAllow: /\n";

function makeFetchMock(htmlBody: string) {
  return async (url: string) => {
    await Promise.resolve();
    const u = new URL(url);
    if (u.pathname === "/robots.txt") {
      return new Response(ALLOW_ALL_ROBOTS, { status: 200 });
    }
    return new Response(htmlBody, { status: 200 });
  };
}

// C2 guard: html and fullText are different strings; callers that need
// extraction-input provenance must hash fullText separately from html.
describe("fetchAndParseDocument", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetchMock(fixture));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns non-empty fullText", async () => {
    const { fetchAndParseDocument } = await import("../sources/who-don.js");
    const result = await fetchAndParseDocument(
      "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON-001",
    );
    expect(result.fullText.length).toBeGreaterThan(0);
  });

  it("returns sha256 as 32-byte Buffer", async () => {
    const { fetchAndParseDocument } = await import("../sources/who-don.js");
    const result = await fetchAndParseDocument(
      "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON-001",
    );
    expect(result.sha256).toBeInstanceOf(Buffer);
    expect(result.sha256.length).toBe(32);
  });

  it("returns a non-empty title", async () => {
    const { fetchAndParseDocument } = await import("../sources/who-don.js");
    const result = await fetchAndParseDocument(
      "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON-001",
    );
    expect(result.title.length).toBeGreaterThan(0);
  });

  it("returns the raw html", async () => {
    const { fetchAndParseDocument } = await import("../sources/who-don.js");
    const result = await fetchAndParseDocument(
      "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON-001",
    );
    expect(result.html).toContain("<!DOCTYPE html>");
  });

  it("throws on non-200 HTTP response", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      await Promise.resolve();
      const u = new URL(url);
      if (u.pathname === "/robots.txt") {
        return new Response(ALLOW_ALL_ROBOTS, { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    });
    const { fetchAndParseDocument } = await import("../sources/who-don.js");
    await expect(
      fetchAndParseDocument(
        "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON-404",
      ),
    ).rejects.toThrow("HTTP 404");
  });
});

describe("whoDONAdapter.fetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetchMock(fixture));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("populates rawBytes so canonical-bytes archive is non-empty (G-11)", async () => {
    const { whoDONAdapter } = await import("../sources/who-don.js");
    const result = await whoDONAdapter.fetch(
      "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON-001",
    );
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.rawBytes).toBeInstanceOf(Uint8Array);
    expect(result.rawBytes?.length).toBeGreaterThan(0);
  });

  it("returns skipped:true on 304 Not Modified", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      await Promise.resolve();
      const u = new URL(url);
      if (u.pathname === "/robots.txt") {
        return new Response(ALLOW_ALL_ROBOTS, { status: 200 });
      }
      return new Response(null, { status: 304 });
    });
    const { whoDONAdapter } = await import("../sources/who-don.js");
    const result = await whoDONAdapter.fetch(
      "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON-001",
    );
    expect(result.skipped).toBe(true);
  });
});
