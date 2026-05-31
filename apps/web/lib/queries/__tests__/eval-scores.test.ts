import { describe, expect, it, vi } from "vitest";

import { listEvalScores } from "../eval-scores";

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
  run_id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  metric: "f1",
  score: 0.92,
  source_slug: "who-don",
  evaluated_at: "2026-05-01T00:00:00Z",
};

describe("listEvalScores", () => {
  it("returns parsed eval rows on success", async () => {
    mockFrom.mockReturnValue(chain({ data: [ROW], error: null }));
    const result = await listEvalScores();
    expect(result).toHaveLength(1);
    expect(result[0]!.metric).toBe("f1");
    expect(result[0]!.score).toBe(0.92);
  });

  it("returns empty array on error", async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: "fail" } }));
    expect(await listEvalScores()).toEqual([]);
  });

  it("queries extraction_eval_scores", async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    await listEvalScores();
    expect(mockFrom).toHaveBeenCalledWith("extraction_eval_scores");
  });
});
