/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it } from "vitest";

import { ExtractionBatchSchema, ExtractionRowSchema, extractionTool } from "../tools.js";

describe("extractionTool", () => {
  // Lint fix: runExtraction reordered before buildAnthropicMessages (perfectionist/sort-modules)
  it("has the correct tool name", () => {
    expect(extractionTool.name).toBe("extract_case_counts");
  });

  it("input_schema has extractions array property", () => {
    expect(extractionTool.input_schema).toMatchObject({
      type: "object",
      properties: { extractions: { type: "array" } },
    });
  });

  it("extraction row schema has required source_quote fields", () => {
    expect(extractionTool.input_schema).toMatchObject({
      properties: {
        extractions: {
          items: {
            properties: {
              source_quote: {
                required: expect.arrayContaining(["char_start", "char_end", "quote_text"]),
              },
            },
          },
        },
      },
    });
  });
});

describe("ExtractionBatchSchema", () => {
  it("parses a valid extraction batch", () => {
    const input = {
      extractions: [
        {
          pathogen_icd11: "1D60.00",
          country_iso3: "COD",
          metric: "confirmed",
          value: 42,
          as_of: "2026-03-15",
          source_quote: { char_start: 0, char_end: 10, quote_text: "42 confirmed" },
        },
      ],
    };
    // quote_text length validated separately; use schema to check structure
    const result = ExtractionBatchSchema.safeParse(input);
    // We only check structure here — char/quote correctness is verified by verifySubstring
    expect(result.success).toBe(true);
  });

  it("rejects invalid metric", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.00",
      country_iso3: "COD",
      metric: "hospitalised", // not in enum
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.00",
      country_iso3: "COD",
      metric: "cases",
      value: -1,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty string admin1_name (H4)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.00",
      country_iso3: "COD",
      admin1_name: "",
      metric: "cases",
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts undefined admin1_name (H4)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.00",
      country_iso3: "COD",
      metric: "cases",
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects pathogen_icd11 shorter than 4 chars (M4)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "A1",
      country_iso3: "COD",
      metric: "cases",
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects pathogen_icd11 longer than 12 chars (M4)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "ABCDEFGHIJKLM",
      country_iso3: "COD",
      metric: "cases",
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid pathogen_icd11 (M4)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.00",
      country_iso3: "COD",
      metric: "cases",
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(true);
  });
});
