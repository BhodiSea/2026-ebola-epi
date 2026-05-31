import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TimeScrubber } from "../time-scrubber";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@visx/xychart", () => ({
  XYChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="xychart">{children}</div>
  ),
  AreaSeries: () => null,
  Axis: () => null,
  DataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@visx/brush", () => ({
  Brush: () => <div data-testid="brush" />,
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

const PLAY_BUTTON_RE = /play/i;
const ACLED_RE = /^acled$/i;
const ANNOUNCE_RE = /^Showing week \d+ of 2026, 55 confirmed cases$/;

const CONFIRMED = [
  { date: "2026-05-01", value: 41 },
  { date: "2026-05-08", value: 55 },
];
const DEATHS = [
  { date: "2026-05-01", value: 4 },
  { date: "2026-05-08", value: 6 },
];

describe("TimeScrubber", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <TimeScrubber
        confirmedSeries={CONFIRMED}
        deathsSeries={DEATHS}
        sitrepDates={["2026-05-07"]}
        outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
      />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("has an ARIA-live polite region", () => {
    render(
      <TimeScrubber
        confirmedSeries={CONFIRMED}
        deathsSeries={DEATHS}
        sitrepDates={[]}
        outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
      />,
    );
    const live = document.querySelector("[aria-live='polite']");
    expect(live).not.toBeNull();
  });

  it("shows playback controls", () => {
    render(
      <TimeScrubber
        confirmedSeries={CONFIRMED}
        deathsSeries={DEATHS}
        sitrepDates={[]}
        outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
      />,
    );
    expect(screen.getByRole("button", { name: PLAY_BUTTON_RE })).toBeInTheDocument();
  });

  it("does not render an ACLED toggle button (no backing data)", () => {
    render(
      <TimeScrubber
        confirmedSeries={CONFIRMED}
        deathsSeries={DEATHS}
        sitrepDates={[]}
        outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
      />,
    );
    expect(screen.queryByRole("button", { name: ACLED_RE })).toBeNull();
  });

  it("announces the ISO week, year, and cumulative confirmed count in the spec format", () => {
    render(
      <TimeScrubber
        confirmedSeries={CONFIRMED}
        deathsSeries={DEATHS}
        sitrepDates={[]}
        outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
      />,
    );
    const live = document.querySelector("[aria-live='polite']");
    // latest date 2026-05-08, cumulative confirmed = 41 + 55 = 96
    expect(live?.textContent).toMatch(ANNOUNCE_RE);
  });
});
