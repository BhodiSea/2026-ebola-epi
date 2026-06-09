// @vitest-environment node
// selectPrimaryOutbreak — unit tests for severity + country-preference sort (outbreaks.ts integration)
import { describe, expect, it } from "vitest";

import { selectPrimaryOutbreak } from "../queries/select-primary-outbreak";

const BASE = {
  pathogenIcd11: "1D60.2",
  pathogenSlug: "bundibugyo",
  onsetDate: "2026-05-16",
  name: null,
  status: "active",
  createdAt: "2026-05-16T00:00:00Z",
};

describe("selectPrimaryOutbreak", () => {
  it("returns null for empty list", () => {
    expect(selectPrimaryOutbreak([])).toBeNull();
  });

  it("returns the single outbreak when only one exists", () => {
    const outbreak = { ...BASE, id: "a", countryIso3: "COD", severityLevel: "alert" };
    expect(selectPrimaryOutbreak([outbreak])?.id).toBe("a");
  });

  it("prefers higher severity over lower", () => {
    const emergency = { ...BASE, id: "hi", countryIso3: "UGA", severityLevel: "emergency" };
    const alert = { ...BASE, id: "lo", countryIso3: "COD", severityLevel: "alert" };
    expect(selectPrimaryOutbreak([alert, emergency])?.id).toBe("hi");
  });

  it("prefers COD over UGA when severity is tied", () => {
    const uga = { ...BASE, id: "uga", countryIso3: "UGA", severityLevel: "alert" };
    const cod = { ...BASE, id: "cod", countryIso3: "COD", severityLevel: "alert" };
    expect(selectPrimaryOutbreak([uga, cod])?.id).toBe("cod");
  });

  it("treats null severity_level as info rank (lowest)", () => {
    const nullSev = { ...BASE, id: "null", countryIso3: "UGA", severityLevel: null };
    const alertSev = { ...BASE, id: "alert", countryIso3: "UGA", severityLevel: "alert" };
    expect(selectPrimaryOutbreak([nullSev, alertSev])?.id).toBe("alert");
  });
});
