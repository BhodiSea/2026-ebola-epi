// WS3: variant=candidate tests in the describe blocks below
import { describe, expect, it } from "vitest";

import { CANDIDATE_FEW_SHOTS, CANDIDATE_STATIC_INSTRUCTIONS } from "../prompt.js";
import { buildExtractionParams } from "../run.js";

const DOC = "As of 2026-05-01, 10 confirmed cases of Bundibugyo ebolavirus in DRC.";

// Encodes AGENTS.md Rule 13: the long-TTL (1h) cache breakpoint must appear
// before the short-TTL (5m) breakpoint in the serialised Anthropic request
// body. Bedrock/Anthropic prefix caching requires the longer-TTL block first.
// WS3: variant="candidate" tests follow at the bottom of this file.
describe("cache breakpoint ordering — AGENTS.md Rule 13", () => {
  it("tools key appears before messages key in params (Bedrock ordering rule)", () => {
    const params = buildExtractionParams(DOC);
    const keys = Object.keys(params);
    expect(keys.indexOf("tools")).toBeLessThan(keys.indexOf("messages"));
  });

  it("long-TTL (1h) breakpoint is on tools[0]", () => {
    const params = buildExtractionParams(DOC);
    expect(JSON.stringify(params.tools?.[0]?.cache_control)).toContain('"ttl":"1h"');
  });

  it("short-TTL (5m default) breakpoint is on messages[0].content[0]", () => {
    const params = buildExtractionParams(DOC);
    const content = params.messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const block = content[0];
    if (block?.type !== "text") {
      throw new TypeError("expected text block");
    }
    expect(block.cache_control?.type).toBe("ephemeral");
    expect(JSON.stringify(block.cache_control)).not.toContain('"ttl"');
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

describe("buildExtractionParams — variant: candidate (WS3)", () => {
  it("system text equals CANDIDATE_STATIC_INSTRUCTIONS", () => {
    const params = buildExtractionParams(DOC, "candidate");
    expect(params.system).toBe(CANDIDATE_STATIC_INSTRUCTIONS);
  });

  it("messages[0].content[0] text equals CANDIDATE_FEW_SHOTS", () => {
    const params = buildExtractionParams(DOC, "candidate");
    const content = params.messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const firstBlock = content[0];
    if (firstBlock?.type !== "text") {
      throw new TypeError("expected text block");
    }
    expect(firstBlock.text).toBe(CANDIDATE_FEW_SHOTS);
  });

  it("tools[0] cache_control.ttl is still '1h' (AGENTS.md Rule 13 unchanged)", () => {
    const params = buildExtractionParams(DOC, "candidate");
    expect(JSON.stringify(params.tools?.[0]?.cache_control)).toContain('"ttl":"1h"');
  });

  it("exactly one ttl:'1h' block in serialised candidate params", () => {
    const params = buildExtractionParams(DOC, "candidate");
    const json = JSON.stringify(params);
    expect((json.match(/"ttl":"1h"/g) ?? []).length).toBe(1);
  });

  it("document is wrapped in untrusted XML in candidate variant", () => {
    const params = buildExtractionParams(DOC, "candidate");
    const content = params.messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const docBlock = content[1];
    if (docBlock?.type !== "text") {
      throw new TypeError("expected text block");
    }
    expect(docBlock.text).toContain('<document trust="untrusted">');
    expect(docBlock.text).toContain(DOC);
  });
});
