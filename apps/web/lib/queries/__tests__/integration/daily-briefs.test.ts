import { afterEach, describe, expect, it, vi } from "vitest";

import { getDailyBriefByDate, listPublishedBriefs } from "@/lib/queries/daily-briefs";
import { insertDailyBrief, resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("getDailyBriefByDate (integration)", () => {
  it("returns a published brief that was inserted via fixture", async () => {
    await insertDailyBrief({
      date: "2026-06-01",
      headline: "Integration test brief",
      body: "Body text for integration test.",
      reviewStatus: "published",
    });

    const result = await getDailyBriefByDate("2026-06-01");
    expect(result).not.toBeNull();
    expect(result?.headline).toBe("Integration test brief");
    expect(result?.reviewStatus).toBe("published");
    expect(result?.modelId).toBe("integration-test");
  });

  it("returns null when no brief exists for the date", async () => {
    const result = await getDailyBriefByDate("1900-01-01");
    expect(result).toBeNull();
  });

  it("returns null for an unreviewed brief (anon SELECT policy: published only)", async () => {
    await insertDailyBrief({
      date: "2026-06-02",
      reviewStatus: "unreviewed",
    });
    const result = await getDailyBriefByDate("2026-06-02");
    expect(result).toBeNull();
  });
});

describe("listPublishedBriefs (integration)", () => {
  it("includes a published brief after insertion", async () => {
    await insertDailyBrief({ date: "2026-06-03", reviewStatus: "published" });

    const result = await listPublishedBriefs();
    expect(result.some((b) => b.date === "2026-06-03")).toBe(true);
  });

  it("returns an array (may be empty if no briefs seeded)", async () => {
    const result = await listPublishedBriefs();
    expect(result).toBeInstanceOf(Array);
  });
});
