import { describe, expect, it } from "vitest";

import { buildExtractionParams } from "../run.js";

const DOC = "As of 2026-05-01, 10 confirmed cases of Bundibugyo ebolavirus in DRC.";

// Encodes AGENTS.md Rule 13: the long-TTL (1h) cache breakpoint must appear
// before the short-TTL (5m) breakpoint in the serialised Anthropic request
// body. Bedrock/Anthropic prefix caching requires the longer-TTL block first.
describe("cache breakpoint ordering — AGENTS.md Rule 13", () => {
  it("tools key appears before messages key in params (Bedrock ordering rule)", () => {
    const params = buildExtractionParams(DOC);
    const keys = Object.keys(params);
    expect(keys.indexOf("tools")).toBeLessThan(keys.indexOf("messages"));
  });

  it("long-TTL (1h) breakpoint is on tools[0]", () => {
    const params = buildExtractionParams(DOC);
    const cc = params.tools?.[0]?.cache_control as
      | null
      | undefined
      | { ttl?: string; type: string };
    expect(cc?.ttl).toBe("1h");
  });

  it("short-TTL (5m default) breakpoint is on messages[0].content[0]", () => {
    const params = buildExtractionParams(DOC);
    const content = params.messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const cc = (content[0] as { cache_control?: { ttl?: string; type?: string } }).cache_control;
    expect(cc?.type).toBe("ephemeral");
    expect(cc?.ttl).toBeUndefined();
  });

  it("system is a plain string — no embedded cache_control (caches via tools prefix)", () => {
    const params = buildExtractionParams(DOC);
    expect(typeof params.system).toBe("string");
  });

  it("exactly one ttl:'1h' block exists in serialised params", () => {
    const params = buildExtractionParams(DOC);
    const json = JSON.stringify(params);
    expect((json.match(/"ttl":"1h"/g) ?? []).length).toBe(1);
  });

  it("1h block serialises before the messages section (structural prefix ordering)", () => {
    const params = buildExtractionParams(DOC);
    const json = JSON.stringify(params);
    const idx1h = json.indexOf('"ttl":"1h"');
    const idxMessages = json.indexOf('"messages"');
    expect(idx1h).toBeGreaterThan(-1);
    expect(idxMessages).toBeGreaterThan(-1);
    expect(idx1h).toBeLessThan(idxMessages);
  });
});
