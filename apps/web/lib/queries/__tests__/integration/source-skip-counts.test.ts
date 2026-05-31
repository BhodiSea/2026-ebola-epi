import { afterEach, describe, expect, it, vi } from "vitest";

import { listSkipCounts24h } from "@/lib/queries/source-skip-counts";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("listSkipCounts24h (integration)", () => {
  it("returns an empty record as anon (agent_actions view is authenticated-only)", async () => {
    // public.agent_actions revokes all from anon. listSkipCounts24h queries that view.
    // An empty record is the correct response for anon — no error, just no data.
    const result = await listSkipCounts24h();
    expect(result).toEqual({});
  });
});
