import { describe, expect, it, vi } from "vitest";

import { listAdmin2Codes } from "../zones";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mockSupabase,
}));

const SEED_ZONES = [
  { code: "COD-IT-BU", name: "Bunia", admin1_code: "COD-IT" },
  { code: "COD-IT-IR", name: "Irumu", admin1_code: "COD-IT" },
];

describe("listAdmin2Codes", () => {
  it("returns parsed zone rows", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: SEED_ZONES, error: null }),
    };
    mockFrom.mockReturnValue(chain);
    const result = await listAdmin2Codes();
    expect(result).toHaveLength(2);
    expect(result[0]?.code).toBe("COD-IT-BU");
    expect(result[1]?.name).toBe("Irumu");
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "oops" } }),
    };
    mockFrom.mockReturnValue(chain);
    const result = await listAdmin2Codes();
    expect(result).toEqual([]);
  });
});
