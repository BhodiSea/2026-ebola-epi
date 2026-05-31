import { describe, expect, it, vi } from "vitest";

import { listSkipCounts24h } from "../source-skip-counts";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

function chain(returnValue: { data: unknown; error: unknown }) {
  const m = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
  };
  return Object.assign(Promise.resolve(returnValue), m);
}

describe("listSkipCounts24h", () => {
  it("returns a record keyed by subject_id with counts", async () => {
    mockFrom.mockReturnValue(
      chain({
        data: [{ subject_id: "uuid-1" }, { subject_id: "uuid-1" }, { subject_id: "uuid-2" }],
        error: null,
      }),
    );
    const result = await listSkipCounts24h();
    expect(result["uuid-1"]).toBe(2);
    expect(result["uuid-2"]).toBe(1);
  });

  it("returns empty record on supabase error", async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: "fail" } }));
    expect(await listSkipCounts24h()).toEqual({});
  });

  it("queries the agent_actions table", async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    await listSkipCounts24h();
    expect(mockFrom).toHaveBeenCalledWith("agent_actions");
  });

  it("filters by agent = ingest-runner and action = ingest_skipped", async () => {
    const c = chain({ data: [], error: null });
    mockFrom.mockReturnValue(c);
    await listSkipCounts24h();
    expect(c.eq).toHaveBeenCalledWith("agent", "ingest-runner");
    expect(c.eq).toHaveBeenCalledWith("action", "ingest_skipped");
  });

  it("applies a 24h time filter", async () => {
    const c = chain({ data: [], error: null });
    mockFrom.mockReturnValue(c);
    await listSkipCounts24h();
    expect(c.gte).toHaveBeenCalledWith("ts", expect.any(String));
  });
});
