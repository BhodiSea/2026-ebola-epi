import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TodayPage from "../page";
import { getSparkline14d, getStatTotals } from "@/lib/queries/case-counts";
import { listRecentDocuments } from "@/lib/queries/documents";
import { getActiveOutbreak, listOutbreaks } from "@/lib/queries/outbreaks";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/queries/outbreaks", () => ({
  getActiveOutbreak: vi.fn(),
  listOutbreaks: vi.fn(),
}));
vi.mock("@/lib/queries/case-counts", () => ({
  getStatTotals: vi.fn(),
  getSparkline14d: vi.fn(),
}));
vi.mock("@/lib/queries/documents", () => ({
  listRecentDocuments: vi.fn(),
}));
vi.mock("@/lib/copy/daily-brief", () => ({
  DAILY_BRIEF: {
    date: "2026-05-28",
    headline: "Test headline",
    body: ["Test body paragraph."],
    context: "Test context.",
  },
}));
vi.mock("@/components/outbreak/stat-card", () => ({
  StatCard: ({ label, quoteId }: { label: string; quoteId: string; value: number | string }) => (
    <div data-stat-card={label.toLowerCase()}>
      <span data-figure data-quote-id={quoteId}>
        {label}
      </span>
    </div>
  ),
}));
vi.mock("@/components/outbreak/active-outbreak-banner", () => ({
  ActiveOutbreakBanner: () => (
    <div className="bg-emergency" data-banner>
      ActiveOutbreakBanner
    </div>
  ),
}));
vi.mock("@/components/outbreak/choropleth-stub", () => ({
  ChoroplethStub: () => <div data-choropleth-stub>ChoroplethStub</div>,
}));
vi.mock("@/components/provenance/ai-generated-label", () => ({
  AiGeneratedLabel: () => <span data-ai-label>AI label</span>,
}));

const MOCK_OUTBREAK = {
  id: "d0eebc99-0000-0000-0000-000000000001",
  pathogenIcd11: "1D60.00",
  pathogenSlug: "bundibugyo",
  countryIso3: "COD",
  onsetDate: "2026-04-20",
  name: "Bundibugyo virus disease — Ituri Province",
  status: "active",
  severityLevel: "emergency",
  createdAt: "2026-04-20T00:00:00Z",
};

const MOCK_STATS = {
  confirmed: { value: 189, quoteId: "00000000-0000-0000-0000-000000000001" },
  deaths: { value: 37, quoteId: "00000000-0000-0000-0000-000000000002" },
  cfr: 19.6,
  zonesAffected: 5,
};

describe("TodayPage", () => {
  it("renders all four data-stat-card attributes", async () => {
    vi.mocked(getActiveOutbreak).mockResolvedValue(MOCK_OUTBREAK);
    vi.mocked(getStatTotals).mockResolvedValue(MOCK_STATS);
    vi.mocked(getSparkline14d).mockResolvedValue([]);
    vi.mocked(listRecentDocuments).mockResolvedValue([]);
    vi.mocked(listOutbreaks).mockResolvedValue([]);

    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);

    expect(container.querySelector('[data-stat-card="confirmed"]')).not.toBeNull();
    expect(container.querySelector('[data-stat-card="deaths"]')).not.toBeNull();
    expect(container.querySelector('[data-stat-card="cfr"]')).not.toBeNull();
    expect(container.querySelector('[data-stat-card="zones affected"]')).not.toBeNull();
  });

  it("renders data-figure for each stat value", async () => {
    vi.mocked(getActiveOutbreak).mockResolvedValue(MOCK_OUTBREAK);
    vi.mocked(getStatTotals).mockResolvedValue(MOCK_STATS);
    vi.mocked(getSparkline14d).mockResolvedValue([]);
    vi.mocked(listRecentDocuments).mockResolvedValue([]);
    vi.mocked(listOutbreaks).mockResolvedValue([]);

    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    const figures = container.querySelectorAll("[data-figure]");
    expect(figures.length).toBeGreaterThanOrEqual(2);
  });

  it("renders ActiveOutbreakBanner when outbreak exists", async () => {
    vi.mocked(getActiveOutbreak).mockResolvedValue(MOCK_OUTBREAK);
    vi.mocked(getStatTotals).mockResolvedValue(MOCK_STATS);
    vi.mocked(getSparkline14d).mockResolvedValue([]);
    vi.mocked(listRecentDocuments).mockResolvedValue([]);
    vi.mocked(listOutbreaks).mockResolvedValue([]);

    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    expect(container.querySelector("[data-banner]")).not.toBeNull();
  });

  it("renders ChoroplethStub", async () => {
    vi.mocked(getActiveOutbreak).mockResolvedValue(MOCK_OUTBREAK);
    vi.mocked(getStatTotals).mockResolvedValue(MOCK_STATS);
    vi.mocked(getSparkline14d).mockResolvedValue([]);
    vi.mocked(listRecentDocuments).mockResolvedValue([]);
    vi.mocked(listOutbreaks).mockResolvedValue([]);

    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    expect(container.querySelector("[data-choropleth-stub]")).not.toBeNull();
  });

  it("renders daily brief headline", async () => {
    vi.mocked(getActiveOutbreak).mockResolvedValue(MOCK_OUTBREAK);
    vi.mocked(getStatTotals).mockResolvedValue(MOCK_STATS);
    vi.mocked(getSparkline14d).mockResolvedValue([]);
    vi.mocked(listRecentDocuments).mockResolvedValue([]);
    vi.mocked(listOutbreaks).mockResolvedValue([]);

    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByText("Test headline")).toBeInTheDocument();
  });

  it("renders graceful fallback when no active outbreak", async () => {
    vi.mocked(getActiveOutbreak).mockResolvedValue(null);
    vi.mocked(getStatTotals).mockResolvedValue({
      confirmed: { value: 0, quoteId: null },
      deaths: { value: 0, quoteId: null },
      cfr: null,
      zonesAffected: 0,
    });
    vi.mocked(getSparkline14d).mockResolvedValue([]);
    vi.mocked(listRecentDocuments).mockResolvedValue([]);
    vi.mocked(listOutbreaks).mockResolvedValue([]);

    const jsx = await TodayPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    expect(container.querySelector("[data-banner]")).toBeNull();
  });
});
