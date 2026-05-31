import { afterEach, describe, expect, it, vi } from "vitest";

import { getCostKpis } from "@/lib/queries/cost";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("getCostKpis (integration)", () => {
  it("returns zero totals as anon (anthropic_usage_daily is authenticated-only)", async () => {
    // public.anthropic_usage_daily revokes select from anon; extraction_runs view is
    // also authenticated-only. Both queries return empty data for anon, so totals are zero.
    const result = await getCostKpis("2026-05-01", "2026-05-31");
    expect(result.total30d).toBe(0);
    expect(result.totalToday).toBe(0);
    // runCount comes from extraction_runs (authenticated-only view), so 0 for anon
    expect(result.runCount).toBe(0);
    expect(result.daily).toBeInstanceOf(Array);
    expect(result.outliers).toBeInstanceOf(Array);
  });
});
