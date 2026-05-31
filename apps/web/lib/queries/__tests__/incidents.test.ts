import { describe, expect, it, vi } from "vitest";

import { listIncidents } from "../incidents";

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

describe("listIncidents", () => {
  it("returns parsed incidents on success", async () => {
    const row = {
      id: "d0eebc99-0000-0000-0000-000000000001",
      status: "open",
      class: "anomaly",
      detail: {},
      document_id: null,
      created_at: "2026-05-01T00:00:00Z",
    };
    mockFrom.mockReturnValue(chain({ data: [row], error: null }));
    const result = await listIncidents();
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(row.id);
  });

  it("returns empty array on supabase error", async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: "fail" } }));
    const result = await listIncidents();
    expect(result).toEqual([]);
  });

  it("queries the incidents table", async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    await listIncidents();
    expect(mockFrom).toHaveBeenCalledWith("incidents");
  });
});
