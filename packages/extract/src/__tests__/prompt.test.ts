import { describe, expect, it } from "vitest";

import { FEW_SHOTS, STATIC_INSTRUCTIONS } from "../prompt.js";
import { verifySubstring } from "../verify.js";

const EXAMPLE_DOC = "As of 15 March 2026, 42 confirmed cases and 12 deaths have been reported.";

describe("STATIC_INSTRUCTIONS", () => {
  it("is a non-empty string", () => {
    expect(STATIC_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it("mentions char_start and char_end", () => {
    expect(STATIC_INSTRUCTIONS).toContain("char_start");
    expect(STATIC_INSTRUCTIONS).toContain("char_end");
  });
});

describe("FEW_SHOTS", () => {
  it("is a non-empty string", () => {
    expect(FEW_SHOTS.length).toBeGreaterThan(0);
  });

  it("example char offsets produce exact quote_text via verifySubstring", () => {
    const quote = "42 confirmed cases and 12 deaths";
    const char_start = EXAMPLE_DOC.indexOf(quote);
    const char_end = char_start + quote.length;
    expect(verifySubstring(EXAMPLE_DOC, { char_start, char_end, quote_text: quote })).toBe(true);
    // Guard that the FEW_SHOTS constant encodes the correct char_end (not a stale value)
    expect(FEW_SHOTS).toContain(`char_end: ${char_end}`);
  });
});
