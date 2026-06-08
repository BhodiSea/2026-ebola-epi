import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TabularView } from "../tabular-view";
import { getEpiCurveSeries } from "@/lib/queries/case-counts";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/queries/case-counts", () => ({ getEpiCurveSeries: vi.fn() }));
vi.mock("@/components/provenance/figure", () => ({
  Figure: ({ value, quoteId }: { quoteId: string; value: number | string }) => (
    <span data-figure="" data-quote-id={quoteId}>
      {value}
    </span>
  ),
}));
vi.mock("@/components/provenance/figure-or-missing", () => ({
  FigureOrMissing: ({ value, quoteId }: { quoteId: null | string; value: number | string }) => (
    <span data-figure-or-missing="" data-quote-id={quoteId ?? "null"}>
      {value}
    </span>
  ),
}));

const OUTBREAK_ID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";

describe("TabularView", () => {
  beforeEach(() => {
    vi.mocked(getEpiCurveSeries).mockResolvedValue({
      confirmed: [
        { date: "2026-05-01", value: 100, quoteId: "a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" },
      ],
      deaths: [{ date: "2026-05-01", value: 20, quoteId: null }],
    });
  });

  it("renders a row for each date", async () => {
    const jsx = await TabularView({ outbreakId: OUTBREAK_ID });
    const { container } = render(jsx);
    expect(container.querySelectorAll("tbody tr").length).toBe(1);
  });

  it("renders values in the confirmed and deaths cells", async () => {
    const jsx = await TabularView({ outbreakId: OUTBREAK_ID });
    const { container } = render(jsx);
    expect(container.textContent).toContain("100");
    expect(container.textContent).toContain("20");
  });

  it("th headers use text-fg-muted (not text-fg-subtle) for WCAG AA contrast", async () => {
    const jsx = await TabularView({ outbreakId: OUTBREAK_ID });
    const { container } = render(jsx);
    const headers = container.querySelectorAll("th");
    expect(headers.length).toBeGreaterThan(0);
    for (const th of headers) {
      expect(th.className).not.toContain("fg-subtle");
      expect(th.className).toContain("fg-muted");
    }
  });

  it("uses FigureOrMissing (not Figure with empty string) when quoteId is absent", async () => {
    vi.mocked(getEpiCurveSeries).mockResolvedValue({
      confirmed: [{ date: "2026-05-01", value: 42, quoteId: null }],
      deaths: [{ date: "2026-05-01", value: 7, quoteId: null }],
    });
    const jsx = await TabularView({ outbreakId: OUTBREAK_ID });
    const { container } = render(jsx);
    // Must use FigureOrMissing for null quoteIds
    expect(container.querySelectorAll("[data-figure-or-missing]").length).toBeGreaterThanOrEqual(1);
    // Must NOT pass empty string to Figure
    expect(container.querySelector('[data-figure][data-quote-id=""]')).toBeNull();
  });
});
