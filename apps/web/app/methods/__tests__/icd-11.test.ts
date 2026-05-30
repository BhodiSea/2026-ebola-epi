import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const pageSrc = readFileSync(path.join(import.meta.dirname, "../page.tsx"), "utf8");

const INVALID_ICD_CODE = /1D64/;

describe("methods page ICD-11 section", () => {
  it("renders an ICD-11 classification section heading", () => {
    // Section with ICD-11 heading is required by Phase 8 spec (exit gate)
    expect(pageSrc).toContain("ICD-11");
  });

  it("includes the Bundibugyo virus code 1D60.00 as visible table content", () => {
    // Must appear as renderable text in the section, not only inside JSON-LD
    expect(pageSrc).toContain("1D60.00");
  });

  it("does not contain the invalid code 1D64 anywhere", () => {
    expect(pageSrc).not.toMatch(INVALID_ICD_CODE);
  });
});
