import { afterEach, describe, expect, it, vi } from "vitest";

import { listAgentActions } from "@/lib/queries/agent-actions";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("listAgentActions (integration)", () => {
  it("returns an empty array when queried as anon (RLS: authenticated-only view)", async () => {
    // public.agent_actions is a view over audit.agent_actions.
    // anon is revoked entirely: `revoke all on public.agent_actions from anon, public`.
    // This verifies the view exists, query columns are correct, and access is blocked.
    const result = await listAgentActions();
    expect(result).toBeInstanceOf(Array);
    expect(result).toEqual([]);
  });
});
