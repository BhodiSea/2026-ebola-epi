import { afterEach, describe, expect, it, vi } from "vitest";

import { listAdmin2Codes } from "@/lib/queries/zones";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("listAdmin2Codes (integration)", () => {
  it("returns the five seeded Ituri health zones", async () => {
    const result = await listAdmin2Codes();
    expect(result.length).toBeGreaterThanOrEqual(5);
    const codes = result.map((z) => z.code);
    expect(codes).toContain("COD-IT-IR");
    expect(codes).toContain("COD-IT-MB");
    expect(codes).toContain("COD-IT-BU");
    expect(codes).toContain("COD-IT-KO");
    expect(codes).toContain("COD-IT-MA");
  });

  it("returns zones ordered by code", async () => {
    const result = await listAdmin2Codes();
    const codes = result.map((z) => z.code);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b)));
  });
});
