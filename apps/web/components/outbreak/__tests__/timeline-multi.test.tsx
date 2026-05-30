import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TimelineMulti } from "../timeline-multi";

vi.mock("@visx/xychart", () => ({
  XYChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="xychart">{children}</div>
  ),
  Axis: () => null,
  LineSeries: () => null,
}));

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn() })),
  );
});

const CONFIRMED_LABEL_RE = /Confirmed/;
const DEATHS_LABEL_RE = /Deaths/;

const CONFIRMED: { date: string; value: number }[] = [
  { date: "2026-05-01", value: 12 },
  { date: "2026-05-02", value: 18 },
];

const DEATHS: { date: string; value: number }[] = [
  { date: "2026-05-01", value: 2 },
  { date: "2026-05-02", value: 3 },
];

describe("TimelineMulti", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <TimelineMulti confirmedSeries={CONFIRMED} deathsSeries={DEATHS} ariaLabel="Test timeline" />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders the XYChart", () => {
    const { getByTestId } = render(
      <TimelineMulti confirmedSeries={CONFIRMED} deathsSeries={DEATHS} ariaLabel="Test timeline" />,
    );
    expect(getByTestId("xychart")).toBeInTheDocument();
  });

  it("renders legend labels for confirmed and deaths", () => {
    const { getByText } = render(
      <TimelineMulti confirmedSeries={CONFIRMED} deathsSeries={DEATHS} ariaLabel="Test timeline" />,
    );
    expect(getByText(CONFIRMED_LABEL_RE)).toBeInTheDocument();
    expect(getByText(DEATHS_LABEL_RE)).toBeInTheDocument();
  });

  it("renders with empty series without crashing", () => {
    const { container } = render(
      <TimelineMulti confirmedSeries={[]} deathsSeries={[]} ariaLabel="Test timeline" />,
    );
    expect(container.firstChild).not.toBeNull();
  });
});
