import { describe, expect, it, vi } from "vitest";

import { listShadowResults } from "../shadow-results";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

function chain(returnValue: { data: unknown; error: unknown }) {
  const m = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return Object.assign(Promise.resolve(returnValue), m);
}

const ROW = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  document_id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  candidate_version: "v2",
  production_run_id: null,
  field_variances: { confirmed: 2 },
  promoted: false,
  created_at: "2026-05-01T00:00:00Z",
};

describe("listShadowResults", () => {
  it("returns parsed rows on success", async () => {
    mockFrom.mockReturnValue(chain({ data: [ROW], error: null }));
    const result = await listShadowResults();
    expect(result).toHaveLength(1);
    expect(result[0]!.candidate_version).toBe("v2");
  });

  it("returns empty array on error", async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: "fail" } }));
    expect(await listShadowResults()).toEqual([]);
  });

  it("queries the shadow_results view", async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    await listShadowResults();
    expect(mockFrom).toHaveBeenCalledWith("shadow_results");
  });
});
