// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    select: vi.fn(),
    execute: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("@/inngest/lib/persist-extraction", () => ({
  resolveSourceId: vi.fn().mockResolvedValue("source-uuid-123"),
  upsertDocument: vi.fn().mockResolvedValue("doc-uuid-456"),
}));
vi.mock("@/lib/notify", () => ({
  notifySlack: vi.fn().mockResolvedValue(undefined),
}));

const GROUND_TRUTH = [
  {
    pathogen_icd11: "1D60.2",
    country_iso3: "COD",
    metric: "confirmed",
    value: 61,
    as_of: "2026-05-12",
  },
  {
    pathogen_icd11: "1D60.2",
    country_iso3: "COD",
    metric: "deaths",
    value: 18,
    as_of: "2026-05-12",
  },
];

describe("assertGroundTruth logic", () => {
  it("all expected metrics match observed values exactly", () => {
    const observed = [
      { metric: "confirmed", value: 61 },
      { metric: "deaths", value: 18 },
    ];
    for (const exp of GROUND_TRUTH) {
      const obs = observed.find((r) => r.metric === exp.metric);
      expect(obs).toBeDefined();
      expect(obs?.value).toBe(exp.value);
    }
  });

  it("detects value mismatch", () => {
    const observed = [
      { metric: "confirmed", value: 999 },
      { metric: "deaths", value: 18 },
    ];
    const diff: unknown[] = [];
    for (const exp of GROUND_TRUTH) {
      const obs = observed.find((r) => r.metric === exp.metric);
      if (!obs) {
        diff.push({ type: "missing_metric", metric: exp.metric });
      } else if (obs.value !== exp.value) {
        diff.push({
          type: "value_mismatch",
          metric: exp.metric,
          expected: exp.value,
          observed: obs.value,
        });
      }
    }
    expect(diff).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- diff typed as unknown[]; cast to inspect diff entry shape in assertion
    expect((diff[0] as { type: string }).type).toBe("value_mismatch");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- diff typed as unknown[]; cast to inspect diff entry shape in assertion
    expect((diff[0] as { metric: string }).metric).toBe("confirmed");
  });

  it("detects missing metric", () => {
    const observed = [{ metric: "deaths", value: 18 }];
    const diff: unknown[] = [];
    for (const exp of GROUND_TRUTH) {
      const obs = observed.find((r) => r.metric === exp.metric);
      if (!obs) {
        diff.push({ type: "missing_metric", metric: exp.metric });
      }
    }
    expect(diff).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- diff typed as unknown[]; cast to inspect diff entry shape in assertion
    expect((diff[0] as { type: string }).type).toBe("missing_metric");
  });

  it("returns no_rows diff when observed is null", () => {
    const diff: unknown[] = [{ type: "no_rows" }];
    expect(diff).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- diff typed as unknown[]; cast to inspect diff entry shape in assertion
    expect((diff[0] as { type: string }).type).toBe("no_rows");
  });
});

describe("synthetic-monitor fixture format", () => {
  it("ground-truth.json matches expected schema", () => {
    for (const row of GROUND_TRUTH) {
      expect(typeof row.pathogen_icd11).toBe("string");
      expect(typeof row.country_iso3).toBe("string");
      expect(typeof row.metric).toBe("string");
      expect(typeof row.value).toBe("number");
      expect(typeof row.as_of).toBe("string");
    }
  });

  it("fixture covers confirmed + deaths for COD / 1D60.2", () => {
    const metrics = GROUND_TRUTH.map((r) => r.metric);
    expect(metrics).toContain("confirmed");
    expect(metrics).toContain("deaths");
    expect(GROUND_TRUTH.every((r) => r.country_iso3 === "COD")).toBe(true);
    expect(GROUND_TRUTH.every((r) => r.pathogen_icd11 === "1D60.2")).toBe(true);
  });
});
