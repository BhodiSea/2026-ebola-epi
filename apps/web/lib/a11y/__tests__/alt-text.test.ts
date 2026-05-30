import { describe, expect, it } from "vitest";

import { buildChartAltText } from "../alt-text";

describe("buildChartAltText", () => {
  it("builds a map alt text with scope, variable, date, and highlight", () => {
    const label = buildChartAltText({
      elementType: "map",
      scope: "DRC health zones",
      variable: "suspected Bundibugyo virus case count",
      asOf: "2026-05-01",
      highlight: "Irumu shows the highest count at 47 suspected cases.",
    });
    expect(label).toContain("DRC health zones");
    expect(label).toContain("suspected Bundibugyo virus case count");
    expect(label).toContain("2026-05-01");
    expect(label).toContain("Irumu shows the highest count at 47 suspected cases.");
  });

  it("builds a timeline alt text with scope, variable, and date", () => {
    const label = buildChartAltText({
      elementType: "timeline",
      scope: "Ituri province",
      variable: "confirmed cases and deaths",
      asOf: "2026-05-01",
    });
    expect(label).toContain("confirmed cases and deaths");
    expect(label).toContain("2026-05-01");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(10);
  });

  it("omits highlight when not provided", () => {
    const label = buildChartAltText({
      elementType: "map",
      scope: "DRC health zones",
      variable: "case count",
      asOf: "2026-05-01",
    });
    expect(label).not.toContain("undefined");
  });
});
