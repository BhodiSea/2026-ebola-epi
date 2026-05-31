import { afterEach, describe, expect, it, vi } from "vitest";

import { listEvalScores } from "@/lib/queries/eval-scores";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("listEvalScores (integration)", () => {
  it("returns an empty array when queried as anon (RLS: internal users only)", async () => {
    // extraction_eval_scores: policy "eval_scores_select_internal" requires
    // private.is_internal_user() — never true for anon.
    const result = await listEvalScores();
    expect(result).toBeInstanceOf(Array);
    expect(result).toEqual([]);
  });
});
