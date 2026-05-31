// Additional zone-detail integration coverage for getZoneTotalsAsOf edge cases.
// (Zone stat totals / epi series covered in zone-detail.test.ts)
import { afterEach, describe, expect, it, vi } from "vitest";

import { getZoneTotalsAsOf } from "@/lib/queries/zone-detail";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

const OUTBREAK_ID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";

afterEach(resetFixtures);

describe("getZoneTotalsAsOf — cumulative restatement (integration)", () => {
  it("uses the latest row per zone, not the sum across dates", async () => {
    // Seed has only 2026-05-24 confirmed rows. Each zone's single row IS the latest value.
    const totals = await getZoneTotalsAsOf(OUTBREAK_ID, "2026-05-24");
    // Should be exactly the seeded values (no double-counting from multiple dates)
    expect(totals["COD-IT-BU"]).toBe(23);
    expect(totals["COD-IT-KO"]).toBe(15);
    expect(totals["COD-IT-MA"]).toBe(8);
  });
});
