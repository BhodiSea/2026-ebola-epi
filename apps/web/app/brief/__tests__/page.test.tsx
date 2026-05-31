import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/queries/daily-briefs", () => ({
  getDailyBriefByDate: vi.fn().mockResolvedValue(null),
  listPublishedBriefs: vi.fn().mockResolvedValue([{ date: "2026-05-28" }]),
}));

describe("/brief/[date] page", () => {
  it("exports a default async function", async () => {
    const mod = await import("../[date]/page");
    expect(typeof mod.default).toBe("function");
  });

  it("exports generateStaticParams", async () => {
    const mod = await import("../[date]/page");
    expect(typeof mod.generateStaticParams).toBe("function");
  });

  it("calls notFound when brief is missing", async () => {
    const { default: Page } = await import("../[date]/page");
    await expect(Page({ params: Promise.resolve({ date: "2026-05-29" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("generateStaticParams returns dates from DB", async () => {
    const { generateStaticParams } = await import("../[date]/page");
    const params = await generateStaticParams();
    expect(params).toEqual([{ date: "2026-05-28" }]);
  });
});
