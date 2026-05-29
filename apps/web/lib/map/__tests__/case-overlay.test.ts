import { describe, expect, it } from "vitest";

import { casePointsFromFeatures } from "../case-overlay";

describe("casePointsFromFeatures", () => {
  it("keeps only the requested metric, extracts lng/lat/value, skips non-points", () => {
    const points = casePointsFromFeatures(
      [
        {
          geometry: { type: "Point", coordinates: [30.05, 1.55] },
          properties: { value: 42, metric: "deaths", source_quote_id: "q1" },
        },
        {
          geometry: { type: "Point", coordinates: [31, 2] },
          properties: { value: 99, metric: "confirmed", source_quote_id: "q2" },
        },
        {
          geometry: { type: "LineString", coordinates: [] },
          properties: { value: 9, metric: "deaths" },
        },
        {
          geometry: { type: "Point", coordinates: [29.9, 1.4] },
          properties: { value: "7", metric: "deaths", source_quote_id: "q3" },
        },
      ],
      "deaths",
    );
    // the confirmed point is excluded; only deaths Point features survive
    expect(points).toEqual([
      { lng: 30.05, lat: 1.55, value: 42 },
      { lng: 29.9, lat: 1.4, value: 7 },
    ]);
  });

  it("dedupes features repeated across tile boundaries by source_quote_id", () => {
    const f = {
      geometry: { type: "Point", coordinates: [30, 1] },
      properties: { value: 5, metric: "deaths", source_quote_id: "dup" },
    };
    expect(casePointsFromFeatures([f, f], "deaths")).toHaveLength(1);
  });

  it("defaults a missing/NaN value to 0", () => {
    const points = casePointsFromFeatures(
      [{ geometry: { type: "Point", coordinates: [30, 1] }, properties: { metric: "deaths" } }],
      "deaths",
    );
    expect(points[0]?.value).toBe(0);
  });
});
