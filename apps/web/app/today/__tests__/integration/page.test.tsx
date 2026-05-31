import { afterEach, describe, expect, it, vi } from "vitest";

import TodayPage from "../../page";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

afterEach(resetFixtures);

describe("TodayPage (integration)", () => {
  it("runs end-to-end against the real DB without throwing", async () => {
    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    expect(jsx).toBeTruthy();
  });

  it("includes all four stat card labels in the JSX tree", async () => {
    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    const str = JSON.stringify(jsx);
    expect(str).toContain("Confirmed");
    expect(str).toContain("Deaths");
    expect(str).toContain("CFR");
    expect(str).toContain("Zones affected");
  });

  it("passes seeded confirmed source_quote_id into the JSX props", async () => {
    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    // quoteId flows: getStatTotals → StatCard → FigureOrMissing
    // Seeded confirmed quote = a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01
    const str = JSON.stringify(jsx);
    expect(str).toContain("a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01");
  });

  it("passes seeded deaths source_quote_id into the JSX props", async () => {
    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    // Seeded deaths quote = a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01
    const str = JSON.stringify(jsx);
    expect(str).toContain("a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01");
  });
});
