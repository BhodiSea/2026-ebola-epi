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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.arrayContaining returns any; consumed by Vitest matcher
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
          pathogen_icd11: "1D60.2",
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
});

describe("ExtractionRowSchema", () => {
  it("rejects hallucinated sub-code 1D60.00 — not in PATHOGEN_ICD11 enum", () => {
    // 1D60.00 is a real-world model hallucination that created phantom outbreaks in prod.
    // The enum constraint prevents it reaching the DB.
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.00",
      country_iso3: "COD",
      metric: "confirmed",
      value: 42,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects hallucinated sub-code 1D60.1Y — not in PATHOGEN_ICD11 enum", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.1Y",
      country_iso3: "UGA",
      metric: "confirmed",
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid metric", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.2",
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
      pathogen_icd11: "1D60.2",
      country_iso3: "COD",
      metric: "cases",
      value: -1,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty string admin_name (H4)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.2",
      country_iso3: "COD",
      admin_name: "",
      metric: "cases",
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts undefined admin_name (H4)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.2",
      country_iso3: "COD",
      metric: "cases",
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts zone-level admin_name (H4)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.2",
      country_iso3: "COD",
      admin_name: "Rwampara",
      metric: "cases",
      value: 28,
      as_of: "2026-05-15",
      source_quote: {
        char_start: 0,
        char_end: 42,
        quote_text: "Rwampara Health Zone accounts for 28 cases",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts healthcare_workers metric (WS1 constraint-fix)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.2",
      country_iso3: "COD",
      metric: "healthcare_workers",
      value: 4,
      as_of: "2026-05-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(true);
  });

  it.each([
    "hcw_deaths",
    "nosocomial",
    "lab_positive",
    "in_treatment",
  ] as const)("accepts new WS1 metric %s", (metric) => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.2",
      country_iso3: "COD",
      metric,
      value: 1,
      as_of: "2026-05-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts is_new_in_period boolean (WS1)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.2",
      country_iso3: "COD",
      metric: "cases",
      value: 5,
      as_of: "2026-05-15",
      is_new_in_period: true,
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects is_new_in_period non-boolean (WS1)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.2",
      country_iso3: "COD",
      metric: "cases",
      value: 5,
      as_of: "2026-05-15",
      is_new_in_period: "yes",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(false);
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

  it("accepts canonical Bundibugyo ICD-11 code 1D60.2 (M4)", () => {
    const result = ExtractionRowSchema.safeParse({
      pathogen_icd11: "1D60.2",
      country_iso3: "COD",
      metric: "cases",
      value: 5,
      as_of: "2026-03-15",
      source_quote: { char_start: 0, char_end: 5, quote_text: "hello" },
    });
    expect(result.success).toBe(true);
  });
});
