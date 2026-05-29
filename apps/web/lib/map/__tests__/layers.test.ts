import { describe, expect, it } from "vitest";

import { DEFAULT_LAYERS, LAYER_GROUPS, LAYERS, parseLayers } from "../layers";

describe("parseLayers", () => {
  it("returns the default set when param is null or empty", () => {
    expect(parseLayers(null)).toEqual(new Set(DEFAULT_LAYERS));
    expect(parseLayers("")).toEqual(new Set(DEFAULT_LAYERS));
  });

  it("parses a comma-separated list, dropping empties", () => {
    expect(parseLayers("confirmed,terrain,")).toEqual(new Set(["confirmed", "terrain"]));
  });
});

describe("LAYERS", () => {
  it("covers all six spec groups", () => {
    const groups = new Set(LAYERS.map((l) => l.group));
    for (const g of LAYER_GROUPS) {
      expect(groups.has(g)).toBe(true);
    }
  });

  it("includes the test-required confirmed + terrain layers", () => {
    const labels = LAYERS.map((l) => l.label.toLowerCase());
    expect(labels.some((l) => l.includes("confirmed cases"))).toBe(true);
    expect(labels.some((l) => l.includes("terrain"))).toBe(true);
  });
});
