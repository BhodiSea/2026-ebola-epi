import { describe, expect, it, vi } from "vitest";

import { listAgentActions } from "../agent-actions";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

function chain(returnValue: { data: unknown; error: unknown }) {
  const m = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };
  return Object.assign(Promise.resolve(returnValue), m);
}

const ROW = {
  id: 1,
  agent: "extractor",
  action: "extracted",
  subject_id: null,
  ts: "2026-05-01T00:00:00Z",
};

describe("listAgentActions", () => {
  it("returns parsed rows on success", async () => {
    mockFrom.mockReturnValue(chain({ data: [ROW], error: null }));
    const result = await listAgentActions();
    expect(result).toHaveLength(1);
    expect(result[0]!.agent).toBe("extractor");
  });

  it("returns empty array on error", async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: "fail" } }));
    expect(await listAgentActions()).toEqual([]);
  });

  it("queries the agent_actions table", async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    await listAgentActions();
    expect(mockFrom).toHaveBeenCalledWith("agent_actions");
  });
});
