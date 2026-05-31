import { describe, expect, it, vi } from "vitest";

import { listBatchResults } from "../batch-results";

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
  batch_id: "batch_abc123",
  custom_id: "doc-001",
  document_id: null,
  result: { status: "ok" },
  created_at: "2026-05-01T00:00:00Z",
};

describe("listBatchResults", () => {
  it("returns parsed rows on success", async () => {
    mockFrom.mockReturnValue(chain({ data: [ROW], error: null }));
    const result = await listBatchResults();
    expect(result).toHaveLength(1);
    expect(result[0]!.batch_id).toBe("batch_abc123");
  });

  it("returns empty array on error", async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: "fail" } }));
    expect(await listBatchResults()).toEqual([]);
  });

  it("queries the batch_results view", async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    await listBatchResults();
    expect(mockFrom).toHaveBeenCalledWith("batch_results");
  });
});
