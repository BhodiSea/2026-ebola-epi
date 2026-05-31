// @vitest-environment node
import { describe, expect, it } from "vitest";

import { SHADOW_RUN_TRIGGER } from "../pipeline-events-config.js";
import {
  SHADOW_EXTRACTION_FN_CONFIG,
  SHADOW_EXTRACTION_TRIGGER,
} from "../shadow-extraction-config.js";
import { computeFieldVariances } from "@/inngest/lib/field-variances.js";

describe("SHADOW_EXTRACTION_FN_CONFIG", () => {
  it("has id 'shadow-extraction'", () => {
    expect(SHADOW_EXTRACTION_FN_CONFIG.id).toBe("shadow-extraction");
  });

  it("retries is 1 (best-effort, not critical path)", () => {
    expect(SHADOW_EXTRACTION_FN_CONFIG.retries).toBe(1);
  });
});

describe("SHADOW_EXTRACTION_TRIGGER", () => {
  it("listens on SHADOW_RUN_TRIGGER event", () => {
    expect(SHADOW_EXTRACTION_TRIGGER.event).toBe(SHADOW_RUN_TRIGGER);
  });
});

describe("SHADOW_RUN_TRIGGER", () => {
  it("uses dot-separated format matching pipeline convention", () => {
    expect(SHADOW_RUN_TRIGGER).toBe("shadow.run.trigger");
  });
});

// ExtractionRow has pathogen_icd11/country_iso3; case_counts does NOT — ensure
// the key uses only metric+as_of so candidate and production rows can actually match.
describe("computeFieldVariances", () => {
  const candidateRows = [
    {
      pathogen_icd11: "XA01",
      country_iso3: "COD",
      metric: "confirmed" as const,
      as_of: "2026-04-20",
      value: 142,
      admin_name: undefined,
      source_quote: { char_start: 0, char_end: 10, quote_text: "142 cases", sha256: "abc" },
    },
    {
      pathogen_icd11: "XA01",
      country_iso3: "COD",
      metric: "deaths" as const,
      as_of: "2026-04-20",
      value: 12,
      admin_name: undefined,
      source_quote: { char_start: 11, char_end: 20, quote_text: "12 deaths", sha256: "def" },
    },
  ];

  it("counts a row as matched when metric+as_of key agrees with production", () => {
    const production = [{ metric: "confirmed", as_of: "2026-04-20", value: 142 }];
    const result = computeFieldVariances(candidateRows, production);
    expect(result.matchedRows).toBe(1);
    expect(result.mismatchedRows).toBe(1); // deaths has no production counterpart
  });

  it("counts a row as mismatched when the value differs", () => {
    const production = [{ metric: "confirmed", as_of: "2026-04-20", value: 150 }];
    const result = computeFieldVariances(candidateRows, production);
    expect(result.mismatchedRows).toBeGreaterThanOrEqual(1);
    expect(result.divergingMetrics).toContain("confirmed(150→142)");
  });

  it("matches on metric+as_of only — pathogen/country fields in candidate rows are irrelevant", () => {
    // Regression guard: before the fix, production rows used pathogen_icd11:"unknown"/country_iso3:"unknown"
    // which never matched the real pathogen/country in candidate rows.
    // Production rows now use { metric, as_of } only — keys must align.
    const production = [{ metric: "confirmed", as_of: "2026-04-20", value: 142 }];
    const result = computeFieldVariances(candidateRows, production);
    // confirmed matches; deaths is new → at least 1 matched
    expect(result.matchedRows).toBeGreaterThan(0);
  });

  it("returns zero matched and all as new when production is empty", () => {
    const result = computeFieldVariances(candidateRows, []);
    expect(result.matchedRows).toBe(0);
    expect(result.mismatchedRows).toBe(candidateRows.length);
  });

  it("counts production rows absent from candidate as mismatched (regression guard: candidate prompt regression)", () => {
    // If the candidate prompt returns ZERO rows but production has rows,
    // mismatchedRows must be > 0 so a promotion script can gate on it.
    // Before the fix, mismatchedRows was 0 in this case, giving false confidence.
    const production = [
      { metric: "confirmed", as_of: "2026-04-20", value: 142 },
      { metric: "deaths", as_of: "2026-04-20", value: 12 },
    ];
    const result = computeFieldVariances([], production);
    expect(result.matchedRows).toBe(0);
    expect(result.mismatchedRows).toBe(2);
    expect(result.divergingMetrics.some((m) => m.includes("dropped"))).toBe(true);
  });
});
