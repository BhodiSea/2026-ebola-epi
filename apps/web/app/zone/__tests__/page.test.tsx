import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/queries/zone-detail", () => ({
  getZoneStatTotals: vi.fn().mockResolvedValue({
    confirmed: { value: 0, quoteId: null },
    deaths: { value: 0, quoteId: null },
    cfr: null,
    firstDetected: { value: null, quoteId: null },
  }),
}));

vi.mock("@/lib/queries/documents", () => ({
  getDocumentsForZone: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/queries/outbreaks", () => ({
  getActiveOutbreak: vi.fn().mockResolvedValue(null),
}));

describe("/zone/[code] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a default async function", async () => {
    const mod = await import("../[code]/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders a no-outbreak state when no active outbreak", async () => {
    const { default: Page } = await import("../[code]/page");
    const result = await Page({ params: Promise.resolve({ code: "CD-IT-001" }) });
    expect(result).toBeTruthy();
  });
});
