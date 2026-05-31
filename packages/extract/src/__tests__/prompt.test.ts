import { describe, expect, it } from "vitest";

import { FEW_SHOTS, STATIC_INSTRUCTIONS } from "../prompt.js";
import { verifySubstring } from "../verify.js";

// Mirror of the example document embedded in FEW_SHOTS for offset verification.
const FEW_SHOTS_EXAMPLE_DOC =
  "As of 15 May 2026, 47 cumulative confirmed cases and 12 deaths have been reported from Ituri Province. Rwampara Health Zone accounts for 28 cases. Four deaths occurred among healthcare workers at Mongbwalu General Referral Hospital.";

describe("STATIC_INSTRUCTIONS", () => {
  it("is a non-empty string", () => {
    expect(STATIC_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it("mentions char_start and char_end", () => {
    expect(STATIC_INSTRUCTIONS).toContain("char_start");
    expect(STATIC_INSTRUCTIONS).toContain("char_end");
  });

  it("clarifies that char offsets are relative to the plain document text, not wrapper tags", () => {
    expect(STATIC_INSTRUCTIONS).toContain("document text");
  });

  it("documents the admin_name zone-first rule", () => {
    expect(STATIC_INSTRUCTIONS).toContain("admin_name");
  });

  it("documents is_new_in_period semantics", () => {
    expect(STATIC_INSTRUCTIONS).toContain("is_new_in_period");
  });

  it("contains ICD-11 code table anchoring Bundibugyo to 1D60.2", () => {
    expect(STATIC_INSTRUCTIONS).toContain("1D60.2");
  });
});

describe("FEW_SHOTS", () => {
  it("is a non-empty string", () => {
    expect(FEW_SHOTS.length).toBeGreaterThan(0);
  });

  it("names zone de santé to illustrate admin_name granularity", () => {
    expect(FEW_SHOTS).toContain("Rwampara");
    expect(FEW_SHOTS).toContain("Mongbwalu");
  });

  it("example Rwampara char offsets produce exact quote_text via verifySubstring", () => {
    const quote = "Rwampara Health Zone accounts for 28 cases";
    const char_start = FEW_SHOTS_EXAMPLE_DOC.indexOf(quote);
    const char_end = char_start + quote.length;
    expect(
      verifySubstring(FEW_SHOTS_EXAMPLE_DOC, { char_start, char_end, quote_text: quote }),
    ).toBe(true);
    // Guard that the FEW_SHOTS constant encodes the correct char_end (not a stale value)
    expect(FEW_SHOTS).toContain(`char_end: ${char_end}`);
  });
});
