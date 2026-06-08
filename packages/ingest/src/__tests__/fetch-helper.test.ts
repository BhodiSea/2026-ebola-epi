import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithConditionalGet } from "../fetch-helper";

const ALLOW_ALL_ROBOTS = "User-agent: *\nAllow: /\n";

function stubFetchHtml(body: string): void {
  vi.stubGlobal("fetch", async (url: string) => {
    const u = new URL(url);
    if (u.pathname === "/robots.txt") {
      return new Response(ALLOW_ALL_ROBOTS, { status: 200 });
    }
    return new Response(body, { status: 200, headers: { "Content-Type": "text/html" } });
  });
}

// G-11: HTML responses must include rawBytes so ingest-runner can archive to source-bytes bucket.
describe("fetchWithConditionalGet — rawBytes (G-11)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("HTML response includes rawBytes as Uint8Array matching the response body", async () => {
    const body = "<html><body>test sitrep content</body></html>";
    stubFetchHtml(body);
    const result = await fetchWithConditionalGet("https://who.int/sitrep");
    if (result.skipped) {
      throw new Error("unexpected skip");
    }
    expect(result.rawBytes).toBeInstanceOf(Uint8Array);
    const decoded = new TextDecoder().decode(result.rawBytes);
    expect(decoded).toBe(body);
  });

  it("HTML rawBytes byteLength matches utf-8 encoding of rawContent", async () => {
    const body = "Bulletin de situation — Ébola";
    stubFetchHtml(body);
    const result = await fetchWithConditionalGet("https://who.int/bulletin");
    if (result.skipped) {
      throw new Error("unexpected skip");
    }
    const expected = Buffer.from(body);
    expect(result.rawBytes?.byteLength).toBe(expected.byteLength);
  });
});
