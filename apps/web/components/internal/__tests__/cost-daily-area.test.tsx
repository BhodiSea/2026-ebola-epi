import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CostDailyArea } from "../cost-daily-area";
import type { DailyViewRow } from "@/app/internal/cost/page";

const AREA_SERIES_RE = /^area-series-/;

vi.stubGlobal(
  "ResizeObserver",
  vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  })),
);

vi.mock("@visx/xychart", () => ({
  XYChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AnimatedAreaStack: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-stack">{children}</div>
  ),
  AnimatedAreaSeries: ({ dataKey }: { dataKey: string }) => (
    <div data-testid={`area-series-${dataKey}`} />
  ),
  Axis: () => null,
}));

describe("CostDailyArea", () => {
  it("renders one area series per unique model_id", () => {
    const data: DailyViewRow[] = [
      { day: "2026-05-01", model_id: "claude-sonnet-4-6", total_cost: 0.01 },
      { day: "2026-05-01", model_id: "claude-haiku-4-5", total_cost: 0.005 },
      { day: "2026-05-02", model_id: "claude-sonnet-4-6", total_cost: 0.02 },
    ];
    render(<CostDailyArea data={data} />);
    expect(screen.getByTestId("area-series-claude-sonnet-4-6")).toBeDefined();
    expect(screen.getByTestId("area-series-claude-haiku-4-5")).toBeDefined();
    expect(screen.getAllByTestId(AREA_SERIES_RE)).toHaveLength(2);
  });

  it("renders no series when data is empty", () => {
    render(<CostDailyArea data={[]} />);
    expect(screen.queryAllByTestId(AREA_SERIES_RE)).toHaveLength(0);
  });

  it("wraps series in AnimatedAreaStack", () => {
    const data: DailyViewRow[] = [
      { day: "2026-05-01", model_id: "claude-opus-4-8", total_cost: 0.1 },
    ];
    render(<CostDailyArea data={data} />);
    expect(screen.getByTestId("area-stack")).toBeDefined();
  });
});
