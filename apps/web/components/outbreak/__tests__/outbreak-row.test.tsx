import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OutbreakRow } from "../outbreak-row";
import { getStatTotals } from "@/lib/queries/case-counts";
import type { Outbreak } from "@/lib/queries/outbreaks";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/queries/case-counts", () => ({ getStatTotals: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/components/provenance/figure", () => ({
  Figure: ({ value, quoteId }: { quoteId: string; value: number | string }) => (
    <span data-figure data-quote-id={quoteId}>
      {value}
    </span>
  ),
}));

const MOCK_OUTBREAK: Outbreak = {
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

const PATHOGEN_NAME_RE = /Bundibugyo/;

const MOCK_STATS = {
  confirmed: { value: 189, quoteId: "00000000-0000-0000-0000-000000000001" },
  deaths: { value: 37, quoteId: "00000000-0000-0000-0000-000000000002" },
  cfr: 19.6,
  zonesAffected: 5,
};

describe("OutbreakRow", () => {
  it("renders the outbreak name", async () => {
    vi.mocked(getStatTotals).mockResolvedValue(MOCK_STATS);
    const jsx = await OutbreakRow({ outbreak: MOCK_OUTBREAK });
    render(jsx);
    expect(screen.getByText(PATHOGEN_NAME_RE)).toBeInTheDocument();
  });

  it("renders confirmed count with quoteId passed to Figure", async () => {
    vi.mocked(getStatTotals).mockResolvedValue(MOCK_STATS);
    const jsx = await OutbreakRow({ outbreak: MOCK_OUTBREAK });
    const { container } = render(jsx);
    const figures = container.querySelectorAll("[data-figure]");
    expect(figures.length).toBeGreaterThanOrEqual(2);
    const confirmedFigure = container.querySelector(
      '[data-quote-id="00000000-0000-0000-0000-000000000001"]',
    );
    expect(confirmedFigure).not.toBeNull();
  });

  it("renders CFR with a quoteId passed to Figure", async () => {
    vi.mocked(getStatTotals).mockResolvedValue(MOCK_STATS);
    const jsx = await OutbreakRow({ outbreak: MOCK_OUTBREAK });
    const { container } = render(jsx);
    const cfrFigures = container.querySelectorAll("[data-figure]");
    expect(cfrFigures.length).toBeGreaterThanOrEqual(2);
  });

  it("renders SeverityPill with emergency class", async () => {
    vi.mocked(getStatTotals).mockResolvedValue(MOCK_STATS);
    const jsx = await OutbreakRow({ outbreak: MOCK_OUTBREAK });
    const { container } = render(jsx);
    expect(container.innerHTML).toContain("bg-emergency");
  });
});
