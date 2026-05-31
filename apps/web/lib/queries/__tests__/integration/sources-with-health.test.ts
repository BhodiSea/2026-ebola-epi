import { afterEach, describe, expect, it, vi } from "vitest";

import { listSourcesWithHealth } from "@/lib/queries/sources-with-health";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("listSourcesWithHealth (integration)", () => {
  it("returns an empty array as anon (sources_with_health view is authenticated-only)", async () => {
    // public.sources_with_health revokes all from anon — same pattern as agent_actions.
    // The view exists and the query shape is correct; RLS correctly denies anon.
    const result = await listSourcesWithHealth();
    expect(result).toBeInstanceOf(Array);
    expect(result).toEqual([]);
  });
});
