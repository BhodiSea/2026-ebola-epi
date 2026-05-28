/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it } from "vitest";

import { resolveSubstring, verifySubstring } from "../verify.js";

describe("resolveSubstring", () => {
  it("returns exact offsets when LLM offsets are correct", () => {
    const result = resolveSubstring("hello world test", {
      char_start: 6,
      char_end: 11,
      quote_text: "world",
    });
    expect(result).toStrictEqual({ char_start: 6, char_end: 11 });
  });

  it("corrects wrong offsets when quote_text is found verbatim in document", () => {
    const result = resolveSubstring("hello world test", {
      char_start: 0,
      char_end: 5,
      quote_text: "world",
    });
    expect(result).toStrictEqual({ char_start: 6, char_end: 11 });
  });

  it("returns null when quote_text is not in document at all", () => {
    const result = resolveSubstring("hello world test", {
      char_start: 0,
      char_end: 5,
      quote_text: "MISSING",
    });
    expect(result).toBeNull();
  });

  it("returns null when char_end would exceed document length and quote_text absent", () => {
    const result = resolveSubstring("hi", { char_start: 0, char_end: 10, quote_text: "NOPE" });
    expect(result).toBeNull();
  });
});

// Red-team guard: Fix 1 — extractionRuns inserted before caseCounts (non-deferrable FK)
// Red-team guard: Fix 2 — concurrency reduced to 1 to prevent upsertOutbreak race
// Red-team guard: Fix 3 — MODEL exported from run.ts, imported in ingest-who-don.ts

describe("verifySubstring", () => {
  it("exact match passes", () => {
    expect(
      verifySubstring("hello world test", { char_start: 6, char_end: 11, quote_text: "world" }),
    ).toBe(true);
  });

  it("mismatch fails", () => {
    expect(
      verifySubstring("hello world test", { char_start: 6, char_end: 11, quote_text: "WRONG" }),
    ).toBe(false);
  });

  it("char_end beyond text length returns false", () => {
    expect(verifySubstring("hi", { char_start: 0, char_end: 10, quote_text: "hi" })).toBe(false);
  });

  it("empty slice at same char_start/char_end matches empty quote_text", () => {
    expect(verifySubstring("hello", { char_start: 2, char_end: 2, quote_text: "" })).toBe(true);
  });

  it("full document text match", () => {
    const doc = "As of 15 March 2026, 42 confirmed cases reported.";
    const quote = "42 confirmed cases reported";
    const start = doc.indexOf(quote);
    expect(
      verifySubstring(doc, {
        char_start: start,
        char_end: start + quote.length,
        quote_text: quote,
      }),
    ).toBe(true);
  });
});
