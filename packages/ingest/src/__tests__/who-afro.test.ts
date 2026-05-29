import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(path.join(dirnameLocal, "fixtures/who-afro.html"), "utf8");

const ALLOW_ALL_ROBOTS = "User-agent: *\nAllow: /\n";
const CRON_RE = /^[\d*,/\s-]+$/;

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

describe("whoAFROAdapter.fetch + parse", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetchMock(fixture));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns non-empty fullText containing French text", async () => {
    const { whoAFROAdapter } = await import("../sources/who-afro.js");
    const fetchResult = await whoAFROAdapter.fetch(
      "https://www.afro.who.int/publications/sitrep-bvd-drc-21",
    );
    if (fetchResult.skipped) {
      throw new Error("expected not skipped");
    }
    const parseResult = await whoAFROAdapter.parse(fetchResult.rawContent);
    if (parseResult.skipped) {
      throw new Error("expected not skipped");
    }
    expect(parseResult.fullText.length).toBeGreaterThan(0);
    // French content from the fixture
    expect(parseResult.fullText).toContain("Bundibugyo");
    expect(parseResult.language).toBe("fr");
  });

  it("fetch returns sha256 as 32-byte Buffer", async () => {
    const { whoAFROAdapter } = await import("../sources/who-afro.js");
    const result = await whoAFROAdapter.fetch(
      "https://www.afro.who.int/publications/sitrep-bvd-drc-21",
    );
    if (result.skipped) {
      throw new Error("expected not skipped");
    }
    expect(result.sha256).toBeInstanceOf(Buffer);
    expect(result.sha256.length).toBe(32);
  });

  it("returns skipped:false for a normal HTML response", async () => {
    const { whoAFROAdapter } = await import("../sources/who-afro.js");
    const result = await whoAFROAdapter.fetch(
      "https://www.afro.who.int/publications/sitrep-bvd-drc-21",
    );
    expect(result.skipped).toBe(false);
  });
});

describe("whoAFROAdapter metadata", () => {
  it("sourceSlug is who-afro", async () => {
    const { whoAFROAdapter } = await import("../sources/who-afro.js");
    expect(whoAFROAdapter.sourceSlug).toBe("who-afro");
  });

  it("throttleKey is afro.who.int", async () => {
    const { whoAFROAdapter } = await import("../sources/who-afro.js");
    expect(whoAFROAdapter.throttleKey).toBe("afro.who.int");
  });

  it("pollInterval is a valid cron string", async () => {
    const { whoAFROAdapter } = await import("../sources/who-afro.js");
    expect(whoAFROAdapter.pollInterval).toMatch(CRON_RE);
  });
});
