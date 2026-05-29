import { describe, expect, it } from "vitest";

import { advanceDate, isoWeek, valueAt, windowCutoff } from "../scrubber-utils";

describe("isoWeek", () => {
  it("returns the ISO week and year for a date", () => {
    expect(isoWeek("2026-05-08")).toEqual({ week: 19, year: 2026 });
    expect(isoWeek("2026-01-01").year).toBe(2026);
  });
});

describe("windowCutoff", () => {
  it("returns a sentinel min date for the all window", () => {
    expect(windowCutoff("2026-05-08", "all")).toBe("0000-01-01");
  });

  it("subtracts the window length from the latest date", () => {
    expect(windowCutoff("2026-05-08", "7d")).toBe("2026-05-01");
    expect(windowCutoff("2026-05-08", "30d")).toBe("2026-04-08");
  });
});

describe("valueAt", () => {
  // case_counts metrics are cumulative restatements, so the value at a date is the latest
  // snapshot on or before it — NOT the running sum (which would double-count).
  const series = [
    { date: "2026-05-01", value: 10 },
    { date: "2026-05-08", value: 15 },
    { date: "2026-05-15", value: 20 },
  ];

  it("returns the latest snapshot on or before the given date", () => {
    expect(valueAt(series, "2026-05-08")).toBe(15);
    expect(valueAt(series, "2026-05-15")).toBe(20);
  });

  it("returns the most recent prior snapshot for an in-between date", () => {
    expect(valueAt(series, "2026-05-10")).toBe(15);
  });

  it("returns 0 before the first snapshot and is order-independent", () => {
    expect(valueAt(series, "2026-04-30")).toBe(0);
    expect(valueAt([...series].reverse(), "2026-05-10")).toBe(15);
  });
});

describe("advanceDate", () => {
  const series = [
    { date: "2026-05-01", value: 1 },
    { date: "2026-05-08", value: 2 },
  ];

  it("advances to the next date and wraps to the first", () => {
    expect(advanceDate(series, "2026-05-01")).toBe("2026-05-08");
    expect(advanceDate(series, "2026-05-08")).toBe("2026-05-01");
  });
});
